const express = require('express');
const router = express.Router();

// Simple test route first
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Simple register route (no database for now, just testing)
router.post('/register', (req, res) => {
  console.log('Register route hit!');
  console.log('Request body:', req.body);
  
  res.json({
    success: true,
    message: 'Register route is working!',
    receivedData: req.body
  });
});

// Simple login route
router.post('/login', (req, res) => {
  console.log('Login route hit!');
  console.log('Request body:', req.body);
  
  res.json({
    success: true,
    message: 'Login route is working!',
    receivedData: req.body
  });
});

console.log('Auth routes module loaded successfully');
module.exports = router;