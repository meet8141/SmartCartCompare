import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function Verify() {
  const { login } = useContext(AuthContext);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get('email');

  useEffect(() => {
    if (!email) navigate('/login');
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError('Verification code must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed');

      if (data.token && data.user) {
        login(data.token, data.user);
      }
      
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page grain" style={{ background: 'var(--ink)' }}>
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '20px' }}>✅</div>
          <h2 style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '36px',
            letterSpacing: '-0.03em',
            color: 'var(--acid)',
            marginBottom: '12px'
          }}>
            Verified!
          </h2>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            color: 'var(--bone-60)',
            fontSize: '14px',
            lineHeight: '1.65'
          }}>
            Your account is confirmed. Redirecting you to home…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page grain" style={{ background: 'var(--ink)' }}>
      {/* Blobs */}
      <div style={{
        position: 'absolute', width: '100px', height: '60px',
        background: 'var(--acid)', borderRadius: '16px',
        top: '10%', right: '10%', transform: 'rotate(10deg)',
        boxShadow: '10px 10px 0 var(--ink)', opacity: 0.7
      }} />
      <div style={{
        position: 'absolute', width: '70px', height: '70px',
        background: 'var(--hot)', borderRadius: '50%',
        bottom: '14%', left: '8%',
        boxShadow: '10px 10px 0 var(--ink)', opacity: 0.75
      }} />

      <div className="auth-card">
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <a href="/" style={{ textDecoration: 'none', fontFamily: "'Archivo Black', sans-serif", fontSize: '22px', letterSpacing: '-0.03em' }}>
            <span style={{ color: 'var(--bone)' }}>SMART</span>
            <span style={{ color: 'var(--acid)' }}>CART</span>
          </a>
        </div>

        <h1 className="auth-title">Verify<br />Email.</h1>
        <p className="auth-sub">
          We sent a 6-digit code to <strong style={{ color: 'var(--acid)', fontWeight: 700 }}>{email}</strong>
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" id="verify-form">
          <div>
            <label className="auth-label" htmlFor="verify-code">6-Digit Code</label>
            <input
              id="verify-code"
              type="text"
              className="auth-input otp-input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              maxLength={6}
              placeholder="000000"
            />
          </div>
          <button
            id="verify-submit"
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? 'Verifying…' : 'Verify →'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Verify;
