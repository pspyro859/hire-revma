const express = require('express');
const { getPool } = require('../config/database');

const router = express.Router();

const parseJSON = (val) => {
  if (!val) return val;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
};

// GET /api/public/machine/:qrCodeId
// Accepts both qr_code_id and machine UUID
router.get('/machine/:qrCodeId', async (req, res) => {
  try {
    const { qrCodeId } = req.params;

    // Try qr_code_id first, then id
    let [rows] = await getPool().query(
      'SELECT * FROM machines WHERE qr_code_id = ? OR id = ?',
      [qrCodeId, qrCodeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ detail: 'Machine not found' });
    }
    const machine = { ...rows[0], specifications: parseJSON(rows[0].specifications) };

    // Get documents
    const [documents] = await getPool().query(
      'SELECT * FROM machine_documents WHERE machine_id = ? ORDER BY doc_type',
      [machine.id]
    );

    // Get prestart template (universal items)
    const [template] = await getPool().query(
      `SELECT * FROM prestart_checklist_templates 
       WHERE (machine_id = ? OR machine_id IS NULL) AND is_active = 1
       ORDER BY category, item_order`,
      [machine.id]
    );

    res.json({
      machine,
      documents,
      prestart_template: template
    });
  } catch (error) {
    console.error('Get public machine error:', error);
    res.status(500).json({ detail: 'Failed to get machine' });
  }
});

module.exports = router;
