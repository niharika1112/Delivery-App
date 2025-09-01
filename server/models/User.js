const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AddressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  landmark: String,
  addressType: { 
    type: String, 
    enum: ['home', 'work', 'other'], 
    default: 'home' 
  },
  isDefault: { type: Boolean, default: false }
});

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter valid Indian phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['customer', 'restaurant', 'delivery', 'admin'],
    default: 'customer'
  },
  addresses: [AddressSchema],
  profileImage: String,
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Customer specific fields
  preferences: {
    cuisineTypes: [String],
    dietaryRestrictions: [String], // ['veg', 'vegan', 'gluten-free']
    spiceLevel: { type: Number, min: 1, max: 5, default: 3 }
  },
  
  // Delivery partner specific fields
  deliveryPartner: {
    vehicleType: { type: String, enum: ['bike', 'cycle', 'car'] },
    licenseNumber: String,
    aadharNumber: String,
    panNumber: String,
    isApproved: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }
    },
    earnings: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Index for geospatial queries (delivery partner location)
UserSchema.index({ "deliveryPartner.currentLocation": "2dsphere" });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);