const express = require('express');
const { User } = require('../models');
const { authenticate, requireStaff, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Format user response (exclude password)
const formatUserResponse = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  const { password_hash, _id, __v, ...rest } = userObj;
  return rest;
};

// GET /api/users (Staff only)
router.get('/', authenticate, requireStaff, async (req, res) => {
  try {
    const { role } = req.query;
    
    const query = {};
    if (role) query.role = role;

    const users = await User.find(query).select('-password_hash -_id -__v');
    res.json(users.map(u => formatUserResponse(u)));
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

    const result = await User.updateOne(
      { id: req.params.id },
      { $set: { role } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ detail: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ detail: 'Failed to update user role' });
  }
});

module.exports = router;
