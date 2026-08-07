const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SearchHistory = require('../models/SearchHistory');
const UserLog = require('../models/UserLog');
const Order = require('../models/Order');
const StoreProduct = require('../models/StoreProduct');
const Wishlist = require('../models/Wishlist');
const Cart = require('../models/Cart');
const { auth, adminAuth } = require('../middleware/auth');

// Protect all admin routes
router.use(auth, adminAuth);

// Helper function to guess category based on query
const guessCategory = (query) => {
  const q = query.toLowerCase();
  if (q.match(/laptop|macbook|dell|hp|lenovo|asus/)) return 'Laptops';
  if (q.match(/headphone|earphone|airpods|earbuds|speaker|boat|iem|headset|mic/)) return 'Audio';
  if (q.match(/phone|mobile|samsung|iphone|apple|oneplus|realme|redmi/)) return 'Smartphones';
  if (q.match(/tv|television|smart tv/)) return 'Televisions';
  if (q.match(/fridge|refrigerator/)) return 'Refrigerators';
  if (q.match(/ac|air conditioner/)) return 'Air Conditioners';
  if (q.match(/shirt|jeans|t-shirt|shoes|sneakers|watch|dress|mens|womens|kurta|Ethnic|Jutti|Saree|Kurti|Ethnic|clothes/)) return 'Fashion';
  return 'Other';
};

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isBlocked: false });

    // Searches today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const searchesToday = await SearchHistory.countDocuments({
      timestamp: { $gte: startOfDay }
    });

    // Most compared products (top 5)
    const topProductsAgg = await SearchHistory.aggregate([
      { $group: { _id: "$query", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const topProducts = topProductsAgg.map(p => ({ name: p._id, count: p.count }));

    // Category distribution
    // Since we don't store category directly, we'll fetch recent searches and estimate
    const recentSearches = await SearchHistory.find().sort({ timestamp: -1 }).limit(1000);
    const categoryCounts = {};
    recentSearches.forEach(s => {
      const cat = guessCategory(s.query);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categories = Object.keys(categoryCounts).map(cat => ({
      name: cat,
      value: categoryCounts[cat]
    }));

    res.json({
      totalUsers,
      activeUsers,
      searchesToday,
      topProducts,
      categories
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// GET /api/admin/time-stats
router.get('/time-stats', async (req, res) => {
  try {
    const range = req.query.range || '7d';
    const now = new Date();
    let startDate = new Date();
    let groupBy = 'day'; // 'hour' or 'day'

    if (range === '24h') {
      startDate.setHours(now.getHours() - 24);
      groupBy = 'hour';
    } else if (range === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(now.getDate() - 30);
    }

    const searches = await SearchHistory.find({ timestamp: { $gte: startDate } });
    
    const timeMap = {};
    
    searches.forEach(s => {
      const d = new Date(s.timestamp);
      let key;
      if (groupBy === 'hour') {
        key = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:00`;
      } else {
        key = `${d.getMonth()+1}/${d.getDate()}`;
      }
      
      const cat = guessCategory(s.query);
      if (!timeMap[key]) {
        timeMap[key] = { time: key };
      }
      timeMap[key][cat] = (timeMap[key][cat] || 0) + 1;
    });

    // Ensure array is sorted by actual time, but keys are strings, so we map from start to now
    const result = [];
    if (groupBy === 'hour') {
      for (let i = 24; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 60 * 60 * 1000);
        const key = `${t.getMonth()+1}/${t.getDate()} ${t.getHours()}:00`;
        result.push(timeMap[key] || { time: key });
      }
    } else {
      const days = range === '7d' ? 7 : 30;
      for (let i = days; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = `${t.getMonth()+1}/${t.getDate()}`;
        result.push(timeMap[key] || { time: key });
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Time stats error:', err);
    res.status(500).json({ error: 'Failed to load time stats' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// PUT /api/admin/users/:id/block
router.put('/users/:id/block', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isAdmin) return res.status(400).json({ error: 'Cannot block an admin' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    await UserLog.create({
      user: req.user._id,
      action: user.isBlocked ? 'BLOCKED_USER' : 'UNBLOCKED_USER',
      details: `Target User ID: ${user._id}`
    });

    res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isAdmin) return res.status(400).json({ error: 'Cannot delete an admin' });

    await User.findByIdAndDelete(req.params.id);
    // Also delete their history and logs? Optional, but good practice.
    await SearchHistory.deleteMany({ user: req.params.id });
    await UserLog.deleteMany({ user: req.params.id });

    await UserLog.create({
      user: req.user._id,
      action: 'DELETED_USER',
      details: `Target User ID: ${user._id} (${user.email})`
    });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await UserLog.find()
      .populate('user', 'username email')
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load logs' });
  }
});

// GET /api/admin/store-stats
router.get('/store-stats', async (req, res) => {
  try {
    // 1. Revenue & Orders
    const orders = await Order.find().populate('user', 'username email');
    const totalOrders = orders.length;
    let totalRevenue = 0;
    
    const paymentMethods = { GPay: 0, NetBanking: 0, DebitCard: 0 };
    const paymentProducts = { GPay: {}, NetBanking: {}, DebitCard: {} }; // method -> productId -> quantity
    const recentOrders = orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
    
    const productSales = {}; // productId -> { name, quantity, revenue }
    
    const now = new Date();
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const past7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const past30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let rev24h = 0;
    let rev7d = 0;
    let rev30d = 0;
    
    orders.forEach(order => {
      totalRevenue += order.totalAmount;
      if (paymentMethods[order.paymentMethod] !== undefined) {
        paymentMethods[order.paymentMethod]++;
      }
      
      const orderDate = new Date(order.createdAt);
      if (orderDate >= past24h) rev24h += order.totalAmount;
      if (orderDate >= past7d) rev7d += order.totalAmount;
      if (orderDate >= past30d) rev30d += order.totalAmount;
      
      order.items.forEach(item => {
        const pId = item.product.toString();
        if (!productSales[pId]) {
          productSales[pId] = { id: pId, quantity: 0, revenue: 0 };
        }
        productSales[pId].quantity += item.quantity;
        productSales[pId].revenue += item.priceAtPurchase * item.quantity;
        
        if (paymentProducts[order.paymentMethod]) {
          paymentProducts[order.paymentMethod][pId] = (paymentProducts[order.paymentMethod][pId] || 0) + item.quantity;
        }
      });
    });
    
    const revenuePeriods = { past24h: rev24h, past7d: rev7d, past30d: rev30d };
    
    const aov = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;
    
    // 2. Inventory Health & Category Breakdown
    const products = await StoreProduct.find();
    const totalActiveProducts = products.length;
    const lowStockAlerts = products.filter(p => p.stock < 10).map(p => ({ id: p._id, name: p.name, stock: p.stock }));
    
    let outOfStock = 0;
    let lowStockCount = 0;
    let healthyStock = 0;
    const inventoryDetails = { OutOfStock: [], LowStock: [], Healthy: [] };
    
    products.forEach(p => {
      if (p.stock <= 0) {
        outOfStock++;
        inventoryDetails.OutOfStock.push({ name: p.name, stock: p.stock });
      }
      else if (p.stock < 10) {
        lowStockCount++;
        inventoryDetails.LowStock.push({ name: p.name, stock: p.stock });
      }
      else {
        healthyStock++;
        // Healthy lists can be very large, maybe only keep top 20 or we just send it. Let's limit healthy list to avoid huge payloads
        if (healthyStock <= 50) inventoryDetails.Healthy.push({ name: p.name, stock: p.stock });
      }
    });
    const inventoryHealth = { OutOfStock: outOfStock, LowStock: lowStockCount, Healthy: healthyStock };
    
    const categoryRevenue = {};
    const productMap = {}; // id -> name
    products.forEach(p => {
      productMap[p._id.toString()] = { name: p.name, category: p.category };
    });
    
    Object.values(productSales).forEach(ps => {
      if (productMap[ps.id]) {
        ps.name = productMap[ps.id].name;
        const cat = productMap[ps.id].category || 'Other';
        categoryRevenue[cat] = (categoryRevenue[cat] || 0) + ps.revenue;
      } else {
        ps.name = 'Unknown Product';
      }
    });
    
    const paymentMethodsDetails = {};
    for (const [method, prods] of Object.entries(paymentProducts)) {
      paymentMethodsDetails[method] = Object.entries(prods)
        .map(([id, qty]) => ({ name: productMap[id]?.name || 'Unknown', quantity: qty }))
        .sort((a,b) => b.quantity - a.quantity)
        .slice(0, 10); // top 10 products per method
    }
    
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
      
    // 3. User Engagement
    const wishlists = await Wishlist.find();
    const wishlistCounts = {};
    wishlists.forEach(w => {
      w.items.forEach(itemId => {
        const idStr = itemId.toString();
        wishlistCounts[idStr] = (wishlistCounts[idStr] || 0) + 1;
      });
    });
    
    const mostWishlisted = Object.keys(wishlistCounts)
      .map(id => ({ id, count: wishlistCounts[id], name: productMap[id]?.name || 'Unknown' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
      
    const carts = await Cart.find();
    const activeCarts = carts.filter(c => c.items.length > 0).length;

    res.json({
      revenue: {
        total: totalRevenue,
        orders: totalOrders,
        aov: Number(aov)
      },
      inventory: {
        health: inventoryHealth,
        details: inventoryDetails,
        lowStock: lowStockAlerts
      },
      sales: {
        topProducts,
        categoryRevenue: Object.keys(categoryRevenue).map(cat => ({ name: cat, value: categoryRevenue[cat] })),
        revenuePeriods
      },
      engagement: {
        mostWishlisted,
        activeCarts
      },
      operations: {
        recentOrders: recentOrders.map(o => ({
          _id: o._id,
          user: o.user?.username || 'Guest',
          amount: o.totalAmount,
          method: o.paymentMethod,
          status: o.status,
          date: o.createdAt
        })),
        paymentMethods,
        paymentMethodsDetails
      }
    });
  } catch (err) {
    console.error('Store stats error:', err);
    res.status(500).json({ error: 'Failed to load store stats' });
  }
});

module.exports = router;
