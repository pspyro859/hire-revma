const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');
const { authenticate, requireStaff } = require('../middleware/auth');

const router = express.Router();

// GET /api/maintenance (staff only) — all logs
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { machine_id, maintenance_type, upcoming_service } = req.query;

    let sql = `
      SELECT ml.*, m.name AS machine_name, m.make, m.model, m.qr_code_id
      FROM maintenance_logs ml
      LEFT JOIN machines m ON ml.machine_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (machine_id) { sql += ' AND ml.machine_id = ?'; params.push(machine_id); }
    if (maintenance_type) { sql += ' AND ml.maintenance_type = ?'; params.push(maintenance_type); }
    if (upcoming_service === 'true') {
      sql += ' AND ml.next_service_due IS NOT NULL AND ml.next_service_due <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)';
    }

    sql += ' ORDER BY ml.service_date DESC';

    const [rows] = await getPool().query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Get maintenance logs error:', error);
    res.status(500).json({ detail: 'Failed to get maintenance logs' });
  }
});

// GET /api/machines/:machineId/maintenance (staff only)
router.get('/machine/:machineId', authenticate, requireStaff, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      `SELECT ml.*, m.name AS machine_name, m.make, m.model
       FROM maintenance_logs ml
       LEFT JOIN machines m ON ml.machine_id = m.id
       WHERE ml.machine_id = ?
       ORDER BY ml.service_date DESC`,
      [req.params.machineId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get machine maintenance logs error:', error);
    res.status(500).json({ detail: 'Failed to get maintenance logs' });
  }
});

// GET /api/maintenance/:id (staff only)
router.get('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      `SELECT ml.*, m.name AS machine_name, m.make, m.model
       FROM maintenance_logs ml
       LEFT JOIN machines m ON ml.machine_id = m.id
       WHERE ml.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Maintenance log not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Get maintenance log error:', error);
    res.status(500).json({ detail: 'Failed to get maintenance log' });
  }
});

// POST /api/maintenance (staff only)
router.post('/', authenticate, requireStaff, async (req, res) => {
  try {
    const {
      machine_id, maintenance_type, description, parts_replaced,
      cost, technician_name, service_date, hours_at_service,
      next_service_due, next_service_hours, notes
    } = req.body;

    if (!machine_id || !maintenance_type || !description || !service_date) {
      return res.status(400).json({ detail: 'machine_id, maintenance_type, description, and service_date are required' });
    }

    // Verify machine exists
    const [machines] = await getPool().query('SELECT id FROM machines WHERE id = ?', [machine_id]);
    if (machines.length === 0) {
      return res.status(404).json({ detail: 'Machine not found' });
    }

    const id = uuidv4();
    await getPool().query('INSERT INTO maintenance_logs SET ?', [{
      id,
      machine_id,
      maintenance_type,
      description,
      parts_replaced: parts_replaced || null,
      cost: cost || null,
      technician_name: technician_name || null,
      service_date,
      hours_at_service: hours_at_service || null,
      next_service_due: next_service_due || null,
      next_service_hours: next_service_hours || null,
      notes: notes || null,
      created_by: req.user.id
    }]);

    const [rows] = await getPool().query(
      `SELECT ml.*, m.name AS machine_name, m.make, m.model
       FROM maintenance_logs ml
       LEFT JOIN machines m ON ml.machine_id = m.id
       WHERE ml.id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Create maintenance log error:', error);
    res.status(500).json({ detail: 'Failed to create maintenance log' });
  }
});

// PUT /api/maintenance/:id (staff only)
router.put('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const {
      maintenance_type, description, parts_replaced, cost,
      technician_name, service_date, hours_at_service,
      next_service_due, next_service_hours, notes
    } = req.body;

    const updateData = {};
    if (maintenance_type !== undefined) updateData.maintenance_type = maintenance_type;
    if (description !== undefined) updateData.description = description;
    if (parts_replaced !== undefined) updateData.parts_replaced = parts_replaced;
    if (cost !== undefined) updateData.cost = cost;
    if (technician_name !== undefined) updateData.technician_name = technician_name;
    if (service_date !== undefined) updateData.service_date = service_date;
    if (hours_at_service !== undefined) updateData.hours_at_service = hours_at_service;
    if (next_service_due !== undefined) updateData.next_service_due = next_service_due;
    if (next_service_hours !== undefined) updateData.next_service_hours = next_service_hours;
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ detail: 'No fields to update' });
    }

    const setClauses = Object.keys(updateData).map(k => `\`${k}\` = ?`).join(', ');
    const [result] = await getPool().query(
      `UPDATE maintenance_logs SET ${setClauses} WHERE id = ?`,
      [...Object.values(updateData), req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Maintenance log not found' });
    }

    const [rows] = await getPool().query(
      `SELECT ml.*, m.name AS machine_name, m.make, m.model
       FROM maintenance_logs ml
       LEFT JOIN machines m ON ml.machine_id = m.id
       WHERE ml.id = ?`,
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Update maintenance log error:', error);
    res.status(500).json({ detail: 'Failed to update maintenance log' });
  }
});

// DELETE /api/maintenance/:id (staff only)
router.delete('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const [result] = await getPool().query('DELETE FROM maintenance_logs WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Maintenance log not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete maintenance log error:', error);
    res.status(500).json({ detail: 'Failed to delete maintenance log' });
  }
});

module.exports = router;
