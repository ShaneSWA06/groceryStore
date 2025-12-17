const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'grocery-store-secret-key-change-in-production';

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Middleware to check if user is admin or cashier
function requireCashierOrAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'cashier') {
    return res.status(403).json({ error: 'Cashier or Admin access required' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireCashierOrAdmin,
  JWT_SECRET
};

