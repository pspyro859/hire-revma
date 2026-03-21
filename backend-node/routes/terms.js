const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/terms (Public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await getPool().query(
      'SELECT * FROM terms WHERE is_active = 1 ORDER BY display_order ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Get terms error:', error);
    res.status(500).json({ detail: 'Failed to get terms' });
  }
});

// POST /api/terms (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { section_name, content, order, is_active } = req.body;

    const id = uuidv4();
    await getPool().query('INSERT INTO terms SET ?', [{
      id,
      section_name,
      content,
      display_order: order || 0,
      is_active: is_active !== false ? 1 : 0
    }]);

    const [rows] = await getPool().query('SELECT * FROM terms WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Create terms error:', error);
    res.status(500).json({ detail: 'Failed to create terms' });
  }
});

// PUT /api/terms/:id (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { section_name, content, order, is_active } = req.body;

    const updateData = {};
    if (section_name !== undefined) updateData.section_name = section_name;
    if (content !== undefined) updateData.content = content;
    if (order !== undefined) updateData.display_order = order;
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;

    if (Object.keys(updateData).length > 0) {
      const setClauses = Object.keys(updateData).map(k => `\`${k}\` = ?`).join(', ');
      const [result] = await getPool().query(
        `UPDATE terms SET ${setClauses} WHERE id = ?`,
        [...Object.values(updateData), req.params.id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ detail: 'Terms section not found' });
      }
    }

    const [rows] = await getPool().query('SELECT * FROM terms WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ detail: 'Terms section not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Update terms error:', error);
    res.status(500).json({ detail: 'Failed to update terms' });
  }
});

// DELETE /api/terms/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [result] = await getPool().query('DELETE FROM terms WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'Terms section not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete terms error:', error);
    res.status(500).json({ detail: 'Failed to delete terms' });
  }
});

module.exports = router;
