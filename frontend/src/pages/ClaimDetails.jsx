import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { PageLoader } from '../components/common/Loader';
import { useToast } from '../components/common/Toast';
import { claimApi } from '../services/claimApi';
import { formatDate } from '../utils/formatters';

const ClaimDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [claimData, setClaimData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Finder feedback form state
  const [finderResponse, setFinderResponse] = useState('RECOGNIZED');
  const [finderNotes, setFinderNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Claimant additional info state
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [submittingInfo, setSubmittingInfo] = useState(false);

  // Withdraw state
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Selected image preview modal
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchClaim = async () => {
    try {
      const res = await claimApi.getById(id);
      setClaimData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load claim details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaim();
  }, [id]);

  const handleFinderSubmit = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      await claimApi.submitFinderResponse(id, finderResponse, finderNotes);
      toast('Feedback submitted and claim forwarded to Administrator review.', 'success');
      fetchClaim();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to submit feedback.', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleAdditionalInfoSubmit = async (e) => {
    e.preventDefault();
    setSubmittingInfo(true);
    try {
      await claimApi.provideAdditionalInfo(id, additionalInfo);
      toast('Clarification submitted and routed for Administrator review.', 'success');
      fetchClaim();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to submit information.', 'error');
    } finally {
      setSubmittingInfo(false);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await claimApi.withdraw(id, 'Claimant requested withdrawal');
      toast('Claim has been withdrawn.', 'info');
      setWithdrawDialogOpen(false);
      fetchClaim();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to withdraw claim.', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) return <><Navbar /><PageLoader /></>;

  if (error || !claimData) {
    return (
      <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh' }}>
        <Navbar />
        <PageContainer style={{ paddingTop: 'var(--space-16)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--color-gray-900)' }}>{error || 'Claim Not Found'}</h2>
          <Button onClick={() => navigate('/claims')} style={{ marginTop: 16 }}>← Back to Claims</Button>
        </PageContainer>
        <Footer />
      </div>
    );
  }

  const { claim, evidence, auditLogs, userRole } = claimData;
  const isClaimant = userRole === 'CLAIMANT';
  const isFinder = userRole === 'FINDER';
  const isAdmin = userRole === 'ADMIN';

  // Timeline step calculation
  const getTimelineStatus = (stepIndex) => {
    const s = claim.status;
    if (s === 'WITHDRAWN') return stepIndex === 1 ? 'completed' : 'cancelled';
    if (s === 'REJECTED') {
      if (stepIndex <= 3) return 'completed';
      if (stepIndex === 4) return 'rejected';
    }
    if (s === 'APPROVED') return 'completed';
    if (s === 'ADMIN_REVIEW') return stepIndex <= 3 ? (stepIndex === 3 ? 'active' : 'completed') : 'upcoming';
    if (s === 'FINDER_REVIEW') return stepIndex <= 2 ? (stepIndex === 2 ? 'active' : 'completed') : 'upcoming';
    return stepIndex === 1 ? 'active' : 'upcoming';
  };

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh' }}>
      <Navbar />
      <PageContainer style={{ paddingTop: '100px', paddingBottom: 'var(--space-16)' }}>
        {/* Navigation */}
        <button
          onClick={() => navigate('/claims')}
          style={{ background: 'none', border: 'none', color: 'var(--color-gray-500)', fontWeight: 600, cursor: 'pointer', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Back to Claims
        </button>

        {/* Claim Header */}
        <div style={{
          background: '#fff',
          borderRadius: 'var(--radius-2xl)',
          padding: '24px 28px',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Claim Ref: CLM-{String(claim.id).padStart(4, '0')}
              </span>
              <StatusBadge status={claim.status} />
              <span style={{ fontSize: 11, background: 'var(--color-gray-100)', color: 'var(--color-gray-600)', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                Viewing as {userRole}
              </span>
            </div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-gray-900)', margin: '0 0 6px 0' }}>
              Claim for "{claim.found_title}"
            </h1>
            <div style={{ fontSize: 13, color: 'var(--color-gray-500)' }}>
              Submitted on {formatDate(claim.created_at)} &nbsp;·&nbsp; Found item located at <strong>{claim.found_location}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              to={`/messages?claimId=${claim.id}`}
              style={{
                padding: '8px 18px',
                background: 'var(--color-primary)',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 700,
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(67, 97, 238, 0.25)'
              }}
            >
              💬 Message {isClaimant ? 'Finder' : (isFinder ? 'Claimant' : 'Participants')}
            </Link>
            <Link
              to={`/found-items/${claim.found_item_id}`}
              style={{
                padding: '8px 16px', background: 'var(--color-gray-100)', color: 'var(--color-gray-700)',
                textDecoration: 'none', borderRadius: 'var(--radius-lg)', fontWeight: 700, fontSize: 13
              }}
            >
              View Found Item Listing ↗
            </Link>
          </div>
        </div>

        {/* 4-Step Visual Progress Timeline */}
        <div style={{
          background: '#fff',
          borderRadius: 'var(--radius-2xl)',
          padding: '24px 28px',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 'var(--space-8)'
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>
            Verification Progress Timeline
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, position: 'relative' }}>
            {[
              { num: 1, title: '1. Claim Submitted', desc: 'Proof details filed' },
              { num: 2, title: '2. Finder Review', desc: claim.finder_response ? `Noted: ${claim.finder_response}` : 'Awaiting feedback' },
              { num: 3, title: '3. Admin Review', desc: 'Official review' },
              { num: 4, title: '4. Decision', desc: claim.status === 'APPROVED' ? 'Approved' : (claim.status === 'REJECTED' ? 'Rejected' : 'Pending decision') }
            ].map(step => {
              const state = getTimelineStatus(step.num);
              let icon = '⚪';
              let badgeBg = '#F1F5F9';
              let textColor = '#64748B';

              if (state === 'completed') {
                icon = '✓';
                badgeBg = '#D1FAE5';
                textColor = '#059669';
              } else if (state === 'active') {
                icon = '⏳';
                badgeBg = '#E0E7FF';
                textColor = '#4361EE';
              } else if (state === 'rejected') {
                icon = '✕';
                badgeBg = '#FEE2E2';
                textColor = '#DC2626';
              }

              return (
                <div key={step.num} style={{ textAlign: 'center', padding: '8px 4px' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: badgeBg, color: textColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                    fontSize: 14, margin: '0 auto 8px auto', border: `2px solid ${textColor}`
                  }}>
                    {icon}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: 2 }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 11, color: textColor, fontWeight: 600 }}>
                    {step.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-8)' }}>
          {/* Left Column: Details & Evidence */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Decision Banner (If finalized) */}
            {claim.status === 'APPROVED' && (
              <div style={{
                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                border: '1px solid #A7F3D0',
                borderRadius: 'var(--radius-xl)',
                padding: '20px 24px',
                color: '#065F46'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
                  <span>🎉</span> Ownership Claim Approved by Administrator
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: 13, lineHeight: 1.6 }}>
                  Congratulations! An administrator has verified your claim. This item is now marked as verified and will be eligible for the return handover process.
                </p>
                {claim.decision_reason && (
                  <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                    <strong>Admin Reason:</strong> {claim.decision_reason}
                  </div>
                )}
              </div>
            )}

            {claim.status === 'REJECTED' && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 'var(--radius-xl)',
                padding: '20px 24px',
                color: '#991B1B'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
                  <span>✕</span> Ownership Claim Rejected
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: 13, lineHeight: 1.6 }}>
                  The reviewing administrator has determined that the provided proof does not sufficiently substantiate ownership.
                </p>
                {claim.decision_reason && (
                  <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 12, border: '1px solid #FCA5A5' }}>
                    <strong>Decision Reason:</strong> {claim.decision_reason}
                  </div>
                )}
              </div>
            )}

            {/* Ownership Evidence Card */}
            <div style={{
              background: '#fff',
              borderRadius: 'var(--radius-2xl)',
              padding: '24px 28px',
              border: '1px solid var(--color-gray-200)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-gray-900)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📋</span> Claimant Ownership Statement
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Claim Reason
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-gray-800)' }}>
                    {claim.claim_reason || 'Not specified'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Detailed Ownership Proof
                  </div>
                  <div style={{
                    fontSize: 14, color: 'var(--color-gray-800)', lineHeight: 1.7, background: 'var(--color-gray-50)',
                    padding: '14px 18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {claim.ownership_details}
                  </div>
                </div>

                {claim.identifying_marks && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 4 }}>
                      Secret Identifying Marks
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gray-800)', background: 'rgba(67, 97, 238, 0.05)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(67, 97, 238, 0.2)' }}>
                      🔍 {claim.identifying_marks}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: 2 }}>
                      Claimed Lost Date
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gray-800)' }}>
                      {claim.lost_date_claimed ? formatDate(claim.lost_date_claimed) : 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: 2 }}>
                      Claimed Lost Location
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gray-800)' }}>
                      {claim.lost_location_claimed || 'Not specified'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Attachments Gallery */}
            <div style={{
              background: '#fff',
              borderRadius: 'var(--radius-2xl)',
              padding: '24px 28px',
              border: '1px solid var(--color-gray-200)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-gray-900)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🔒</span> Confidential Evidence Documents ({evidence.length})
                </h3>
                <span style={{ fontSize: 11, color: 'var(--color-gray-400)', fontWeight: 600 }}>
                  Restricted Access
                </span>
              </div>

              {evidence.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', color: 'var(--color-gray-500)', fontSize: 13 }}>
                  No photos or receipts attached.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
                  {evidence.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedImage(item.image_url)}
                      style={{
                        position: 'relative', height: 110, borderRadius: 12, overflow: 'hidden',
                        cursor: 'pointer', border: '1px solid var(--color-gray-200)', boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <img src={item.image_url} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                        padding: '4px 6px', color: '#fff', fontSize: 10, fontWeight: 600
                      }}>
                        🔍 Click to preview
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Finder Review Section */}
            <div style={{
              background: '#fff',
              borderRadius: 'var(--radius-2xl)',
              padding: '24px 28px',
              border: '1px solid var(--color-gray-200)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-gray-900)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🕵️</span> Finder Participation &amp; Review
              </h3>

              {claim.finder_response ? (
                <div style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', border: '1px solid var(--color-gray-200)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>
                      Finder Assessment:
                    </span>
                    <span style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800,
                      background: claim.finder_response === 'RECOGNIZED' ? '#D1FAE5' : (claim.finder_response === 'NEEDS_INFO' ? '#FEF3C7' : '#FEE2E2'),
                      color: claim.finder_response === 'RECOGNIZED' ? '#065F46' : (claim.finder_response === 'NEEDS_INFO' ? '#92400E' : '#991B1B')
                    }}>
                      {claim.finder_response === 'RECOGNIZED' && '✓ Recognized Item Description'}
                      {claim.finder_response === 'NEEDS_INFO' && '⚠️ Requested Additional Information'}
                      {claim.finder_response === 'NOT_RECOGNIZED' && '✕ Description Did Not Match'}
                    </span>
                  </div>

                  {claim.finder_notes && (
                    <div style={{ fontSize: 13, color: 'var(--color-gray-700)', marginTop: 8, fontStyle: 'italic' }}>
                      "{claim.finder_notes}"
                    </div>
                  )}

                  {claim.finder_responded_at && (
                    <div style={{ fontSize: 11, color: 'var(--color-gray-400)', marginTop: 8 }}>
                      Submitted on {formatDate(claim.finder_responded_at)}
                    </div>
                  )}
                </div>
              ) : isFinder && (claim.status === 'PENDING' || claim.status === 'FINDER_REVIEW') ? (
                /* Interactive Finder Response Form */
                <form onSubmit={handleFinderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 13, color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                    You reported finding this item. Does the claimant's description above match what you found?
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { val: 'RECOGNIZED', label: '✓ I recognize this description (Matches the item)', color: '#059669' },
                      { val: 'NEEDS_INFO', label: '⚠️ I need more details/clarification from claimant', color: '#D97706' },
                      { val: 'NOT_RECOGNIZED', label: '✕ This description does not match what I found', color: '#DC2626' }
                    ].map(opt => (
                      <label key={opt.val} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderRadius: 8, border: finderResponse === opt.val ? '2px solid var(--color-primary)' : '1px solid var(--color-gray-200)',
                        cursor: 'pointer', background: finderResponse === opt.val ? 'var(--color-primary-light)' : '#fff'
                      }}>
                        <input
                          type="radio"
                          name="finder_resp"
                          value={opt.val}
                          checked={finderResponse === opt.val}
                          onChange={() => setFinderResponse(opt.val)}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: opt.color }}>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 4 }}>
                      Feedback Notes for Reviewer
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Add any specific observations..."
                      value={finderNotes}
                      onChange={e => setFinderNotes(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-gray-300)', fontSize: 13, fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--color-gray-500)' }}>
                    ℹ️ Submitting feedback moves this claim to the Administrator for the final ownership determination.
                  </div>

                  <Button size="sm" type="submit" loading={submittingFeedback}>
                    Submit Assessment &amp; Forward to Admin →
                  </Button>
                </form>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--color-gray-500)', fontStyle: 'italic' }}>
                  Awaiting review by finder.
                </div>
              )}

              {/* Claimant response to NEEDS_INFO */}
              {isClaimant && claim.additional_info_requested && (
                <div style={{ marginTop: 18, padding: 16, background: '#FFFBEB', borderRadius: 12, border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E', marginBottom: 6 }}>
                    Clarification Requested by Finder
                  </div>
                  <p style={{ fontSize: 12, color: '#B45309', margin: '0 0 10px 0' }}>
                    The finder requested further information before final review. Please provide any additional proof or details below:
                  </p>
                  <form onSubmit={handleAdditionalInfoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <textarea
                      rows={3}
                      placeholder="Provide additional details..."
                      value={additionalInfo}
                      onChange={e => setAdditionalInfo(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #FCD34D', fontSize: 13 }}
                      required
                    />
                    <Button size="sm" type="submit" loading={submittingInfo}>
                      Submit Clarification
                    </Button>
                  </form>
                </div>
              )}

              {claim.additional_info_provided && (
                <div style={{ marginTop: 14, padding: 12, background: 'var(--color-gray-50)', borderRadius: 8, fontSize: 12 }}>
                  <strong>Claimant Clarification Provided:</strong> "{claim.additional_info_provided}"
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Meta & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Meta Card */}
            <div style={{
              background: '#fff',
              borderRadius: 'var(--radius-2xl)',
              padding: '20px 24px',
              border: '1px solid var(--color-gray-200)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 800, color: 'var(--color-gray-900)' }}>
                Verification Summary
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--color-gray-400)', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>Claimant</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-gray-800)' }}>{claim.claimant_name}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--color-gray-400)', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>Finder</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-gray-800)' }}>{claim.finder_name}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--color-gray-400)', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>Current Stage</span>
                  <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{claim.status}</span>
                </div>

                {claim.reviewed_at && (
                  <div>
                    <span style={{ color: 'var(--color-gray-400)', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>Decision Date</span>
                    <span style={{ fontWeight: 700 }}>{formatDate(claim.reviewed_at)}</span>
                  </div>
                )}
              </div>

              {/* Claimant withdraw button */}
              {isClaimant && (claim.status === 'PENDING' || claim.status === 'FINDER_REVIEW') && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-gray-100)' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    style={{ width: '100%', color: 'var(--color-error)' }}
                    onClick={() => setWithdrawDialogOpen(true)}
                  >
                    Withdraw This Claim
                  </Button>
                </div>
              )}
            </div>

            {/* Audit History */}
            <div style={{
              background: '#fff',
              borderRadius: 'var(--radius-2xl)',
              padding: '20px 24px',
              border: '1px solid var(--color-gray-200)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 800, color: 'var(--color-gray-900)' }}>
                Audit Log History
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {auditLogs.map((log, idx) => (
                  <div key={log.id || idx} style={{ borderLeft: '2px solid var(--color-primary)', paddingLeft: 10, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-gray-800)' }}>
                      {log.action.replace(/_/g, ' ')}
                    </div>
                    <div style={{ color: 'var(--color-gray-500)', fontSize: 11 }}>
                      by {log.actor_name} ({log.actor_role}) &nbsp;·&nbsp; {formatDate(log.created_at)}
                    </div>
                    {log.notes && (
                      <div style={{ color: 'var(--color-gray-600)', fontSize: 11, marginTop: 2 }}>
                        {log.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
      <Footer />

      {/* Withdraw Dialog */}
      <ConfirmDialog
        isOpen={withdrawDialogOpen}
        title="Withdraw Claim?"
        message="Are you sure you want to withdraw this claim? You will not be able to reactivate it once withdrawn."
        confirmText="Yes, Withdraw"
        confirmVariant="danger"
        loading={withdrawing}
        onConfirm={handleWithdraw}
        onCancel={() => setWithdrawDialogOpen(false)}
      />

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}
        >
          <img src={selectedImage} alt="Enlarged evidence" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  );
};

export default ClaimDetails;
