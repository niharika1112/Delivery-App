const mongoose = require('mongoose');

const NutritionSchema = new mongoose.Schema({
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  fiber: Number
});

const MenuItemSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [1, 'Price must be at least ₹1']
  },
  discountedPrice: {
    type: Number,
    validate: {
      validator: function(value) {
        return !value || value < this.price;
      },
      message: 'Discounted price must be less than original price'
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Starters', 'Main Course', 'Rice & Biryani', 'Breads', 'Desserts',
      'Beverages', 'Snacks', 'Salads', 'Soups', 'Combos', 'Thali'
    ]
  },
  cuisineType: {
    type: String,
    enum: [
      'North Indian', 'South Indian', 'Chinese', 'Italian', 'Continental',
      'Punjabi', 'Gujarati', 'Rajasthani', 'Bengali', 'Maharashtrian',
      'Street Food', 'Fast Food', 'Desserts', 'Beverages', 'Bakery',
      'Haryanvi', 'Delhi Special', 'Mughlai', 'Tandoor', 'Biryani'
    ],
    required: true
  },
  
  // Dietary information
  isVeg: { type: Boolean, required: true },
  isVegan: { type: Boolean, default: false },
  isGlutenFree: { type: Boolean, default: false },
  isJain: { type: Boolean, default: false },
  
  spiceLevel: { 
    type: Number, 
    min: 1, 
    max: 5, 
    default: 3 
  }, // 1 = Mild, 5 = Very Spicy
  
  images: [String], // Cloudinary URLs
  
  // Availability
  isAvailable: { type: Boolean, default: true },
  availableQuantity: Number, // For limited items
  preparationTime: { type: Number, default: 15 }, // in minutes
  
  // Additional details
  ingredients: [String],
  allergens: [String], // ['nuts', 'dairy', 'gluten']
  tags: [String], // ['popular', 'chef-special', 'healthy', 'spicy']
  nutrition: NutritionSchema,
  
  // Performance metrics
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  
  // Variants (for different sizes/options)
  variants: [{
    name: String, // 'Regular', 'Large', 'Family Pack'
    price: Number,
    description: String
  }],
  
  // Add-ons
  addOns: [{
    name: String, // 'Extra Cheese', 'Extra Spicy'
    price: Number,
    isRequired: { type: Boolean, default: false }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
MenuItemSchema.index({ restaurantId: 1 });
MenuItemSchema.index({ category: 1 });
MenuItemSchema.index({ cuisineType: 1 });
MenuItemSchema.index({ isVeg: 1 });
MenuItemSchema.index({ isAvailable: 1 });
MenuItemSchema.index({ rating: -1 });

module.exports = mongoose.model('MenuItem', MenuItemSchema);