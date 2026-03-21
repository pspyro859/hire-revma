const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');
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
  const { password_hash, ...rest } = user;
  return rest;
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, company_name, abn, drivers_licence, address } = req.body;

    // Check if user exists
    const [existing] = await getPool().query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ detail: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    await getPool().query('INSERT INTO users SET ?', [{
      id: userId,
      email,
      password_hash,
      full_name,
      phone: phone || null,
      role: 'customer',
      company_name: company_name || null,
      abn: abn || null,
      drivers_licence: drivers_licence || null,
      address: address || null
    }]);

    const [rows] = await getPool().query(
      'SELECT id, email, full_name, phone, role, company_name, abn, drivers_licence, address, created_at FROM users WHERE id = ?',
      [userId]
    );
    const user = rows[0];

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
    const [rows] = await getPool().query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }
    const user = rows[0];

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
    // Accept both body and query params (for legacy compatibility)
    const source = Object.keys(req.body).length > 0 ? req.body : req.query;
    const { full_name, phone, company_name, abn, drivers_licence, address } = source;
    
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (company_name !== undefined) updateData.company_name = company_name;
    if (abn !== undefined) updateData.abn = abn;
    if (drivers_licence !== undefined) updateData.drivers_licence = drivers_licence;
    if (address !== undefined) updateData.address = address;

    if (Object.keys(updateData).length > 0) {
      const setClauses = Object.keys(updateData).map(k => `\`${k}\` = ?`).join(', ');
      await getPool().query(
        `UPDATE users SET ${setClauses} WHERE id = ?`,
        [...Object.values(updateData), req.user.id]
      );
    }

    const [rows] = await getPool().query(
      'SELECT id, email, full_name, phone, role, company_name, abn, drivers_licence, address, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(formatUserResponse(rows[0]));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ detail: 'Failed to update profile' });
  }
});

module.exports = router;
