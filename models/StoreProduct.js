const mongoose = require('mongoose');

const storeProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['Sports', 'Clothes', 'Shoes', 'Electronics', 'Groceries', 'Home', 'Bags', 'Headphones']
  },
  subCategory: { type: String, default: 'General' }, // Used for clothes (Men, Women, Kids)
  imageUrl: { type: String, default: 'https://via.placeholder.com/200' },
  stock: { type: Number, default: 50 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StoreProduct', storeProductSchema);
