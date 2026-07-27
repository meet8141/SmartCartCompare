import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, user: null });
  const { token } = useContext(AuthContext);

  useEffect(() => {
    fetchData();
  }, [token, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = activeTab === 'users'
        ? 'http://localhost:3000/api/admin/users'
        : 'http://localhost:3000/api/admin/logs';
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        if (activeTab === 'users') setUsers(data);
        else setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockClick = (user) => setModalConfig({ isOpen: true, type: 'block', user });
  const handleDeleteClick = (user) => setModalConfig({ isOpen: true, type: 'delete', user });

  const confirmAction = async () => {
    const { type, user } = modalConfig;
    setModalConfig({ isOpen: false, type: null, user: null });

    if (type === 'block') {
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isBlocked: !u.isBlocked } : u));
      try {
        await fetch(`http://localhost:3000/api/admin/users/${user._id}/block`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchData();
      } catch (err) {
        console.error('Failed to block/unblock', err);
        fetchData();
      }
    } else if (type === 'delete') {
      try {
        await fetch(`http://localhost:3000/api/admin/users/${user._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchData();
      } catch (err) {
        console.error('Failed to delete', err);
      }
    }
  };

  const closeModal = () => setModalConfig({ isOpen: false, type: null, user: null });

  const tableStyle = {
    width: '100%', borderCollapse: 'collapse',
    fontFamily: "'Space Grotesk', sans-serif",
    color: 'var(--bone)',
  };
  const thStyle = {
    padding: '14px 20px', textAlign: 'left',
    fontFamily: "'Archivo', sans-serif",
    fontSize: '11px', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: '0.12em',
    color: 'var(--bone-55)',
    borderBottom: '2px solid var(--bone-15)',
  };
  const tdStyle = {
    padding: '16px 20px',
    borderBottom: '1px solid var(--bone-10)',
    fontSize: '14px',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ background: 'var(--ink)', minHeight: '100vh' }}>
      {/* ── NAV ── */}
      <header className="nav">
        <div className="nav-inner">
          <Link className="nav-brand" to="/admin">
            <span className="brand-main">SMART</span>
            <span className="brand-accent">CART</span>
          </Link>
          <div className="nav-right">
            <Link to="/admin" className="nav-login">← Dashboard</Link>
            <a
              href="/"
              style={{
                textDecoration: 'none', padding: '7px 16px', borderRadius: '999px',
                border: '2px solid var(--bone-30)', color: 'var(--bone-75)',
                fontSize: '13px', fontWeight: '700', fontFamily: "'Archivo', sans-serif",
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--hot)'; e.currentTarget.style.color = 'var(--hot)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--bone-30)'; e.currentTarget.style.color = 'var(--bone-75)'; }}
            >
              Exit Admin
            </a>
          </div>
        </div>
      </header>

      <div className="admin-content">
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div className="eyebrow" style={{ marginBottom: '14px' }}>
            <span className="eyebrow-dot" />
            USER MANAGEMENT
          </div>
          <h1 className="admin-title">
            MANAGE<br />
            <span style={{ color: 'var(--acid)' }}>USERS.</span>
          </h1>
        </div>

        {/* Tab Toggle */}
        <div className="admin-view-toggle" style={{ marginBottom: '32px' }}>
          <button
            id="tab-users"
            className={`admin-view-btn${activeTab === 'users' ? ' active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            id="tab-logs"
            className={`admin-view-btn${activeTab === 'logs' ? ' active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            System Logs
          </button>
        </div>

        {loading ? (
          <div className="loader on" style={{ display: 'flex', padding: '60px' }}>
            <div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" />
          </div>
        ) : activeTab === 'users' ? (
          <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: '600', color: 'var(--bone)' }}>{u.username}</span>
                      {u.isAdmin && (
                        <span style={{
                          marginLeft: '8px', background: 'var(--acid)', color: 'var(--ink)',
                          padding: '2px 8px', borderRadius: '999px', fontSize: '10px',
                          fontFamily: "'Archivo', sans-serif", fontWeight: '800', letterSpacing: '0.08em'
                        }}>ADMIN</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--bone-55)' }}>{u.email}</td>
                    <td style={tdStyle}>
                      {u.isBlocked
                        ? <span style={{ color: 'var(--hot)', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>● Blocked</span>
                        : <span style={{ color: 'var(--green)', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>● Active</span>
                      }
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {!u.isAdmin && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            id={`block-${u._id}`}
                            onClick={() => handleBlockClick(u)}
                            style={{
                              padding: '6px 14px', borderRadius: '999px', border: 'none',
                              background: u.isBlocked ? 'var(--green)' : 'var(--hot)',
                              color: 'var(--ink)', fontFamily: "'Archivo', sans-serif",
                              fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                              textTransform: 'uppercase', letterSpacing: '0.06em'
                            }}
                          >
                            {u.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                          <button
                            id={`delete-${u._id}`}
                            onClick={() => handleDeleteClick(u)}
                            style={{
                              padding: '6px 14px', borderRadius: '999px',
                              border: '2px solid rgba(248,113,113,0.4)',
                              background: 'transparent',
                              color: 'var(--red)', fontFamily: "'Archivo', sans-serif",
                              fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                              textTransform: 'uppercase', letterSpacing: '0.06em'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: 'var(--bone-55)', padding: '48px' }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id}>
                    <td style={{ ...tdStyle, color: 'var(--bone-55)', fontSize: '12px' }}>{new Date(log.timestamp).toLocaleString()}</td>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>{log.user?.username || 'Unknown'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: 'rgba(212,255,0,0.10)', color: 'var(--acid)',
                        padding: '3px 10px', borderRadius: '999px',
                        fontSize: '11px', fontWeight: '700',
                        fontFamily: "'Archivo', sans-serif",
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        border: '1px solid rgba(212,255,0,0.25)'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--bone-55)', fontSize: '13px' }}>{log.details || '—'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: 'var(--bone-55)', padding: '48px' }}>
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CONFIRM MODAL ── */}
      {modalConfig.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.80)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: '#111111',
            border: '2px solid var(--bone-15)',
            borderRadius: '24px',
            padding: '40px 36px',
            maxWidth: '380px', width: '90%',
            textAlign: 'center',
            boxShadow: '10px 10px 0 var(--acid)',
          }}>
            <div style={{ fontSize: '44px', marginBottom: '16px' }}>
              {modalConfig.type === 'delete' ? '⚠️' : '🛡️'}
            </div>
            <h2 style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '24px', letterSpacing: '-0.02em',
              color: 'var(--bone)', marginBottom: '12px'
            }}>
              {modalConfig.type === 'delete'
                ? 'Delete User?'
                : modalConfig.user?.isBlocked ? 'Unblock User?' : 'Block User?'}
            </h2>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: 'var(--bone-60)', marginBottom: '28px',
              lineHeight: '1.65', fontSize: '14px'
            }}>
              {modalConfig.type === 'delete'
                ? `This permanently deletes ${modalConfig.user?.username}. Cannot be undone.`
                : `${modalConfig.user?.isBlocked ? 'Unblock' : 'Block'} ${modalConfig.user?.username}?`}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={closeModal} className="pill-ghost" id="modal-cancel">
                Cancel
              </button>
              <button
                id="modal-confirm"
                onClick={confirmAction}
                style={{
                  padding: '12px 24px', borderRadius: '999px', border: 'none',
                  background: modalConfig.type === 'delete' ? 'var(--red)'
                    : modalConfig.user?.isBlocked ? 'var(--green)' : 'var(--hot)',
                  color: modalConfig.type === 'delete' ? 'var(--bone)' : 'var(--ink)',
                  fontFamily: "'Archivo', sans-serif",
                  fontSize: '13px', fontWeight: '800', cursor: 'pointer',
                }}
              >
                Yes, {modalConfig.type === 'delete' ? 'Delete' : modalConfig.user?.isBlocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
