const express = require('express');
const router = express.Router();
const StoreProduct = require('../models/StoreProduct');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Order = require('../models/Order');
const { auth, adminAuth } = require('../middleware/auth'); // Require auth middleware
const multer = require('multer');
const path = require('path');

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --- Admin Route: Add Product ---
router.post('/products', auth, adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, subCategory, stock } = req.body;
    let imageUrl = req.body.imageUrl;
    
    // If a file was uploaded, use the local path instead
    if (req.file) {
      imageUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    }

    const newProduct = await StoreProduct.create({
      name, 
      description, 
      price: Number(price), 
      category, 
      subCategory, 
      imageUrl: imageUrl || 'https://via.placeholder.com/200', 
      stock: stock ? Number(stock) : 50
    });
    res.status(201).json({ message: 'Product added successfully', product: newProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(400).json({ error: 'Failed to create product. Check data format.' });
  }
});

// Get all store products (with optional category filter)
router.get('/products', async (req, res) => {
  try {
    const { category, subCategory } = req.query;
    let query = {};
    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;

    const products = await StoreProduct.find(query);
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store products' });
  }
});

// Get product details
router.get('/products/:id', async (req, res) => {
  try {
    const product = await StoreProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// --- Cart Routes ---
router.get('/cart', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }
    res.json({ cart });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

router.post('/cart/add', auth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const itemIndex = cart.items.findIndex(p => p.product.toString() === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }
    
    await cart.save();
    res.json({ message: 'Added to cart', cart });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

router.post('/cart/remove', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    let cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = cart.items.filter(p => p.product.toString() !== productId);
      await cart.save();
    }
    res.json({ message: 'Removed from cart', cart });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

router.post('/cart/clear', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    res.json({ message: 'Cart cleared', cart });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// --- Wishlist Routes ---
router.get('/wishlist', auth, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id }).populate('items');
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    }
    res.json({ wishlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

router.post('/wishlist/add', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user._id, items: [] });
    }
    
    if (!wishlist.items.includes(productId)) {
      wishlist.items.push(productId);
      await wishlist.save();
    }
    res.json({ message: 'Added to wishlist', wishlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

router.post('/wishlist/remove', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (wishlist) {
      wishlist.items = wishlist.items.filter(id => id.toString() !== productId);
      await wishlist.save();
    }
    res.json({ message: 'Removed from wishlist', wishlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// --- Checkout Flow ---
router.post('/checkout', auth, async (req, res) => {
  try {
    const { paymentMethod, paymentDetails } = req.body;
    
    // Fetch user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of cart.items) {
      const price = item.product.price;
      totalAmount += price * item.quantity;
      orderItems.push({
        product: item.product._id,
        quantity: item.quantity,
        priceAtPurchase: price
      });
      
      // Optional: Reduce stock
      await StoreProduct.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } });
    }

    // Create Order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      paymentMethod,
      paymentDetails,
      status: 'Success'
    });

    // Clear cart after successful checkout
    cart.items = [];
    await cart.save();

    res.json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error('Checkout Error:', error);
    res.status(500).json({ error: 'Failed to process checkout' });
  }
});

module.exports = router;
