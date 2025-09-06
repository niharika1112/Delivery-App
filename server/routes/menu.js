const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Menu routes working!'
  });
});

console.log('Menu routes module loaded successfully');
module.exports = router;