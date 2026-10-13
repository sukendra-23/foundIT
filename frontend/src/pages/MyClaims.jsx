import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Loader';
import { claimApi } from '../services/claimApi';
import { formatDate } from '../utils/formatters';

const getProgressStep = (status) => {
  switch (status) {
    case 'PENDING':
      return { step: 1, label: 'Submitted (Awaiting Review)', color: '#D97706' };
    case 'FINDER_REVIEW':
      return { step: 2, label: 'Finder Review', color: '#4361EE' };
    case 'ADMIN_REVIEW':
      return { step: 3, label: 'Administrator Review', color: '#7C3AED' };
    case 'APPROVED':
      return { step: 4, label: 'Approved by Administrator', color: '#059669' };
    case 'REJECTED':
      return { step: 4, label: 'Rejected by Administrator', color: '#DC2626' };
    case 'WITHDRAWN':
      return { step: 0, label: 'Withdrawn by Claimant', color: '#64748B' };
    default:
      return { step: 1, label: status, color: '#64748B' };
  }
};

const MyClaims = () => {
  const [activeTab, setActiveTab] = useState('SUBMITTED'); // 'SUBMITTED' or 'RECEIVED'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [submittedClaims, setSubmittedClaims] = useState([]);
  const [receivedClaims, setReceivedClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const [subRes, recRes] = await Promise.all([
        claimApi.getMyClaims(),
        claimApi.getReceivedClaims(),
      ]);
      setSubmittedClaims(subRes.data || []);
      setReceivedClaims(recRes.data || []);
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const currentList = activeTab === 'SUBMITTED' ? submittedClaims : receivedClaims;

  const filteredList = currentList.filter(claim => {
    if (statusFilter === 'ALL') return true;
    return claim.status === statusFilter;
  });

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh' }}>
      <Navbar />
      <PageContainer style={{ paddingTop: '100px', paddingBottom: 'var(--space-16)' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Phase 6 Ownership Claims
          </div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-gray-900)' }}>
            Claims &amp; Ownership Verification
          </h1>
          <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-base)', maxWidth: 640 }}>
            Track claims you've filed for lost items, or review incoming claims for items you found.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 'var(--space-6)',
          borderBottom: '1px solid var(--color-gray-200)',
          paddingBottom: 12
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => { setActiveTab('SUBMITTED'); setStatusFilter('ALL'); }}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: activeTab === 'SUBMITTED' ? 'var(--color-primary)' : 'var(--color-gray-100)',
                color: activeTab === 'SUBMITTED' ? '#fff' : 'var(--color-gray-700)',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
            >
              <span>🏷️ Claims I Submitted</span>
              <span style={{
                background: activeTab === 'SUBMITTED' ? 'rgba(255,255,255,0.25)' : 'var(--color-gray-200)',
                padding: '2px 8px', borderRadius: 12, fontSize: 11
              }}>
                {submittedClaims.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('RECEIVED'); setStatusFilter('ALL'); }}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: activeTab === 'RECEIVED' ? 'var(--color-primary)' : 'var(--color-gray-100)',
                color: activeTab === 'RECEIVED' ? '#fff' : 'var(--color-gray-700)',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
            >
              <span>📥 Claims on My Found Items</span>
              <span style={{
                background: activeTab === 'RECEIVED' ? 'rgba(255,255,255,0.25)' : 'var(--color-gray-200)',
                padding: '2px 8px', borderRadius: 12, fontSize: 11
              }}>
                {receivedClaims.length}
              </span>
            </button>
          </div>

          {/* Status filter dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Filter:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-gray-300)',
                background: '#fff',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-gray-800)'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="FINDER_REVIEW">Finder Review</option>
              <option value="ADMIN_REVIEW">Admin Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </div>
        </div>

        {/* Claims Cards */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 'var(--radius-2xl)', padding: 20 }}>
                <Skeleton height={140} style={{ borderRadius: 12, marginBottom: 16 }} />
                <Skeleton height={18} width="70%" style={{ marginBottom: 8 }} />
                <Skeleton height={14} width="40%" />
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <EmptyState
            icon={activeTab === 'SUBMITTED' ? '🏷️' : '📥'}
            title={activeTab === 'SUBMITTED' ? 'No submitted claims found' : 'No claims received yet'}
            description={activeTab === 'SUBMITTED'
              ? (statusFilter !== 'ALL' ? `No claims with status '${statusFilter}'.` : "You haven't submitted any ownership claims yet. You can claim items from the Found Items section.")
              : 'When someone claims an item you reported as found, it will appear here for your review.'}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-6)' }}>
            {filteredList.map(claim => {
              const progress = getProgressStep(claim.status);
              return (
                <div
                  key={claim.id}
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
                  {/* Card Image Banner */}
                  <div style={{ position: 'relative', height: 140, background: 'var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {claim.found_image ? (
                      <img src={claim.found_image} alt={claim.found_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 40, opacity: 0.3 }}>📦</span>
                    )}
                    <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, backdropFilter: 'blur(2px)' }}>
                      CLM-{String(claim.id).padStart(4, '0')}
                    </div>
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <StatusBadge status={claim.status} />
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 4 }}>
                      {claim.found_category} &nbsp;·&nbsp; 📍 {claim.found_location}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-gray-900)', margin: '0 0 8px 0', lineHeight: 1.3 }}>
                      {claim.found_title}
                    </h3>

                    {activeTab === 'RECEIVED' && claim.claimant_name && (
                      <div style={{ fontSize: 12, color: 'var(--color-gray-600)', marginBottom: 8 }}>
                        👤 Claimed by: <strong>{claim.claimant_name}</strong>
                      </div>
                    )}

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
                      "{claim.claim_reason || claim.ownership_details || 'Claim description provided'}"
                    </p>

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
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: progress.color }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: progress.color }}>
                        {progress.label}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-gray-100)', paddingTop: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--color-gray-400)' }}>
                        Filed: {formatDate(claim.created_at)}
                      </div>
                      <Link
                        to={`/claims/${claim.id}`}
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {activeTab === 'RECEIVED' ? 'Review Claim' : 'Track Details'} →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageContainer>
      <Footer />
    </div>
  );
};

export default MyClaims;
