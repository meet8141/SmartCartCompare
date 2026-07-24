require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const path    = require('path');
const cors    = require('cors');
const mongoose = require('mongoose');

const { parseAmazon, parseFlipkart } = require('./parser');
const ProductCache = require('./models/ProductCache');
const SearchHistory = require('./models/SearchHistory');

const app  = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartcartcompare')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));


// ── Browser-realistic user-agents ────────────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];
const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/**
 * fetchHtml(url)
 * Fetches raw HTML using realistic browser headers to reduce bot detection.
 */
async function fetchHtml(url) {
  try {
    const ua = randomUA();
    const { data, status } = await axios.get(url, {
      headers: {
        'User-Agent':              ua,
        'Accept':                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language':         'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding':         'gzip, deflate, br',
        'sec-ch-ua':               '"Google Chrome";v="124", "Not;A=Brand";v="8", "Chromium";v="124"',
        'sec-ch-ua-mobile':        '?0',
        'sec-ch-ua-platform':      '"Windows"',
        'Sec-Fetch-Dest':          'document',
        'Sec-Fetch-Mode':          'navigate',
        'Sec-Fetch-Site':          'none',
        'Sec-Fetch-User':          '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control':           'max-age=0',
        'DNT':                     '1',
      },
      timeout:      20000,
      maxRedirects: 5,
    });
    return { ok: true, status, html: data };
  } catch (err) {
    return {
      ok:     false,
      status: err.response ? err.response.status : null,
      error:  err.message,
    };
  }
}

// ── In-Memory Rate Limiter (2 requests per minute per IP) ─────────────────────
const rateLimitMap = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 2;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  let timestamps = rateLimitMap.get(ip);
  // Filter out timestamps older than 1 minute
  timestamps = timestamps.filter(time => now - time < windowMs);

  if (timestamps.length >= maxRequests) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. To avoid being blocked by Amazon, please limit your searches to 2 comparisons per minute. Try again shortly.' 
    });
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  next();
}

// ── GET /api/product-details?product=<query> ─────────────────────────────────
app.get('/api/product-details', rateLimiter, async (req, res) => {
  const query = req.query.product;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Missing "product" query parameter' });
  }

  const cleanQuery = query.trim().toLowerCase();

  try {
    // 1. Log search history
    await SearchHistory.create({ query: cleanQuery });

    // 2. Check Cache
    const cachedData = await ProductCache.findOne({ query: cleanQuery });
    if (cachedData) {
      return res.json({
        query: cleanQuery,
        amazon: cachedData.amazon,
        flipkart: cachedData.flipkart,
        cached: true,
      });
    }

    // 3. Scrape if not in cache
    const encoded     = encodeURIComponent(query.trim());
    const amazonUrl   = `https://www.amazon.in/s?k=${encoded}`;
    const flipkartUrl = `https://www.flipkart.com/search?q=${encoded}`;

    // Fetch both pages concurrently
    const [amazonResult, flipkartResult] = await Promise.all([
      fetchHtml(amazonUrl),
      fetchHtml(flipkartUrl),
    ]);

    // Parse; parsers return { source, products[], error? }
    const amazonData   = amazonResult.ok
      ? parseAmazon(amazonResult.html)
      : { source: 'amazon',   products: [], error: amazonResult.error || 'Fetch failed' };

    const flipkartData = flipkartResult.ok
      ? parseFlipkart(flipkartResult.html)
      : { source: 'flipkart', products: [], error: flipkartResult.error || 'Fetch failed' };

    // Attach source URLs for debugging
    amazonData.searchUrl   = amazonUrl;
    flipkartData.searchUrl = flipkartUrl;

    // 4. Save to Cache
    const newCache = new ProductCache({
      query: cleanQuery,
      amazon: amazonData,
      flipkart: flipkartData,
    });
    await newCache.save();

    res.json({
      query: cleanQuery,
      amazon: amazonData,
      flipkart: flipkartData,
      cached: false,
    });
  } catch (err) {
    console.error('Error fetching product details:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`SmartCart Compare running at http://localhost:${PORT}`);
});
