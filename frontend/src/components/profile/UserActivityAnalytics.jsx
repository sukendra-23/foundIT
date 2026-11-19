import React, { useState, useEffect } from 'react';
import { profileApi } from '../../services/profileApi';
import { Skeleton } from '../common/Loader';

const UserActivityAnalytics = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'categories'

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await profileApi.getAnalytics();
        if (isMounted) {
          setData(res.data.analytics);
        }
      } catch (err) {
        console.error('Failed to load user analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAnalytics();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">📊</div>
          <div>
            <div className="psc-head-title">Activity & Recovery Analytics</div>
            <div className="psc-head-sub">Loading your reports and claims trajectory...</div>
          </div>
        </div>
        <div className="psc-body">
          <Skeleton width="100%" height={160} style={{ marginBottom: 16 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Skeleton height={80} />
            <Skeleton height={80} />
            <Skeleton height={80} />
          </div>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    lostTotal: 0,
    foundTotal: 0,
    claimsTotal: 0,
    recoveriesTotal: 0,
    totalItems: 0,
    resolutionRate: 0,
    impactScore: 0,
    impactRank: 'Community Member',
  };

  const monthlyTrends = data?.monthlyTrends || [];
  const statusDist    = data?.statusDistribution || { OPEN: 0, MATCHED: 0, RETURNED: 0, CLOSED: 0 };
  const categoryDist  = data?.categoryDistribution || {};

  // Compute maximum count in monthly data to scale chart
  const maxMonthlyVal = Math.max(
    3,
    ...monthlyTrends.map(m => Math.max(m.lost, m.found, m.claims))
  );

  const totalStatusCount = Object.values(statusDist).reduce((a, b) => a + b, 0);

  // Status color map
  const STATUS_CONFIG = {
    RETURNED: { label: 'Returned', color: '#10B981', bg: '#ECFDF5' },
    MATCHED:  { label: 'Matched',  color: '#8B5CF6', bg: '#F5F3FF' },
    OPEN:     { label: 'Active/Open', color: '#3B82F6', bg: '#EFF6FF' },
    CLOSED:   { label: 'Closed',   color: '#F59E0B', bg: '#FFFBEB' },
  };

  return (
    <div className="profile-section-card">
      <div className="psc-head">
        <div className="psc-head-icon">📊</div>
        <div style={{ flex: 1 }}>
          <div className="psc-head-title">Activity & Recovery Analytics</div>
          <div className="psc-head-sub">Visual analysis of your reported items, claims & recovery impact</div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--color-gray-100)',
          padding: 3,
          borderRadius: 'var(--radius-lg)',
          gap: 2,
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            style={{
              padding: '5px 12px',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'monthly' ? '#fff' : 'transparent',
              color: activeTab === 'monthly' ? 'var(--color-primary)' : 'var(--color-gray-600)',
              boxShadow: activeTab === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            📈 Trends
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            style={{
              padding: '5px 12px',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'categories' ? '#fff' : 'transparent',
              color: activeTab === 'categories' ? 'var(--color-primary)' : 'var(--color-gray-600)',
              boxShadow: activeTab === 'categories' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            🏷️ Categories
          </button>
        </div>
      </div>

      <div className="psc-body">

        {/* ── Metric Cards Grid ─────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
        }}>
          {/* Impact Score */}
          <div style={{
            background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 100%)',
            border: '1.5px solid #C7D2FE',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-4)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: '#4338CA', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Community Score
                </span>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#1E1B4B', marginTop: 2 }}>
                  {summary.impactScore} <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: '#6366F1' }}>pts</span>
                </div>
              </div>
              <span style={{ fontSize: 24 }}>✨</span>
            </div>
            <div style={{ fontSize: '11px', color: '#4F46E5', fontWeight: 600, marginTop: 4 }}>
              {summary.impactRank}
            </div>
          </div>

          {/* Resolution Rate */}
          <div style={{
            background: '#F0FDF4',
            border: '1.5px solid #BBF7D0',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Resolution Rate
                </span>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#14532D', marginTop: 2 }}>
                  {summary.resolutionRate}%
                </div>
              </div>
              <span style={{ fontSize: 24 }}>🎯</span>
            </div>
            <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600, marginTop: 4 }}>
              {summary.totalItems > 0 ? `${statusDist.RETURNED || 0} items successfully reunited` : 'No reports yet'}
            </div>
          </div>

          {/* Claims & Recoveries */}
          <div style={{
            background: '#F8FAFC',
            border: '1.5px solid #E2E8F0',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Claims & Submissions
                </span>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0F172A', marginTop: 2 }}>
                  {summary.claimsTotal + summary.recoveriesTotal}
                </div>
              </div>
              <span style={{ fontSize: 24 }}>📑</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: 4 }}>
              {summary.claimsTotal} claims • {summary.recoveriesTotal} recoveries
            </div>
          </div>
        </div>

        {/* ── Visual Bar / Area Chart ─────────────────────────── */}
        {activeTab === 'monthly' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-gray-800)' }}>
                Activity Trajectory (Last 6 Months)
              </span>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 14, fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#EF4444' }} /> Lost
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#10B981' }} /> Found
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#4361EE' }} /> Claims
                </span>
              </div>
            </div>

            {/* Custom SVG Grouped Bar Chart */}
            <div style={{
              background: '#fff',
              border: '1px solid var(--color-gray-100)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px 16px 12px',
              position: 'relative',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${monthlyTrends.length || 6}, 1fr)`,
                gap: 12,
                height: 160,
                alignItems: 'end',
              }}>
                {monthlyTrends.map((m, idx) => {
                  const lostH  = Math.max(4, Math.round((m.lost / maxMonthlyVal) * 130));
                  const foundH = Math.max(4, Math.round((m.found / maxMonthlyVal) * 130));
                  const claimH = Math.max(4, Math.round((m.claims / maxMonthlyVal) * 130));

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                      }}
                    >
                      {/* Bar Group */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 130 }}>
                        {/* Lost Bar */}
                        <div
                          title={`Lost Items: ${m.lost}`}
                          style={{
                            width: 10,
                            height: `${lostH}px`,
                            background: m.lost > 0 ? '#EF4444' : '#F1F5F9',
                            borderRadius: '4px 4px 1px 1px',
                            transition: 'height 0.4s ease',
                          }}
                        />
                        {/* Found Bar */}
                        <div
                          title={`Found Items: ${m.found}`}
                          style={{
                            width: 10,
                            height: `${foundH}px`,
                            background: m.found > 0 ? '#10B981' : '#F1F5F9',
                            borderRadius: '4px 4px 1px 1px',
                            transition: 'height 0.4s ease',
                          }}
                        />
                        {/* Claims Bar */}
                        <div
                          title={`Claims: ${m.claims}`}
                          style={{
                            width: 10,
                            height: `${claimH}px`,
                            background: m.claims > 0 ? '#4361EE' : '#F1F5F9',
                            borderRadius: '4px 4px 1px 1px',
                            transition: 'height 0.4s ease',
                          }}
                        />
                      </div>

                      {/* Month label */}
                      <span style={{ fontSize: 11, color: 'var(--color-gray-500)', marginTop: 8, whiteSpace: 'nowrap' }}>
                        {m.month.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Category Breakdown View ─────────────────────────── */}
        {activeTab === 'categories' && (
          <div style={{
            background: '#fff',
            border: '1px solid var(--color-gray-100)',
            borderRadius: 'var(--radius-xl)',
            padding: 20,
          }}>
            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-gray-900)', marginBottom: 12 }}>
              Item Category Distribution
            </h4>

            {Object.keys(categoryDist).length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', textAlign: 'center', padding: '24px 0' }}>
                No category data recorded yet. Report your first lost or found item to view distribution insights.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(categoryDist).map(([cat, count]) => {
                  const pct = Math.round((count / (summary.totalItems || 1)) * 100);
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-gray-700)', marginBottom: 4 }}>
                        <span>{cat}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: 7, borderRadius: 4, background: 'var(--color-gray-100)', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--color-primary), #8B5CF6)',
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Status Spectrum Distribution Strip ───────────────── */}
        <div style={{ marginTop: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Report Status Breakdown
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
              {totalStatusCount} Total Items
            </span>
          </div>

          {/* Multi-segmented color spectrum bar */}
          <div style={{
            display: 'flex',
            width: '100%',
            height: 10,
            borderRadius: 5,
            overflow: 'hidden',
            background: 'var(--color-gray-100)',
            marginBottom: 14,
          }}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = statusDist[key] || 0;
              const pct = totalStatusCount > 0 ? (count / totalStatusCount) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <div
                  key={key}
                  title={`${cfg.label}: ${count} (${Math.round(pct)}%)`}
                  style={{
                    width: `${pct}%`,
                    background: cfg.color,
                    transition: 'width 0.3s ease',
                  }}
                />
              );
            })}
          </div>

          {/* Status Badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = statusDist[key] || 0;
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: cfg.bg,
                    border: `1px solid ${cfg.color}30`,
                    fontSize: 12,
                    fontWeight: 600,
                    color: cfg.color,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                  <span>{cfg.label}:</span>
                  <span style={{ fontWeight: 800 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserActivityAnalytics;
