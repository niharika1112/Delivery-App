const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get restaurant dashboard overview
// @route   GET /api/restaurant/dashboard
// @access  Private (Restaurant owner)
router.get('/dashboard', protect, authorize('restaurant', 'admin'), async (req, res) => {
  try {
    // Find restaurant owned by this user
    const restaurant = await Restaurant.findOne({ userId: req.user._id });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Dashboard statistics
    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      totalRevenue,
      todayRevenue,
      averageOrderValue,
      topMenuItems,
      recentOrders
    ] = await Promise.all([
      // Total orders
      Order.countDocuments({ restaurant: restaurant._id }),
      
      // Today's orders
      Order.countDocuments({
        restaurant: restaurant._id,
        createdAt: { $gte: startOfDay, $lt: endOfDay }
      }),
      
      // Pending orders (placed, confirmed, preparing)
      Order.countDocuments({
        restaurant: restaurant._id,
        status: { $in: ['placed', 'confirmed', 'preparing'] }
      }),
      
      // Total revenue
      Order.aggregate([
        { $match: { restaurant: restaurant._id, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      
      // Today's revenue
      Order.aggregate([
        {
          $match: {
            restaurant: restaurant._id,
            paymentStatus: 'paid',
            createdAt: { $gte: startOfDay, $lt: endOfDay }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      
      // Average order value
      Order.aggregate([
        { $match: { restaurant: restaurant._id, paymentStatus: 'paid' } },
        { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
      ]),
      
      // Top menu items
      Order.aggregate([
        { $match: { restaurant: restaurant._id } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.menuItem',
            name: { $first: '$items.name' },
            totalOrdered: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        { $sort: { totalOrdered: -1 } },
        { $limit: 5 }
      ]),
      
      // Recent orders
      Order.find({ restaurant: restaurant._id })
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderNumber items totalAmount status createdAt paymentStatus')
    ]);

    // Format the data
    const dashboardData = {
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        rating: restaurant.rating,
        totalOrders: restaurant.totalOrders,
        isActive: restaurant.isActive,
        isAcceptingOrders: restaurant.isAcceptingOrders
      },
      
      statistics: {
        totalOrders,
        todayOrders,
        pendingOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        averageOrderValue: Math.round(averageOrderValue[0]?.avg || 0)
      },
      
      topMenuItems: topMenuItems.map(item => ({
        name: item.name,
        totalOrdered: item.totalOrdered,
        revenue: Math.round(item.revenue)
      })),
      
      recentOrders: recentOrders.map(order => ({
        orderNumber: order.orderNumber,
        customer: order.customer.name,
        items: order.items.length,
        amount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        time: order.createdAt
      })),
      
      quickActions: [
        'View pending orders',
        'Update menu items',
        'Change restaurant status',
        'View analytics'
      ]
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Restaurant dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching restaurant dashboard'
    });
  }
});

// @desc    Get live orders (orders needing attention)
// @route   GET /api/restaurant/live-orders
// @access  Private (Restaurant owner)
router.get('/live-orders', protect, authorize('restaurant', 'admin'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ userId: req.user._id });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Get orders that need attention
    const liveOrders = await Order.find({
      restaurant: restaurant._id,
      status: { $in: ['placed', 'confirmed', 'preparing', 'ready'] }
    })
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(20);

    // Group orders by status
    const ordersByStatus = {
      placed: [],
      confirmed: [],
      preparing: [],
      ready: []
    };

    liveOrders.forEach(order => {
      if (ordersByStatus[order.status]) {
        ordersByStatus[order.status].push({
          _id: order._id,
          orderNumber: order.orderNumber,
          customer: {
            name: order.customer.name,
            phone: order.customer.phone
          },
          items: order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions
          })),
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          specialInstructions: order.specialInstructions,
          estimatedDeliveryTime: order.estimatedDeliveryTime,
          createdAt: order.createdAt,
          timeElapsed: Math.round((new Date() - order.createdAt) / (1000 * 60)) // minutes
        });
      }
    });

    res.json({
      success: true,
      data: {
        summary: {
          total: liveOrders.length,
          placed: ordersByStatus.placed.length,
          confirmed: ordersByStatus.confirmed.length,
          preparing: ordersByStatus.preparing.length,
          ready: ordersByStatus.ready.length
        },
        orders: ordersByStatus,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Live orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching live orders'
    });
  }
});

// @desc    Update restaurant settings
// @route   PUT /api/restaurant/settings
// @access  Private (Restaurant owner)
router.put('/settings', protect, authorize('restaurant', 'admin'), async (req, res) => {
  try {
    const {
      isAcceptingOrders,
      deliveryFee,
      minimumOrder,
      estimatedDeliveryTime,
      operatingHours
    } = req.body;

    const restaurant = await Restaurant.findOne({ userId: req.user._id });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Update settings
    if (isAcceptingOrders !== undefined) restaurant.isAcceptingOrders = isAcceptingOrders;
    if (deliveryFee !== undefined) restaurant.deliveryFee = deliveryFee;
    if (minimumOrder !== undefined) restaurant.minimumOrder = minimumOrder;
    if (estimatedDeliveryTime !== undefined) restaurant.estimatedDeliveryTime = estimatedDeliveryTime;
    if (operatingHours) restaurant.operatingHours = operatingHours;

    await restaurant.save();

    res.json({
      success: true,
      message: 'Restaurant settings updated successfully',
      data: {
        isAcceptingOrders: restaurant.isAcceptingOrders,
        deliveryFee: restaurant.deliveryFee,
        minimumOrder: restaurant.minimumOrder,
        estimatedDeliveryTime: restaurant.estimatedDeliveryTime
      }
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating restaurant settings'
    });
  }
});

// @desc    Get revenue analytics
// @route   GET /api/restaurant/analytics
// @access  Private (Restaurant owner)
router.get('/analytics', protect, authorize('restaurant', 'admin'), async (req, res) => {
  try {
    const { period = '7days' } = req.query; // 7days, 30days, 90days
    
    const restaurant = await Restaurant.findOne({ userId: req.user._id });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default: // 7days
        startDate.setDate(endDate.getDate() - 7);
    }

    // Revenue by day
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          restaurant: restaurant._id,
          paymentStatus: 'paid',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Popular items
    const popularItems = await Order.aggregate([
      {
        $match: {
          restaurant: restaurant._id,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalOrdered: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 10 }
    ]);

    // Peak hours analysis
    const peakHours = await Order.aggregate([
      {
        $match: {
          restaurant: restaurant._id,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        period,
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        },
        dailyRevenue,
        popularItems,
        peakHours,
        summary: {
          totalRevenue: dailyRevenue.reduce((sum, day) => sum + day.revenue, 0),
          totalOrders: dailyRevenue.reduce((sum, day) => sum + day.orders, 0),
          avgDailyRevenue: Math.round(dailyRevenue.reduce((sum, day) => sum + day.revenue, 0) / dailyRevenue.length || 0),
          avgOrderValue: Math.round(dailyRevenue.reduce((sum, day) => sum + day.avgOrderValue, 0) / dailyRevenue.length || 0)
        }
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics'
    });
  }
});

// @desc    Bulk update order status
// @route   PUT /api/restaurant/orders/bulk-update
// @access  Private (Restaurant owner)
router.put('/orders/bulk-update', protect, authorize('restaurant', 'admin'), async (req, res) => {
  try {
    const { orderIds, status, message } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || !status) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array and status are required'
      });
    }

    const restaurant = await Restaurant.findOne({ userId: req.user._id });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Update multiple orders
    const updateResult = await Order.updateMany(
      {
        _id: { $in: orderIds },
        restaurant: restaurant._id
      },
      {
        $set: { status },
        $push: {
          tracking: {
            status,
            message: message || `Bulk updated to ${status}`,
            updatedBy: req.user._id,
            timestamp: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      message: `${updateResult.modifiedCount} orders updated successfully`,
      data: {
        updatedCount: updateResult.modifiedCount,
        newStatus: status
      }
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating orders'
    });
  }
});

// @desc    Create new restaurant (Restaurant owners only)
// @route   POST /api/restaurants
// @access  Private
router.post('/', protect, authorize('restaurant', 'admin'), async (req, res) => {
  try {
    const {
      name,
      description,
      cuisineTypes,
      address,
      longitude,
      latitude,
      fssaiNumber,
      gstNumber,
      deliveryRadius,
      minimumOrder,
      deliveryFee,
      estimatedDeliveryTime
    } = req.body;

    console.log('Creating restaurant for user:', req.user.name);

    // Validation
    if (!name || !description || !cuisineTypes || !address || !longitude || !latitude || !fssaiNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, description, cuisineTypes, address, coordinates, fssaiNumber'
      });
    }

    // Check if user already has a restaurant
    const existingRestaurant = await Restaurant.findOne({ userId: req.user._id });
    if (existingRestaurant) {
      return res.status(400).json({
        success: false,
        message: 'You already have a restaurant registered',
        data: {
          restaurantId: existingRestaurant._id,
          restaurantName: existingRestaurant.name
        }
      });
    }

    const restaurant = await Restaurant.create({
      userId: req.user._id,
      name,
      description,
      cuisineTypes,
      address,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      license: {
        fssaiNumber,
        gstNumber
      },
      deliveryRadius: deliveryRadius || 5,
      minimumOrder: minimumOrder || 100,
      deliveryFee: deliveryFee || 30,
      estimatedDeliveryTime: estimatedDeliveryTime || 30,
      isActive: true, // Auto-approve for testing
      isAcceptingOrders: true
    });

    console.log('Restaurant created:', restaurant._id);

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully!',
      data: restaurant,
      nextSteps: [
        'Add menu items to your restaurant',
        'Access your dashboard at GET /api/restaurant/dashboard',
        'Start receiving orders!'
      ]
    });

  } catch (error) {
    console.error('Create restaurant error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages[0]
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating restaurant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

console.log('Restaurant dashboard routes loaded successfully');
module.exports = router;