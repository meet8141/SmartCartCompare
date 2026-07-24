import React, { useState } from 'react';
import ProductCard from './components/ProductCard';

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`http://localhost:3000/api/product-details?product=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    // Ideally, trigger search immediately here, but setting state is async
    // Let's just set the input value for now and user can click search.
  };

  return (
    <div className="page">
      <div className="bg-orbs"></div>

      <nav>
        <a className="nav-brand" href="/">
          <div className="nav-logo">🛒</div>
          <span className="nav-title">SmartCart Compare</span>
        </a>
        <div className="nav-pill">
          <div className="live-dot"></div>
          Live Prices
        </div>
      </nav>

      <section className="hero">
        <span className="hero-eyebrow">Real-time price comparison</span>
        <h1>
          <span className="h1-line1">Find the Best Deal on</span>
          <span className="h1-line2">Amazon & Flipkart</span>
        </h1>
        <p className="hero-sub">
          Enter any product name and instantly compare prices, ratings,
          and specs from both platforms — side by side, in real time.
        </p>

        <div className="search-container">
          <form onSubmit={handleSearch} className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="productInput"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Try "Samsung S24", "iPhone 15 Pro", "boAt headphones"…'
              autoComplete="off"
            />
            <button type="submit" className="searchBtn" disabled={loading}>
              <span id="btnText">{loading ? 'Searching' : 'Compare'}</span>
              <span id="btnArrow">{loading ? '…' : '→'}</span>
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
      </section>

      {loading && (
        <div className="loader on">
          <div className="loader-dot"></div>
          <div className="loader-dot"></div>
          <div className="loader-dot"></div>
        </div>
      )}

      {error && (
        <div className="statusBar err">{error}</div>
      )}

      {results && !loading && (
        <div className="resultsSection" style={{ display: 'block' }}>
          <div className="summary-bar">
            <div className="summary-query">Results for <strong>{results.query}</strong></div>
            <div className="summary-counts">
              <div className="src-badge amazon"><div className="dot"></div>{results.amazon?.products?.length || 0} on Amazon</div>
              <div className="src-badge flipkart"><div className="dot"></div>{results.flipkart?.products?.length || 0} on Flipkart</div>
            </div>
          </div>

          <div className="section-heading" style={{ marginBottom: '16px', color: '#fff', fontSize: '20px', fontWeight: '700' }}>
            Best Matches
          </div>
          <div className="compare-grid">
            {/* Amazon Column */}
            <div className="platform-col">
              <div className="platform-header amazon">
                <div className="ph-icon">📦</div>
                <div className="ph-name">Amazon.in</div>
                {results.amazon?.searchUrl && (
                  <a href={results.amazon.searchUrl} target="_blank" rel="noopener noreferrer" className="ph-link">View all ↗</a>
                )}
              </div>

              {results.amazon?.error ? (
                <div className="error-card">⚠️ {results.amazon.error}</div>
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
                  <a href={results.flipkart.searchUrl} target="_blank" rel="noopener noreferrer" className="ph-link">View all ↗</a>
                )}
              </div>

              {results.flipkart?.error ? (
                <div className="error-card">⚠️ {results.flipkart.error}</div>
              ) : results.flipkart?.products?.length > 0 ? (
                <ProductCard product={results.flipkart.products[0]} platform="flipkart" />
              ) : (
                <div className="error-card">No products found on Flipkart.</div>
              )}
            </div>
          </div>

          {/* Other Results */}
          {(results.amazon?.products?.length > 1 || results.flipkart?.products?.length > 1) && (
            <div style={{ marginTop: '48px', maxWidth: '800px', margin: '48px auto 0' }}>
              <div className="section-heading" style={{ marginBottom: '16px', color: '#a99ebc', fontSize: '16px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                Other Options
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

      {!results && !loading && (
        <div className="placeholderSection">
          <div className="placeholder-col">
            <div className="ph-emoji">🛒</div>
            <div className="ph-label">Amazon results appear here</div>
          </div>
          <div className="placeholder-col">
            <div className="ph-emoji">🛍️</div>
            <div className="ph-label">Flipkart results appear here</div>
          </div>
        </div>
      )}

      <footer>
        SmartCart Compare fetches live data directly from Amazon.in & Flipkart.com.<br />
        Prices may vary. Always verify before purchase.
      </footer>
    </div>
  );
}

export default App;
