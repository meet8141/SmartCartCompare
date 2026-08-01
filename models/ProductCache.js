const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  currentPrice: String,
  originalPrice: String,
  discount: String,
  rating: String,
  ratingsCount: String,
  reviews: String,
  imageUrl: String,
  productLink: String,
  delivery: String,
  features: [String],
  sponsored: Boolean,
  normalizedName: { type: String, index: true },
  matchedProducts: [{
    site: String,
    name: String,
    price: String,
    rating: String,
    url: String
  }]
});

const cacheSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  amazon: {
    source: String,
    products: [productSchema],
    error: String,
    searchUrl: String,
  },
  flipkart: {
    source: String,
    products: [productSchema],
    error: String,
    searchUrl: String,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Cache expires after 24 hours (86400 seconds)
cacheSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('ProductCache', cacheSchema);
