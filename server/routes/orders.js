const express = require('express');
const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Order routes loaded successfully!'
  });
});

module.exports = router;