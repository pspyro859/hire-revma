const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');
const { authenticate, requireStaff } = require('../middleware/auth');

const router = express.Router();

const parseJSON = (val) => {
  if (!val) return val;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
};

const formatMachine = (row) => ({
  ...row,
  specifications: parseJSON(row.specifications),
  is_available: Boolean(row.is_available)
});

// GET /api/machines
router.get('/', async (req, res) => {
  try {
    const { category, available_only } = req.query;
    
    let sql = 'SELECT * FROM machines';
    const params = [];
    const conditions = [];

    if (category) { conditions.push('category = ?'); params.push(category); }
    if (available_only === 'true') { conditions.push('is_available = 1'); }

    if (conditions.length > 0) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ' ORDER BY name';

    const [rows] = await getPool().query(sql, params);
    res.json(rows.map(formatMachine));
  } catch (error) {
    console.error('Get machines error:', error);
    res.status(500).json({ detail: 'Failed to get machines' });
  }
});

// GET /api/machines/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await getPool().query('SELECT * FROM machines WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Machine not found' });
    }
    res.json(formatMachine(rows[0]));
  } catch (error) {
    console.error('Get machine error:', error);
    res.status(500).json({ detail: 'Failed to get machine' });
  }
});

// POST /api/machines (Staff only)
router.post('/', authenticate, requireStaff, async (req, res) => {
  try {
    const {
      name, make, model, category, description, image_url,
      daily_rate, weekly_rate, monthly_rate, security_bond, specifications, is_available,
      serial_number, year, hours_reading, registration, qr_code_id
    } = req.body;

    const id = uuidv4();
    await getPool().query('INSERT INTO machines SET ?', [{
      id, name, make, model, category, description, image_url,
      daily_rate, weekly_rate, monthly_rate, security_bond,
      specifications: specifications ? JSON.stringify(specifications) : null,
      is_available: is_available !== false ? 1 : 0,
      serial_number: serial_number || null,
      year: year || null,
      hours_reading: hours_reading || null,
      registration: registration || null,
      qr_code_id: qr_code_id || null
    }]);

    const [rows] = await getPool().query('SELECT * FROM machines WHERE id = ?', [id]);
    res.json(formatMachine(rows[0]));
  } catch (error) {
    console.error('Create machine error:', error);
    res.status(500).json({ detail: 'Failed to create machine' });
  }
});

