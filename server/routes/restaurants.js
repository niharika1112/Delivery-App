const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all restaurants (with filters)
// @route   GET /api/restaurants
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      cuisineType, 
      city, 
      latitude, 
      longitude, 
      radius = 10, 
      minRating = 0,
      sortBy = 'rating',
      page = 1,
      limit = 12
    } = req.query;

    // Build query
    let query = { isActive: true, isAcceptingOrders: true };
    
    // Filter by cuisine type
    if (cuisineType) {
      query.cuisineTypes = { $in: [cuisineType] };
    }
    
    // Filter by city
    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }
    
    // Filter by rating
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Location-based search
    if (latitude && longitude) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    }

    // Sorting options
    let sortOptions = {};
    switch (sortBy) {
      case 'rating':
        sortOptions = { rating: -1 };
        break;
      case 'deliveryTime':
        sortOptions = { estimatedDeliveryTime: 1 };
        break;
      case 'deliveryFee':
        sortOptions = { deliveryFee: 1 };
        break;
      default:
        sortOptions = { rating: -1 };
    }

    // Pagination
    const skip = (page - 1) * limit;

    const restaurants = await Restaurant.find(query)
      .populate('userId', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Restaurant.countDocuments(query);

    res.json({
      success: true,
      count: restaurants.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: restaurants
    });

  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching restaurants'
    });
  }
});

// @desc    Get single restaurant with menu
// @route   GET /api/restaurants/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('userId', 'name email phone');

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Get restaurant's menu items
    const menuItems = await MenuItem.find({ 
      restaurantId: req.params.id,
      isAvailable: true 
    }).sort({ category: 1, name: 1 });

    // Group menu items by category
    const menuByCategory = menuItems.reduce((acc, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        restaurant,
        menu: menuByCategory,
        totalMenuItems: menuItems.length
      }
    });

  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching restaurant details'
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
      images,
      fssaiNumber,
      gstNumber,
      operatingHours,
      deliveryRadius,
      minimumOrder,
      deliveryFee,
      estimatedDeliveryTime
    } = req.body;

    // Validation
    if (!name || !description || !cuisineTypes || !address || !longitude || !latitude || !fssaiNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user already has a restaurant
    const existingRestaurant = await Restaurant.findOne({ userId: req.user._id });
    if (existingRestaurant) {
      return res.status(400).json({
        success: false,
        message: 'You already have a restaurant registered'
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
      images: images || [],
      license: {
        fssaiNumber,
        gstNumber
      },
      operatingHours: operatingHours || [],
      deliveryRadius: deliveryRadius || 5,
      minimumOrder: minimumOrder || 0,
      deliveryFee: deliveryFee || 30,
      estimatedDeliveryTime: estimatedDeliveryTime || 30
    });

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully. Pending admin approval.',
      data: restaurant
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
      message: 'Error creating restaurant'
    });
  }
});

// @desc    Search restaurants
// @route   GET /api/restaurants/search
// @access  Public  
router.get('/search/query', async (req, res) => {
  try {
    const { q, latitude, longitude, radius = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let query = {
      isActive: true,
      isAcceptingOrders: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { cuisineTypes: { $in: [new RegExp(q, 'i')] } }
      ]
    };

    // Location-based search if coordinates provided
    if (latitude && longitude) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000
        }
      };
    }

    const restaurants = await Restaurant.find(query)
      .populate('userId', 'name')
      .sort({ rating: -1 })
      .limit(20);

    // Also search menu items
    const menuItems = await MenuItem.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ],
      isAvailable: true
    }).populate('restaurantId', 'name address rating isActive')
      .limit(10);

    // Filter menu items to only include active restaurants
    const validMenuItems = menuItems.filter(item => 
      item.restaurantId && item.restaurantId.isActive
    );

    res.json({
      success: true,
      data: {
        restaurants,
        menuItems: validMenuItems,
        total: restaurants.length + validMenuItems.length
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search'
    });
  }
});

module.exports = router;