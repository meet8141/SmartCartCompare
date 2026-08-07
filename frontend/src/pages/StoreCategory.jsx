import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StoreNavbar from '../components/StoreNavbar';
import { AuthContext } from '../contexts/AuthContext';

const SORT_OPTIONS = [
  { value: 'default',    label: 'Default' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'name_asc',   label: 'Name: A → Z' },
  { value: 'name_desc',  label: 'Name: Z → A' },
];

function StoreCategory() {
  const { categoryId } = useParams();
  const [products, setProducts]         = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [notification, setNotification] = useState(null);
  const { token } = useContext(AuthContext);
  const navigate  = useNavigate();

  // ── Filter state ──────────────────────────────────────────
  const [sortBy,        setSortBy]        = useState('default');
  const [priceRange,    setPriceRange]    = useState([0, 100000]);
  const [maxPriceLimit, setMaxPriceLimit] = useState(100000);
  const [inStockOnly,   setInStockOnly]   = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [ratingMin,     setRatingMin]     = useState(0);

  useEffect(() => { fetchProducts(); }, [categoryId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`http://localhost:3000/api/store/products?category=${categoryId}`);
      const data = await res.json();
      const prods = data.products || [];
      setProducts(prods);
      if (prods.length) {
        const max = Math.max(...prods.map(p => p.price));
        setMaxPriceLimit(max);
        setPriceRange([0, max]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Apply filters ─────────────────────────────────────────
  useEffect(() => {
    let result = [...products];
    if (searchQuery.trim()) {
      result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (inStockOnly) result = result.filter(p => p.stock > 0);
    if (ratingMin > 0) result = result.filter(p => (p.rating || 0) >= ratingMin);
    switch (sortBy) {
      case 'price_asc':  result.sort((a, b) => a.price - b.price); break;
      case 'price_desc': result.sort((a, b) => b.price - a.price); break;
      case 'name_asc':   result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name_desc':  result.sort((a, b) => b.name.localeCompare(a.name)); break;
      default: break;
    }
    setFiltered(result);
  }, [products, searchQuery, priceRange, inStockOnly, ratingMin, sortBy]);

  const resetFilters = () => {
    setSortBy('default');
    setPriceRange([0, maxPriceLimit]);
    setInStockOnly(false);
    setSearchQuery('');
    setRatingMin(0);
  };

  const showNotif = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  };

  const addToCart = async (productId) => {
    try {
      const res = await fetch('http://localhost:3000/api/store/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (res.ok) showNotif('Added to cart! 🛒');
      else showNotif('Failed to add to cart.', 'error');
    } catch { showNotif('Error adding to cart.', 'error'); }
  };

  const addToWishlist = async (productId) => {
    try {
      const res = await fetch('http://localhost:3000/api/store/wishlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) showNotif('Saved to wishlist! ❤️');
      else showNotif('Failed to save.', 'error');
    } catch { showNotif('Error saving to wishlist.', 'error'); }
  };

  const activeCount = [
    sortBy !== 'default',
    priceRange[0] > 0 || priceRange[1] < maxPriceLimit,
    inStockOnly,
    searchQuery.trim() !== '',
    ratingMin > 0,
  ].filter(Boolean).length;

  const labelStyle  = { color: 'var(--bone-55)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px', display: 'block' };
  const inputStyle  = { background: 'rgba(244,241,234,0.07)', border: '1px solid rgba(244,241,234,0.15)', borderRadius: '8px', color: 'var(--bone)', padding: '8px 12px', fontSize: '13px', width: '100%', outline: 'none' };
  const sectionStyle = { marginBottom: '28px' };

  return (
    <div className="page">
      <StoreNavbar />

      {/* ── Toast notification ── */}
      {notification && (
        <div style={{
          position: 'fixed', bottom: '32px', right: '32px', zIndex: 9999,
          background: notification.type === 'error' ? 'var(--hot)' : 'var(--acid)',
          color: notification.type === 'error' ? '#fff' : 'var(--ink)',
          padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {notification.msg}
        </div>
      )}

      <div style={{ paddingTop: '80px', display: 'flex', minHeight: '100vh' }}>

        {/* ── FILTER SIDEBAR ── */}
        <aside style={{
          width: sidebarOpen ? '268px' : '0',
          minWidth: sidebarOpen ? '268px' : '0',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          borderRight: '1px solid rgba(244,241,234,0.08)',
          padding: sidebarOpen ? '28px 18px' : '0',
          background: 'rgba(244,241,234,0.02)',
          position: 'sticky', top: '80px', height: 'calc(100vh - 80px)', overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ color: 'var(--bone)', fontWeight: '800', fontSize: '15px' }}>Filters</span>
            {activeCount > 0 && (
              <button onClick={resetFilters} style={{ background: 'none', border: '1px solid rgba(244,241,234,0.2)', borderRadius: '999px', color: 'var(--bone-55)', fontSize: '11px', padding: '3px 10px', cursor: 'pointer' }}>
                Clear ({activeCount})
              </button>
            )}
          </div>

          {/* Search */}
          <div style={sectionStyle}>
            <span style={labelStyle}>Search</span>
            <input style={inputStyle} type="text" placeholder={`Find in ${categoryId}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          {/* Sort */}
          <div style={sectionStyle}>
            <span style={labelStyle}>Sort By</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setSortBy(opt.value)} style={{
                  background: sortBy === opt.value ? 'var(--acid)' : 'rgba(244,241,234,0.05)',
                  border: `1px solid ${sortBy === opt.value ? 'var(--acid)' : 'rgba(244,241,234,0.12)'}`,
                  borderRadius: '8px', color: sortBy === opt.value ? 'var(--ink)' : 'var(--bone)',
                  padding: '8px 12px', fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                  fontWeight: sortBy === opt.value ? '700' : '400', transition: 'all 0.15s ease'
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div style={sectionStyle}>
            <span style={labelStyle}>Price Range</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--acid)', fontSize: '13px', fontWeight: '700' }}>₹{priceRange[0].toLocaleString('en-IN')}</span>
              <span style={{ color: 'var(--acid)', fontSize: '13px', fontWeight: '700' }}>₹{priceRange[1].toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--bone-55)', fontSize: '11px', width: '28px' }}>Min</span>
                <input type="range" min={0} max={maxPriceLimit} value={priceRange[0]}
                  onChange={e => { const v = Number(e.target.value); if (v <= priceRange[1]) setPriceRange([v, priceRange[1]]); }}
                  style={{ flex: 1, accentColor: 'var(--acid)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--bone-55)', fontSize: '11px', width: '28px' }}>Max</span>
                <input type="range" min={0} max={maxPriceLimit} value={priceRange[1]}
                  onChange={e => { const v = Number(e.target.value); if (v >= priceRange[0]) setPriceRange([priceRange[0], v]); }}
                  style={{ flex: 1, accentColor: 'var(--acid)' }} />
              </div>
            </div>
          </div>

          {/* Availability Toggle */}
          <div style={sectionStyle}>
            <span style={labelStyle}>Availability</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <div onClick={() => setInStockOnly(!inStockOnly)} style={{
                width: '40px', height: '22px', borderRadius: '999px',
                background: inStockOnly ? 'var(--acid)' : 'rgba(244,241,234,0.15)',
                position: 'relative', transition: 'background 0.2s ease', cursor: 'pointer', flexShrink: 0
              }}>
                <div style={{
                  position: 'absolute', top: '3px', left: inStockOnly ? '21px' : '3px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: inStockOnly ? 'var(--ink)' : 'var(--bone-55)',
                  transition: 'left 0.2s ease'
                }} />
              </div>
              <span style={{ color: 'var(--bone)', fontSize: '13px' }}>In Stock Only</span>
            </label>
          </div>

          {/* Min Rating */}
          <div style={sectionStyle}>
            <span style={labelStyle}>Minimum Rating</span>
            <div style={{ display: 'flex', gap: '5px' }}>
              {[0, 1, 2, 3, 4].map(star => {
                const val = star === 0 ? 0 : star + 1;
                return (
                  <button key={star} onClick={() => setRatingMin(val)} style={{
                    flex: 1, padding: '6px 0', borderRadius: '8px',
                    background: ratingMin === val ? 'var(--acid)' : 'rgba(244,241,234,0.05)',
                    border: `1px solid ${ratingMin === val ? 'var(--acid)' : 'rgba(244,241,234,0.12)'}`,
                    color: ratingMin === val ? 'var(--ink)' : 'var(--bone)',
                    fontSize: '12px', cursor: 'pointer', fontWeight: ratingMin === val ? '700' : '400'
                  }}>
                    {star === 0 ? 'All' : `${star + 1}★`}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, padding: '28px 24px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
                background: 'rgba(244,241,234,0.08)', border: '1px solid rgba(244,241,234,0.15)',
                borderRadius: '8px', color: 'var(--bone)', padding: '8px 14px', fontSize: '13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                {sidebarOpen ? '✕ Hide' : '⊞ Filters'}
                {activeCount > 0 && (
                  <span style={{ background: 'var(--acid)', color: 'var(--ink)', borderRadius: '999px', fontSize: '11px', fontWeight: '800', padding: '1px 7px' }}>{activeCount}</span>
                )}
              </button>
              <div>
                <h2 style={{ color: 'var(--bone)', fontFamily: 'Archivo Black', fontSize: '20px', lineHeight: 1 }}>{categoryId.toUpperCase()}</h2>
                <span style={{ color: 'var(--bone-55)', fontSize: '13px' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <button className="pill-ghost" onClick={() => navigate('/store')} style={{ fontSize: '13px' }}>← Back to Store</button>
          </div>

          {loading ? (
            <div className="loader on" style={{ margin: '80px auto' }}>
              <div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <div style={{ color: 'var(--bone)', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No products match your filters</div>
              <div style={{ color: 'var(--bone-55)', fontSize: '14px', marginBottom: '24px' }}>Try adjusting or clearing your filters.</div>
              <button className="pill-ghost" onClick={resetFilters}>Clear All Filters</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '18px' }}>
              {filtered.map(product => (
                <div key={product._id} className="product-card visible" style={{ position: 'relative' }}>
                  {product.stock <= 0 && (
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'var(--hot)', color: '#fff', fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '999px', textTransform: 'uppercase', zIndex: 2 }}>Out of Stock</div>
                  )}
                  {product.stock > 0 && product.stock < 10 && (
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#ffbb40', color: 'var(--ink)', fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '999px', textTransform: 'uppercase', zIndex: 2 }}>Only {product.stock} left</div>
                  )}
                  <div className="card-img-area">
                    <img src={product.imageUrl} alt={product.name} style={{ opacity: product.stock <= 0 ? 0.5 : 1 }} />
                  </div>
                  <div className="card-body">
                    <h3 className="card-name" title={product.name}>{product.name}</h3>
                    {product.rating > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <span style={{ color: '#fbbf24', fontSize: '12px' }}>{'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}</span>
                        <span style={{ color: 'var(--bone-55)', fontSize: '11px' }}>({product.rating})</span>
                      </div>
                    )}
                    <div className="price-col">
                      <span className="price-current">₹{product.price.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '12px', flexWrap: 'wrap' }}>
                      <button className="pill-primary" style={{ flex: '1 1 45%', fontSize: '13px', padding: '8px', justifyContent: 'center', opacity: product.stock <= 0 ? 0.5 : 1 }} onClick={() => addToCart(product._id)} disabled={product.stock <= 0}>🛒 Cart</button>
                      <button className="pill-ghost"   style={{ flex: '1 1 45%', fontSize: '13px', padding: '8px', justifyContent: 'center' }} onClick={() => addToWishlist(product._id)}>❤️ Save</button>
                      <button className="pill-hot" style={{ flex: '1 1 100%', justifyContent: 'center', padding: '10px', opacity: product.stock <= 0 ? 0.5 : 1 }} onClick={() => navigate(`/payment?productId=${product._id}`)} disabled={product.stock <= 0}>⚡ Buy Now</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default StoreCategory;

