const express = require('express');
const router = express.Router();
const SearchHistory = require('../models/SearchHistory');
const ProductCache = require('../models/ProductCache');

// POST /api/history/view
// Expects JSON payload with product details
router.post('/', async (req, res) => {
  try {
    const { title, link, platform, price, originalPrice, image } = req.body;
    if (!title || !link) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Record in SearchHistory (store the product title as the query)
    const historyData = { query: title };
    if (req.user) {
      historyData.user = req.user._id;
    }
    await SearchHistory.create(historyData);

    // Upsert into ProductCache under a query key derived from the title (lowercased)
    const cacheKey = title.toLowerCase();
    const productData = {
      name: title,
      currentPrice: price || '',
      originalPrice: originalPrice || '',
      rating: '',
      ratingsCount: '',
      reviews: '',
      imageUrl: image || '',
      productLink: link,
      delivery: '',
      features: [],
      sponsored: false
    };

    let updateQuery = { $setOnInsert: { query: cacheKey } };
    
    // Add to the specific platform's products array
    if (platform === 'amazon' || platform === 'flipkart') {
      updateQuery.$addToSet = { [`${platform}.products`]: productData };
    }

    await ProductCache.findOneAndUpdate(
      { query: cacheKey },
      updateQuery,
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'View logged' });
  } catch (err) {
    console.error('Error logging view:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
