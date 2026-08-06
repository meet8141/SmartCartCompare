import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { AuthContext } from '../contexts/AuthContext';

const MARQUEE_ITEMS = [
  'Smartphones', 'Laptops', 'Headphones', 'Smart Watches', 'Cameras',
  'Clothing', 'Electronics', 'Appliances', 'Books', 'Gaming',
  'Smartphones', 'Laptops', 'Headphones', 'Smart Watches', 'Cameras',
  'Clothing', 'Electronics', 'Appliances', 'Books', 'Gaming',
];

function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const { logout, user, token } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Navigate to the full results page (used by cards below)
  const navigateToResults = (q) => {
    navigate(`/results?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    const q = searchParams.get('search');
    const fromHistory = searchParams.get('fromHistory') === 'true';
    if (q) {
      setQuery(q);
      executeSearch(q, fromHistory);
    }
  }, [searchParams]);

  const executeSearch = async (searchQuery, fromHistory = false) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(
        `http://localhost:3000/api/product-details?product=${encodeURIComponent(searchQuery)}${fromHistory ? '&fromHistory=true' : ''}`,
        { headers }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch data');
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    executeSearch(suggestion);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page">
      {/* ── STICKY NAV ── */}
      <header className="nav">
        <div className="nav-inner">
          {/* Left: Brand + Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <a className="nav-brand" href="/">
              <span className="brand-main">SMART</span>
              <span className="brand-accent">CART</span>
              <span className="brand-main">Compare</span>
            </a>
            <div className="nav-badge">
              <span>⚡</span>
              <span>Live Prices</span>
            </div>
          </div>

          {/* Center: Nav links */}
          <ul className="nav-links">
            <li><a href="/#deals">Hot Deals</a></li>
            <li><a href="/#categories">Categories</a></li>
            {user && <li><a href="/store">Store</a></li>}
            {user && <li><a href="/cart">Cart</a></li>}
            {user && <li><a href="/wishlist">Wishlist</a></li>}
            {user && <li><a href="/history">History</a></li>}
          </ul>

          {/* Right: Auth controls */}
          <div className="nav-right">
            {user ? (
              <div className="nav-user">
                <span className="nav-username">Hi, {user.username}</span>
                <a href="/history" className="nav-history-link" style={{ display: 'none' }}>History</a>
                {user.isAdmin && (
                  <a href="/admin" className="nav-admin-link">Admin</a>
                )}
                <button onClick={logout} className="nav-logout">Logout</button>
              </div>
            ) : (
              <>
                <a href="/login" className="nav-login">Log in</a>
                <a href="/signup" className="pill-primary nav-cta">Sign up →</a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="hero grain">
        {/* Floating blobs */}
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="blob blob-4" />
        <div className="blob blob-5" />

        <div className="hero-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            REAL-TIME PRICE COMPARISON · AMAZON &amp; FLIPKART
          </div>

          <h1>
            <span style={{ color: 'var(--bone)', display: 'block' }}>COMPARE</span>
            <span style={{ color: 'var(--hot)', display: 'block' }}>SMARTER.</span>
            <span className="stroke-acid display" style={{ display: 'block', fontSize: '0.75em' }}>SAVE</span>
            <span style={{ color: 'var(--acid)', display: 'block', fontSize: '0.75em' }}>MORE.</span>
          </h1>

          <p className="hero-sub">
            Enter any product name and instantly compare prices, ratings, and specs
            from Amazon &amp; Flipkart — side by side, in real time.
          </p>

          {/* Search bar */}
          <div className="search-container">
            <form onSubmit={handleSearch} className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="productInput"
                id="product-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Try "Samsung S24", "iPhone 15 Pro", "boAt headphones"…'
                autoComplete="off"
              />
              <button type="submit" className="searchBtn" id="compare-btn" disabled={loading}>
                <span>{loading ? 'Searching…' : 'Compare'}</span>
                <span>{loading ? '' : '→'}</span>
              </button>
            </form>

            <div className="suggestions">
              {['Samsung Galaxy S24', 'iPhone 15 Pro', 'boAt headphones', 'OnePlus 12', 'Laptops'].map(s => (
                <span key={s} className="suggestion-chip" onClick={() => handleSuggestionClick(s)}>
                  {s}
                </span>
              ))}
            </div>
          </div>


        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div className="marquee-section">
        <div className="marquee-track">
          {MARQUEE_ITEMS.map((item, i) => (
            <span key={i} className="marquee-item">
              {item}
              <span className="marquee-sep">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── LOADER ── */}
      {loading && (
        <div className="loader on">
          <div className="loader-dot" />
          <div className="loader-dot" />
          <div className="loader-dot" />
        </div>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div className="resultsSection" style={{ paddingTop: '32px' }}>
          <div className="statusBar err">⚠ {error}</div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {results && !loading && (
        <div className="resultsSection" style={{ paddingTop: '40px' }}>
          <div className="summary-bar">
            <div className="summary-query">
              Results for <strong>"{results.query}"</strong>
            </div>
            <div className="summary-counts">
              <div className="src-badge amazon">
                <div className="dot" />
                {results.amazon?.products?.length || 0} on Amazon
              </div>
              <div className="src-badge flipkart">
                <div className="dot" />
                {results.flipkart?.products?.length || 0} on Flipkart
              </div>
            </div>
          </div>

          <div className="section-heading" style={{ marginBottom: '16px', color: 'var(--bone)', fontSize: '20px' }}>
            Best Matches
          </div>
          <div className="compare-grid">
            {/* Amazon Column */}
            <div className="platform-col">
              <div className="platform-header amazon">
                <div className="ph-icon">📦</div>
                <div className="ph-name">Amazon.in</div>
                {results.amazon?.searchUrl && (
                  <a href={results.amazon.searchUrl} target="_blank" rel="noopener noreferrer" className="ph-link">
                    View all ↗
                  </a>
                )}
              </div>
              {results.amazon?.error ? (
                <div className="error-card">⚠ {results.amazon.error}</div>
              ) : results.amazon?.products?.length > 0 ? (
                <ProductCard product={results.amazon.products[0]} platform="amazon" />
              ) : (
                <div className="error-card">No products found on Amazon.</div>
              )}
            </div>

            {/* Flipkart Column */}
            <div className="platform-col">
              <div className="platform-header flipkart">
                <div className="ph-icon">🛍️</div>
                <div className="ph-name">Flipkart</div>
                {results.flipkart?.searchUrl && (
                  <a href={results.flipkart.searchUrl} target="_blank" rel="noopener noreferrer" className="ph-link">
                    View all ↗
                  </a>
                )}
              </div>
              {results.flipkart?.error ? (
                <div className="error-card">⚠ {results.flipkart.error}</div>
              ) : results.flipkart?.products?.length > 0 ? (
                <ProductCard product={results.flipkart.products[0]} platform="flipkart" />
              ) : (
                <div className="error-card">No products found on Flipkart.</div>
              )}
            </div>
          </div>

          {/* Other Results */}
          {(results.amazon?.products?.length > 1 || results.flipkart?.products?.length > 1) && (
            <div style={{ marginTop: '48px' }}>
              <div className="section-heading" style={{
                marginBottom: '16px', color: 'var(--bone-55)', fontSize: '13px',
                fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em',
                textAlign: 'center', fontFamily: "'Archivo', sans-serif"
              }}>
                Other Options
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
                {results.amazon?.products?.slice(1).map((p, idx) => (
                  <ProductCard key={`amz-other-${idx}`} product={p} platform="amazon" initialCompact={true} />
                ))}
                {results.flipkart?.products?.slice(1).map((p, idx) => (
                  <ProductCard key={`fk-other-${idx}`} product={p} platform="flipkart" initialCompact={true} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PLACEHOLDER ── */}
      {!results && !loading && (
        <div className="placeholderSection" style={{ paddingTop: '40px' }}>
          <div className="placeholder-col">
            <div className="ph-emoji">📦</div>
            <div className="ph-label">Amazon results appear here</div>
          </div>
          <div className="placeholder-col">
            <div className="ph-emoji">🛍️</div>
            <div className="ph-label">Flipkart results appear here</div>
          </div>
        </div>
      )}

      {/* ── HOT DEALS ── */}
      <div className="section" id="deals" >
        <div className="section-head">
          <h2 className="section-title">
            HOT <span style={{ color: 'var(--hot)' }}>DEALS</span>
          </h2>
          <p className="section-sub">⚡ Powered by Smart Deal Scanner — click any budget to find the best picks.</p>
        </div>
        <div className="hot-deal-grid">
          {[99, 199, 299, 399, 499, 599, 799, 999].map(price => (
            <div key={price} className="hot-deal-card" id={`deal-${price}`} onClick={() => navigateToResults(`Under ₹${price}`)}>
              <div className="hot-deal-label">Under</div>
              <div className="hot-deal-value">₹{price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BEST DISCOUNTS ── */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <h2 className="section-title">
            BEST <span style={{ color: 'var(--acid)' }}>DISCOUNTS</span>
          </h2>
          <p className="section-sub">Find products with the biggest markdowns across both platforms.</p>
        </div>
        <div className="discount-grid">
          {[50, 60, 70, 80].map(pct => (
            <div key={pct} className="discount-card" id={`discount-${pct}`} onClick={() => navigateToResults(`${pct}% off deals`)}>
              <div className="discount-min">Min.</div>
              <div className="discount-value">{pct}%</div>
              <div className="discount-off">off</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES ── */}
      <div className="section" style={{ paddingTop: 0 }} id="categories">
        <div className="section-head">
          <h2 className="section-title">
            SHOP BY <span style={{ color: 'var(--hot)' }}>CATEGORY</span>
          </h2>
          <p className="section-sub">Jump straight into a category and find the best-priced products instantly.</p>
        </div>
        <div className="bento-grid">
          <div className="bento-tile bento-tile-acid" id="cat-mobile" onClick={() => navigateToResults('Best Pick for Mobile')}>
            <div className="bento-icon">📱</div>
            <div className="bento-label">MOBILES</div>
            <div className="bento-sub">Smartphones &amp; Accessories</div>
          </div>
          <div className="bento-tile bento-tile-ink" id="cat-laptop" onClick={() => navigateToResults('Top Laptops')}>
            <div className="bento-icon">💻</div>
            <div className="bento-label">LAPTOPS</div>
            <div className="bento-sub">Work &amp; Gaming Machines</div>
          </div>
          <div className="bento-tile bento-tile-hot" id="cat-audio" onClick={() => navigateToResults('Headphones')}>
            <div className="bento-icon">🎧</div>
            <div className="bento-label">AUDIO</div>
            <div className="bento-sub">Headphones &amp; Earbuds</div>
          </div>
          <div className="bento-tile bento-tile-bone" id="cat-clothes" onClick={() => navigateToResults('Clothes')}>
            <div className="bento-icon">👕</div>
            <div className="bento-label">FASHION</div>
            <div className="bento-sub">Clothing &amp; Accessories</div>
          </div>
          <div className="bento-tile bento-tile-ink" id="cat-food" onClick={() => navigateToResults('Snacks')}>
            <div className="bento-icon">🥫</div>
            <div className="bento-label">GROCERY</div>
            <div className="bento-sub">Ration &amp; Daily Essentials</div>
          </div>
          <div className="bento-tile bento-tile-acid" id="cat-electronics" onClick={() => navigateToResults('Electronics')}>
            <div className="bento-icon">🔌</div>
            <div className="bento-label">ELECTRONICS</div>
            <div className="bento-sub">Gadgets &amp; Smart Devices</div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span style={{ color: 'var(--bone)' }}>SMART</span>
            <span style={{ color: 'var(--acid)' }}>CART</span>
            <span style={{ color: 'var(--bone)' }}> COMPARE</span>
          </div>
          <p className="footer-tagline">
            Fetches live data directly from Amazon.in &amp; Flipkart.com.<br />
            Prices may vary. Always verify before purchase.
          </p>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} SmartCart Compare. Built for smart shoppers.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
