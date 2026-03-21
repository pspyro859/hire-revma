const express = require('express');
const { getPool } = require('../config/database');
const { authenticate, requireStaff } = require('../middleware/auth');

const router = express.Router();

// GET /api/prestart/submissions (staff only) — all machines
router.get('/submissions', authenticate, requireStaff, async (req, res) => {
  try {
    const { machine_id, status, start_date, end_date } = req.query;

    let sql = `
      SELECT ps.*, m.name AS machine_name, m.make, m.model, m.qr_code_id
      FROM prestart_submissions ps
      LEFT JOIN machines m ON ps.machine_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (machine_id) { sql += ' AND ps.machine_id = ?'; params.push(machine_id); }
    if (status) { sql += ' AND ps.overall_status = ?'; params.push(status); }
    if (start_date) { sql += ' AND ps.submission_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND ps.submission_date <= ?'; params.push(end_date); }

    sql += ' ORDER BY ps.created_at DESC';

    const [rows] = await getPool().query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Get all prestart submissions error:', error);
    res.status(500).json({ detail: 'Failed to get prestart submissions' });
  }
});

// GET /api/prestart/submissions/:id (staff only)
router.get('/submissions/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const [subs] = await getPool().query(
      `SELECT ps.*, m.name AS machine_name, m.make, m.model, m.qr_code_id
       FROM prestart_submissions ps
       LEFT JOIN machines m ON ps.machine_id = m.id
       WHERE ps.id = ?`,
      [req.params.id]
    );
    if (subs.length === 0) {
      return res.status(404).json({ detail: 'Submission not found' });
    }

    const [items] = await getPool().query(
      'SELECT * FROM prestart_submission_items WHERE submission_id = ? ORDER BY category, id',
      [req.params.id]
    );

    res.json({ ...subs[0], items });
  } catch (error) {
    console.error('Get prestart submission error:', error);
    res.status(500).json({ detail: 'Failed to get prestart submission' });
  }
});

module.exports = router;
