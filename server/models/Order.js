const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: String, // Snapshot of item name
  price: Number, // Snapshot of item price
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  variant: String, // If variant was selected
  addOns: [{
    name: String,
    price: Number
  }],
  specialInstructions: String
});

const OrderTrackingSchema = new mongoose.Schema({
  status: String,
  timestamp: { type: Date, default: Date.now },
  message: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // Stakeholders
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Order details
  items: [OrderItemSchema],
  
  // Pricing breakdown
  itemsTotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 },
  taxes: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  // Delivery details
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String,
    contactPhone: String
  },
  
  // Order status
  status: {
    type: String,
    enum: [
      'placed',        // Order placed by customer
      'confirmed',     // Confirmed by restaurant
      'preparing',     // Food being prepared
      'ready',         // Ready for pickup
      'picked-up',     // Picked up by delivery partner
      'out-for-delivery', // On the way
      'delivered',     // Successfully delivered
      'cancelled',     // Cancelled
      'refunded'       // Refunded
    ],
    default: 'placed'
  },
  
  // Payment details
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'stripe', 'cod'], // Cash on Delivery
    required: true
  },
  paymentId: String, // Payment gateway transaction ID
  
  // Timing
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  preparationTime: Number, // in minutes
  
  // Additional details
  specialInstructions: String,
  cancellationReason: String,
  
  // Tracking
  tracking: [OrderTrackingSchema],
  
  // Reviews
  customerRating: { type: Number, min: 1, max: 5 },
  customerReview: String,
  restaurantRating: { type: Number, min: 1, max: 5 },
  deliveryRating: { type: Number, min: 1, max: 5 },
  
  // Business metrics
  commissionAmount: Number, // Platform commission
  restaurantEarnings: Number,
  deliveryPartnerEarnings: Number
}, {
  timestamps: true
});

// Generate unique order number before saving
OrderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `DE${Date.now()}${count.toString().padStart(4, '0')}`;
  }
  next();
});

// Indexes for better query performance
OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ restaurant: 1, createdAt: -1 });
OrderSchema.index({ deliveryPartner: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ orderNumber: 1 });

module.exports = mongoose.model('Order', OrderSchema);