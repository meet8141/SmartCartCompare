import React from 'react';
import { useNavigate } from 'react-router-dom';
import StoreNavbar from '../components/StoreNavbar';

const CATEGORIES = [
  { name: 'Sports', icon: '⚽', color: 'var(--hot)' },
  { name: 'Clothes', icon: '👕', color: 'var(--bone)' },
  { name: 'Shoes', icon: '👟', color: 'var(--acid)' },
  { name: 'Electronics', icon: '🔌', color: 'var(--ink)' },
  { name: 'Groceries', icon: '🥫', color: 'var(--hot)' },
  { name: 'Home', icon: '🏠', color: 'var(--bone)' },
  { name: 'Bags', icon: '🎒', color: 'var(--acid)' },
  { name: 'Headphones', icon: '🎧', color: 'var(--ink)' }
];

function StoreHome() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <StoreNavbar />
      
      <section className="hero grain" style={{ minHeight: '40vh', paddingTop: '100px' }}>
        <div className="hero-content">
          <h1>
            <span style={{ color: 'var(--bone)', display: 'block' }}>MOCK</span>
            <span style={{ color: 'var(--acid)', display: 'block' }}>STORE.</span>
          </h1>
          <p className="hero-sub">
            Browse our dummy products, add to cart, and checkout with our mock payment gateway.
          </p>
        </div>
      </section>

      <div className="section">
        <div className="section-head">
          <h2 className="section-title">
            SHOP BY <span style={{ color: 'var(--hot)' }}>CATEGORY</span>
          </h2>
        </div>
        
        <div className="bento-grid">
          {CATEGORIES.map((cat, index) => {
            const bentoClasses = ['bento-tile-acid', 'bento-tile-ink', 'bento-tile-hot', 'bento-tile-bone'];
            const assignedClass = bentoClasses[index % bentoClasses.length];
            return (
              <div 
                key={cat.name}
                className={`bento-tile ${assignedClass}`} 
                onClick={() => navigate(`/store/category/${cat.name}`)}
              >
                <div className="bento-icon" style={{ fontSize: '40px' }}>{cat.icon}</div>
                <div className="bento-label">{cat.name.toUpperCase()}</div>
                <div className="bento-sub">Explore mock {cat.name.toLowerCase()} products</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StoreHome;
