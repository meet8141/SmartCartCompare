import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresVerification) {
          navigate(`/verify?email=${encodeURIComponent(email)}`);
          return;
        }
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page grain" style={{ background: 'var(--ink)' }}>
      {/* Background blobs */}
      <div style={{
        position: 'absolute', width: '200px', height: '120px',
        background: 'var(--acid)', borderRadius: '32px',
        top: '8%', right: '8%', transform: 'rotate(15deg)',
        boxShadow: '10px 10px 0 var(--ink)',
        opacity: 0.7, display: 'none'
      }} className="auth-blob-lg" />
      <div style={{
        position: 'absolute', width: '80px', height: '80px',
        background: 'var(--hot)', borderRadius: '50%',
        bottom: '12%', left: '6%',
        boxShadow: '10px 10px 0 var(--ink)',
        opacity: 0.8
      }} />

      <div className="auth-card">
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <a href="/" style={{ textDecoration: 'none', fontFamily: "'Archivo Black', sans-serif", fontSize: '22px', letterSpacing: '-0.03em' }}>
            <span style={{ color: 'var(--bone)' }}>SMART</span>
            <span style={{ color: 'var(--acid)' }}>CART</span>
          </a>
        </div>

        <h1 className="auth-title">Welcome<br />Back.</h1>
        <p className="auth-sub">Sign in to compare prices and track your searches.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" id="login-form">
          <div>
            <label className="auth-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="auth-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button
            id="login-submit"
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? 'Logging in…' : 'Log In →'}
          </button>
        </form>

        <p className="auth-footer-text">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
