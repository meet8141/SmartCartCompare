import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

function AdminStoreStats() {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewModes, setViewModes] = useState({
    trend: 'graph',
    category: 'graph',
    payment: 'graph',
    inventory: 'graph'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/admin/store-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchStats();
  }, [token]);

  if (loading || !stats) {
    return (
      <div className="page">
        <header className="nav">
          <div className="nav-inner">
            <Link className="nav-brand" to="/admin">
              <span className="brand-main">SMART</span>
              <span className="brand-accent">ADMIN</span>
            </Link>
          </div>
        </header>
        <div style={{ paddingTop: '120px', textAlign: 'center' }}>
          <div className="loader on"><div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" /></div>
        </div>
      </div>
    );
  }

  // Calculate max values for bar charts
  const maxCategoryRev = Math.max(...(stats.sales.categoryRevenue.map(c => c.value) || [0]), 1);
  const totalPayments = Object.values(stats.operations.paymentMethods).reduce((a,b)=>a+b, 0);
  const totalHealth = Object.values(stats.inventory.health).reduce((a,b)=>a+b, 0);

  const toggleView = (key) => setViewModes(prev => ({...prev, [key]: prev[key] === 'graph' ? 'list' : 'graph'}));

  const ViewToggle = ({ mode, onToggle }) => (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', padding: '4px', cursor: 'pointer' }} onClick={onToggle}>
      <div style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '999px', background: mode === 'list' ? 'var(--bone)' : 'transparent', color: mode === 'list' ? 'var(--ink)' : 'var(--bone-55)', transition: 'all 0.2s', fontWeight: mode === 'list' ? 'bold' : 'normal' }}>List</div>
      <div style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '999px', background: mode === 'graph' ? 'var(--bone)' : 'transparent', color: mode === 'graph' ? 'var(--ink)' : 'var(--bone-55)', transition: 'all 0.2s', fontWeight: mode === 'graph' ? 'bold' : 'normal' }}>Graph</div>
    </div>
  );

  const handleExportCSV = () => {
    if (!stats) return;
    let csv = "data:text/csv;charset=utf-8,\n";
    csv += "=== REVENUE & ORDERS ===\n";
    csv += `Total Revenue,${stats.revenue.total}\n`;
    csv += `Total Orders,${stats.revenue.orders}\n`;
    csv += `Average Order Value,${stats.revenue.aov}\n\n`;
    csv += "=== INVENTORY HEALTH ===\n";
    csv += `Healthy,${stats.inventory.health.Healthy}\n`;
    csv += `Low Stock,${stats.inventory.health.LowStock}\n`;
    csv += `Out Of Stock,${stats.inventory.health.OutOfStock}\n\n`;
    csv += "=== REVENUE PERIODS ===\n";
    csv += `Past 24 Hours,${stats.sales.revenuePeriods?.past24h || 0}\n`;
    csv += `Past 7 Days,${stats.sales.revenuePeriods?.past7d || 0}\n`;
    csv += `Past 30 Days,${stats.sales.revenuePeriods?.past30d || 0}\n`;
    csv += "\n=== TOP PRODUCTS ===\n";
    csv += "Product Name,Quantity Sold,Revenue\n";
    stats.sales.topProducts.forEach(p => csv += `"${p.name}",${p.quantity},${p.revenue}\n`);
    csv += "\n=== RECENT ORDERS ===\n";
    csv += "Order ID,User,Date,Method,Amount,Status\n";
    stats.operations.recentOrders.forEach(o => csv += `${o._id},${o.user},${new Date(o.date).toLocaleDateString()},${o.method},${o.amount},${o.status}\n`);
    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `store_stats_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page">
      {/* ── STICKY NAV ── */}
      <header className="nav">
        <div className="nav-inner">
          <Link className="nav-brand" to="/admin">
            <span className="brand-main">SMART</span>
            <span className="brand-accent">ADMIN</span>
            <span className="brand-main">Store Stats</span>
          </Link>
          <div className="nav-right">
            <button onClick={handleExportCSV} className="pill-ghost" style={{ fontSize: '13px', padding: '6px 14px', marginRight: '12px' }}>Export CSV</button>
            <Link to="/admin" className="nav-login">← Dashboard</Link>
            <Link to="/admin/add-product" className="nav-login">Add Product</Link>
          </div>
        </div>
      </header>

      <div className="admin-content" style={{ maxWidth: '1100px', margin: '0 auto', paddingTop: '100px', paddingBottom: '60px', paddingLeft: '20px', paddingRight: '20px' }}>
        <h1 className="admin-title" style={{ fontSize: '32px' }}>
          STORE <span style={{ color: 'var(--acid)' }}>STATISTICS.</span>
        </h1>
        <p className="history-sub" style={{ marginBottom: '32px' }}>
          Real-time metrics, revenue data, and inventory health for the mock store.
        </p>

        {/* ── KEY METRICS GRID ── */}
        <div className="bento-grid" style={{ marginBottom: '32px' }}>
          <div className="bento-tile bento-tile-acid">
            <div className="bento-icon">💰</div>
            <div className="bento-label">₹{stats.revenue.total.toLocaleString('en-IN')}</div>
            <div className="bento-sub">Total Revenue</div>
          </div>
          <div className="bento-tile bento-tile-hot">
            <div className="bento-icon">📦</div>
            <div className="bento-label">{stats.revenue.orders}</div>
            <div className="bento-sub">Total Orders</div>
          </div>
          <div className="bento-tile bento-tile-bone">
            <div className="bento-icon">📈</div>
            <div className="bento-label">₹{stats.revenue.aov.toLocaleString('en-IN')}</div>
            <div className="bento-sub">Average Order Value</div>
          </div>
          <div className="bento-tile bento-tile-ink">
            <div className="bento-icon">🛒</div>
            <div className="bento-label">{stats.engagement.activeCarts}</div>
            <div className="bento-sub">Active Carts</div>
          </div>
        </div>

        {/* ── REVENUE PERIODS ── */}
        <div className="chart-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--bone)', marginBottom: '16px', fontSize: '16px' }}>Revenue Insights</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px', background: 'rgba(34,211,164,0.05)', border: '1px solid var(--acid)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ color: 'var(--bone-55)', fontSize: '13px', marginBottom: '8px' }}>Past 24 Hours</div>
              <div style={{ color: 'var(--acid)', fontSize: '24px', fontWeight: 'bold' }}>₹{stats.sales.revenuePeriods?.past24h?.toLocaleString('en-IN') || 0}</div>
            </div>
            <div style={{ flex: 1, minWidth: '150px', background: 'rgba(255,187,64,0.05)', border: '1px solid #ffbb40', padding: '16px', borderRadius: '12px' }}>
              <div style={{ color: 'var(--bone-55)', fontSize: '13px', marginBottom: '8px' }}>Past 7 Days</div>
              <div style={{ color: '#ffbb40', fontSize: '24px', fontWeight: 'bold' }}>₹{stats.sales.revenuePeriods?.past7d?.toLocaleString('en-IN') || 0}</div>
            </div>
            <div style={{ flex: 1, minWidth: '150px', background: 'rgba(255,45,120,0.05)', border: '1px solid var(--hot)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ color: 'var(--bone-55)', fontSize: '13px', marginBottom: '8px' }}>Past 30 Days</div>
              <div style={{ color: 'var(--hot)', fontSize: '24px', fontWeight: 'bold' }}>₹{stats.sales.revenuePeriods?.past30d?.toLocaleString('en-IN') || 0}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* ── CATEGORY REVENUE ── */}
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: 'var(--bone)', fontSize: '16px' }}>Category Revenue</h3>
              <ViewToggle mode={viewModes.category} onToggle={() => toggleView('category')} />
            </div>
            {stats.sales.categoryRevenue.length === 0 ? (
              <div style={{ color: 'var(--bone-55)', fontSize: '14px' }}>No revenue data yet.</div>
            ) : viewModes.category === 'list' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.sales.categoryRevenue.sort((a,b)=>b.value-a.value).map(cat => (
                  <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--bone)' }}>{cat.name}</span>
                    <span style={{ color: 'var(--acid)', fontWeight: 'bold' }}>₹{cat.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.sales.categoryRevenue.sort((a,b)=>b.value-a.value).map(cat => (
                  <div key={cat.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--bone)' }}>{cat.name}</span>
                      <span style={{ color: 'var(--acid)', fontWeight: 'bold' }}>₹{cat.value.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bone-15)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(cat.value / maxCategoryRev) * 100}%`, background: 'var(--acid)', borderRadius: '999px', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── PAYMENT METHODS ── */}
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: 'var(--bone)', fontSize: '16px' }}>Payment Methods</h3>
              <ViewToggle mode={viewModes.payment} onToggle={() => toggleView('payment')} />
            </div>
            {totalPayments === 0 ? (
              <div style={{ color: 'var(--bone-55)', fontSize: '14px' }}>No payments yet.</div>
            ) : viewModes.payment === 'list' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(stats.operations.paymentMethodsDetails || {}).map(([method, prods]) => (
                  <div key={method} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px' }}>
                    <div style={{ color: 'var(--acid)', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase' }}>{method}</div>
                    {prods.length === 0 ? <div style={{ color: 'var(--bone-55)', fontSize: '12px' }}>No products bought</div> : null}
                    {prods.map(p => (
                      <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'var(--bone)' }}>{p.name.length > 30 ? p.name.substring(0,30)+'...' : p.name}</span>
                        <span style={{ color: 'var(--bone-55)' }}>{p.quantity} units</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(stats.operations.paymentMethods).map(([method, count]) => {
                  const colors = { GPay: '#4285f4', NetBanking: '#22d3a4', DebitCard: '#ffbb40' };
                  const color = colors[method] || 'var(--bone)';
                  return (
                    <div key={method}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--bone)' }}>{method}</span>
                        <span style={{ color: color, fontWeight: 'bold' }}>{count} ({Math.round((count/totalPayments)*100)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bone-15)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(count / totalPayments) * 100}%`, background: color, borderRadius: '999px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* ── INVENTORY HEALTH ── */}
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: 'var(--bone)', fontSize: '16px' }}>Inventory Health</h3>
              <ViewToggle mode={viewModes.inventory} onToggle={() => toggleView('inventory')} />
            </div>
            {totalHealth === 0 ? (
              <div style={{ color: 'var(--bone-55)', fontSize: '14px' }}>No products.</div>
            ) : viewModes.inventory === 'list' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['OutOfStock', 'LowStock', 'Healthy'].map(status => {
                  const prods = stats.inventory.details?.[status] || [];
                  const colors = { Healthy: '#22d3a4', LowStock: '#ffbb40', OutOfStock: '#ff2d78' };
                  if (prods.length === 0) return null;
                  return (
                    <div key={status} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px' }}>
                      <div style={{ color: colors[status], fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase' }}>{status.replace(/([A-Z])/g, ' $1').trim()} ({prods.length})</div>
                      <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                        {prods.map(p => (
                          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: 'var(--bone)' }}>{p.name.length > 35 ? p.name.substring(0,35)+'...' : p.name}</span>
                            <span style={{ color: 'var(--bone-55)' }}>{p.stock} stock</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(stats.inventory.health).map(([status, count]) => {
                  const colors = { Healthy: '#22d3a4', LowStock: '#ffbb40', OutOfStock: '#ff2d78' };
                  const color = colors[status] || 'var(--bone)';
                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--bone)' }}>{status.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span style={{ color: color, fontWeight: 'bold' }}>{count} ({Math.round((count/totalHealth)*100)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bone-15)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(count / totalHealth) * 100}%`, background: color, borderRadius: '999px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* ── TOP SELLING PRODUCTS ── */}
          <div className="chart-card">
            <h3 style={{ color: 'var(--bone)', marginBottom: '16px', fontSize: '16px' }}>Top Selling Products</h3>
            {stats.sales.topProducts.length === 0 ? (
              <div style={{ color: 'var(--bone-55)', fontSize: '14px' }}>No sales data.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.sales.topProducts.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px', background: 'rgba(244,241,234,0.03)', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--acid)', fontWeight: 'bold', fontSize: '16px', width: '20px' }}>#{i+1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--bone)', fontSize: '14px', lineHeight: 1.3 }}>{p.name}</div>
                      <div style={{ color: 'var(--bone-55)', fontSize: '12px' }}>{p.quantity} units sold</div>
                    </div>
                    <div style={{ color: 'var(--hot)', fontWeight: '800' }}>₹{p.revenue.toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── MOST WISHLISTED ── */}
          <div className="chart-card">
            <h3 style={{ color: 'var(--bone)', marginBottom: '16px', fontSize: '16px' }}>Most Wishlisted</h3>
            {stats.engagement.mostWishlisted.length === 0 ? (
              <div style={{ color: 'var(--bone-55)', fontSize: '14px' }}>No wishlisted items.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.engagement.mostWishlisted.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px', background: 'rgba(244,241,234,0.03)', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--hot)', fontWeight: 'bold', fontSize: '16px', width: '20px' }}>❤️</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--bone)', fontSize: '14px', lineHeight: 1.3 }}>{p.name}</div>
                    </div>
                    <div style={{ color: 'var(--bone)', fontWeight: '800', background: 'var(--bone-20)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {p.count} saves
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── INVENTORY ALERTS ── */}
        <div className="chart-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--hot)', marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> Inventory Alerts ({stats.inventory.lowStock.length})
          </h3>
          {stats.inventory.lowStock.length === 0 ? (
            <div style={{ color: 'var(--bone-55)', fontSize: '14px' }}>Inventory is healthy. No items under 10 stock.</div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {stats.inventory.lowStock.map(p => (
                <div key={p.id} style={{ background: p.stock <= 0 ? 'rgba(255,45,120,0.1)' : 'rgba(255,187,64,0.1)', border: `1px solid ${p.stock <= 0 ? 'var(--hot)' : '#ffbb40'}`, padding: '8px 12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ color: 'var(--bone)', fontSize: '13px' }}>{p.name.length > 30 ? p.name.substring(0,30)+'...' : p.name}</div>
                  <div style={{ color: p.stock <= 0 ? 'var(--hot)' : '#ffbb40', fontWeight: 'bold', fontSize: '14px' }}>
                    {p.stock <= 0 ? 'Out of Stock' : `Only ${p.stock} left`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RECENT ORDERS TABLE ── */}
        <div className="chart-card">
          <h3 style={{ color: 'var(--bone)', marginBottom: '16px', fontSize: '16px' }}>Recent Orders</h3>
          {stats.operations.recentOrders.length === 0 ? (
            <div style={{ color: 'var(--bone-55)', fontSize: '14px' }}>No orders yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bone-15)' }}>
                    <th style={{ padding: '12px 8px', color: 'var(--bone-55)', fontSize: '12px', textTransform: 'uppercase' }}>Order ID</th>
                    <th style={{ padding: '12px 8px', color: 'var(--bone-55)', fontSize: '12px', textTransform: 'uppercase' }}>User</th>
                    <th style={{ padding: '12px 8px', color: 'var(--bone-55)', fontSize: '12px', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '12px 8px', color: 'var(--bone-55)', fontSize: '12px', textTransform: 'uppercase' }}>Method</th>
                    <th style={{ padding: '12px 8px', color: 'var(--bone-55)', fontSize: '12px', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ padding: '12px 8px', color: 'var(--bone-55)', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.operations.recentOrders.map(order => (
                    <tr key={order._id} style={{ borderBottom: '1px solid var(--bone-10)' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--bone)', fontSize: '13px', fontFamily: 'monospace' }}>{order._id.slice(-8)}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--bone)', fontSize: '13px' }}>{order.user}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--bone-55)', fontSize: '13px' }}>{new Date(order.date).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--bone)', fontSize: '13px' }}>{order.method}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--acid)', fontSize: '14px', fontWeight: 'bold' }}>₹{order.amount.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ background: 'rgba(34,211,164,0.1)', color: '#22d3a4', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default AdminStoreStats;
