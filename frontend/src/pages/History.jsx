import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchHistory();
  }, [token]);

  return (
    <div className="history-page">
      {/* ── STICKY NAV ── */}
      <header className="nav">
        <div className="nav-inner">
          <a className="nav-brand" href="/">
            <span className="brand-main">SMART</span>

            <span className="brand-accent">CART</span>
            <span className="brand-main">COMPARE</span>
          </a>
          <div className="nav-right">
            <a href="/" className="nav-login">← Back to Compare</a>
          </div>
        </div>
      </header>

      <div className="history-content">
        {loading ? (
          <div style={{ display: 'flex', gap: '8px', padding: '80px 0', justifyContent: 'center' }}>
            <div className="loader-dot" style={{ display: 'block', animation: 'loaderBounce 0.9s ease-in-out infinite' }} />
            <div className="loader-dot" style={{ display: 'block', animation: 'loaderBounce 0.9s ease-in-out 0.15s infinite', background: 'var(--hot)' }} />
            <div className="loader-dot" style={{ display: 'block', animation: 'loaderBounce 0.9s ease-in-out 0.3s infinite' }} />
          </div>
        ) : (
          <>
            <div className="eyebrow" style={{ marginBottom: '20px' }}>
              <span className="eyebrow-dot" />
              SEARCH HISTORY
            </div>
            <h1 className="history-title">
              YOUR PAST<br />
              <span style={{ color: 'var(--acid)' }}>SEARCHES.</span>
            </h1>
            <p className="history-sub">
              Click any search to instantly run a fresh price comparison.
            </p>

            {history.length === 0 ? (
              <div className="error-card" style={{ textAlign: 'center', padding: '48px' }}>
                No search history yet. Start comparing!
              </div>
            ) : (
              <div className="history-list">
                {history.map((item, i) => (
                  <div
                    key={item._id}
                    id={`history-item-${i}`}
                    className="history-item"
                    onClick={() => navigate(`/results?q=${encodeURIComponent(item.query)}&fromHistory=true`)}
                  >
                    <div>
                      <div className="history-query">{item.query}</div>
                      <div className="history-time">{new Date(item.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="history-arrow">→</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span style={{ color: 'var(--bone)' }}>SMART</span>
            <span style={{ color: 'var(--acid)' }}>CART</span>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} SmartCart Compare. Built for smart shoppers.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default History;
