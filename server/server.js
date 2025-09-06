const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// Basic routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DesiEats API is running!',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Health check passed',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Test route to verify server is working
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API test route working',
    availableRoutes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /api/restaurants',
      'GET /api/menu/restaurant/:id'
    ]
  });
});

// Load routes with error handling
console.log('Loading routes...');

try {
  // Load auth routes
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
  
  // Load restaurant routes  
  const restaurantRoutes = require('./routes/restaurants');
  app.use('/api/restaurants', restaurantRoutes);
  console.log('✅ Restaurant routes loaded');
  
  // Load menu routes
  const menuRoutes = require('./routes/menu');
  app.use('/api/menu', menuRoutes);
  console.log('✅ Menu routes loaded');
  
  // Load order routes (if exists)
  const orderRoutes = require('./routes/orders');
  app.use('/api/orders', orderRoutes);
  console.log('✅ Order routes loaded');
  
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.log('Please check that all route files exist and are properly formatted');
}

// Handle undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/test',
      'POST /api/auth/register',
      'POST /api/auth/login'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global Error:', error);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 DesiEats Server Started!');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
  console.log('=================================');
});

module.exports = app;