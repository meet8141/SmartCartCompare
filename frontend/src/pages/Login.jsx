import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useContext(AuthContext);
  const isAdminLogin = searchParams.get('role') === 'admin';

  useEffect(() => {
    if (isAdminLogin) {
      setEmail('admin');
      setPassword('Admin@123');
    }
  }, [isAdminLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isAdminLogin ? { username: email, password } : { email, password })
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
      navigate(data.user?.isAdmin ? '/admin' : '/');
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

        <h1 className="auth-title">{isAdminLogin ? <>Admin<br />Login.</> : <>Welcome<br />Back.</>}</h1>
        <p className="auth-sub">{isAdminLogin ? 'Use admin / Admin@123 to open the admin panel.' : 'Sign in to compare prices and track your searches.'}</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" id="login-form">
          <div>
            <label className="auth-label" htmlFor="login-email">{isAdminLogin ? 'Username' : 'Email'}</label>
            <input
              id="login-email"
              type={isAdminLogin ? 'text' : 'email'}
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={isAdminLogin ? 'admin' : 'you@example.com'}
            />
          </div>
          <div>
            <label className="auth-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                style={{ width: '100%', paddingRight: '60px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
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
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </>
                  ) : (
                    <>
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
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
