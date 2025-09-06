// File: server/routes/orders.js (Replace your current orders.js with this)
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// ============================================================================
// TEST ROUTES FIRST
// ============================================================================

// Simple test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Order routes are working!',
    availableEndpoints: [
      'POST /api/orders/setup-test-data',
      'POST /api/orders',
      'GET /api/orders',
      'GET /api/orders/:id',
      'PUT /api/orders/:id/status'
    ]
  });
});

// ============================================================================
// TEST DATA CREATION (DO THIS FIRST)
// ============================================================================

router.post('/setup-test-data', protect, async (req, res) => {
  try {
    console.log('Setting up test data for user:', req.user.name);

    // Check if test restaurant already exists
    const existingRestaurant = await Restaurant.findOne({ name: 'DesiEats Test Restaurant' });
    if (existingRestaurant) {
      // Get menu items for existing restaurant
      const menuItems = await MenuItem.find({ restaurantId: existingRestaurant._id });
      
      return res.json({
        success: true,
        message: 'Test data already exists - ready to use!',
        data: {
          restaurant: {
            _id: existingRestaurant._id,
            name: existingRestaurant.name,
            address: existingRestaurant.address
          },
          menuItems: menuItems.map(item => ({
            _id: item._id,
            name: item.name,
            price: item.price,
            category: item.category
          })),
          instructions: {
            step1: 'Copy the restaurant _id above',
            step2: 'Copy any menu item _id above',
            step3: 'Use these in your order request'
          }
        }
      });
    }

    // Create test restaurant
    const restaurant = await Restaurant.create({
      userId: req.user._id,
      name: 'DesiEats Test Restaurant',
      description: 'A test restaurant for trying DesiEats orders',
      cuisineTypes: ['North Indian', 'Chinese', 'Fast Food'],
      address: {
        street: 'Sector 14, Near City Center',
        city: 'Sonipat',
        state: 'Haryana',
        pincode: '131001',
        landmark: 'Opposite Metro Station'
      },
      location: {
        type: 'Point',
        coordinates: [77.0077, 28.9931] // Sonipat coordinates
      },
      license: {
        fssaiNumber: '12345678901234',
        gstNumber: 'GST123456789'
      },
      isActive: true,
      isAcceptingOrders: true,
      deliveryFee: 30,
      minimumOrder: 100,
      deliveryRadius: 10,
      estimatedDeliveryTime: 25,
      operatingHours: [
        { day: 'monday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
        { day: 'tuesday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
        { day: 'wednesday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
        { day: 'thursday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
        { day: 'friday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
        { day: 'saturday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
        { day: 'sunday', isOpen: true, openTime: '09:00', closeTime: '23:00' }
      ]
    });

    console.log('Restaurant created:', restaurant._id);

    // Create test menu items
    const menuItemsData = [
      {
        restaurantId: restaurant._id,
        name: 'Butter Chicken',
        description: 'Creamy tomato-based chicken curry with aromatic spices',
        price: 280,
        category: 'Main Course',
        cuisineType: 'North Indian',
        isVeg: false,
        spiceLevel: 3,
        preparationTime: 20,
        isAvailable: true,
        tags: ['popular', 'creamy', 'mild-spicy']
      },
      {
        restaurantId: restaurant._id,
        name: 'Dal Makhani',
        description: 'Rich and creamy black lentils cooked with butter and cream',
        price: 200,
        category: 'Main Course',
        cuisineType: 'North Indian',
        isVeg: true,
        spiceLevel: 2,
        preparationTime: 15,
        isAvailable: true,
        tags: ['vegetarian', 'creamy', 'healthy']
      },
      {
        restaurantId: restaurant._id,
        name: 'Chicken Biryani',
        description: 'Fragrant basmati rice cooked with marinated chicken and spices',
        price: 320,
        category: 'Rice & Biryani',
        cuisineType: 'North Indian',
        isVeg: false,
        spiceLevel: 4,
        preparationTime: 25,
        isAvailable: true,
        tags: ['popular', 'spicy', 'aromatic']
      },
      {
        restaurantId: restaurant._id,
        name: 'Veg Hakka Noodles',
        description: 'Stir-fried noodles with fresh vegetables and soy sauce',
        price: 180,
        category: 'Main Course',
        cuisineType: 'Chinese',
        isVeg: true,
        spiceLevel: 2,
        preparationTime: 12,
        isAvailable: true,
        tags: ['vegetarian', 'quick', 'healthy']
      },
      {
        restaurantId: restaurant._id,
        name: 'Chicken Fried Rice',
        description: 'Wok-tossed rice with chicken pieces and vegetables',
        price: 220,
        category: 'Rice & Biryani',
        cuisineType: 'Chinese',
        isVeg: false,
        spiceLevel: 2,
        preparationTime: 15,
        isAvailable: true,
        tags: ['filling', 'comfort-food']
      },
      {
        restaurantId: restaurant._id,
        name: 'Masala Dosa',
        description: 'Crispy crepe filled with spiced potato curry, served with chutney',
        price: 120,
        category: 'Snacks',
        cuisineType: 'South Indian',
        isVeg: true,
        spiceLevel: 2,
        preparationTime: 10,
        isAvailable: true,
        tags: ['crispy', 'light', 'traditional']
      }
    ];

    const menuItems = await MenuItem.insertMany(menuItemsData);
    console.log('Menu items created:', menuItems.length);

    res.status(201).json({
      success: true,
      message: 'Test restaurant and menu created successfully!',
      data: {
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name,
          address: restaurant.address,
          deliveryFee: restaurant.deliveryFee,
          minimumOrder: restaurant.minimumOrder
        },
        menuItems: menuItems.map(item => ({
          _id: item._id,
          name: item.name,
          price: item.price,
          category: item.category,
          isVeg: item.isVeg
        })),
        nextSteps: {
          step1: 'Copy the restaurant _id above',
          step2: 'Copy menu item _ids you want to order',
          step3: 'Use POST /api/orders to place an order',
          exampleOrder: {
            restaurantId: restaurant._id,
            items: [
              { menuItem: menuItems[0]._id, quantity: 1 },
              { menuItem: menuItems[1]._id, quantity: 2 }
            ]
          }
        }
      }
    });

  } catch (error) {
    console.error('Setup test data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up test data',
      error: error.message
    });
  }
});

// ============================================================================
// CORE ORDER MANAGEMENT
// ============================================================================

// Place a new order
router.post('/', protect, async (req, res) => {
  try {
    const {
      restaurantId,
      items,
      deliveryAddress,
      paymentMethod = 'cod',
      specialInstructions
    } = req.body;

    console.log('Order placement by:', req.user.name, 'for restaurant:', restaurantId);

    // Basic validation
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant ID is required'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required and cannot be empty'
      });
    }

    // Default delivery address if not provided (for testing)
    const defaultAddress = {
      street: deliveryAddress?.street || 'Test Street, Sector 15',
      city: deliveryAddress?.city || 'Sonipat',
      state: deliveryAddress?.state || 'Haryana',
      pincode: deliveryAddress?.pincode || '131001',
      landmark: deliveryAddress?.landmark || 'Near Test Location',
      contactPhone: deliveryAddress?.contactPhone || req.user.phone || '9999999999'
    };

    // Check restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    if (!restaurant.isActive || !restaurant.isAcceptingOrders) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant is currently not accepting orders'
      });
    }

    // Process order items
    let orderItems = [];
    let itemsTotal = 0;
    let maxPreparationTime = 0;

    for (let item of items) {
      if (!item.menuItem || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have menuItem ID and quantity >= 1'
        });
      }

      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item not found: ${item.menuItem}`
        });
      }

      if (!menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `${menuItem.name} is currently not available`
        });
      }

      if (menuItem.restaurantId.toString() !== restaurantId) {
        return res.status(400).json({
          success: false,
          message: `${menuItem.name} does not belong to this restaurant`
        });
      }

      const itemPrice = menuItem.discountedPrice || menuItem.price;
      const totalItemPrice = itemPrice * item.quantity;
      itemsTotal += totalItemPrice;
      maxPreparationTime = Math.max(maxPreparationTime, menuItem.preparationTime || 15);

      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: itemPrice,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || ''
      });
    }

    // Check minimum order
    if (itemsTotal < restaurant.minimumOrder) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ₹${restaurant.minimumOrder}. Current total: ₹${itemsTotal}`
      });
    }

    // Calculate totals
    const deliveryFee = restaurant.deliveryFee || 30;
    const taxes = Math.round(itemsTotal * 0.05); // 5% tax
    const totalAmount = itemsTotal + deliveryFee + taxes;

    // Estimated delivery time
    const estimatedDeliveryTime = new Date();
    estimatedDeliveryTime.setMinutes(
      estimatedDeliveryTime.getMinutes() + 
      maxPreparationTime + 
      (restaurant.estimatedDeliveryTime || 30)
    );

    // Create order
    const order = await Order.create({
      customer: req.user._id,
      restaurant: restaurantId,
      items: orderItems,
      itemsTotal: Math.round(itemsTotal),
      deliveryFee,
      taxes,
      totalAmount: Math.round(totalAmount),
      deliveryAddress: defaultAddress,
      paymentMethod,
      specialInstructions: specialInstructions || '',
      estimatedDeliveryTime,
      preparationTime: maxPreparationTime,
      status: 'placed',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      tracking: [{
        status: 'placed',
        message: 'Order placed successfully',
        updatedBy: req.user._id,
        timestamp: new Date()
      }]
    });

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name phone email')
      .populate('restaurant', 'name address phone')
      .populate('items.menuItem', 'name images category');

    console.log('Order created successfully:', order.orderNumber);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: populatedOrder,
      orderSummary: {
        orderNumber: order.orderNumber,
        itemsTotal: `₹${itemsTotal}`,
        deliveryFee: `₹${deliveryFee}`,
        taxes: `₹${taxes}`,
        totalAmount: `₹${totalAmount}`,
        estimatedDelivery: estimatedDeliveryTime.toLocaleString('en-IN'),
        paymentMethod: paymentMethod.toUpperCase()
      }
    });

  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error placing order',
      error: error.message
    });
  }
});

// Get user orders
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = { customer: req.user._id };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('restaurant', 'name address phone images rating')
      .populate('items.menuItem', 'name images category')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: orders
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

// Get single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone email')
      .populate('restaurant', 'name address phone images rating')
      .populate('items.menuItem', 'name images price category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check access permission
    if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order'
    });
  }
});

// Update order status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, message } = req.body;

    const validStatuses = ['confirmed', 'preparing', 'ready', 'picked-up', 'out-for-delivery', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        validStatuses
      });
    }

    const order = await Order.findById(req.params.id).populate('restaurant');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check permissions (for now, allow any authenticated user for testing)
    // In production, you'd check restaurant ownership, etc.

    // Update order
    order.status = status;
    order.tracking.push({
      status,
      message: message || `Order ${status}`,
      updatedBy: req.user._id,
      timestamp: new Date()
    });

    if (status === 'delivered') {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        tracking: order.tracking
      }
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
});

console.log('Complete order management system loaded successfully');
module.exports = router;