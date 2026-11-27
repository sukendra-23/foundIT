import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import EmptyState from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Loader';
import { recoveryApi } from '../services/recoveryApi';
import { formatDate } from '../utils/formatters';
import './MyRecoveries.css';

const STATUS_CONFIG = {
  PENDING: {
    bg: '#FEF3C7',
    color: '#92400E',
    border: '#FDE68A',
    label: 'Pending Review',
    icon: '⏳',
    dot: '#F59E0B'
  },
  UNDER_REVIEW: {
    bg: '#DBEAFE',
    color: '#1E40AF',
    border: '#BFDBFE',
    label: 'Under Review',
    icon: '🔍',
    dot: '#3B82F6'
  },
  APPROVED: {
    bg: '#D1FAE5',
    color: '#065F46',
    border: '#A7F3D0',
    label: 'Approved',
    icon: '🎉',
    dot: '#10B981'
  },
  REJECTED: {
    bg: '#FEE2E2',
    color: '#991B1B',
    border: '#FECACA',
    label: 'Rejected',
    icon: '❌',
    dot: '#EF4444'
  },
  CANCELLED: {
    bg: '#F1F5F9',
    color: '#475569',
    border: '#E2E8F0',
    label: 'Cancelled',
    icon: '↩️',
    dot: '#64748B'
  },
};

const CATEGORY_ICONS = {
  Electronics: '💻',
  Phones: '📱',
  Wallets: '👛',
  Keys: '🔑',
  Documents: '📄',
  Jewelry: '💍',
  Bags: '🎒',
  Clothing: '👕',
  Accessories: '👓',
  Other: '📦',
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || {
    bg: '#F1F5F9',
    color: '#475569',
    border: '#E2E8F0',
    label: status,
    icon: '🏷️',
    dot: '#64748B'
  };

  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      padding: '4px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      letterSpacing: '0.01em',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: cfg.dot,
        display: 'inline-block'
      }} />
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
};

// ─── Metric Summary Card (Preserved from recovery dashboard) ──────────────────
const MetricCard = ({ title, count, icon, subtitle, color, bgGradient, borderColor }) => (
  <div style={{
    background: bgGradient || '#fff',
    borderRadius: 'var(--radius-xl)',
    border: `1px solid ${borderColor || 'var(--color-gray-200)'}`,
    padding: '16px 18px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'default',
  }}
  onMouseEnter={e => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
  }}
  onMouseLeave={e => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
  }}
  >
    <div style={{
      width: 44,
      height: 44,
      borderRadius: 12,
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      flexShrink: 0,
      border: '1px solid rgba(0,0,0,0.04)'
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--color-gray-900)', lineHeight: 1.1 }}>
        {count}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-gray-800)', marginTop: 2 }}>
        {title}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-gray-500)', marginTop: 1 }}>
        {subtitle}
      </div>
    </div>
  </div>
);

