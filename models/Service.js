const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['sound', 'lighting', 'venue', 'furniture', 'mc', 'catering', 'decoration', 'photography']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    enum: ['hour', 'day', 'event', 'person', 'set']
  },
  images: [{
    type: String
  }],
  availability: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  features: [{
    type: String
  }],
  capacity: {
    type: Number,
    min: 1
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

serviceSchema.index({ location: '2dsphere' });
serviceSchema.index({ category: 1 });
serviceSchema.index({ price: 1 });

module.exports = mongoose.model('Service', serviceSchema);
