const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Create JWT token
const createToken = (userId, email, role) => {
  return jwt.sign(
    { sub: userId, email, role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Format user response (exclude password)
const formatUserResponse = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  const { password_hash, _id, __v, ...rest } = userObj;
  return rest;
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, role, company_name, abn, drivers_licence, address } = req.body;

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ detail: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    const user = new User({
      id: userId,
      email,
      password_hash,
      full_name,
      phone,
      role: role === 'customer' ? 'customer' : 'customer', // Only allow customer registration
      company_name,
      abn,
      drivers_licence,
      address,
      created_at: new Date().toISOString()
    });

    await user.save();

    // Create token
    const token = createToken(userId, email, user.role);

    res.json({
      access_token: token,
      token_type: 'bearer',
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ detail: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    // Create token
    const token = createToken(user.id, user.email, user.role);

    res.json({
      access_token: token,
      token_type: 'bearer',
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json(formatUserResponse(req.user));
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ detail: 'Failed to get user' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { full_name, phone, company_name, abn, drivers_licence, address } = req.body;
    
    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (phone) updateData.phone = phone;
    if (company_name) updateData.company_name = company_name;
    if (abn) updateData.abn = abn;
    if (drivers_licence) updateData.drivers_licence = drivers_licence;
    if (address) updateData.address = address;

    if (Object.keys(updateData).length > 0) {
      await User.updateOne({ id: req.user.id }, { $set: updateData });
    }

    const user = await User.findOne({ id: req.user.id });
    res.json(formatUserResponse(user));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ detail: 'Failed to update profile' });
  }
});

module.exports = router;
