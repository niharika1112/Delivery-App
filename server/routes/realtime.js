const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Test real-time notification
router.post('/test-notification', protect, (req, res) => {
  const { type = 'broadcast', targetId, message } = req.body || {};
  const io = req.app.get('io');

  if (!io) {
    return res.status(500).json({
      success: false,
      message: 'WebSocket server not available'
    });
  }

  try {
    // Send test notification
    io.emit('test-notification', {
      message: message || 'Test notification from DesiEats Real-Time System!',
      timestamp: new Date(),
      type: type,
      from: 'DesiEats Server'
    });

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: {
        type: type,
        message: message || 'Test notification from DesiEats Real-Time System!',
        connectedClients: io.engine.clientsCount,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notification',
      error: error.message
    });
  }
});

// Get real-time stats
router.get('/stats', protect, (req, res) => {
  try {
    const io = req.app.get('io');

    res.json({
      success: true,
      data: {
        connectedClients: io ? io.engine.clientsCount : 0,
        serverUptime: Math.round(process.uptime()),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date(),
        websocketStatus: io ? 'Active' : 'Inactive',
        features: [
          'Real-time order notifications',
          'Live order status updates', 
          'Restaurant dashboard live updates',
          'Customer order tracking',
          'Broadcast notifications'
        ]
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
});

// Simple test endpoint (no auth required)
router.get('/test', (req, res) => {
  const io = req.app.get('io');
  
  res.json({
    success: true,
    message: 'Real-time routes are working!',
    websocketStatus: io ? 'Active' : 'Inactive',
    connectedClients: io ? io.engine.clientsCount : 0,
    timestamp: new Date()
  });
});

console.log('Real-time testing routes loaded successfully');
module.exports = router;