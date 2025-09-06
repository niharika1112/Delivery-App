
const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Restaurant routes working!'
  });
});

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Get restaurants route working!',
    data: []
  });
});

console.log('Restaurant routes module loaded successfully');
module.exports = router;