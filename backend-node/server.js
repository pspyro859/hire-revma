// Environment Configuration
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth');
const machineRoutes = require('./routes/machines');
const agreementRoutes = require('./routes/agreements');
const inquiryRoutes = require('./routes/inquiries');
const quoteRoutes = require('./routes/quotes');
const termsRoutes = require('./routes/terms');
const userRoutes = require('./routes/users');
const seedRoutes = require('./routes/seed');
const prestartRoutes = require('./routes/prestart');
const maintenanceRoutes = require('./routes/maintenance');
const publicRoutes = require('./routes/public');

// Import database connection
const { connectDB } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 8001;

// Create upload directories
const uploadDirs = [
  'uploads',
  'uploads/photos',
  'uploads/signatures',
  'uploads/pdfs',
  'uploads/id_documents'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS === '*' ? '*' : process.env.CORS_ORIGINS?.split(','),
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads
app.use('/api/photos', express.static(path.join(__dirname, 'uploads/photos')));
app.use('/api/signatures', express.static(path.join(__dirname, 'uploads/signatures')));
app.use('/api/id-documents', express.static(path.join(__dirname, 'uploads/id_documents')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/customer', quoteRoutes); // Customer quote access routes
app.use('/api/terms', termsRoutes);
app.use('/api/users', userRoutes);
app.use('/api', seedRoutes);
app.use('/api/prestart', prestartRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), db: 'mysql' });
});

// Root route
app.get('/api/', (req, res) => {
  res.json({ 
    message: 'Revma Heavy Equipment Hire API', 
    version: '2.0.0',
    docs: '/api/health'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Database: MySQL');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
