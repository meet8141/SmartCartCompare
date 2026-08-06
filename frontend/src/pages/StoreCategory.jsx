import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StoreNavbar from '../components/StoreNavbar';
import { AuthContext } from '../contexts/AuthContext';

function StoreCategory() {
  const { categoryId } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, [categoryId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/store/products?category=${categoryId}`);
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId) => {
    try {
      const response = await fetch('http://localhost:3000/api/store/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId, quantity: 1 })
      });
      if (response.ok) {
        alert('Added to cart!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addToWishlist = async (productId) => {
    try {
      const response = await fetch('http://localhost:3000/api/store/wishlist/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });
      if (response.ok) {
        alert('Saved to wishlist!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page">
      <StoreNavbar />
      
      <div className="section" style={{ paddingTop: '100px' }}>
        <div className="section-head">
          <h2 className="section-title">
            <span style={{ color: 'var(--bone)' }}>{categoryId.toUpperCase()}</span>
          </h2>
          <button className="pill-secondary" onClick={() => navigate('/store')}>← Back to Categories</button>
        </div>

        {loading ? (
           <div className="loader on"><div className="loader-dot"/><div className="loader-dot"/><div className="loader-dot"/></div>
        ) : (
          <div className="compare-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {products.map(product => (
              <div key={product._id} className="hot-deal-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center' }}>
                <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '200px', objectFit: 'contain', borderRadius: '8px', background: '#fff' }} />
                <h3 style={{ fontSize: '15px', margin: 0, color: 'var(--bone)', lineHeight: 1.4, minHeight: '42px' }}>{product.name}</h3>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--acid)' }}>₹{product.price.toLocaleString('en-IN')}</div>
                
                <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: 'auto', flexWrap: 'wrap' }}>
                  <button className="pill-primary" style={{ flex: '1 1 45%', fontSize: '13px' }} onClick={() => addToCart(product._id)}>🛒 Cart</button>
                  <button className="pill-secondary" style={{ flex: '1 1 45%', fontSize: '13px' }} onClick={() => addToWishlist(product._id)}>❤️ Save</button>
                  <button 
                    style={{ 
                      flex: '1 1 100%', padding: '10px', borderRadius: '999px', border: 'none',
                      background: 'linear-gradient(135deg, var(--hot), #ff6b3d)', color: '#fff', 
                      fontWeight: '800', fontSize: '14px', cursor: 'pointer', fontFamily: "'Archivo', sans-serif",
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,45,120,0.4)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                    onClick={() => navigate(`/payment?productId=${product._id}`)}
                  >
                    ⚡ Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StoreCategory;
