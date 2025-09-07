const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

// For now, we'll simulate Razorpay - you can add real integration later
// Real Razorpay setup requires API keys and webhook verification

// @desc    Create payment order (Razorpay simulation)
// @route   POST /api/payments/create-order
// @access  Private
router.post('/create-order', protect, async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and amount are required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId).populate('customer').populate('restaurant');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this order'
      });
    }

    // Verify amount matches
    if (parseInt(amount) !== order.totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Amount mismatch'
      });
    }

    // Simulate Razorpay order creation
    const paymentOrder = {
      id: `order_${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      entity: 'order',
      amount: amount * 100, // Razorpay uses paise
      amount_paid: 0,
      amount_due: amount * 100,
      currency: 'INR',
      receipt: order.orderNumber,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000),
      notes: {
        orderId: order._id,
        customerName: order.customer.name,
        restaurantName: order.restaurant.name
      }
    };

    // Update order with payment details
    order.paymentId = paymentOrder.id;
    await order.save();

    res.json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        paymentOrder,
        orderDetails: {
          orderNumber: order.orderNumber,
          amount: order.totalAmount,
          customerName: order.customer.name,
          restaurantName: order.restaurant.name
        },
        paymentMethods: ['card', 'netbanking', 'upi', 'wallet'],
        instructions: 'In production, integrate with Razorpay SDK for actual payment processing'
      }
    });

  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order'
    });
  }
});

// @desc    Verify payment (simulate success)
// @route   POST /api/payments/verify
// @access  Private
router.post('/verify', protect, async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and payment ID are required'
      });
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Simulate successful payment verification
    // In production, verify with Razorpay webhook/API
    
    order.paymentStatus = 'paid';
    order.paymentId = paymentId;
    order.status = 'confirmed'; // Auto-confirm paid orders
    
    order.tracking.push({
      status: 'payment_confirmed',
      message: 'Payment successful - Order confirmed',
      updatedBy: req.user._id,
      timestamp: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderNumber: order.orderNumber,
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        message: 'Your order has been confirmed and will be prepared soon!'
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
});

// @desc    Handle failed payment
// @route   POST /api/payments/failed
// @access  Private
router.post('/failed', protect, async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.paymentStatus = 'failed';
    order.tracking.push({
      status: 'payment_failed',
      message: `Payment failed: ${reason || 'Unknown error'}`,
      updatedBy: req.user._id,
      timestamp: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: 'Payment failure recorded',
      data: {
        orderNumber: order.orderNumber,
        paymentStatus: 'failed',
        nextSteps: 'Customer can retry payment or choose COD'
      }
    });

  } catch (error) {
    console.error('Payment failure handling error:', error);
    res.status(500).json({
      success: false,
      message: 'Error handling payment failure'
    });
  }
});

console.log('Payment integration routes loaded successfully');
module.exports = router;
