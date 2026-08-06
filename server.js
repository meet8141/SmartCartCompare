require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const path    = require('path');
const cors    = require('cors');
const mongoose = require('mongoose');

const { parseAmazon, parseFlipkart } = require('./parser');
const ProductCache = require('./models/ProductCache');
const SearchHistory = require('./models/SearchHistory');
const { matchAllProducts, rankProducts } = require('./matcher');

const app  = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/products/compare', require('./routes/compare'));
app.use('/api/store', require('./routes/store')); // Mock E-Commerce Routes

// ── Browser-realistic user-agents ────────────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0',
];
const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/** Small delay helper */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * fetchHtml(url, site)
 * Fetches raw HTML using realistic browser headers to reduce bot detection.
 * Includes site-specific headers and retry logic.
 */
async function fetchHtml(url, site = 'amazon', retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const ua = randomUA();

      // Build site-specific headers
      const headers = {
        'User-Agent':              ua,
        'Accept':                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language':         'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6',
        'Accept-Encoding':         'gzip, deflate, br',
        'sec-ch-ua':               `"Chromium";v="137", "Not/A)Brand";v="24", "Google Chrome";v="137"`,
        'sec-ch-ua-mobile':        '?0',
        'sec-ch-ua-platform':      '"Windows"',
        'Sec-Fetch-Dest':          'document',
        'Sec-Fetch-Mode':          'navigate',
        'Sec-Fetch-Site':          'none',
        'Sec-Fetch-User':          '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control':           'max-age=0',
        'DNT':                     '1',
        'Connection':              'keep-alive',
        'Priority':                'u=0, i',
      };

      // Flipkart needs a Referer and specific cookie handling
      if (site === 'flipkart') {
        headers['Referer'] = 'https://www.flipkart.com/';
        headers['Origin'] = 'https://www.flipkart.com';
        headers['Sec-Fetch-Site'] = 'same-origin';
      }

      const { data, status, headers: respHeaders } = await axios.get(url, {
        headers,
        timeout:      25000,
        maxRedirects: 5,
        // Don't throw on non-2xx so we can handle 403 gracefully
        validateStatus: (status) => status < 500,
      });

      if (status === 403) {
        console.warn(`⚠ ${site} returned 403 (attempt ${attempt}/${retries})`);
        if (attempt < retries) {
          await delay(2000 * attempt); // Exponential backoff
          continue;
        }
        return {
          ok: false,
          status: 403,
          error: `${site} blocked this request (403 Forbidden). The site may be detecting automated requests.`,
        };
      }

      if (status === 503) {
        console.warn(`⚠ ${site} returned 503 (attempt ${attempt}/${retries})`);
        if (attempt < retries) {
          await delay(3000 * attempt);
          continue;
        }
        return { ok: false, status: 503, error: `${site} returned 503 Service Unavailable.` };
      }

      if (status >= 400) {
        return { ok: false, status, error: `${site} returned HTTP ${status}` };
      }

      return { ok: true, status, html: data };
    } catch (err) {
      console.warn(`⚠ ${site} fetch error (attempt ${attempt}/${retries}):`, err.message);
      if (attempt < retries) {
        await delay(2000 * attempt);
        continue;
      }
      return {
        ok:     false,
        status: err.response ? err.response.status : null,
        error:  err.message,
      };
    }
  }
}

/**
 * fetchFlipkartWithSession(url)
 * Flipkart requires a valid session cookie. This function first visits
 * the Flipkart homepage to establish a session, then fetches the search page.
 */
