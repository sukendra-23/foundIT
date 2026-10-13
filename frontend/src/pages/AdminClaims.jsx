import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Loader';
import { useToast } from '../components/common/Toast';
import { adminClaimApi } from '../services/claimApi';
import { formatDate } from '../utils/formatters';

const AdminClaims = () => {
  const toast = useToast();

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Selected claim for review
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Side-by-side image comparison state
  const [activeFinderImgIdx, setActiveFinderImgIdx] = useState(0);
  const [activeEvidenceImgIdx, setActiveEvidenceImgIdx] = useState(0);
  const [enlargedImage, setEnlargedImage] = useState(null);

  // Decision state
  const [decision, setDecision] = useState('APPROVED');
  const [decisionReason, setDecisionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Tab & Moderation State (Feature F: Abuse Handling & Moderation)
  const [activeTab, setActiveTab] = useState('CLAIMS'); // 'CLAIMS' | 'MODERATION'
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportAction, setReportAction] = useState('ACTION_TAKEN');
  const [reportAdminNotes, setReportAdminNotes] = useState('');
  const [submittingReportReview, setSubmittingReportReview] = useState(false);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await adminClaimApi.getAll({
        status: statusFilter,
        search: search.trim() || undefined
      });
      setClaims(res.data || []);
    } catch (err) {
      toast('Failed to load claims for admin review.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClaims();
  };

  const openReviewModal = async (claimId) => {
    setSelectedClaimId(claimId);
    setDetailLoading(true);
    setDecision('APPROVED');
    setDecisionReason('');
    setAdminNotes('');
    setActiveFinderImgIdx(0);
    setActiveEvidenceImgIdx(0);
    setEnlargedImage(null);
    try {
      const res = await adminClaimApi.getById(claimId);
      setDetailData(res.data);
    } catch (err) {
      toast('Failed to load claim review details.', 'error');
      setSelectedClaimId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!decisionReason || decisionReason.trim().length < 5) {
      toast('Please provide a decision reason (at least 5 characters).', 'error');
      return;
    }

    setSubmittingDecision(true);
    try {
      await adminClaimApi.decide(selectedClaimId, decision, decisionReason, adminNotes);
      toast(`Claim successfully ${decision.toLowerCase()}!`, 'success');
      setSelectedClaimId(null);
      setDetailData(null);
      fetchClaims();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to submit decision.', 'error');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await adminClaimApi.getMessageReports();
      setReports(res.data || []);
    } catch (err) {
      toast('Failed to load message moderation reports.', 'error');
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'MODERATION') {
      fetchReports();
    }
  }, [activeTab]);

  const handleReportReviewSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedReport) return;

    setSubmittingReportReview(true);
    try {
      await adminClaimApi.reviewMessageReport(selectedReport.id, reportAction, reportAdminNotes);
      toast(`Report has been marked as ${reportAction.replace(/_/g, ' ')}.`, 'success');
      setSelectedReport(null);
      setReportAdminNotes('');
      fetchReports();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update report.', 'error');
    } finally {
      setSubmittingReportReview(false);
    }
  };

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh' }}>
      <Navbar />
      <PageContainer style={{ paddingTop: '100px', paddingBottom: 'var(--space-16)' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            🛡️ Administrator Management
          </div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-gray-900)' }}>
            Ownership Verification &amp; Moderation
          </h1>
          <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-base)', maxWidth: 680 }}>
            Inspect ownership proof, review finder assessments, manage claim decisions, and moderate reported communications.
          </p>

          {/* Section Switcher Tabs (Feature F: Moderation Portal) */}
          <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
            <button
              type="button"
              onClick={() => setActiveTab('CLAIMS')}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                background: activeTab === 'CLAIMS' ? '#7C3AED' : '#fff',
                color: activeTab === 'CLAIMS' ? '#fff' : 'var(--color-gray-700)',
                boxShadow: activeTab === 'CLAIMS' ? '0 4px 12px rgba(124, 58, 237, 0.25)' : 'var(--shadow-xs)',
                transition: 'all 0.15s ease'
              }}
            >
              🛡️ Ownership Claims ({claims.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MODERATION')}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                background: activeTab === 'MODERATION' ? '#DC2626' : '#fff',
                color: activeTab === 'MODERATION' ? '#fff' : 'var(--color-gray-700)',
                boxShadow: activeTab === 'MODERATION' ? '0 4px 12px rgba(220, 38, 38, 0.25)' : 'var(--shadow-xs)',
                transition: 'all 0.15s ease'
              }}
            >
              🚨 Message Moderation {reports.filter(r => r.status === 'PENDING').length > 0 && `(${reports.filter(r => r.status === 'PENDING').length} pending)`}
            </button>
          </div>
        </div>

        {/* Tab 1: CLAIMS TAB */}
        {activeTab === 'CLAIMS' && (
          <>

        {/* Filter and Search Bar */}
        <div style={{
          background: '#fff',
          borderRadius: 'var(--radius-xl)',
          padding: '16px 20px',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14
        }}>
          {/* Status buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['ALL', 'PENDING', 'FINDER_REVIEW', 'ADMIN_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: statusFilter === st ? '#7C3AED' : 'var(--color-gray-100)',
                  color: statusFilter === st ? '#fff' : 'var(--color-gray-700)',
                  transition: 'all 0.15s'
                }}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Search by title, claimant..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-gray-300)', fontSize: 13, minWidth: 220
              }}
            />
            <Button size="sm" type="submit">Search</Button>
          </form>
        </div>

        {/* Claims Table */}
        {loading ? (
          <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: 24 }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} height={40} style={{ marginBottom: 12 }} />)}
          </div>
        ) : claims.length === 0 ? (
          <EmptyState
            icon="🛡️"
            title="No claims match current filter"
            description="There are currently no ownership claims in this view."
          />
        ) : (
          <div style={{
            background: '#fff',
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--color-gray-200)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)', color: 'var(--color-gray-600)' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 800 }}>Ref</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800 }}>Item</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800 }}>Claimant</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800 }}>Finder</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800 }}>Finder Input</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800 }}>Status</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800 }}>Filed</th>
                  <th style={{ padding: '14px 18px', fontWeight: 800, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(claim => (
                  <tr key={claim.id} style={{ borderBottom: '1px solid var(--color-gray-100)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--color-primary)' }}>
                      #{String(claim.id).padStart(4, '0')}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-gray-900)' }}>{claim.found_title}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-gray-500)' }}>{claim.found_category}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-gray-800)' }}>{claim.claimant_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-gray-500)' }}>{claim.claimant_email}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>{claim.finder_name}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {claim.finder_response ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                          background: claim.finder_response === 'RECOGNIZED' ? '#D1FAE5' : (claim.finder_response === 'NEEDS_INFO' ? '#FEF3C7' : '#FEE2E2'),
                          color: claim.finder_response === 'RECOGNIZED' ? '#047857' : (claim.finder_response === 'NEEDS_INFO' ? '#B45309' : '#B91C1C')
                        }}>
                          {claim.finder_response}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--color-gray-400)' }}>Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <StatusBadge status={claim.status} />
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--color-gray-500)', fontSize: 12 }}>
                      {formatDate(claim.created_at)}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <Button size="sm" onClick={() => openReviewModal(claim.id)}>
                        Review &amp; Decide →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </>
        )}

        {/* Tab 2: MODERATION TAB (Feature F: Abuse Handling & Moderation Portal) */}
        {activeTab === 'MODERATION' && (
          <div>
            {/* Moderation Controls Header */}
            <div style={{
              background: '#fff',
              borderRadius: 'var(--radius-xl)',
              padding: '16px 20px',
              border: '1px solid var(--color-gray-200)',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: 'var(--space-6)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 14
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-gray-900)' }}>
                  🚨 Flagged Communications
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: 13, color: 'var(--color-gray-500)' }}>
                  Review in-app chat messages reported by community members for abuse, spam, or safety violations.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Metric Pills */}
                <div style={{
                  display: 'flex',
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: 'var(--color-gray-50)',
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: '1px solid var(--color-gray-200)'
                }}>
                  <span style={{ color: '#DC2626' }}>
                    ● {reports.filter(r => r.status === 'PENDING').length} Pending
                  </span>
                  <span style={{ color: 'var(--color-gray-400)' }}>|</span>
                  <span style={{ color: '#059669' }}>
                    ● {reports.filter(r => r.status === 'ACTION_TAKEN').length} Action Taken
                  </span>
                  <span style={{ color: 'var(--color-gray-400)' }}>|</span>
                  <span style={{ color: 'var(--color-gray-500)' }}>
                    ● {reports.filter(r => r.status === 'DISMISSED').length} Dismissed
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={fetchReports}
                  disabled={loadingReports}
                >
                  {loadingReports ? 'Refreshing...' : '🔄 Refresh'}
                </Button>
              </div>
            </div>

            {/* Reports Content */}
            {loadingReports ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Skeleton height={200} />
              </div>
            ) : reports.length === 0 ? (
              <EmptyState
                icon="🛡️"
                title="No Moderation Reports"
                description="All claim messages are safe and clean! No user reports have been logged."
              />
            ) : (
              <div style={{
                background: '#fff',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-gray-200)',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)', color: 'var(--color-gray-500)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '12px 18px' }}>Report ID / Date</th>
                      <th style={{ padding: '12px 18px' }}>Violation Reason</th>
                      <th style={{ padding: '12px 18px' }}>Flagged Message</th>
                      <th style={{ padding: '12px 18px' }}>Participants</th>
                      <th style={{ padding: '12px 18px' }}>Associated Item</th>
                      <th style={{ padding: '12px 18px' }}>Status</th>
                      <th style={{ padding: '12px 18px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => {
                      const reasonLabels = {
                        HARASSMENT: { label: 'Harassment', bg: '#FEE2E2', color: '#991B1B' },
                        SPAM: { label: 'Spam / Advertising', bg: '#FEF3C7', color: '#92400E' },
                        SCAM_FRAUD: { label: 'Scam / Extortion', bg: '#FFEDD5', color: '#9A3412' },
                        INAPPROPRIATE: { label: 'Inappropriate Content', bg: '#EDE9FE', color: '#5B21B6' },
                        OTHER: { label: 'Other Concern', bg: '#F1F5F9', color: '#475569' }
                      };
                      const reasonMeta = reasonLabels[report.reason] || { label: report.reason, bg: '#F1F5F9', color: '#475569' };

                      const statusColors = {
                        PENDING: { bg: '#FEF3C7', color: '#B45309', label: '⏳ Pending' },
                        ACTION_TAKEN: { bg: '#FEE2E2', color: '#DC2626', label: '⚠️ Action Taken' },
                        DISMISSED: { bg: '#F1F5F9', color: '#64748B', label: '✕ Dismissed' },
                        REVIEWED: { bg: '#E0F2FE', color: '#0284C7', label: '✓ Reviewed' }
                      };
                      const statusMeta = statusColors[report.status] || { bg: '#F1F5F9', color: '#64748B', label: report.status };

                      return (
                        <tr key={report.id} style={{ borderBottom: '1px solid var(--color-gray-100)', transition: 'background 0.15s ease' }}>
                          <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 800, color: 'var(--color-gray-900)', fontSize: 13 }}>
                              #REP-{String(report.id).padStart(4, '0')}
                            </div>
                            <div style={{ color: 'var(--color-gray-400)', fontSize: 11, marginTop: 2 }}>
                              {formatDate(report.created_at)}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              background: reasonMeta.bg,
                              color: reasonMeta.color
                            }}>
                              {reasonMeta.label}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px', verticalAlign: 'top', maxWidth: 260 }}>
                            <div style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: 6,
                              padding: '6px 10px',
                              fontSize: 12,
                              color: 'var(--color-gray-800)',
                              fontStyle: 'italic',
                              wordBreak: 'break-word',
                              lineHeight: 1.4
                            }}>
                              "{report.message_text.length > 90 ? `${report.message_text.slice(0, 90)}...` : report.message_text}"
                            </div>
                            {report.details && (
                              <div style={{ fontSize: 11, color: 'var(--color-gray-500)', marginTop: 4 }}>
                                <strong>Note:</strong> {report.details}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '14px 18px', verticalAlign: 'top', fontSize: 12 }}>
                            <div style={{ color: '#DC2626', fontWeight: 600 }}>
                              Reported: {report.reported_name}
                            </div>
                            <div style={{ color: 'var(--color-gray-400)', fontSize: 11 }}>
                              {report.reported_email}
                            </div>
                            <div style={{ color: 'var(--color-gray-500)', marginTop: 4 }}>
                              By: {report.reporter_name}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px', verticalAlign: 'top', fontSize: 12 }}>
                            <div style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>
                              Claim #{report.claim_id}
                            </div>
                            <div style={{ color: 'var(--color-gray-500)', fontSize: 11 }}>
                              {report.found_title}
                            </div>
                          </td>

                          <td style={{ padding: '14px 18px', verticalAlign: 'top' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              background: statusMeta.bg,
                              color: statusMeta.color
                            }}>
                              {statusMeta.label}
                            </span>
                          </td>

                          <td style={{ padding: '14px 18px', verticalAlign: 'top', textAlign: 'right' }}>
                            <Button
                              size="sm"
                              variant={report.status === 'PENDING' ? 'primary' : 'ghost'}
                              onClick={() => {
                                setSelectedReport(report);
                                setReportAction(report.status === 'PENDING' ? 'ACTION_TAKEN' : report.status);
                                setReportAdminNotes(report.admin_notes || '');
                              }}
                            >
                              Review Report →
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </PageContainer>
      <Footer />

      {/* Review & Decision Modal */}
      {selectedClaimId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 'var(--radius-2xl)', maxWidth: 840, width: '100%',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-2xl)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid var(--color-gray-100)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-gray-50)'
            }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase' }}>Admin Ownership Review</span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: 17, fontWeight: 800 }}>
                  Claim #{String(selectedClaimId).padStart(4, '0')}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedClaimId(null); setDetailData(null); }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-gray-400)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {detailLoading || !detailData ? (
                <div><Skeleton height={200} /></div>
              ) : (() => {
                const finderImages = (detailData.foundItemImages && detailData.foundItemImages.length > 0)
                  ? detailData.foundItemImages
                  : (detailData.claim?.foundItemImages && detailData.claim.foundItemImages.length > 0)
                    ? detailData.claim.foundItemImages
                    : (detailData.claim?.found_image ? [{ id: 'found-primary', image_url: detailData.claim.found_image }] : []);

                const evidenceImages = detailData.evidence || [];

                const activeFinder = finderImages[activeFinderImgIdx] || finderImages[0] || null;
                const activeEvidence = evidenceImages[activeEvidenceImgIdx] || evidenceImages[0] || null;

                const claim = detailData.claim;
                const lostItem = detailData.lostItem;

                const renderComparisonRow = (label, leftVal, rightVal, isHighlighted = false) => {
                  const isLeftEmpty = !leftVal || leftVal === 'Not specified' || leftVal === 'None reported by finder' || leftVal === 'No description provided' || leftVal === '—';
                  const isRightEmpty = !rightVal || rightVal === 'Not provided' || rightVal.includes('Not provided') || rightVal === '—';

                  return (
                    <div key={label} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: isHighlighted ? '#F5F3FF' : '#F8FAFC',
                      border: isHighlighted ? '1px solid #DDD6FE' : '1px solid #F1F5F9'
                    }}>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: isHighlighted ? '#6D28D9' : '#64748B',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {label}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 14,
                        alignItems: 'start'
                      }}>
                        <div style={{
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: isLeftEmpty ? '#94A3B8' : '#0F172A',
                          fontStyle: isLeftEmpty ? 'italic' : 'normal',
                          fontWeight: isHighlighted ? 700 : 400,
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {leftVal}
                        </div>
                        <div style={{
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: isRightEmpty ? '#94A3B8' : '#0F172A',
                          fontStyle: isRightEmpty ? 'italic' : 'normal',
                          fontWeight: isHighlighted ? 700 : 400,
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {rightVal}
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Status Banner */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-gray-50)', borderRadius: 12, border: '1px solid var(--color-gray-200)' }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--color-gray-500)', textTransform: 'uppercase', fontWeight: 700 }}>Current Status: </span>
                      <StatusBadge status={detailData.claim.status} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>
                      Filed on {formatDate(detailData.claim.created_at)}
                    </div>
                  </div>

                  {/* Found Item & Claimant Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Found Item Details
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{detailData.claim.found_title}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-gray-600)' }}>📍 {detailData.claim.found_location}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-gray-500)', marginTop: 4 }}>Finder: {detailData.claim.finder_name} ({detailData.claim.finder_email})</div>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Claimant Contact
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{detailData.claim.claimant_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-gray-600)' }}>📧 {detailData.claim.claimant_email}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-gray-600)' }}>📞 {detailData.claim.claimant_phone || 'None'}</div>
                    </div>
                  </div>

                  {/* Ownership Proof */}
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gray-600)' }}>
                      Submitted Ownership Proof
                    </h4>
                    <div style={{ background: 'var(--color-gray-50)', padding: 14, borderRadius: 10, border: '1px solid var(--color-gray-200)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {detailData.claim.ownership_details}
                    </div>
                    {detailData.claim.identifying_marks && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
                        🔍 Identifying Marks: {detailData.claim.identifying_marks}
                      </div>
                    )}
                  </div>

                  {/* Side-by-Side Image Comparison Section */}
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: 14,
                    border: '1px solid #E2E8F0',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                  }}>
                    {/* Comparison Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Visual Ownership Verification
                        </div>
                        <h4 style={{ margin: '2px 0 0 0', fontSize: 15, fontWeight: 800, color: 'var(--color-gray-900)' }}>
                          Original Found Item vs Claimant's Evidence
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--color-gray-500)', lineHeight: 1.4 }}>
                          Compare item details, color, scratches, serial numbers, and keys side-by-side.
                        </p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#EDE9FE', color: '#6D28D9', padding: '3px 10px', borderRadius: 999 }}>
                        Side-by-Side Review
                      </span>
                    </div>

                    {/* Comparison Columns */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 14,
                      alignItems: 'stretch'
                    }}>
                      {/* LEFT: Finder's Original Photos */}
                      <div style={{
                        background: '#fff',
                        borderRadius: 12,
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          padding: '10px 14px',
                          background: '#F1F5F9',
                          borderBottom: '1px solid #E2E8F0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-gray-900)' }}>
                              Finder's Original Photos
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-gray-500)' }}>
                              Uploaded with found item report
                            </div>
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                            background: finderImages.length > 0 ? '#DBEAFE' : '#F1F5F9',
                            color: finderImages.length > 0 ? '#1E40AF' : '#94A3B8'
                          }}>
                            {finderImages.length} {finderImages.length === 1 ? 'photo' : 'photos'}
                          </span>
                        </div>

                        {finderImages.length > 0 && activeFinder ? (
                          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                            <div
                              onClick={() => setEnlargedImage({
                                url: activeFinder.image_url,
                                title: "Finder's Original Photo",
                                subtitle: `Photo ${activeFinderImgIdx + 1} of ${finderImages.length} · Item: ${detailData.claim.found_title}`
                              })}
                              style={{
                                width: '100%',
                                height: 210,
                                background: '#0F172A',
                                borderRadius: 8,
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'zoom-in',
                                position: 'relative'
                              }}
                              title="Click to enlarge"
                            >
                              <img
                                src={activeFinder.image_url}
                                alt="Finder original"
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                              />
                              <div style={{
                                position: 'absolute', bottom: 8, right: 8,
                                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                                color: '#fff', fontSize: 11, fontWeight: 600,
                                padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4
                              }}>
                                🔍 Click to enlarge
                              </div>
                            </div>

                            {finderImages.length > 1 && (
                              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                                {finderImages.map((img, idx) => (
                                  <button
                                    key={img.id || idx}
                                    type="button"
                                    onClick={() => setActiveFinderImgIdx(idx)}
                                    style={{
                                      width: 48, height: 48, padding: 0, flexShrink: 0,
                                      borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                                      border: activeFinderImgIdx === idx ? '2px solid var(--color-primary)' : '1px solid #CBD5E1',
                                      opacity: activeFinderImgIdx === idx ? 1 : 0.65,
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <img src={img.image_url} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{
                            padding: '36px 16px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            background: '#FAFAFA'
                          }}>
                            <span style={{ fontSize: 32, opacity: 0.35, marginBottom: 6 }}>📦</span>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-gray-700)' }}>
                              Original found-item photos are unavailable
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-gray-400)', marginTop: 4 }}>
                              No photos were uploaded with this found report.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* RIGHT: Claimant's Evidence */}
                      <div style={{
                        background: '#fff',
                        borderRadius: 12,
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          padding: '10px 14px',
                          background: '#F1F5F9',
                          borderBottom: '1px solid #E2E8F0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-gray-900)' }}>
                              Claimant's Evidence
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-gray-500)' }}>
                              Uploaded with ownership claim
                            </div>
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                            background: evidenceImages.length > 0 ? '#EDE9FE' : '#F1F5F9',
                            color: evidenceImages.length > 0 ? '#6D28D9' : '#94A3B8'
                          }}>
                            {evidenceImages.length} {evidenceImages.length === 1 ? 'photo' : 'photos'}
                          </span>
                        </div>

                        {evidenceImages.length > 0 && activeEvidence ? (
                          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                            <div
                              onClick={() => setEnlargedImage({
                                url: activeEvidence.image_url,
                                title: "Claimant's Ownership Evidence",
                                subtitle: `Photo ${activeEvidenceImgIdx + 1} of ${evidenceImages.length} · Claimant: ${detailData.claim.claimant_name}`
                              })}
                              style={{
                                width: '100%',
                                height: 210,
                                background: '#0F172A',
                                borderRadius: 8,
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'zoom-in',
                                position: 'relative'
                              }}
                              title="Click to enlarge"
                            >
                              <img
                                src={activeEvidence.image_url}
                                alt="Claimant evidence"
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                              />
                              <div style={{
                                position: 'absolute', bottom: 8, right: 8,
                                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                                color: '#fff', fontSize: 11, fontWeight: 600,
                                padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4
                              }}>
                                🔍 Click to enlarge
                              </div>
                            </div>

                            {evidenceImages.length > 1 && (
                              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                                {evidenceImages.map((img, idx) => (
                                  <button
                                    key={img.id || idx}
                                    type="button"
                                    onClick={() => setActiveEvidenceImgIdx(idx)}
                                    style={{
                                      width: 48, height: 48, padding: 0, flexShrink: 0,
                                      borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                                      border: activeEvidenceImgIdx === idx ? '2px solid #7C3AED' : '1px solid #CBD5E1',
                                      opacity: activeEvidenceImgIdx === idx ? 1 : 0.65,
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <img src={img.image_url} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{
                            padding: '36px 16px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            background: '#FAFAFA'
                          }}>
                            <span style={{ fontSize: 32, opacity: 0.35, marginBottom: 6 }}>📄</span>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-gray-700)' }}>
                              No evidence photos submitted
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-gray-400)', marginTop: 4 }}>
                              No ownership proof photos were attached to this claim.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Item Details & Ownership Information Comparison */}
                  <div style={{
                    background: '#fff',
                    borderRadius: 14,
                    border: '1px solid #E2E8F0',
                    padding: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                  }}>
                    {/* Section Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Attribute Verification
                        </div>
                        <h4 style={{ margin: '2px 0 0 0', fontSize: 15, fontWeight: 800, color: 'var(--color-gray-900)' }}>
                          Item Details &amp; Ownership Information Comparison
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--color-gray-500)', lineHeight: 1.4 }}>
                          Direct field-by-field alignment between the finder's original report and claimant's submission.
                        </p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#EEF2FF', color: 'var(--color-primary)', padding: '3px 10px', borderRadius: 999 }}>
                        Field Comparison
                      </span>
                    </div>

                    {/* Column Headers */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 14,
                      paddingBottom: 6,
                      borderBottom: '2px solid #E2E8F0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>
                          Finder's Original Report
                        </span>
                        <span style={{ fontSize: 11, color: '#1E40AF', background: '#DBEAFE', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                          Reported Item
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#6D28D9', textTransform: 'uppercase' }}>
                          Claimant's Ownership Details
                        </span>
                        <span style={{ fontSize: 11, color: '#6D28D9', background: '#EDE9FE', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                          Claimed Ownership
                        </span>
                      </div>
                    </div>

                    {/* Comparison Fields Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {renderComparisonRow(
                        'Item Name / Title',
                        claim.found_title || 'Not specified',
                        lostItem?.title || claim.claim_reason || 'Not provided',
                        true
                      )}

                      {renderComparisonRow(
                        'Category',
                        claim.found_category || 'Not specified',
                        lostItem?.category || 'Not provided'
                      )}

                      {renderComparisonRow(
                        'Brand & Model',
                        [claim.found_brand, claim.found_model].filter(Boolean).join(' ') || 'Not specified',
                        [lostItem?.brand, lostItem?.model].filter(Boolean).join(' ') || 'Not provided'
                      )}

                      {renderComparisonRow(
                        'Color',
                        claim.found_color || 'Not specified',
                        lostItem?.color || 'Not provided'
                      )}

                      {renderComparisonRow(
                        'Location',
                        claim.found_location ? `📍 Found at: ${claim.found_location}` : 'Not specified',
                        (claim.lost_location_claimed || lostItem?.location) ? `📍 Claimed lost at: ${claim.lost_location_claimed || lostItem?.location}` : 'Not provided'
                      )}

                      {renderComparisonRow(
                        'Date & Time',
                        claim.found_date ? `📅 Found on: ${formatDate(claim.found_date)}${claim.found_time ? ' at ' + claim.found_time : ''}` : 'Not specified',
                        (claim.lost_date_claimed || lostItem?.lost_date) ? `📅 Claimed lost on: ${formatDate(claim.lost_date_claimed || lostItem?.lost_date)}` : 'Not provided'
                      )}

                      {renderComparisonRow(
                        'Identifying Marks & Distinguishing Features',
                        claim.found_identifying_details || 'None reported by finder',
                        claim.identifying_marks || lostItem?.identifying_details || 'Not provided',
                        true
                      )}

                      {renderComparisonRow(
                        'Description & Ownership Explanation',
                        claim.found_description || 'No description provided',
                        claim.ownership_details || claim.proof_description || 'Not provided'
                      )}

                      {renderComparisonRow(
                        'Additional Report & Claim Details',
                        `Reported on ${formatDate(claim.found_created_at)} by ${claim.finder_name} (${claim.finder_email})`,
                        claim.additional_info_provided ? `Clarification provided: "${claim.additional_info_provided}"` : (claim.claim_reason ? `Reason: "${claim.claim_reason}"` : 'Not provided')
                      )}
                    </div>

                    {/* Review Checklist / Important Details to Verify */}
                    <div style={{
                      marginTop: 4,
                      padding: '14px 16px',
                      background: '#FFFBEB',
                      borderRadius: 10,
                      border: '1px solid #FDE68A',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>📋</span>
                        <h5 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Important Details to Verify (Review Checklist)
                        </h5>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#78350F', lineHeight: 1.4 }}>
                        Evaluate these consistency criteria before making your final determination:
                      </p>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: 10,
                        fontSize: 12,
                        color: '#92400E'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span>🔍</span>
                          <span><strong>Visual Consistency:</strong> Do photos above match in appearance, color, brand, wear, and physical shape?</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span>🏷️</span>
                          <span><strong>Identifying Marks:</strong> Do unique details (scratches, stickers, keychains, serial numbers) align?</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span>📍</span>
                          <span><strong>Location Plausibility:</strong> Is the claimed lost location geographically consistent with where it was found?</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span>⏱️</span>
                          <span><strong>Timeline Plausibility:</strong> Was the item lost on or before the date it was found?</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span>💬</span>
                          <span><strong>Finder Feedback:</strong> Review the finder's assessment below regarding whether they recognized the claimant's proof.</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span>⚖️</span>
                          <span><strong>Discretionary Decision:</strong> The decision rests strictly upon administrative review, with reasons recorded to audit log.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Finder Feedback */}
                  {detailData.claim.finder_response && (
                    <div style={{ background: 'rgba(67, 97, 238, 0.05)', padding: 14, borderRadius: 10, border: '1px solid rgba(67, 97, 238, 0.2)' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Finder Feedback: {detailData.claim.finder_response}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-gray-700)' }}>
                        "{detailData.claim.finder_notes || 'No notes provided by finder'}"
                      </div>
                    </div>
                  )}

                  {/* Decision Form (Only if not in terminal state) */}
                  {!['APPROVED', 'REJECTED', 'WITHDRAWN'].includes(detailData.claim.status) ? (
                    <form onSubmit={handleDecisionSubmit} style={{ marginTop: 8, padding: 18, background: '#FAF5FF', borderRadius: 12, border: '1px solid #E9D5FF', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#6B21A8' }}>
                        ⚖️ Issue Final Ownership Determination
                      </h4>

                      <div style={{ display: 'flex', gap: 12 }}>
                        <label style={{
                          flex: 1, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                          border: decision === 'APPROVED' ? '2px solid #059669' : '1px solid var(--color-gray-300)',
                          background: decision === 'APPROVED' ? '#D1FAE5' : '#fff', display: 'flex', alignItems: 'center', gap: 8
                        }}>
                          <input type="radio" name="admin_decision" value="APPROVED" checked={decision === 'APPROVED'} onChange={() => setDecision('APPROVED')} />
                          <span style={{ fontWeight: 800, color: '#047857' }}>✓ Approve Claim</span>
                        </label>

                        <label style={{
                          flex: 1, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                          border: decision === 'REJECTED' ? '2px solid #DC2626' : '1px solid var(--color-gray-300)',
                          background: decision === 'REJECTED' ? '#FEE2E2' : '#fff', display: 'flex', alignItems: 'center', gap: 8
                        }}>
                          <input type="radio" name="admin_decision" value="REJECTED" checked={decision === 'REJECTED'} onChange={() => setDecision('REJECTED')} />
                          <span style={{ fontWeight: 800, color: '#B91C1C' }}>✕ Reject Claim</span>
                        </label>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 4 }}>
                          Public Decision Reason <span style={{ color: 'var(--color-error)' }}>*</span> (Visible to Claimant and Finder)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Serial number and purchase receipt match item records"
                          value={decisionReason}
                          onChange={e => setDecisionReason(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-gray-300)', fontSize: 13 }}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 4 }}>
                          Internal Administrator Notes (Confidential — Only visible to Admins)
                        </label>
                        <input
                          type="text"
                          placeholder="Internal audit notes..."
                          value={adminNotes}
                          onChange={e => setAdminNotes(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-gray-300)', fontSize: 13 }}
                        />
                      </div>

                      <Button type="submit" loading={submittingDecision} style={{ background: decision === 'APPROVED' ? '#059669' : '#DC2626' }}>
                        Confirm &amp; Record {decision} Decision
                      </Button>
                    </form>
                  ) : (
                    <div style={{ padding: 14, background: 'var(--color-gray-50)', borderRadius: 10, fontSize: 13 }}>
                      <strong>Decision:</strong> {detailData.claim.status} by Administrator.
                      {detailData.claim.decision_reason && <div>Reason: "{detailData.claim.decision_reason}"</div>}
                      {detailData.claim.admin_notes && <div style={{ color: 'var(--color-gray-500)', marginTop: 4 }}>Internal Note: {detailData.claim.admin_notes}</div>}
                    </div>
                  )}
                </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen / Enlarged Image Preview Modal */}
      {enlargedImage && (
        <div
          onClick={() => setEnlargedImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(6px)',
            zIndex: 1300, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 20,
            cursor: 'zoom-out'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 900, width: '100%', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              background: '#1E293B', borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              cursor: 'default'
            }}
          >
            <div style={{
              padding: '12px 20px', background: '#0F172A',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid #334155'
            }}>
              <div>
                <div style={{ color: '#F8FAFC', fontWeight: 800, fontSize: 14 }}>
                  {enlargedImage.title}
                </div>
                {enlargedImage.subtitle && (
                  <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                    {enlargedImage.subtitle}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEnlargedImage(null)}
                style={{
                  background: 'none', border: 'none', color: '#94A3B8',
                  fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
            <div style={{
              padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              maxHeight: 'calc(90vh - 80px)', overflow: 'hidden'
            }}>
              <img
                src={enlargedImage.url}
                alt="Enlarged review"
                style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 120px)', objectFit: 'contain', borderRadius: 6 }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Review Message Report Modal (Feature F: Abuse Handling & Moderation) */}
      {selectedReport && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, padding: 20
        }}>
          <div style={{
            background: '#fff', borderRadius: 'var(--radius-2xl)', maxWidth: 640, width: '100%',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-2xl)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid var(--color-gray-100)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FEF2F2'
            }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Safety &amp; Abuse Moderation
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: 17, fontWeight: 800, color: 'var(--color-gray-900)' }}>
                  Report #REP-{String(selectedReport.id).padStart(4, '0')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--color-gray-400)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {/* Report Summary Card */}
              <div style={{
                background: 'var(--color-gray-50)',
                borderRadius: 12,
                padding: '14px 18px',
                border: '1px solid var(--color-gray-200)',
                marginBottom: 20
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--color-gray-500)', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
                      Reported Sender
                    </span>
                    <div style={{ fontWeight: 700, color: '#DC2626', marginTop: 2 }}>
                      {selectedReport.reported_name}
                    </div>
                    <div style={{ color: 'var(--color-gray-500)', fontSize: 12 }}>
                      {selectedReport.reported_email}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-gray-500)', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
                      Reporter (Flagged by)
                    </span>
                    <div style={{ fontWeight: 700, color: 'var(--color-gray-900)', marginTop: 2 }}>
                      {selectedReport.reporter_name}
                    </div>
                    <div style={{ color: 'var(--color-gray-500)', fontSize: 12 }}>
                      {selectedReport.reporter_email}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-gray-500)', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
                      Reason Category
                    </span>
                    <div style={{ fontWeight: 700, color: 'var(--color-gray-900)', marginTop: 2 }}>
                      {selectedReport.reason ? selectedReport.reason.replace(/_/g, ' ') : 'General'}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-gray-500)', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
                      Claim &amp; Item Context
                    </span>
                    <div style={{ fontWeight: 700, color: 'var(--color-gray-900)', marginTop: 2 }}>
                      Claim #{selectedReport.claim_id}: {selectedReport.found_title}
                    </div>
                  </div>
                </div>

                {selectedReport.details && (
                  <div style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--color-gray-200)',
                    fontSize: 12,
                    color: 'var(--color-gray-700)'
                  }}>
                    <strong>Reporter's Description:</strong> {selectedReport.details}
                  </div>
                )}
              </div>

              {/* Flagged Message Block */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 6 }}>
                  💬 Flagged Message Content
                </label>
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: 10,
                  padding: '14px 16px',
                  fontSize: 13,
                  color: '#0F172A',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                  maxHeight: 160,
                  overflowY: 'auto'
                }}>
                  {selectedReport.message_text}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-gray-400)', marginTop: 4 }}>
                  Sent on {formatDate(selectedReport.message_sent_at || selectedReport.created_at)}
                </div>
              </div>

              {/* Moderation Action Form */}
              <form onSubmit={handleReportReviewSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 8 }}>
                    Decision Action
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <label style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: reportAction === 'ACTION_TAKEN' ? '2px solid #DC2626' : '1px solid var(--color-gray-300)',
                      background: reportAction === 'ACTION_TAKEN' ? '#FEF2F2' : '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      color: reportAction === 'ACTION_TAKEN' ? '#991B1B' : 'var(--color-gray-700)'
                    }}>
                      <input
                        type="radio"
                        name="reportAction"
                        value="ACTION_TAKEN"
                        checked={reportAction === 'ACTION_TAKEN'}
                        onChange={(e) => setReportAction(e.target.value)}
                        style={{ accentColor: '#DC2626' }}
                      />
                      <span>⚠️ Action Taken (Violation Confirmed)</span>
                    </label>

                    <label style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: reportAction === 'DISMISSED' ? '2px solid var(--color-gray-600)' : '1px solid var(--color-gray-300)',
                      background: reportAction === 'DISMISSED' ? 'var(--color-gray-50)' : '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      color: reportAction === 'DISMISSED' ? 'var(--color-gray-900)' : 'var(--color-gray-700)'
                    }}>
                      <input
                        type="radio"
                        name="reportAction"
                        value="DISMISSED"
                        checked={reportAction === 'DISMISSED'}
                        onChange={(e) => setReportAction(e.target.value)}
                        style={{ accentColor: 'var(--color-gray-600)' }}
                      />
                      <span>✕ Dismiss (No Violation)</span>
                    </label>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 6 }}>
                    Internal Moderator Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reportAdminNotes}
                    onChange={(e) => setReportAdminNotes(e.target.value)}
                    placeholder="Log internal details (e.g., user cautioned, warning issued, resolved amicably)..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--color-gray-300)',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 14, borderTop: '1px solid var(--color-gray-100)' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedReport(null)}
                    disabled={submittingReportReview}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submittingReportReview}
                    style={{ background: reportAction === 'ACTION_TAKEN' ? '#DC2626' : '#2563EB', borderColor: 'transparent' }}
                  >
                    {submittingReportReview ? 'Saving...' : 'Submit Resolution'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClaims;