// ─── Recovery Card (Styled to match ClaimCard in MyClaims) ────────────────────
const RecoveryCard = ({ recovery, tab, onView }) => {
  const [imageError, setImageError] = useState(false);

  const id = recovery.id;
  const lostTitle = recovery.lostItemTitle || recovery.lost_item_title || recovery.lost_title || 'Original Lost Item';
  const itemName = recovery.finderItemName || recovery.finder_item_name || recovery.item_name || 'Found Item';
  const category = recovery.lostItemCategory || recovery.lost_category || 'General';
  const location = [recovery.foundLocation || recovery.found_location, recovery.foundCity || recovery.city || recovery.found_city].filter(Boolean).join(', ');
  const date = recovery.foundDate || recovery.found_date;
  const status = recovery.status;
  const submittedAt = recovery.createdAt || recovery.created_at;
  const isReceived = tab === 'received';
  const otherParty = isReceived
    ? (recovery.finderName || recovery.finder_name || 'Finder')
    : (recovery.ownerName || recovery.owner_name || 'Item Owner');

  const displayImage = !imageError
    ? (recovery.primaryImage || recovery.primary_image || recovery.lostItemImage || recovery.lost_item_image)
    : null;

  const categoryIcon = CATEGORY_ICONS[category] || '📦';
  const cfg = STATUS_CONFIG[status] || { dot: '#64748B', label: status };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-2xl)',
        border: '1px solid var(--color-gray-200)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      {/* ── Card Image Banner ── */}
      <div style={{ position: 'relative', height: 140, background: 'var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {displayImage ? (
          <img
            src={displayImage}
            alt={itemName}
            onError={() => setImageError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: 38, opacity: 0.35 }}>{categoryIcon}</span>
        )}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0,0,0,0.65)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 6,
          backdropFilter: 'blur(2px)'
        }}>
          REC-{String(id).padStart(4, '0')}
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 4 }}>
          {category} {location ? `· 📍 ${location}` : ''}
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-gray-900)', margin: '0 0 6px 0', lineHeight: 1.3 }}>
          {itemName}
        </h3>

        <div style={{ fontSize: 12, color: 'var(--color-gray-600)', marginBottom: 8 }}>
          {isReceived ? '👤 Found by: ' : '👤 Owned by: '}
          <strong>{otherParty}</strong>
        </div>

        <p style={{
          fontSize: 13,
          color: 'var(--color-gray-600)',
          margin: '0 0 14px 0',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          Matching Lost Report: "{lostTitle}"
        </p>

        {/* Smart Handover Callout for Approved Recoveries */}
        {status === 'APPROVED' && (
          <div style={{
            marginBottom: 12,
            padding: '6px 12px',
            background: '#ECFDF5',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#065F46',
            fontWeight: 700
          }}>
            <span>🤝 Smart Handover Active</span>
            <span style={{ fontSize: 11, color: '#059669' }}>Ready for physical return</span>
          </div>
        )}

        {/* Progress indicator pill */}
        <div style={{
          marginTop: 'auto',
          padding: '8px 12px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-gray-50)',
          border: '1px solid var(--color-gray-200)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color || 'var(--color-gray-700)' }}>
            {cfg.label}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-gray-100)', paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--color-gray-400)' }}>
            {submittedAt ? `Filed: ${formatDate(submittedAt)}` : (date ? `Found: ${formatDate(date)}` : '')}
          </div>
          <button
            onClick={() => onView(id)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--color-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0
            }}
          >
            {isReceived ? 'Review Recovery' : 'Track Details'} →
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main MyRecoveries Page ───────────────────────────────────────────────────
const MyRecoveries = () => {
  const navigate = useNavigate();

  const [tab, setTab] = useState('submissions'); // 'submissions' | 'received'
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'updated'

  const [submissions, setSubmissions] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const getRecFn = recoveryApi.getReceivedRecoveries || recoveryApi.getReceived;
      const [subRes, recRes] = await Promise.all([
        recoveryApi.getMySubmissions(),
        getRecFn()
      ]);
      const subData = Array.isArray(subRes?.data) ? subRes.data : (subRes?.data?.data || []);
      const recData = Array.isArray(recRes?.data) ? recRes.data : (recRes?.data?.data || []);
      setSubmissions(subData);
      setReceived(recData);
    } catch (err) {
      console.error('Failed to load recoveries:', err);
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || 'Unable to load your recovery submissions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Active list calculation ────────────────────────────────────────────────
  const rawList = tab === 'submissions' ? submissions : received;

  // ── Metric calculation ─────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const list = rawList;
    const pending = list.filter(r => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length;
    const approved = list.filter(r => r.status === 'APPROVED').length;
    const closed = list.filter(r => r.status === 'REJECTED' || r.status === 'CANCELLED').length;
    return {
      total: list.length,
      pending,
      approved,
      closed
    };
  }, [rawList]);

  // ── Filtering & Sorting ────────────────────────────────────────────────────
  const filteredList = useMemo(() => {
    let result = [...rawList];

    if (filter !== 'ALL') {
      result = result.filter(r => r.status === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(r => {
        const name = (r.finderItemName || r.finder_item_name || r.item_name || '').toLowerCase();
        const lost = (r.lostItemTitle || r.lost_item_title || r.lost_title || '').toLowerCase();
        const loc = (r.foundLocation || r.found_location || '').toLowerCase();
        const city = (r.foundCity || r.city || r.found_city || '').toLowerCase();
        const idStr = String(r.id);
        return name.includes(q) || lost.includes(q) || loc.includes(q) || city.includes(q) || idStr.includes(q);
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0);
      }
      if (sortBy === 'updated') {
        return new Date(b.updatedAt || b.updated_at || 0) - new Date(a.updatedAt || a.updated_at || 0);
      }
      return 0;
    });

    return result;
  }, [rawList, filter, search, sortBy]);

  const clearFilters = () => {
    setFilter('ALL');
    setSearch('');
    setSortBy('newest');
  };

  const hasActiveFilters = filter !== 'ALL' || search.trim() !== '' || sortBy !== 'newest';

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh' }}>
      <Navbar />

      <PageContainer style={{ paddingTop: '100px', paddingBottom: 'var(--space-16)' }}>
        {/* ── 1. Page Header (Matches MyClaims structure) ─────────────────── */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Phase 7 Recovery Verification
          </div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-gray-900)' }}>
            My Recoveries &amp; Handover
          </h1>
          <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-base)', maxWidth: 640 }}>
            Track the items you have found and manage recovery submissions for items you have lost.
          </p>
        </div>

        {/* ── 2. Metric Summary Cards (Dashboard preserved) ───────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 'var(--space-8)'
        }}>
          <MetricCard
            title={tab === 'submissions' ? 'Total Submissions' : 'Total Received'}
            count={error && !rawList.length ? '—' : metrics.total}
            icon="📦"
            subtitle={tab === 'submissions' ? 'Reports you submitted' : 'Incoming matches'}
            color="#2563EB"
            bgGradient="linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%)"
            borderColor="#DBEAFE"
          />
          <MetricCard
            title="Pending Review"
            count={error && !rawList.length ? '—' : metrics.pending}
            icon="⏳"
            subtitle="Awaiting verification"
            color="#D97706"
            bgGradient="linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)"
            borderColor="#FDE68A"
          />
          <MetricCard
            title="Approved"
            count={error && !rawList.length ? '—' : metrics.approved}
            icon="🎉"
            subtitle="Chat & handover open"
            color="#059669"
            bgGradient="linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 100%)"
            borderColor="#A7F3D0"
          />
          <MetricCard
            title="Rejected / Cancelled"
            count={error && !rawList.length ? '—' : metrics.closed}
            icon="↩️"
            subtitle="Resolved submissions"
            color="#64748B"
            bgGradient="linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)"
            borderColor="#E2E8F0"
          />
        </div>

        {/* ── 3. Recovery Controls Section (Responsive 3-row layout) ───────── */}
        <div className="recovery-controls-section">
          {/* Row 1: My Submissions and Received Recoveries Tabs (Side-by-side) */}
          <div className="recovery-tabs-row">
            <button
              onClick={() => { setTab('submissions'); setFilter('ALL'); }}
              className={`recovery-tab-btn ${tab === 'submissions' ? 'active' : 'inactive'}`}
              type="button"
            >
              <span>🎁 My Submissions</span>
              <span className="recovery-tab-badge">
                {error && !submissions.length ? '—' : submissions.length}
              </span>
            </button>

            <button
              onClick={() => { setTab('received'); setFilter('ALL'); }}
              className={`recovery-tab-btn ${tab === 'received' ? 'active' : 'inactive'}`}
              type="button"
            >
              <span>📥 Received Recoveries</span>
              <span className="recovery-tab-badge">
                {error && !received.length ? '—' : received.length}
              </span>
            </button>
          </div>

          {/* Row 2: Search field immediately below tabs (Full available width on mobile) */}
          <div className="recovery-search-row">
            <span className="recovery-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search recoveries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="recovery-search-input"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="recovery-search-clear"
                type="button"
                aria-label="Clear search"
              >✕</button>
            )}
          </div>

          {/* Row 3: Filter, Sort, Refresh Controls Below Search */}
          <div className="recovery-filters-row">
            {/* Status filter dropdown */}
            <div className="recovery-filter-select-wrapper">
              <span className="recovery-filter-label">Filter:</span>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="recovery-select"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Sort dropdown */}
            <div className="recovery-sort-wrapper">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="recovery-select recovery-sort-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="updated">Recently Updated</option>
              </select>
            </div>

            {/* Refresh action */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="recovery-refresh-btn"
              type="button"
              title="Refresh recoveries"
            >
              <span className={loading ? 'anim-spin' : ''}>🔄</span>
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="recovery-clear-btn"
                type="button"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── 4. Main Cards Grid / Empty States ───────────────────────────── */}
        {error ? (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            textAlign: 'center',
            color: '#991B1B'
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 700 }}>Something went wrong</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#7F1D1D' }}>{error}</p>
            <button
              onClick={fetchData}
              style={{
                padding: '8px 20px',
                background: '#DC2626',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--space-6)'
          }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  borderRadius: 'var(--radius-2xl)',
                  padding: 20
                }}
              >
                <Skeleton height={140} style={{ borderRadius: 12, marginBottom: 16 }} />
                <Skeleton height={18} width="70%" style={{ marginBottom: 8 }} />
                <Skeleton height={14} width="40%" />
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <EmptyState
            icon={tab === 'submissions' ? '🎁' : '📥'}
            title={tab === 'submissions' ? 'No submitted recoveries found' : 'No recoveries received yet'}
            description={tab === 'submissions'
              ? (filter !== 'ALL' ? `No recoveries with status '${filter}'.` : "You haven't submitted any item recovery reports yet. You can submit a recovery from open Lost Items reports.")
              : 'When someone finds and reports an item matching your lost reports, it will appear here for verification.'}
            action={
              hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '9px 20px',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              ) : null
            }
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 'var(--space-6)'
          }}>
            {filteredList.map(r => (
              <RecoveryCard
                key={r.id}
                recovery={r}
                tab={tab}
                onView={id => navigate(`/recoveries/${id}`)}
              />
            ))}
          </div>
        )}
      </PageContainer>
      <Footer />
    </div>
  );
};

export default MyRecoveries;
