const express = require('express');
const { getPool } = require('../config/database');
const { authenticate, requireStaff, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const formatUserResponse = (user) => {
  const { password_hash, ...rest } = user;
  return rest;
};

// GET /api/users (Staff only)
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { role } = req.query;
    
    let sql = 'SELECT id, email, full_name, phone, role, company_name, abn, drivers_licence, address, created_at FROM users';
    const params = [];
    if (role) {
      sql += ' WHERE role = ?';
      params.push(role);
    }
    sql += ' ORDER BY created_at DESC';

    const [rows] = await getPool().query(sql, params);
    res.json(rows.map(formatUserResponse));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ detail: 'Failed to get users' });
  }
});

// PUT /api/users/:id/role (Admin only)
router.put('/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    
    if (!['customer', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ detail: 'Invalid role' });
    }

    const [result] = await getPool().query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ detail: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ detail: 'Failed to update user role' });
  }
});

module.exports = router;
