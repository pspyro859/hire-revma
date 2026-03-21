const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'revma-hire-secret-key-change-in-production';

// Fetch user from MySQL by id
const getUserById = async (id) => {
  const [rows] = await getPool().query(
    'SELECT id, email, full_name, phone, role, company_name, abn, drivers_licence, address, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

// Verify JWT token middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await getUserById(decoded.sub);
    if (!user) {
      return res.status(401).json({ detail: 'User not found' });
    }

    req.user = user;
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
      const user = await getUserById(decoded.sub);
      if (user) {
        req.user = user;
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
