import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import EmptyState from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Loader';
import { recoveryApi } from '../services/recoveryApi';
import { formatDate } from '../utils/formatters';

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

// ─── Metric Summary Card ──────────────────────────────────────────────────────
const MetricCard = ({ title, count, icon, subtitle, color, bgGradient, borderColor }) => (
  <div style={{
    background: bgGradient || '#fff',
    borderRadius: 'var(--radius-xl)',
    border: `1px solid ${borderColor || 'var(--color-gray-200)'}`,
    padding: '18px 20px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
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
      width: 48,
      height: 48,
      borderRadius: 12,
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 22,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      flexShrink: 0,
      border: '1px solid rgba(0,0,0,0.04)'
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || 'var(--color-gray-900)', lineHeight: 1.1 }}>
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

// ─── Recovery Card ────────────────────────────────────────────────────────────
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

  // Image resolution hierarchy:
  // 1. Finder's primary uploaded photo for this recovery
  // 2. Lost item original photo
  const displayImage = !imageError
    ? (recovery.primaryImage || recovery.primary_image || recovery.lostItemImage || recovery.lost_item_image)
    : null;

  const categoryIcon = CATEGORY_ICONS[category] || '📦';

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--color-gray-200)',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        e.currentTarget.style.borderColor = 'var(--color-primary-muted)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor = 'var(--color-gray-200)';
      }}
    >
      {/* ── Top Image Banner ────────────────────────────── */}
      <div style={{
        position: 'relative',
        height: 160,
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {displayImage ? (
          <img
            src={displayImage}
            alt={itemName}
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
            }}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-gray-400)',
            gap: 4
          }}>
            <span style={{ fontSize: 44 }}>{categoryIcon}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-gray-400)' }}>
              No image uploaded
            </span>
          </div>
        )}

        {/* Top-left ID badge */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(15, 23, 42, 0.75)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 800,
          padding: '3px 9px',
          borderRadius: 6,
          backdropFilter: 'blur(4px)',
          letterSpacing: '0.04em'
        }}>
          #REC-{String(id).padStart(4, '0')}
        </div>

        {/* Top-right status badge */}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* ── Card Body ──────────────────────────────────── */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
        {/* Title and context */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
            flexWrap: 'wrap'
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isReceived ? '#059669' : 'var(--color-primary)',
              background: isReceived ? '#ECFDF5' : '#EEF2FF',
              padding: '2px 8px',
              borderRadius: 6
            }}>
              {isReceived ? '📬 Incoming Recovery' : '🎁 Your Submission'}
            </span>
            <span style={{
              fontSize: 11,
              color: 'var(--color-gray-500)',
              background: 'var(--color-gray-100)',
              padding: '2px 8px',
              borderRadius: 6,
              fontWeight: 600
            }}>
              {category}
            </span>
          </div>

          <h3 style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 800,
            color: 'var(--color-gray-900)',
            lineHeight: 1.3
          }}>
            {itemName}
          </h3>

          <div style={{
            fontSize: 12,
            color: 'var(--color-gray-500)',
            marginTop: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            Matching Lost Report: <strong style={{ color: 'var(--color-gray-700)' }}>"{lostTitle}"</strong>
          </div>
        </div>

        {/* Key Information Grid */}
        <div style={{
          background: 'var(--color-gray-50)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          fontSize: 12.5,
          border: '1px solid var(--color-gray-200)',
          marginTop: 'auto'
        }}>
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--color-gray-400)', width: 16 }}>📍</span>
              <span style={{ color: 'var(--color-gray-500)', fontWeight: 600, minWidth: 60 }}>Found:</span>
              <span style={{ color: 'var(--color-gray-800)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {location}
              </span>
            </div>
          )}

          {date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--color-gray-400)', width: 16 }}>📅</span>
              <span style={{ color: 'var(--color-gray-500)', fontWeight: 600, minWidth: 60 }}>Date:</span>
              <span style={{ color: 'var(--color-gray-800)', fontWeight: 500 }}>
                {formatDate(date)}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--color-gray-400)', width: 16 }}>👤</span>
            <span style={{ color: 'var(--color-gray-500)', fontWeight: 600, minWidth: 60 }}>
              {isReceived ? 'Finder:' : 'Owner:'}
            </span>
            <span style={{ color: 'var(--color-gray-800)', fontWeight: 600 }}>
              {otherParty}
            </span>
          </div>

          {submittedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--color-gray-400)', borderTop: '1px solid var(--color-gray-200)', paddingTop: 6, marginTop: 2 }}>
              <span>⏱️ Submitted:</span>
              <span>{formatDate(submittedAt)}</span>
            </div>
          )}
        </div>

        {/* ── Handover Notification Banner for Approved Recoveries ──────── */}
        {status === 'APPROVED' && (
          <div style={{
            marginBottom: 8,
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
            <span style={{ fontSize: 11, color: '#059669' }}>Physical return open</span>
          </div>
        )}

        {/* ── Action Button ─────────────────────────────── */}
        <button
          onClick={() => onView(id)}
          style={{
            marginTop: 4,
            padding: '10px 16px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(67, 97, 238, 0.22)',
            transition: 'all 0.18s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--color-primary-dark)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(67, 97, 238, 0.35)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--color-primary)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(67, 97, 238, 0.22)';
          }}
        >
          <span>View Recovery Journey</span>
          <span>→</span>
        </button>
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
      const [subRes, recRes] = await Promise.all([
        recoveryApi.getMySubmissions(),
        recoveryApi.getReceived(),
      ]);
      const subList = Array.isArray(subRes.data) ? subRes.data : (subRes.data?.data || []);
      const recList = Array.isArray(recRes.data) ? recRes.data : (recRes.data?.data || []);
      setSubmissions(subList);
      setReceived(recList);
    } catch (err) {
      console.error('Failed to load recoveries:', err);
      setError('Unable to load recovery submissions. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Current list depending on active tab
  const currentList = tab === 'submissions' ? submissions : received;

  // ── Summary metrics calculation ─────────────────────────────────────────────
  const metrics = useMemo(() => {
    const list = currentList;
    const total = list.length;
    const pending = list.filter(r => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length;
    const approved = list.filter(r => r.status === 'APPROVED').length;
    const closed = list.filter(r => r.status === 'REJECTED' || r.status === 'CANCELLED').length;
    return { total, pending, approved, closed };
  }, [currentList]);

  // ── Search, filter & sort ───────────────────────────────────────────────────
  const filteredList = useMemo(() => {
    let result = [...currentList];

    // Status filter
    if (filter !== 'ALL') {
      result = result.filter(r => r.status === filter);
    }

    // Search query filter (matches item name, lost title, location, or recovery id)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(r => {
        const idMatch = String(r.id).includes(q) || `rec-${r.id}`.includes(q);
        const nameMatch = (r.finderItemName || r.item_name || '').toLowerCase().includes(q);
        const lostMatch = (r.lostItemTitle || r.lost_title || '').toLowerCase().includes(q);
        const locMatch = (r.foundLocation || r.found_location || '').toLowerCase().includes(q);
        return idMatch || nameMatch || lostMatch || locMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
      const updateA = new Date(a.updatedAt || a.updated_at || a.createdAt || 0).getTime();
      const updateB = new Date(b.updatedAt || b.updated_at || b.createdAt || 0).getTime();

      if (sortBy === 'oldest') return timeA - timeB;
      if (sortBy === 'updated') return updateB - updateA;
      return timeB - timeA; // default 'newest'
    });

    return result;
  }, [currentList, filter, search, sortBy]);

  const hasActiveFilters = filter !== 'ALL' || search.trim() !== '' || sortBy !== 'newest';

  const clearFilters = () => {
    setFilter('ALL');
    setSearch('');
    setSortBy('newest');
  };

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Navbar />
      <PageContainer maxWidth="1140px" style={{ paddingTop: '100px', paddingBottom: 'var(--space-20)', flex: 1 }}>

        {/* ── 1. Page Header ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--color-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span>🎁</span>
            <span>RECOVERY DASHBOARD</span>
          </div>
          <h1 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 800,
            color: 'var(--color-gray-900)',
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em'
          }}>
            My Recoveries
          </h1>
          <p style={{
            color: 'var(--color-gray-500)',
            fontSize: 'var(--font-size-base)',
            maxWidth: 680,
            margin: 0,
            lineHeight: 1.5
          }}>
            Track the items you have found and manage recovery submissions for items you have lost.
          </p>
        </div>

        {/* ── 2. Metric Summary Cards ─────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 'var(--space-8)'
        }}>
          <MetricCard
            title={tab === 'submissions' ? 'Total Submissions' : 'Total Received'}
            count={metrics.total}
            icon="📦"
            subtitle={tab === 'submissions' ? 'Reports you submitted' : 'Incoming matches'}
            color="#2563EB"
            bgGradient="linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%)"
            borderColor="#DBEAFE"
          />
          <MetricCard
            title="Pending Review"
            count={metrics.pending}
            icon="⏳"
            subtitle="Awaiting verification"
            color="#D97706"
            bgGradient="linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)"
            borderColor="#FDE68A"
          />
          <MetricCard
            title="Approved"
            count={metrics.approved}
            icon="🎉"
            subtitle="Chat & handover open"
            color="#059669"
            bgGradient="linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 100%)"
            borderColor="#A7F3D0"
          />
          <MetricCard
            title="Rejected / Cancelled"
            count={metrics.closed}
            icon="↩️"
            subtitle="Resolved submissions"
            color="#64748B"
            bgGradient="linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 100%)"
            borderColor="#E2E8F0"
          />
        </div>

        {/* ── 3. Tabs & Controls Bar ──────────────────────────────────────── */}
        <div style={{
          background: '#fff',
          borderRadius: 'var(--radius-2xl)',
          padding: '16px 20px',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'var(--space-6)'
        }}>
          {/* Tab buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            borderBottom: '1px solid var(--color-gray-200)',
            paddingBottom: 14,
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => { setTab('submissions'); setFilter('ALL'); }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-lg)',
                  border: 'none',
                  background: tab === 'submissions' ? 'var(--color-primary)' : 'var(--color-gray-100)',
                  color: tab === 'submissions' ? '#fff' : 'var(--color-gray-700)',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: tab === 'submissions' ? '0 4px 12px rgba(67, 97, 238, 0.25)' : 'none',
                  transition: 'all 0.18s ease'
                }}
              >
                <span>🎁 My Submissions</span>
                <span style={{
                  background: tab === 'submissions' ? 'rgba(255,255,255,0.25)' : 'var(--color-gray-200)',
                  color: tab === 'submissions' ? '#fff' : 'var(--color-gray-800)',
                  padding: '1px 8px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800
                }}>
                  {submissions.length}
                </span>
              </button>

              <button
                onClick={() => { setTab('received'); setFilter('ALL'); }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-lg)',
                  border: 'none',
                  background: tab === 'received' ? '#059669' : 'var(--color-gray-100)',
                  color: tab === 'received' ? '#fff' : 'var(--color-gray-700)',
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: tab === 'received' ? '0 4px 12px rgba(5, 150, 105, 0.25)' : 'none',
                  transition: 'all 0.18s ease'
                }}
              >
                <span>📬 Received Recoveries</span>
                <span style={{
                  background: tab === 'received' ? 'rgba(255,255,255,0.25)' : 'var(--color-gray-200)',
                  color: tab === 'received' ? '#fff' : 'var(--color-gray-800)',
                  padding: '1px 8px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800
                }}>
                  {received.length}
                </span>
              </button>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                background: 'none',
                border: '1px solid var(--color-gray-300)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 14px',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--color-gray-600)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span className={loading ? 'anim-spin' : ''}>🔄</span>
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Search, Filter Pills, and Sort Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            {/* Status Filter Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gray-400)', textTransform: 'uppercase', marginRight: 4 }}>
                Status:
              </span>
              {['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilter(st)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: filter === st ? 'var(--color-gray-900)' : 'var(--color-gray-100)',
                    color: filter === st ? '#fff' : 'var(--color-gray-600)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Right side: Search & Sort */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search box */}
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)', fontSize: 13 }}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search item, ID, location..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    padding: '7px 12px 7px 30px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-gray-300)',
                    fontSize: 12.5,
                    outline: 'none',
                    width: 210,
                    background: 'var(--color-gray-50)',
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-gray-400)',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort dropdown */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-gray-300)',
                  background: '#fff',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--color-gray-700)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="updated">Recently Updated</option>
              </select>

              {/* Clear filters button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--color-gray-300)',
                    background: '#fff',
                    color: 'var(--color-gray-600)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 4. Main Content Area ────────────────────────────────────────── */}
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
          /* Skeleton Loading Cards */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 'var(--space-6)'
          }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  borderRadius: 'var(--radius-2xl)',
                  border: '1px solid var(--color-gray-200)',
                  overflow: 'hidden',
                  padding: 16
                }}
              >
                <Skeleton height={150} style={{ borderRadius: 12, marginBottom: 16 }} />
                <Skeleton height={20} width="65%" style={{ marginBottom: 10 }} />
                <Skeleton height={14} width="40%" style={{ marginBottom: 16 }} />
                <Skeleton height={60} style={{ borderRadius: 8, marginBottom: 16 }} />
                <Skeleton height={38} style={{ borderRadius: 8 }} />
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          /* Empty States */
          <div style={{
            background: '#fff',
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--color-gray-200)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {hasActiveFilters ? (
              <EmptyState
                icon="🔍"
                title="No Matching Recoveries"
                description={`No recovery records match your search "${search}" with status "${filter}". Try adjusting or clearing your filters.`}
                action={
                  <button
                    onClick={clearFilters}
                    style={{
                      padding: '10px 22px',
                      background: 'var(--color-gray-900)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-lg)',
                      fontWeight: 700,
                      fontSize: 13.5,
                      cursor: 'pointer'
                    }}
                  >
                    Clear All Filters
                  </button>
                }
              />
            ) : tab === 'submissions' ? (
              <EmptyState
                icon="🎁"
                title="No Recovery Submissions Yet"
                description="Have you found an item that someone lost? Browse open lost item reports and submit a recovery to help reunite owners with their belongings."
                action={
                  <Link
                    to="/lost-items"
                    style={{
                      padding: '10px 24px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      borderRadius: 'var(--radius-lg)',
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(67, 97, 238, 0.25)',
                      display: 'inline-block'
                    }}
                  >
                    Browse Lost Items →
                  </Link>
                }
              />
            ) : (
              <EmptyState
                icon="📬"
                title="No Incoming Recoveries Yet"
                description="When community finders discover items matching your lost reports, their submitted recovery records will appear here for verification and handover."
                action={
                  <Link
                    to="/report/lost"
                    style={{
                      padding: '10px 24px',
                      background: '#059669',
                      color: '#fff',
                      borderRadius: 'var(--radius-lg)',
                      fontWeight: 700,
                      fontSize: 14,
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                      display: 'inline-block'
                    }}
                  >
                    Report a Lost Item →
                  </Link>
                }
              />
            )}
          </div>
        ) : (
          /* Recovery Cards Grid */
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
