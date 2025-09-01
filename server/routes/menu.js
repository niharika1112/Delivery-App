const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get all menu items for a restaurant
// @route   GET /api/menu/restaurant/:restaurantId
// @access  Public
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const { category, isVeg, minPrice, maxPrice, sortBy = 'name' } = req.query;

    // Build query
    let query = { 
      restaurantId: req.params.restaurantId,
      isAvailable: true 
    };

    // Filters
    if (category) query.category = category;
    if (isVeg !== undefined) query.isVeg = isVeg === 'true';
    if (minPrice) query.price = { $gte: parseFloat(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: parseFloat(maxPrice) };

    // Sorting
    let sortOptions = {};
    switch (sortBy) {
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'rating':
        sortOptions = { rating: -1 };
        break;
      case 'popular':
        sortOptions = { totalOrders: -1 };
        break;
      default:
        sortOptions = { name: 1 };
    }

    const menuItems = await MenuItem.find(query)
      .sort(sortOptions)
      .populate('restaurantId', 'name');

    // Group by category
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
      count: menuItems.length,
      data: menuByCategory
    });

  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching menu items'
    });
  }
});

// @desc    Add new menu item (Restaurant owners only)
// @route   POST /api/menu
// @access  Private
router.post('/', protect, authorize('restaurant', 'admin'), async (req, res) => {
  try {
    const {
      restaurantId,
      name,
      description,
      price,
      category,
      cuisineType,
      isVeg,
      spiceLevel,
      images,
      ingredients,
      preparationTime
    } = req.body;

    // Validation
    if (!restaurantId || !name || !description || !price || !category || !cuisineType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if restaurant exists and user owns it
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    if (restaurant.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add menu items to this restaurant'
      });
    }

    const menuItem = await MenuItem.create({
      restaurantId,
      name,
      description,
      price: parseFloat(price),
      category,
      cuisineType,
      isVeg: isVeg !== undefined ? isVeg : true,
      spiceLevel: spiceLevel || 3,
      images: images || [],
      ingredients: ingredients || [],
      preparationTime: preparationTime || 15
    });

    res.status(201).json({
      success: true,
      message: 'Menu item added successfully',
      data: menuItem
    });

  } catch (error) {
    console.error('Add menu item error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages[0]
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding menu item'
    });
  }
});

// @desc    Update menu item
// @route   PUT /api/menu/:id
// @access  Private
router.put('/:id', protect, authorize('restaurant', 'admin'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id).populate('restaurantId');
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Check ownership
    if (menuItem.restaurantId.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this menu item'
      });
    }

    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: updatedMenuItem
    });

  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating menu item'
    });
  }
});

module.exports = router;