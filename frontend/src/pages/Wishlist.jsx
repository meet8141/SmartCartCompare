import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import StoreNavbar from '../components/StoreNavbar';
import { AuthContext } from '../contexts/AuthContext';

function Wishlist() {
  const [wishlist, setWishlist] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/store/wishlist', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setWishlist(data.wishlist || { items: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [token]);

  const removeFromWishlist = async (productId) => {
    try {
      await fetch('http://localhost:3000/api/store/wishlist/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ productId })
      });
      fetchWishlist();
    } catch (err) {
      console.error(err);
    }
  };

  const moveToCart = async (productId) => {
    try {
      await fetch('http://localhost:3000/api/store/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ productId, quantity: 1 })
      });
      await removeFromWishlist(productId);
      alert('Moved to cart!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page">
      <StoreNavbar />
      
      <div className="section" style={{ paddingTop: '100px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="section-title">YOUR <span style={{ color: 'var(--hot)' }}>WISHLIST</span></h2>
        
        {loading ? (
          <div className="loader on"><div className="loader-dot"/><div className="loader-dot"/><div className="loader-dot"/></div>
        ) : wishlist.items.length === 0 ? (
          <div className="error-card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>❤️</div>
            Your wishlist is empty. <br/><br/>
            <button className="pill-primary" onClick={() => navigate('/store')}>Browse Store</button>
          </div>
        ) : (
          <div className="compare-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {wishlist.items.map(product => (
              <div key={product._id} className="hot-deal-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center' }}>
                <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                <h3 style={{ fontSize: '18px', margin: 0, color: 'var(--bone)' }}>{product.name}</h3>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--acid)' }}>₹{product.price}</div>
                
                <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
                  <button className="pill-primary" style={{ flex: 1 }} onClick={() => moveToCart(product._id)}>🛒 Move to Cart</button>
                  <button className="pill-secondary" onClick={() => removeFromWishlist(product._id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Wishlist;
