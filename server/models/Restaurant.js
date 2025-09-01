const mongoose = require('mongoose');

const OperatingHoursSchema = new mongoose.Schema({
  day: { 
    type: String, 
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true 
  },
  isOpen: { type: Boolean, default: true },
  openTime: { type: String, required: true }, // "09:00"
  closeTime: { type: String, required: true } // "22:00"
});

const RestaurantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true,
    maxlength: [100, 'Restaurant name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  cuisineTypes: [{
    type: String,
    enum: [
      'North Indian', 'South Indian', 'Chinese', 'Italian', 'Continental',
      'Punjabi', 'Gujarati', 'Rajasthani', 'Bengali', 'Maharashtrian',
      'Street Food', 'Fast Food', 'Desserts', 'Beverages', 'Bakery',
      'Haryanvi', 'Delhi Special', 'Mughlai', 'Tandoor', 'Biryani'
    ],
    required: true
  }],
  
  // Location details
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: String
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  
  // Restaurant details
  images: [String], // Cloudinary URLs
  coverImage: String,
  license: {
    fssaiNumber: { type: String, required: true },
    gstNumber: String
  },
  
  // Operational details
  isActive: { type: Boolean, default: false }, // Admin approval required
  isAcceptingOrders: { type: Boolean, default: true },
  operatingHours: [OperatingHoursSchema],
  
  // Delivery settings
  deliveryRadius: { type: Number, default: 5 }, // in kilometers
  minimumOrder: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 30 },
  estimatedDeliveryTime: { type: Number, default: 30 }, // in minutes
  
  // Performance metrics
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  isPromoted: { type: Boolean, default: false }, // For featured restaurants
  
  // Financial
  commissionRate: { type: Number, default: 20 }, // Percentage
  totalEarnings: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
RestaurantSchema.index({ location: "2dsphere" });
RestaurantSchema.index({ cuisineTypes: 1 });
RestaurantSchema.index({ rating: -1 });
RestaurantSchema.index({ isActive: 1, isAcceptingOrders: 1 });

module.exports = mongoose.model('Restaurant', RestaurantSchema);