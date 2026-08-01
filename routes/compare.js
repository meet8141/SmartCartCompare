const express = require('express');
const router = express.Router();
const ProductCache = require('../models/ProductCache');

// Helper to convert ₹x,xxx to a number for comparison
function parsePrice(priceStr) {
  if (!priceStr) return 99999999;
  return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 99999999;
}

// GET /api/products/compare?name=...
router.get('/', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'Missing name parameter' });

    const cleanQuery = name.trim().toLowerCase();
    const cachedData = await ProductCache.findOne({ query: cleanQuery });

    if (!cachedData) {
      return res.status(404).json({ error: 'Products not found in cache. Please search for the product first.' });
    }

    const comparisons = [];

    // Collect all products from Amazon that have matches
    cachedData.amazon.products.forEach(amzProd => {
      if (amzProd.matchedProducts && amzProd.matchedProducts.length > 0) {
        // Find the best match (lowest price)
        const bestMatch = amzProd.matchedProducts.sort((a, b) => parsePrice(a.price) - parsePrice(b.price))[0];
        
        const amzPrice = parsePrice(amzProd.currentPrice);
        const matchPrice = parsePrice(bestMatch.price);
        
        comparisons.push({
          baseProduct: {
            site: 'amazon',
            name: amzProd.name,
            price: amzProd.currentPrice,
            rating: amzProd.rating,
            url: amzProd.productLink,
            imageUrl: amzProd.imageUrl
          },
          matchProduct: {
            site: bestMatch.site,
            name: bestMatch.name,
            price: bestMatch.price,
            rating: bestMatch.rating,
            url: bestMatch.url,
            // Assuming bestMatch doesn't have imageUrl, but we can just show baseProduct imageUrl or omit
          },
          priceDiff: amzPrice - matchPrice,
          cheaperSite: amzPrice < matchPrice ? 'amazon' : (matchPrice < amzPrice ? bestMatch.site : 'tie')
        });
      }
    });

    // Sort comparisons by most relevant (lowest base price maybe)
    comparisons.sort((a, b) => parsePrice(a.baseProduct.price) - parsePrice(b.baseProduct.price));

    res.json({ comparisons });
  } catch (err) {
    console.error('Error in comparison endpoint:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
