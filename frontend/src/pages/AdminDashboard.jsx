import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  ArcElement
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  ChartTooltip,
  ChartLegend
);

const CHART_COLORS = ['#d4ff00', '#ff2d78', '#74aaff', '#ffbb40', '#22d3a4', '#a78bfa', '#fb923c'];

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [timeStats, setTimeStats] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [activeChart, setActiveChart] = useState('all');
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, timeRes] = await Promise.all([
          fetch('http://localhost:3000/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`http://localhost:3000/api/admin/time-stats?range=${timeRange}`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const statsData = await statsRes.json();
        const timeData = await timeRes.json();

        if (statsRes.ok && timeRes.ok) {
          setStats(statsData);
          setTimeStats(timeData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token, timeRange]);

  if (loading || !stats || !timeStats) {
    return (
      <div style={{ background: 'var(--ink)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader on" style={{ display: 'flex' }}>
          <div className="loader-dot" />
          <div className="loader-dot" />
          <div className="loader-dot" />
        </div>
      </div>
    );
  }

  const chartBase = {
    plugins: { legend: { labels: { color: 'rgba(244,241,234,0.75)', font: { family: "'Archivo', sans-serif", weight: '600' } } } }
  };

  return (
    <div style={{ background: 'var(--ink)', minHeight: '100vh' }}>
      {/* ── NAV ── */}
      <header className="nav">
        <div className="nav-inner">
          <a className="nav-brand" href="/">
            <span className="brand-main">SMART</span>
            <span className="brand-accent">CART</span>
          </a>
          <div className="nav-right">
            <Link to="/admin/users" className="nav-login">User Management</Link>
            <a href="/" className="nav-logout" style={{ textDecoration: 'none', padding: '7px 16px', borderRadius: '999px', border: '2px solid var(--bone-30)', color: 'var(--bone-75)', fontSize: '13px', fontWeight: '700', fontFamily: "'Archivo', sans-serif", transition: 'border-color 0.2s, color 0.2s' }}
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
        <div className="admin-header">
          <div>
            <div className="eyebrow" style={{ marginBottom: '14px' }}>
              <span className="eyebrow-dot" />
              ADMIN PANEL
            </div>
            <h1 className="admin-title">
              DASHBOARD<br />
              <span style={{ color: 'var(--acid)' }}>OVERVIEW.</span>
            </h1>
          </div>
          <div className="admin-view-toggle">
            {['all', 'pie', 'scatter', 'line'].map(view => (
              <button
                key={view}
                id={`view-${view}`}
                className={`admin-view-btn${activeChart === view ? ' active' : ''}`}
                onClick={() => setActiveChart(view)}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Stats tiles */}
        <div className="stats-grid">
          <div className="stat-tile stat-tile-acid">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{stats.totalUsers}</div>
          </div>
          <div className="stat-tile stat-tile-hot">
            <div className="stat-label">Active Users</div>
            <div className="stat-value">{stats.activeUsers}</div>
          </div>
          <div className="stat-tile stat-tile-outline">
            <div className="stat-label">Searches Today</div>
            <div className="stat-value" style={{ color: 'var(--acid)' }}>{stats.searchesToday}</div>
          </div>
        </div>

        {/* Pie Chart */}
        {(activeChart === 'all' || activeChart === 'pie') && (
          <div className="chart-card">
            <h3 className="chart-title">Most Searched Categories</h3>
            <div style={{ width: '100%', height: 300, display: 'flex', justifyContent: 'center' }}>
              <Pie
                data={{
                  labels: stats.categories.map(c => c.name),
                  datasets: [{
                    data: stats.categories.map(c => c.value),
                    backgroundColor: CHART_COLORS,
                    borderColor: 'rgba(244,241,234,0.08)',
                    borderWidth: 2
                  }]
                }}
                options={{
                  maintainAspectRatio: false,
                  ...chartBase
                }}
              />
            </div>
          </div>
        )}

        {/* Scatter/Line Chart */}
        {(activeChart === 'all' || activeChart === 'scatter') && (
          <div className="chart-card">
            <h3 className="chart-title">Top Compared Products</h3>
            <div style={{ width: '100%', height: 300 }}>
              <Line
                data={{
                  labels: stats.topProducts.map(p => p.name),
                  datasets: [{
                    label: 'Searches',
                    data: stats.topProducts.map(p => p.count),
                    backgroundColor: '#d4ff00',
                    pointBackgroundColor: '#d4ff00',
                    pointBorderColor: '#0a0a0a',
                    pointBorderWidth: 2,
                    pointRadius: 7,
                    pointHoverRadius: 9,
                    showLine: false
                  }]
                }}
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    x: { ticks: { color: 'rgba(244,241,234,0.55)', font: { family: "'Space Grotesk', sans-serif" } }, grid: { color: 'rgba(244,241,234,0.06)' } },
                    y: { ticks: { color: 'rgba(244,241,234,0.55)', stepSize: 1, font: { family: "'Space Grotesk', sans-serif" } }, grid: { color: 'rgba(244,241,234,0.06)' }, beginAtZero: true }
                  },
                  plugins: { legend: { display: false } }
                }}
              />
            </div>
          </div>
        )}

        {/* Line Chart */}
        {(activeChart === 'all' || activeChart === 'line') && (
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title" style={{ marginBottom: 0 }}>Searches Over Time</h3>
              <select
                id="time-range-select"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="chart-select"
              >
                <option value="24h">Past 24 Hours</option>
                <option value="7d">Past 7 Days</option>
                <option value="30d">Last Month</option>
              </select>
            </div>
            <div style={{ width: '100%', height: 350 }}>
              <Line
                data={{
                  labels: timeStats.map(t => t.time),
                  datasets: stats.categories.map((c, i) => ({
                    label: c.name,
                    data: timeStats.map(t => t[c.name] || 0),
                    borderColor: CHART_COLORS[i % CHART_COLORS.length],
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                    tension: 0.35,
                    pointRadius: 4,
                    pointHoverRadius: 6
                  }))
                }}
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    x: { ticks: { color: 'rgba(244,241,234,0.55)', font: { family: "'Space Grotesk', sans-serif" } }, grid: { color: 'rgba(244,241,234,0.06)' } },
                    y: { ticks: { color: 'rgba(244,241,234,0.55)', font: { family: "'Space Grotesk', sans-serif" } }, grid: { color: 'rgba(244,241,234,0.06)' }, beginAtZero: true }
                  },
                  plugins: {
                    legend: { labels: { color: 'rgba(244,241,234,0.7)', font: { family: "'Archivo', sans-serif", weight: '600' } } },
                    tooltip: { mode: 'index', intersect: false }
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
