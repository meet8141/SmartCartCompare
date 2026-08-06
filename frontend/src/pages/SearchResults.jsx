import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { AuthContext } from '../contexts/AuthContext';

function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, user, logout } = useContext(AuthContext);

  const query = searchParams.get('q') || '';

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [newQuery, setNewQuery] = useState(query);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  // Filters State
  const [selectedPlatforms, setSelectedPlatforms] = useState({ amazon: true, flipkart: true });
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    if (query) {
      setNewQuery(query);
      fetchResults(query);
      setCurrentPage(1);
      // Reset filters on new search
      setSelectedPlatforms({ amazon: true, flipkart: true });
      setSelectedBrands([]);
      setPriceRange({ min: '', max: '' });
      setMinRating(0);
    }
  }, [query]);

  const fetchResults = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(
        `http://localhost:3000/api/product-details?product=${encodeURIComponent(searchQuery)}`,
        { headers }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch results');
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (newQuery.trim()) {
      navigate(`/results?q=${encodeURIComponent(newQuery.trim())}`);
    }
  };

  const parsePrice = (priceStr) => {
    if (!priceStr) return Infinity;
    const num = parseFloat(priceStr.replace(/[^\d.]/g, ''));
    return isNaN(num) ? Infinity : num;
  };

  // Process and Filter Data
  const { filteredProducts, uniqueBrands, totalFilteredCount, totalFetched, similarPricePairs } = useMemo(() => {
    let all = [];
    if (results) {
      const amazon = (results?.amazon?.products || []).map(p => ({ ...p, _platform: 'amazon' }));
      const flipkart = (results?.flipkart?.products || []).map(p => ({ ...p, _platform: 'flipkart' }));

      // Interleave to mix platforms while keeping the best relevant matches at the top
      const maxLength = Math.max(amazon.length, flipkart.length);
      for (let i = 0; i < maxLength; i++) {
        if (i < amazon.length) all.push(amazon[i]);
        if (i < flipkart.length) all.push(flipkart[i]);
      }
    }

    const totalFetched = all.length;

    // Extract brands
    const brandsSet = new Set();
    all.forEach(p => {
      if (p.name) {
        // Simple heuristic: first word of title is usually brand
        const brand = p.name.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (brand && brand.length > 1) brandsSet.add(brand);
      }
    });
    // Sort brands alphabetically, limit to top 15 to avoid huge lists
    const uniqueBrands = Array.from(brandsSet).sort().slice(0, 15);

    // Apply Filters
    let filtered = all.filter(p => {
      // Platform Filter
      if (!selectedPlatforms[p._platform]) return false;

      // Price Filter
      const price = parsePrice(p.currentPrice);
      const minP = parseFloat(priceRange.min);
      const maxP = parseFloat(priceRange.max);
      if (!isNaN(minP) && price < minP) return false;
      if (!isNaN(maxP) && price > maxP) return false;

      // Brand Filter
      if (selectedBrands.length > 0) {
        const pBrand = (p.name || '').split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!selectedBrands.includes(pBrand)) return false;
      }

      // Rating Filter
      if (minRating > 0) {
        const ratingNum = parseFloat(p.rating);
        if (isNaN(ratingNum) || ratingNum < minRating) return false;
      }

      return true;
    });

    // Find Similar Price Pairs
    const similarPricePairs = [];
    const amazonProds = filtered.filter(p => p._platform === 'amazon');
    const flipkartProds = filtered.filter(p => p._platform === 'flipkart');

    const usedFlipkart = new Set();
    amazonProds.forEach(amz => {
      const p1 = parsePrice(amz.currentPrice);
      if (p1 === Infinity) return;

      let bestMatch = null;
      let minDiff = Infinity;

      flipkartProds.forEach(flp => {
        if (usedFlipkart.has(flp.productLink)) return;
        const p2 = parsePrice(flp.currentPrice);
        if (p2 === Infinity) return;

        const diff = Math.abs(p1 - p2);
        const percentDiff = diff / Math.max(p1, p2);

        // Within 15% price difference
        if (percentDiff <= 0.15 && diff < minDiff) {
          minDiff = diff;
          bestMatch = flp;
        }
      });

      if (bestMatch) {
        const amzIndex = amazonProds.indexOf(amz);
        const flpIndex = flipkartProds.indexOf(bestMatch);
        similarPricePairs.push({
          amazon: amz,
          flipkart: bestMatch,
          priceDiff: minDiff,
          relevanceScore: amzIndex + flpIndex
        });
        usedFlipkart.add(bestMatch.productLink);
      }
    });

    // Sort by relevance (lowest combined index first) so the best matches are always shown at the top
    similarPricePairs.sort((a, b) => a.relevanceScore - b.relevanceScore);

    return { filteredProducts: filtered, uniqueBrands, totalFilteredCount: filtered.length, totalFetched, similarPricePairs };
  }, [results, selectedPlatforms, selectedBrands, priceRange, minRating]);

  // Pagination
  const totalPages = Math.ceil(totalFilteredCount / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handlers for Filters
  const handlePlatformChange = (platform) => {
    setSelectedPlatforms(prev => ({ ...prev, [platform]: !prev[platform] }));
    setCurrentPage(1);
  };
  const handleBrandChange = (brand) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
    setCurrentPage(1);
  };

  return (
    <div style={{ background: 'var(--ink)', minHeight: '100vh' }}>

      {/* ── STICKY NAV ── */}
      <header className="nav">
        <div className="nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <a className="nav-brand" href="/">
              <span className="brand-main">SMART</span>
              <span className="brand-accent">CART</span>
            </a>
          </div>


          <div className="nav-right">
            {user ? (
              <div className="nav-user">
                <span className="nav-username">Hi, {user.username}</span>
                {user.isAdmin && <a href="/admin" className="nav-admin-link">Admin</a>}
                <button onClick={logout} className="nav-logout">Logout</button>
              </div>
            ) : (
              <a href="/login" className="nav-login">Log in</a>
            )}
          </div>
        </div>
      </header>

      {/* ── PAGE HEADER ── */}
      <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '48px 20px 24px', display: 'flex', justifyContent: 'center', flexDirection: 'column' }}>
        <a href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontFamily: "'Archivo', sans-serif", fontSize: '12px', fontWeight: '700',
          color: 'var(--bone-55)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: '20px', transition: 'color 0.2s',
        }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--acid)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--bone-55)'}
        >
          ← Back to Home
        </a>
        <form onSubmit={handleSearch} style={{
          display: 'flex', flex: 1, maxWidth: '1060px',
          background: 'rgba(244,241,234,0.05)',
          border: '2px solid var(--bone-20)',
          borderRadius: '999px',
          padding: '5px 5px 5px 18px', gap: '8px', margin: '20px 24px',
        }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--acid)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--bone-20)'}
        >
          <span style={{ opacity: 0.4, display: 'flex', alignItems: 'center' }}>🔍</span>
          <input
            type="text"
            value={newQuery}
            onChange={e => setNewQuery(e.target.value)}
            placeholder="Search products…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--bone)', fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px',
            }}
          />
          <button type="submit" style={{
            padding: '8px 18px', borderRadius: '999px', border: 'none',
            background: 'var(--acid)', color: 'var(--ink)',
            fontFamily: "'Archivo', sans-serif", fontSize: '12px', fontWeight: '800',
            cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
          }}>
            Go →
          </button>
        </form>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '30px' }}>
          {['Under 99 (Electronics)', 'Under 99 (Grocery)', 'Under 99 (Clothes)'].map(s => (
            <span 
              key={s} 
              onClick={() => {
                const searchQ = s.replace(/[()]/g, '');
                setNewQuery(searchQ);
                navigate(`/results?q=${encodeURIComponent(searchQ)}`);
              }}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                background: 'rgba(244,241,234,0.05)',
                border: '1px solid var(--bone-20)',
                color: 'var(--bone-70)',
                fontSize: '13px',
                fontFamily: "'Space Grotesk', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--acid)'; e.currentTarget.style.color = 'var(--acid)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--bone-20)'; e.currentTarget.style.color = 'var(--bone-70)'; }}
            >
              {s}
            </span>
          ))}
        </div>

        {query && !loading && (
          <div style={{ marginBottom: '8px' }}>
            <div className="eyebrow" style={{ marginBottom: '16px' }}>
              <span className="eyebrow-dot" />
              SEARCH RESULTS
            </div>
            <h1 style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(28px, 5vw, 56px)',
              letterSpacing: '-0.03em', lineHeight: '0.9', color: 'var(--bone)', marginBottom: '16px',
            }}>
              {query.toUpperCase().split(' ').map((word, i) => (
                <span key={i}>
                  {i === 0 ? <span style={{ color: 'var(--acid)' }}>{word}</span> : ` ${word}`}
                </span>
              ))}
            </h1>
          </div>
        )}
      </div>

      {/* ── LOADING & ERROR ── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '100px 20px' }}>
          <div className="loader on" style={{ display: 'flex' }}>
            <div className="loader-dot" />
            <div className="loader-dot" />
            <div className="loader-dot" />
          </div>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--bone-55)', fontSize: '14px' }}>
            Fetching up to 3 pages from Amazon &amp; Flipkart…
          </p>
        </div>
      )}

      {error && !loading && (
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 20px 40px' }}>
          <div className="error-card">⚠ {error}</div>
        </div>
      )}

      {/* ── RESULTS LAYOUT (Sidebar + Grid) ── */}
      {results && !loading && (
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 20px 80px' }}>

          <div className="summary-bar" style={{ marginBottom: '32px' }}>
            <div className="summary-query">
              Found <strong>{totalFetched} total products</strong> across platforms. Showing <strong>{totalFilteredCount}</strong> matching filters.
            </div>
          </div>

          <div className="results-layout">

            {/* ── SIDEBAR FILTERS ── */}
            <aside className="sidebar">
              <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '20px', color: 'var(--bone)', marginBottom: '24px' }}>
                Filters
              </div>

              {/* Platform */}
              <div className="filter-section">
                <div className="filter-title">Platform</div>
                <label className="filter-label">
                  <input type="checkbox" className="filter-checkbox"
                    checked={selectedPlatforms.amazon} onChange={() => handlePlatformChange('amazon')}
                  />
                  Amazon
                </label>
                <label className="filter-label">
                  <input type="checkbox" className="filter-checkbox"
                    checked={selectedPlatforms.flipkart} onChange={() => handlePlatformChange('flipkart')}
                  />
                  Flipkart
                </label>
              </div>

              {/* Price Range */}
              <div className="filter-section">
                <div className="filter-title">Price Range</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="Min ₹"
                    value={priceRange.min}
                    onChange={e => { setPriceRange(prev => ({ ...prev, min: e.target.value })); setCurrentPage(1); }}
                    style={{
                      width: '80px', padding: '6px', background: 'transparent',
                      border: '1px solid var(--bone-20)', color: 'var(--bone)', borderRadius: '4px',
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px'
                    }}
                  />
                  <span style={{ color: 'var(--bone-55)' }}>to</span>
                  <input
                    type="number"
                    placeholder="Max ₹"
                    value={priceRange.max}
                    onChange={e => { setPriceRange(prev => ({ ...prev, max: e.target.value })); setCurrentPage(1); }}
                    style={{
                      width: '80px', padding: '6px', background: 'transparent',
                      border: '1px solid var(--bone-20)', color: 'var(--bone)', borderRadius: '4px',
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* Customer Rating */}
              <div className="filter-section">
                <div className="filter-title">Customer Rating</div>
                {[4, 3, 2, 1].map(stars => (
                  <label key={stars} className="filter-label">
                    <input
                      type="radio"
                      name="rating"
                      className="filter-checkbox"
                      checked={minRating === stars}
                      onChange={() => { setMinRating(stars); setCurrentPage(1); }}
                    />
                    {stars}★ &amp; Up
                  </label>
                ))}
                <label className="filter-label">
                  <input
                    type="radio"
                    name="rating"
                    className="filter-checkbox"
                    checked={minRating === 0}
                    onChange={() => { setMinRating(0); setCurrentPage(1); }}
                  />
                  Any Rating
                </label>
              </div>

              {/* Brand */}
              {uniqueBrands.length > 0 && (
                <div className="filter-section" style={{ borderBottom: 'none' }}>
                  <div className="filter-title">Top Brands</div>
                  {uniqueBrands.map(brand => (
                    <label key={brand} className="filter-label">
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => handleBrandChange(brand)}
                      />
                      {brand}
                    </label>
                  ))}
                </div>
              )}
            </aside>

            {/* ── MAIN CONTENT (Results Grid) ── */}
            <main className="main-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                <div className="section-heading" style={{ color: 'var(--bone)', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span>Products</span>

                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--bone-55)', fontSize: '14px' }}>
                  {totalFilteredCount > 0
                    ? `Showing ${Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalFilteredCount)} – ${Math.min(currentPage * ITEMS_PER_PAGE, totalFilteredCount)} of ${totalFilteredCount}`
                    : '0 results'
                  }
                </div>
              </div>

              {totalFilteredCount === 0 ? (
                <div className="error-card">No products match your selected filters.</div>
              ) : (
                <div className="results-4col-grid">
                  {paginatedProducts.map((product, idx) => (
                    <ProductCard
                      key={`${product._platform}-${idx}`}
                      product={product}
                      platform={product._platform}
                      initialCompact={false}
                    />
                  ))}
                </div>
              )}

              {/* ── PAGINATION ── */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '48px' }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      padding: '10px 20px', borderRadius: '999px',
                      border: '2px solid var(--bone-20)', background: 'transparent',
                      color: currentPage === 1 ? 'var(--bone-30)' : 'var(--bone)',
                      fontFamily: "'Archivo', sans-serif", fontSize: '13px', fontWeight: '700',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer', transition: 'border-color 0.2s, color 0.2s'
                    }}
                  >
                    ← Prev
                  </button>

                  <div style={{
                    display: 'flex', alignItems: 'center', padding: '0 10px',
                    fontFamily: "'Space Grotesk', sans-serif", color: 'var(--bone-70)', fontSize: '14px'
                  }}>
                    Page <strong style={{ color: 'var(--bone)', margin: '0 4px' }}>{currentPage}</strong> of {totalPages}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(totalPages, prev + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      padding: '10px 20px', borderRadius: '999px',
                      border: '2px solid var(--bone-20)', background: 'transparent',
                      color: currentPage === totalPages ? 'var(--bone-30)' : 'var(--bone)',
                      fontFamily: "'Archivo', sans-serif", fontSize: '13px', fontWeight: '700',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', transition: 'border-color 0.2s, color 0.2s'
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </main>

          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!query && !loading && (
        <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '32px', letterSpacing: '-0.03em', color: 'var(--bone)', marginBottom: '12px' }}>
            No search term
          </h2>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--bone-55)', marginBottom: '28px' }}>
            Use the search bar above or go back home to pick a category.
          </p>
          <a href="/" className="pill-primary">← Go Home</a>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span style={{ color: 'var(--bone)' }}>SMART</span>
            <span style={{ color: 'var(--acid)' }}>CART</span>
            <span style={{ color: 'var(--bone)' }}> COMPARE</span>
          </div>
          <p className="footer-tagline">Prices may vary. Always verify before purchase.</p>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} SmartCart Compare. Built for smart shoppers.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default SearchResults;
