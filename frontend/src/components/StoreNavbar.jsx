import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

function StoreNavbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="nav">
      <div className="nav-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <a className="nav-brand" href="/">
            <span className="brand-main">SMART</span>
            <span className="brand-accent">CART</span>
            <span className="brand-main">Compare</span>
          </a>
          <div className="nav-badge">
            <span>🛒</span>
            <span>Mock Store</span>
          </div>
        </div>

        <ul className="nav-links">
          <li><a href="/">Home</a></li>
          <li><a href="/store">Store</a></li>
          {user && <li><a href="/cart">Cart</a></li>}
          {user && <li><a href="/wishlist">Wishlist</a></li>}
        </ul>

        <div className="nav-right">
          {user ? (
            <div className="nav-user">
              <span className="nav-username">Hi, {user.username}</span>
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
  );
}

export default StoreNavbar;
