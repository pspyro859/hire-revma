const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { getDBType } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'revma-hire-secret-key-change-in-production';

// Verify JWT token middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const user = await User.findOne({ id: decoded.sub }).select('-password_hash -_id -__v');
    if (!user) {
      return res.status(401).json({ detail: 'User not found' });
    }

    req.user = user.toObject ? user.toObject() : user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ detail: 'Token expired' });
    }
    return res.status(401).json({ detail: 'Invalid token' });
  }
};

// Require staff role
const requireStaff = (req, res, next) => {
  if (!req.user || !['staff', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Staff access required' });
  }
  next();
};

// Require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Admin access required' });
  }
  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findOne({ id: decoded.sub }).select('-password_hash -_id -__v');
      if (user) {
        req.user = user.toObject ? user.toObject() : user;
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
};

module.exports = {
  authenticate,
  requireStaff,
  requireAdmin,
  optionalAuth,
  JWT_SECRET
};