// PUT /api/machines/:id (Staff only)
router.put('/:id', authenticate, requireStaff, async (req, res) => {
  try {
    const {
      name, make, model, category, description, image_url,
      daily_rate, weekly_rate, monthly_rate, security_bond, specifications, is_available,
      serial_number, year, hours_reading, registration, qr_code_id
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (make !== undefined) updateData.make = make;
    if (model !== undefined) updateData.model = model;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (daily_rate !== undefined) updateData.daily_rate = daily_rate;
    if (weekly_rate !== undefined) updateData.weekly_rate = weekly_rate;
    if (monthly_rate !== undefined) updateData.monthly_rate = monthly_rate;
    if (security_bond !== undefined) updateData.security_bond = security_bond;
    if (specifications !== undefined) updateData.specifications = JSON.stringify(specifications);
    if (is_available !== undefined) updateData.is_available = is_available ? 1 : 0;
    if (serial_number !== undefined) updateData.serial_number = serial_number;
    if (year !== undefined) updateData.year = year;
    if (hours_reading !== undefined) updateData.hours_reading = hours_reading;
    if (registration !== undefined) updateData.registration = registration;
    if (qr_code_id !== undefined) updateData.qr_code_id = qr_code_id;

    const setClauses = Object.keys(updateData).map(k => `\`${k}\` = ?`).join(', ');
    const [result] = await getPool().query(
      `UPDATE machines SET ${setClauses} WHERE id = ?`,
      [...Object.values(updateData), req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Machine not found' });
    }

    const [rows] = await getPool().query('SELECT * FROM machines WHERE id = ?', [req.params.id]);
    res.json(formatMachine(rows[0]));
  } catch (error) {
    console.error('Update machine error:', error);
    res.status(500).json({ detail: 'Failed to update machine' });
  }
});

// ─── Machine Documents ───────────────────────────────────────────────────────

// GET /api/machines/:machineId/documents (public)
router.get('/:machineId/documents', async (req, res) => {
  try {
    const [rows] = await getPool().query(
      'SELECT * FROM machine_documents WHERE machine_id = ? ORDER BY doc_type',
      [req.params.machineId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get machine documents error:', error);
    res.status(500).json({ detail: 'Failed to get machine documents' });
  }
});

// POST /api/machines/:machineId/documents (staff only)
router.post('/:machineId/documents', authenticate, requireStaff, async (req, res) => {
  try {
    const { doc_type, title, url } = req.body;
    if (!doc_type || !url) {
      return res.status(400).json({ detail: 'doc_type and url are required' });
    }

    // Check machine exists
    const [machines] = await getPool().query('SELECT id FROM machines WHERE id = ?', [req.params.machineId]);
    if (machines.length === 0) {
      return res.status(404).json({ detail: 'Machine not found' });
    }

    const id = uuidv4();
    await getPool().query(
      'INSERT INTO machine_documents (id, machine_id, doc_type, title, url) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), url = VALUES(url)',
      [id, req.params.machineId, doc_type, title || null, url]
    );

    const [rows] = await getPool().query('SELECT * FROM machine_documents WHERE machine_id = ? AND doc_type = ?', [req.params.machineId, doc_type]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Create machine document error:', error);
    res.status(500).json({ detail: 'Failed to create machine document' });
  }
});

// PUT /api/machines/:machineId/documents/:docId (staff only)
router.put('/:machineId/documents/:docId', authenticate, requireStaff, async (req, res) => {
  try {
    const { title, url } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (url !== undefined) updateData.url = url;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ detail: 'No fields to update' });
    }

    const setClauses = Object.keys(updateData).map(k => `\`${k}\` = ?`).join(', ');
    const [result] = await getPool().query(
      `UPDATE machine_documents SET ${setClauses} WHERE id = ? AND machine_id = ?`,
      [...Object.values(updateData), req.params.docId, req.params.machineId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Document not found' });
    }

    const [rows] = await getPool().query('SELECT * FROM machine_documents WHERE id = ?', [req.params.docId]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Update machine document error:', error);
    res.status(500).json({ detail: 'Failed to update machine document' });
  }
});

// DELETE /api/machines/:machineId/documents/:docId (staff only)
router.delete('/:machineId/documents/:docId', authenticate, requireStaff, async (req, res) => {
  try {
    const [result] = await getPool().query(
      'DELETE FROM machine_documents WHERE id = ? AND machine_id = ?',
      [req.params.docId, req.params.machineId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Document not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete machine document error:', error);
    res.status(500).json({ detail: 'Failed to delete machine document' });
  }
});

// ─── Pre-Start Checklist ─────────────────────────────────────────────────────

// GET /api/machines/:machineId/prestart/template (public)
router.get('/:machineId/prestart/template', async (req, res) => {
  try {
    // Get machine-specific + universal (machine_id IS NULL) items
    const [rows] = await getPool().query(
      `SELECT * FROM prestart_checklist_templates 
       WHERE (machine_id = ? OR machine_id IS NULL) AND is_active = 1
       ORDER BY category, item_order`,
      [req.params.machineId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get prestart template error:', error);
    res.status(500).json({ detail: 'Failed to get prestart template' });
  }
});

// POST /api/machines/:machineId/prestart (public - no auth)
router.post('/:machineId/prestart', async (req, res) => {
  try {
    const {
      operator_name, operator_company, operator_phone,
      submission_date, hours_reading, notes, items
    } = req.body;

    if (!operator_name || !submission_date || !items || !Array.isArray(items)) {
      return res.status(400).json({ detail: 'operator_name, submission_date, and items are required' });
    }

    // Determine overall status: fail if any item failed
    const overall_status = items.some(i => i.status === 'fail') ? 'fail' : 'pass';

    const submissionId = uuidv4();
    await getPool().query('INSERT INTO prestart_submissions SET ?', [{
      id: submissionId,
      machine_id: req.params.machineId,
      operator_name,
      operator_company: operator_company || null,
      operator_phone: operator_phone || null,
      submission_date,
      hours_reading: hours_reading || null,
      overall_status,
      notes: notes || null
    }]);

    // Insert items
    for (const item of items) {
      await getPool().query('INSERT INTO prestart_submission_items SET ?', [{
        id: uuidv4(),
        submission_id: submissionId,
        template_item_id: item.template_item_id || null,
        category: item.category,
        item_text: item.item_text,
        status: item.status,
        comment: item.comment || null
      }]);
    }

    const [subs] = await getPool().query('SELECT * FROM prestart_submissions WHERE id = ?', [submissionId]);
    const [subItems] = await getPool().query('SELECT * FROM prestart_submission_items WHERE submission_id = ?', [submissionId]);

    res.json({ ...subs[0], items: subItems });
  } catch (error) {
    console.error('Submit prestart error:', error);
    res.status(500).json({ detail: 'Failed to submit prestart checklist' });
  }
});

// GET /api/machines/:machineId/prestart/submissions (staff only)
router.get('/:machineId/prestart/submissions', authenticate, requireStaff, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      'SELECT * FROM prestart_submissions WHERE machine_id = ? ORDER BY created_at DESC',
      [req.params.machineId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get prestart submissions error:', error);
    res.status(500).json({ detail: 'Failed to get prestart submissions' });
  }
});

// ─── QR Code Generation ──────────────────────────────────────────────────────

// GET /api/machines/:id/qr
router.get('/:id/qr', async (req, res) => {
  try {
    const QRCode = require('qrcode');
    const [rows] = await getPool().query('SELECT * FROM machines WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Machine not found' });
    }
    const machine = rows[0];
    const qrTarget = machine.qr_code_id || machine.id;
    const url = `${process.env.FRONTEND_URL || 'https://hire.revma.com.au'}/m/${qrTarget}`;

    const pngBuffer = await QRCode.toBuffer(url, { type: 'png', width: 300, margin: 2 });
    res.set('Content-Type', 'image/png');
    res.send(pngBuffer);
  } catch (error) {
    console.error('QR code error:', error);
    res.status(500).json({ detail: 'Failed to generate QR code' });
  }
});

// POST /api/machines/qr/bulk
router.post('/qr/bulk', authenticate, requireStaff, async (req, res) => {
  try {
    const QRCode = require('qrcode');
    const PDFDocument = require('pdfkit');
    const { machine_ids, size = 'medium' } = req.body;

    if (!machine_ids || !Array.isArray(machine_ids) || machine_ids.length === 0) {
      return res.status(400).json({ detail: 'machine_ids array is required' });
    }

    // Size mapping in points (1mm ≈ 2.835 pt)
    const sizeMM = { small: 25, medium: 50, large: 100 };
    const mmPt = (mm) => mm * 2.835;
    const labelSizePt = mmPt(sizeMM[size] || 50);
    const margin = mmPt(5);
    const cols = Math.floor((595 - margin * 2) / (labelSizePt + margin));

    const doc = new PDFDocument({ margin, size: 'A4' });
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'attachment; filename="qr-labels.pdf"');
    doc.pipe(res);

    const frontendUrl = process.env.FRONTEND_URL || 'https://hire.revma.com.au';

    for (let i = 0; i < machine_ids.length; i++) {
      const [rows] = await getPool().query('SELECT * FROM machines WHERE id = ?', [machine_ids[i]]);
      if (rows.length === 0) continue;
      const machine = rows[0];
      const qrTarget = machine.qr_code_id || machine.id;
      const url = `${frontendUrl}/m/${qrTarget}`;

      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * (labelSizePt + margin);
      const y = margin + row * (labelSizePt + margin + 20);

      if (i > 0 && col === 0 && row > 0) {
        // check if we need a new page
        if (y + labelSizePt + 20 > 842 - margin) {
          doc.addPage();
        }
      }

      const pngBuffer = await QRCode.toBuffer(url, { type: 'png', width: Math.floor(labelSizePt), margin: 1 });
      doc.image(pngBuffer, x, y, { width: labelSizePt, height: labelSizePt });
      doc.fontSize(6).text(machine.name, x, y + labelSizePt + 2, { width: labelSizePt, align: 'center' });
    }

    doc.end();
  } catch (error) {
    console.error('QR bulk error:', error);
    res.status(500).json({ detail: 'Failed to generate QR labels' });
  }
});

module.exports = router;
