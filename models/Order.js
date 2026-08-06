const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreProduct', required: true },
      quantity: { type: Number, required: true },
      priceAtPurchase: { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true, enum: ['GPay', 'NetBanking', 'DebitCard'] },
  paymentDetails: { type: Object, default: {} }, // E.g., { upiId: '...'}, { bank: '...'}
  status: { type: String, default: 'Success' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
