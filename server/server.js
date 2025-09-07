const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');


// Load environment variables


const app = express();

// Create HTTP server for Socket.io
const server = createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3001',
      process.env.DELIVERY_URL || 'http://localhost:3002'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const realtimeRoutes = require('./routes/realtime');
app.use('/api/realtime', realtimeRoutes);
console.log('✅ Real-time routes loaded');

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// Basic routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DesiEats API with Real-Time Features!',
    version: '2.0.0',
    features: [
      'Real-time order notifications',
      'Live order tracking', 
      'restaurants live dashboard',
      'Customer live updates'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Health check passed',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    websocket: 'Active',
    connectedClients: io.engine.clientsCount
  });
});

// Socket.io Connection Handling
io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  // Handle user joining specific rooms
  socket.on('join-room', (data) => {
    const { userId, role, restaurantsId } = data;
    
    if (role === 'customer') {
      socket.join(`customer-${userId}`);
      console.log(`👤 Customer ${userId} joined their room`);
    } else if (role === 'restaurants') {
      socket.join(`restaurants-${restaurantsId}`);
      console.log(`🏪 restaurants ${restaurantsId} joined their room`);
    } else if (role === 'admin') {
      socket.join('admin-room');
      console.log(`👨‍💼 Admin joined admin room`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

// Load routes
console.log('Loading all routes...');

try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');
  
  const restaurantsRoutes = require('./routes/restaurants');
  app.use('/api/restaurants', restaurantsRoutes);
  console.log('✅ restaurants routes loaded');
  
  const menuRoutes = require('./routes/menu');
  app.use('/api/menu', menuRoutes);
  console.log('✅ Menu routes loaded');
  
  const orderRoutes = require('./routes/orders');
  app.use('/api/orders', orderRoutes);
  console.log('✅ Order routes loaded');

  const paymentRoutes = require('./routes/payment');
  app.use('/api/payment', paymentRoutes);
  console.log('✅ Payment routes loaded');

  const restaurantsDashboardRoutes = require('./routes/restaurants');
  app.use('/api/restaurants', restaurantsDashboardRoutes);
  console.log('✅ restaurants dashboard routes loaded');
  
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
}

// Handle undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
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

// Use server.listen instead of app.listen for Socket.io
server.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 DesiEats Real-Time Server Started!');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log(`⚡ WebSocket: Active`);
  console.log(`📱 Real-Time Features: Enabled`);
  console.log('=================================');
});

module.exports = { app, server, io };