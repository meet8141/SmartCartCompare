import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic frontend validation to match backend
    if (username.length < 6 || username.length > 10) {
      setError('Username must be between 6 and 10 characters');
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must be 8+ characters with 1 uppercase, 1 lowercase, 1 number, 1 special character');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Signup failed');

      navigate(`/verify?email=${encodeURIComponent(email)}`);
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
        position: 'absolute', width: '110px', height: '110px',
        background: 'var(--hot)', borderRadius: '50%',
        top: '6%', left: '6%',
        boxShadow: '10px 10px 0 var(--ink)',
        opacity: 0.7
      }} />
      <div style={{
        position: 'absolute', width: '90px', height: '55px',
        background: 'var(--acid)', borderRadius: '18px',
        bottom: '10%', right: '7%', transform: 'rotate(-12deg)',
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

        <h1 className="auth-title">Create<br />Account.</h1>
        <p className="auth-sub">Join thousands of smart shoppers comparing prices every day.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" id="signup-form">
          <div>
            <label className="auth-label" htmlFor="signup-username">Username</label>
            <input
              id="signup-username"
              type="text"
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={6}
              maxLength={10}
              placeholder="6–10 characters"
            />
          </div>
          <div>
            <label className="auth-label" htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="auth-label" htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Strong password"
            />
          </div>
          <button
            id="signup-submit"
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? 'Creating Account…' : 'Sign Up →'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
