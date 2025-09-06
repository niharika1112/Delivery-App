const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Order routes working!'
  });
});

console.log('Order routes module loaded successfully');
module.exports = router;