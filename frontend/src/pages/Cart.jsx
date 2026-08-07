import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import StoreNavbar from '../components/StoreNavbar';
import { AuthContext } from '../contexts/AuthContext';

function Cart() {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/store/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCart(data.cart || { items: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [token]);

  const removeFromCart = async (productId) => {
    try {
      await fetch('http://localhost:3000/api/store/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ productId })
      });
      fetchCart();
    } catch (err) {
      console.error(err);
    }
  };

  const total = cart.items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  return (
    <div className="page">
      <StoreNavbar />
      
      <div className="section" style={{ paddingTop: '100px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="section-title">YOUR <span style={{ color: 'var(--hot)' }}>CART</span></h2>
        
        {loading ? (
          <div className="loader on"><div className="loader-dot"/><div className="loader-dot"/><div className="loader-dot"/></div>
        ) : cart.items.length === 0 ? (
          <div className="error-card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛒</div>
            Your cart is empty. <br/><br/>
            <button className="pill-primary" onClick={() => navigate('/store')}>Browse Store</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cart.items.map(item => (
              <div key={item._id} className="product-card compact">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  <img src={item.product.imageUrl} alt={item.product.name} style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px', background: 'rgba(244,241,234,0.03)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h3 className="card-name" style={{ fontSize: '15px' }}>{item.product.name}</h3>
                    <div style={{ color: 'var(--bone-55)', fontSize: '13px' }}>Qty: {item.quantity}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="price-current" style={{ fontSize: '20px' }}>₹{item.product.price * item.quantity}</span>
                  <button className="pill-ghost" style={{ padding: '8px 16px' }} onClick={() => removeFromCart(item.product._id)}>Remove</button>
                </div>
              </div>
            ))}
            
            <div className="summary-bar" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '20px', color: 'var(--bone)' }}>Total: <span style={{ color: 'var(--acid)', fontWeight: 'bold' }}>₹{total}</span></div>
              <button className="searchBtn" style={{ width: 'auto' }} onClick={() => navigate('/payment?fromCart=true')}>Proceed to Checkout →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;
