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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/history', require('./routes/history'));
app.use('/api/admin', require('./routes/admin'));

const { optionalAuth } = require('./middleware/auth');
app.use('/api/history/view', optionalAuth, require('./routes/view'));

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
app.get('/api/product-details', rateLimiter, optionalAuth, async (req, res) => {
  const query = req.query.product;
  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Missing "product" query parameter' });
  }

  const cleanQuery = query.trim().toLowerCase();
  const fromHistory = req.query.fromHistory === 'true';
  const noStore = req.query.noStore === 'true';

  try {
    console.log("Search request for:", cleanQuery);
    console.log("Auth header:", req.header('Authorization'));
    console.log("req.user is:", req.user ? req.user._id : "undefined");

    // 1. Log search history ONLY if it's a new search AND noStore is false
    if (!fromHistory && !noStore) {
      if (req.user) {
        await SearchHistory.findOneAndUpdate(
          { query: cleanQuery, user: req.user._id },
          { timestamp: new Date() },
          { upsert: true, new: true }
        );
      } else {
        await SearchHistory.create({ query: cleanQuery });
      }
    }

    // 2. Check Cache
    if (!noStore) {
      const cachedData = await ProductCache.findOne({ query: cleanQuery });
      if (cachedData) {
        return res.json({
          query: cleanQuery,
          amazon: cachedData.amazon,
          flipkart: cachedData.flipkart,
          cached: true,
        });
      }
    }

    // 3. Scrape if not in cache
    const encoded = encodeURIComponent(query.trim());
    
    // We want pages 1, 2, 3
    const pagesToFetch = [1, 2, 3];
    const amazonUrls = pagesToFetch.map(p => `https://www.amazon.in/s?k=${encoded}&page=${p}`);
    const flipkartUrls = pagesToFetch.map(p => `https://www.flipkart.com/search?q=${encoded}&page=${p}`);

    // Fetch all concurrently (6 requests)
    const allFetchPromises = [
      ...amazonUrls.map(url => fetchHtml(url)),
      ...flipkartUrls.map(url => fetchHtml(url))
    ];
    
    const fetchResults = await Promise.all(allFetchPromises);
    
    // Process Amazon
    const amazonFetchResults = fetchResults.slice(0, 3);
    let amazonProducts = [];
    let amazonError = null;
    for (const res of amazonFetchResults) {
      if (res.ok) {
        const parsed = parseAmazon(res.html);
        if (parsed.products && parsed.products.length > 0) {
          amazonProducts = amazonProducts.concat(parsed.products);
        } else if (parsed.error && !amazonError) {
          amazonError = parsed.error;
        }
      } else if (!amazonError) {
        amazonError = res.error || 'Fetch failed';
      }
    }
    
    // Process Flipkart
    const flipkartFetchResults = fetchResults.slice(3, 6);
    let flipkartProducts = [];
    let flipkartError = null;
    for (const res of flipkartFetchResults) {
      if (res.ok) {
        const parsed = parseFlipkart(res.html);
        if (parsed.products && parsed.products.length > 0) {
          flipkartProducts = flipkartProducts.concat(parsed.products);
        } else if (parsed.error && !flipkartError) {
          flipkartError = parsed.error;
        }
      } else if (!flipkartError) {
        flipkartError = res.error || 'Fetch failed';
      }
    }

    // Deduplicate by URL to avoid overlapping pages
    const uniqueAmazon = Array.from(new Map(amazonProducts.map(p => [p.productLink, p])).values());
    const uniqueFlipkart = Array.from(new Map(flipkartProducts.map(p => [p.productLink, p])).values());

    const amazonData = {
      source: 'amazon',
      products: uniqueAmazon,
      searchUrl: amazonUrls[0], // link to first page
      error: uniqueAmazon.length === 0 ? (amazonError || 'Fetch failed') : undefined
    };

    const flipkartData = {
      source: 'flipkart',
      products: uniqueFlipkart,
      searchUrl: flipkartUrls[0],
      error: uniqueFlipkart.length === 0 ? (flipkartError || 'Fetch failed') : undefined
    };

    // 4. Save to Cache
    if (!noStore) {
      const newCache = new ProductCache({
        query: cleanQuery,
        amazon: amazonData,
        flipkart: flipkartData,
      });
      await newCache.save();
    }

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
