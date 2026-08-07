import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="auth-page grain">
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
            <div style={{ position: 'relative' }}>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                style={{ width: '100%', paddingRight: '60px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Strong password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--bone-55)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPassword ? (
                    <>
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                      <line x1="2" x2="22" y1="2" y2="22"/>
                    </>
                  ) : (
                    <>
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
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