async function fetchFlipkartWithSession(searchUrl) {
  try {
    const ua = randomUA();
    const baseHeaders = {
      'User-Agent':              ua,
      'Accept':                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language':         'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding':         'gzip, deflate, br',
      'Sec-Fetch-Dest':          'document',
      'Sec-Fetch-Mode':          'navigate',
      'Sec-Fetch-Site':          'none',
      'Sec-Fetch-User':          '?1',
      'Upgrade-Insecure-Requests': '1',
      'Connection':              'keep-alive',
    };

    // Step 1: Visit Flipkart homepage to get session cookies
    console.log('  → Establishing Flipkart session...');
    const homeResponse = await axios.get('https://www.flipkart.com/', {
      headers: baseHeaders,
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true, // Accept any status
    });

    // Extract Set-Cookie headers
    const setCookieHeaders = homeResponse.headers['set-cookie'] || [];
    const cookieString = setCookieHeaders
      .map(c => c.split(';')[0])  // Take just the cookie name=value part
      .join('; ');

    if (!cookieString) {
      console.warn('  ⚠ No cookies received from Flipkart homepage');
    }

    // Small delay to mimic human behavior
    await delay(500 + Math.random() * 1000);

    // Step 2: Fetch the search page with session cookies
    const searchHeaders = {
      ...baseHeaders,
      'Referer':        'https://www.flipkart.com/',
      'Sec-Fetch-Site': 'same-origin',
    };
    if (cookieString) {
      searchHeaders['Cookie'] = cookieString;
    }

    const { data, status } = await axios.get(searchUrl, {
      headers: searchHeaders,
      timeout: 25000,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    if (status === 200) {
      return { ok: true, status, html: data };
    }

    console.warn(`  ⚠ Flipkart search returned status ${status}`);
    return {
      ok: false,
      status,
      error: `Flipkart returned HTTP ${status}`,
    };
  } catch (err) {
    console.warn('  ⚠ Flipkart session fetch error:', err.message);
    return {
      ok: false,
      status: err.response ? err.response.status : null,
      error: err.message,
    };
  }
}

// ── In-Memory Rate Limiter (2 requests per minute per IP) ─────────────────────
const rateLimitMap = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30; // Increased for development/testing

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

    // 2. Check Cache — but ONLY return cached data if it has products
    if (!noStore) {
      const cachedData = await ProductCache.findOne({ query: cleanQuery });
      if (cachedData) {
        const hasAmazonProducts = cachedData.amazon?.products?.length > 0;
        const hasFlipkartProducts = cachedData.flipkart?.products?.length > 0;
        
        // Only use cache if at least one platform returned products
        if (hasAmazonProducts || hasFlipkartProducts) {
          console.log(`✓ Cache hit for "${cleanQuery}" (Amazon: ${cachedData.amazon?.products?.length || 0}, Flipkart: ${cachedData.flipkart?.products?.length || 0})`);
          return res.json({
            query: cleanQuery,
            amazon: cachedData.amazon,
            flipkart: cachedData.flipkart,
            cached: true,
          });
        } else {
          // Cache has failed/empty results — delete it so we re-scrape
          console.log(`⚠ Cached data for "${cleanQuery}" has no products — deleting stale cache`);
          await ProductCache.deleteOne({ query: cleanQuery });
        }
      }
    }

    // 3. Scrape if not in cache
    const encoded = encodeURIComponent(query.trim());
    
    const amazonUrl = `https://www.amazon.in/s?k=${encoded}&page=1`;
    const flipkartUrl = `https://www.flipkart.com/search?q=${encoded}&page=1`;

    console.log(`🔍 Scraping Amazon and Flipkart for "${cleanQuery}"...`);

    // Fetch Amazon and Flipkart with a small stagger to avoid looking like a bot
    const amazonPromise = fetchHtml(amazonUrl, 'amazon', 3);
    
    // Small delay before Flipkart to stagger requests
    await delay(300 + Math.random() * 500);
    
    // Try Flipkart with session-based approach first (handles 403)
    const flipkartPromise = fetchFlipkartWithSession(flipkartUrl);

    const [amazonResult, flipkartResult] = await Promise.all([amazonPromise, flipkartPromise]);

    // If session approach failed for Flipkart, try direct fetch as fallback
    let finalFlipkartResult = flipkartResult;
    if (!flipkartResult.ok) {
      console.log('  → Flipkart session approach failed, trying direct fetch...');
      await delay(1000);
      finalFlipkartResult = await fetchHtml(flipkartUrl, 'flipkart', 2);
    }
    
    // Process Amazon
    let amazonProducts = [];
    let amazonError = null;
    if (amazonResult.ok) {
      const parsed = parseAmazon(amazonResult.html);
      if (parsed.products && parsed.products.length > 0) {
        amazonProducts = parsed.products;
        console.log(`  ✓ Amazon: ${amazonProducts.length} products found`);
      } else {
        amazonError = parsed.error || 'No product cards found';
        console.warn(`  ⚠ Amazon: ${amazonError}`);
      }
    } else {
      amazonError = amazonResult.error || 'Fetch failed';
      console.warn(`  ⚠ Amazon fetch failed: ${amazonError}`);
    }
    
    // Process Flipkart
    let flipkartProducts = [];
    let flipkartError = null;
    if (finalFlipkartResult.ok) {
      const parsed = parseFlipkart(finalFlipkartResult.html);
      if (parsed.products && parsed.products.length > 0) {
        flipkartProducts = parsed.products;
        console.log(`  ✓ Flipkart: ${flipkartProducts.length} products found`);
      } else {
        flipkartError = parsed.error || 'No product cards found';
        console.warn(`  ⚠ Flipkart: ${flipkartError}`);
      }
    } else {
      flipkartError = finalFlipkartResult.error || 'Fetch failed';
      console.warn(`  ⚠ Flipkart fetch failed: ${flipkartError}`);
    }

    // Deduplicate by URL to avoid overlapping pages
    let uniqueAmazon = Array.from(new Map(amazonProducts.map(p => [p.productLink, p])).values());
    let uniqueFlipkart = Array.from(new Map(flipkartProducts.map(p => [p.productLink, p])).values());
    
    // Filter and rank products to prioritize relevant matches (e.g., phones over cases)
    uniqueAmazon = rankProducts(uniqueAmazon, cleanQuery).slice(0, 5);
    uniqueFlipkart = rankProducts(uniqueFlipkart, cleanQuery).slice(0, 5);

    // Group matching products before saving to Cache
    matchAllProducts(uniqueAmazon, uniqueFlipkart);

    const amazonData = {
      source: 'amazon',
      products: uniqueAmazon,
      searchUrl: amazonUrl,
      error: uniqueAmazon.length === 0 ? (amazonError || 'Fetch failed') : undefined
    };

    const flipkartData = {
      source: 'flipkart',
      products: uniqueFlipkart,
      searchUrl: flipkartUrl,
      error: uniqueFlipkart.length === 0 ? (flipkartError || 'Fetch failed') : undefined
    };

    // 4. Save to Cache — but ONLY if at least one platform returned products
    if (!noStore && (uniqueAmazon.length > 0 || uniqueFlipkart.length > 0)) {
      await ProductCache.findOneAndUpdate(
        { query: cleanQuery },
        {
          query: cleanQuery,
          amazon: amazonData,
          flipkart: flipkartData,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      console.log(`  ✓ Cached results for "${cleanQuery}"`);
    } else {
      console.log(`  ⚠ Skipping cache — no products from either platform`);
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
