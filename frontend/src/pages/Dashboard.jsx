import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { dashboardApi } from '../services/authApi';
import { getGreeting, firstName, formatDate } from '../utils/formatters';
import { Skeleton } from '../components/common/Loader';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/common/Button';
import './Dashboard.css';

const StatCard = ({ icon, label, value, color, loading }) => (
  <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
    <div className="stat-card-icon" style={{ background: `${color}18`, color }}>{icon}</div>
    <div>
      {loading
        ? <Skeleton width={48} height={28} style={{ marginBottom: 6 }} />
        : <div className="stat-card-value">{value}</div>
      }
      <div className="stat-card-label">{label}</div>
    </div>
  </div>
);

const ActionCard = ({ to, icon, title, subtitle, color }) => (
  <Link to={to} className="action-card" style={{ '--card-accent': color }}>
    <div className="action-icon" style={{ background: `${color}15`, color }}>{icon}</div>
    <div>
      <div className="action-title">{title}</div>
      <div className="action-subtitle">{subtitle}</div>
    </div>
    <div className="action-arrow">→</div>
  </Link>
);

// ── Status pill colour map ──────────────────────────────────────────────
const STATUS_STYLES = {
  OPEN:     { bg: '#DCFCE7', color: '#15803D', label: 'Open' },
  MATCHED:  { bg: '#DBEAFE', color: '#1D4ED8', label: 'Matched' },
  RETURNED: { bg: '#F3F4F6', color: '#374151', label: 'Returned' },
  CLOSED:   { bg: '#FEF9C3', color: '#A16207', label: 'Closed' },
};

const RecentReportRow = ({ report }) => {
  const isLost = report.type === 'LOST';
  const url = isLost ? `/lost-items/${report.id}` : `/found-items/${report.id}`;
  const st = STATUS_STYLES[report.status] || STATUS_STYLES.OPEN;

  return (
    <Link to={url} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 20px',
          borderBottom: '1px solid var(--color-gray-100)',
          transition: 'background 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Type icon */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          background: isLost ? '#FEE2E2' : '#D1FAE5',
          color: isLost ? '#DC2626' : '#059669',
        }}>
          {isLost ? '🔍' : '📦'}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
              color: isLost ? '#DC2626' : '#059669',
              textTransform: 'uppercase',
            }}>
              {report.type}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: st.bg, color: st.color,
            }}>
              {st.label}
            </span>
          </div>
          <div style={{
            fontWeight: 700, color: 'var(--color-gray-900)', fontSize: 14,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {report.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-gray-400)', marginTop: 1 }}>
            📍 {report.location} &nbsp;·&nbsp; 📅 {formatDate(report.created_at)}
          </div>
        </div>

        {/* Category pill */}
        <div style={{
          flexShrink: 0,
          fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
          background: 'var(--color-gray-100)', color: 'var(--color-gray-500)',
          display: 'none',   // hide on mobile, show on wider
        }} className="recent-category">
          {report.category}
        </div>

        {/* Arrow */}
        <div style={{ flexShrink: 0, color: 'var(--color-gray-300)', fontSize: 18 }}>›</div>
      </div>
    </Link>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ lostReports: 0, foundReports: 0, activeClaims: 0, returnedItems: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [recentReports, setRecentReports] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(res => setStats(res.data.stats))
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    dashboardApi.getRecent()
      .then(res => setRecentReports(res.data.reports))
      .catch(() => setRecentReports([]))
      .finally(() => setRecentLoading(false));
  }, []);

  return (
    <div>
      <Navbar />
      <div className="dashboard-page page-wrapper">
        <div className="container">

          {/* ── Welcome Header ── */}
          <div className="dashboard-header anim-fade-in-up">
            <div>
              <p className="dashboard-greeting">{getGreeting()},</p>
              <h1 className="dashboard-name">{firstName(user?.name)} 👋</h1>
              <p className="dashboard-sub">Here's what's happening with your items.</p>
            </div>
            <div className="dashboard-header-actions">
              <Button variant="secondary" size="sm" onClick={() => navigate('/report-lost')} leftIcon="😟">
                Report Lost
              </Button>
              <Button size="sm" onClick={() => navigate('/report-found')} leftIcon="🎉">
                Report Found
              </Button>
            </div>
          </div>

          {/* ── Stats ── */}
          <section className="dashboard-section">
            <h2 className="section-heading">Your Activity</h2>
            <div className="stats-grid">
              <StatCard icon="📋" label="Lost Reports"    value={stats.lostReports}    color="#EF4444" loading={statsLoading} />
              <StatCard icon="📦" label="Found Reports"   value={stats.foundReports}   color="#4361EE" loading={statsLoading} />
              <StatCard icon="🔖" label="Active Claims"   value={stats.activeClaims}   color="#F59E0B" loading={statsLoading} />
              <StatCard icon="✅" label="Items Returned"  value={stats.returnedItems}  color="#10B981" loading={statsLoading} />
            </div>
          </section>

          {/* ── Quick Actions ── */}
          <section className="dashboard-section">
            <h2 className="section-heading">Quick Actions</h2>
            <div className="actions-grid">
              <ActionCard to="/found-items"   icon="🔍" title="Browse Found Items"   subtitle="Search items others have found"       color="#4361EE" />
              <ActionCard to="/report-lost"   icon="😟" title="Report Lost Item"     subtitle="File a report for something you lost"  color="#EF4444" />
              <ActionCard to="/report-found"  icon="🎉" title="Report Found Item"    subtitle="Help someone recover their item"       color="#10B981" />
              <ActionCard to="/my-reports"    icon="📋" title="My Reports"           subtitle="View all your lost & found reports"    color="#F59E0B" />
              <ActionCard to="/matches"       icon="✨" title="My Matches"           subtitle="View potential matches for your items" color="#8B5CF6" />
              <ActionCard to="/claims"        icon="🏷️" title="My Claims"            subtitle="Track verification & review"          color="#3B82F6" />
            </div>
          </section>

          {/* ── Recent Reports ── */}
          <section className="dashboard-section" style={{ marginBottom: 'var(--space-12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h2 className="section-heading" style={{ marginBottom: 0 }}>Recent Reports</h2>
              {recentReports.length > 0 && (
                <Link to="/my-reports" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}>
                  View All →
                </Link>
              )}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {recentLoading ? (
                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Skeleton width={40} height={40} style={{ borderRadius: '50%' }} />
                      <div style={{ flex: 1 }}>
                        <Skeleton height={14} style={{ marginBottom: 6, width: '60%' }} />
                        <Skeleton height={11} style={{ width: '40%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentReports.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 6 }}>No reports yet</div>
                  <div style={{ fontSize: 13, color: 'var(--color-gray-400)', marginBottom: 20 }}>
                    Once you report a lost or found item, it will appear here.
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/report-lost')}>Report Lost Item</Button>
                    <Button size="sm" onClick={() => navigate('/report-found')}>Report Found Item</Button>
                  </div>
                </div>
              ) : (
                <div>
                  {recentReports.map(report => (
                    <RecentReportRow key={`${report.type}-${report.id}`} report={report} />
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
