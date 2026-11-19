import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import { PageLoader, Skeleton } from '../components/common/Loader';
import { recoveryApi } from '../services/recoveryApi';
import { handoverApi } from '../services/handoverApi';
import { formatDate } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';

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
      padding: '5px 14px',
      borderRadius: 999,
      fontSize: 12.5,
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot }} />
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
};

// ─── 4-Stage Recovery Journey Timeline ────────────────────────────────────────
const RecoveryJourneyTimeline = ({ status }) => {
  // Determine states for the 4 stages
  // Stages:
  // 1. Recovery Submitted
  // 2. Administrative Verification
  // 3. Recovery Decision
  // 4. Handover Coordination

  const getStageState = (stageNumber) => {
    if (status === 'CANCELLED') {
      if (stageNumber === 1) return { status: 'completed', label: 'Submitted' };
      if (stageNumber === 2) return { status: 'cancelled', label: 'Cancelled' };
      return { status: 'upcoming', label: 'Inactive' };
    }

    if (status === 'REJECTED') {
      if (stageNumber === 1) return { status: 'completed', label: 'Submitted' };
      if (stageNumber === 2) return { status: 'completed', label: 'Verified' };
      if (stageNumber === 3) return { status: 'rejected', label: 'Rejected' };
      return { status: 'upcoming', label: 'Unavailable' };
    }

    if (status === 'PENDING') {
      if (stageNumber === 1) return { status: 'completed', label: 'Submitted' };
      if (stageNumber === 2) return { status: 'active', label: 'Awaiting Review' };
      return { status: 'upcoming', label: 'Pending' };
    }

    if (status === 'UNDER_REVIEW') {
      if (stageNumber === 1) return { status: 'completed', label: 'Submitted' };
      if (stageNumber === 2) return { status: 'active', label: 'Reviewing Now' };
      return { status: 'upcoming', label: 'Pending' };
    }

    if (status === 'APPROVED') {
      if (stageNumber <= 3) return { status: 'completed', label: 'Completed' };
      return { status: 'active', label: 'Coordination Active' };
    }

    return { status: 'upcoming', label: 'Upcoming' };
  };

  const stages = [
    {
      num: 1,
      title: 'Recovery Submitted',
      desc: 'Finder submitted photos and location details',
      icon: '📝',
      state: getStageState(1)
    },
    {
      num: 2,
      title: 'Administrative Verification',
      desc: 'Admin inspects evidence against lost report',
      icon: '🛡️',
      state: getStageState(2)
    },
    {
      num: 3,
      title: 'Recovery Decision',
      desc: status === 'APPROVED' ? 'Verified & approved' : status === 'REJECTED' ? 'Submission rejected' : 'Official review determination',
      icon: status === 'APPROVED' ? '✅' : status === 'REJECTED' ? '❌' : '⚖️',
      state: getStageState(3)
    },
    {
      num: 4,
      title: 'Handover Coordination',
      desc: status === 'APPROVED' ? 'Direct chat unlocked for safe return' : 'Unlocked upon approval',
      icon: '🤝',
      state: getStageState(4)
    }
  ];

  return (
    <div style={{
      background: '#fff',
      borderRadius: 'var(--radius-xl)',
      padding: '24px 20px',
      border: '1px solid var(--color-gray-200)',
      boxShadow: 'var(--shadow-sm)',
      marginBottom: 24,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🧭</span>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--color-gray-900)' }}>
            Recovery Journey
          </h4>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-gray-500)' }}>
          {status === 'APPROVED'
            ? '🎉 Handover unlocked'
            : status === 'PENDING'
              ? '⏳ Stage 2 in progress'
              : status === 'UNDER_REVIEW'
                ? '🔍 Stage 2 in progress'
                : `Status: ${status}`}
        </span>
      </div>

      {/* Responsive timeline flexbox container */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        position: 'relative',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {stages.map((stg, i) => {
          const isDone = stg.state.status === 'completed';
          const isActive = stg.state.status === 'active';
          const isRejected = stg.state.status === 'rejected';
          const isCancelled = stg.state.status === 'cancelled';

          const circleBg = isDone
            ? '#059669'
            : isActive
              ? 'var(--color-primary)'
              : isRejected
                ? '#DC2626'
                : isCancelled
                  ? '#64748B'
                  : '#F1F5F9';

          const circleColor = isDone || isActive || isRejected || isCancelled ? '#fff' : 'var(--color-gray-400)';

          return (
            <div
              key={stg.num}
              style={{
                flex: '1 1 200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '0 8px',
                position: 'relative'
              }}
            >
              {/* Step indicator circle */}
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: circleBg,
                color: circleColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 800,
                boxShadow: isActive ? '0 0 0 4px rgba(67, 97, 238, 0.2)' : 'none',
                marginBottom: 10,
                transition: 'all 0.2s ease',
              }}>
                {isDone ? '✓' : stg.icon}
              </div>

              {/* Title & Desc */}
              <div style={{
                fontSize: 13,
                fontWeight: 800,
                color: isActive ? 'var(--color-primary)' : isDone ? '#065F46' : 'var(--color-gray-800)',
                marginBottom: 3
              }}>
                {stg.title}
              </div>
              <div style={{
                fontSize: 11.5,
                color: 'var(--color-gray-500)',
                lineHeight: 1.4,
                maxWidth: 180
              }}>
                {stg.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value, highlight }) => value ? (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '9px 0',
    borderBottom: '1px solid #F1F5F9',
    fontSize: 13
  }}>
    <span style={{ color: 'var(--color-gray-500)', fontWeight: 600 }}>{label}</span>
    <span style={{
      color: highlight ? 'var(--color-primary)' : 'var(--color-gray-900)',
      fontWeight: highlight ? 700 : 600,
      textAlign: 'right'
    }}>
      {value}
    </span>
  </div>
) : null;

// ─── Custom Cancellation Modal (NO BROWSER POPUPS) ────────────────────────────
const CancelRecoveryModal = ({
  isOpen,
  onClose,
  onConfirm,
  recoveryItemName,
  recoveryId,
  loading,
  error
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1300,
      padding: 20
    }}>
      <div
        className="anim-scale-in"
        style={{
          background: '#fff',
          borderRadius: 'var(--radius-2xl)',
          maxWidth: 480,
          width: '100%',
          boxShadow: 'var(--shadow-2xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '24px 24px 16px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#FEF2F2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
            border: '1px solid #FEE2E2'
          }}>
            ⚠️
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 800, color: 'var(--color-gray-900)' }}>
              Cancel Recovery Submission?
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-gray-500)', lineHeight: 1.5 }}>
              Cancelling will permanently stop this recovery report from administrator verification. This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Item reference chip */}
        <div style={{ padding: '0 24px', marginBottom: 16 }}>
          <div style={{
            background: 'var(--color-gray-50)',
            border: '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 14px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ fontWeight: 800, color: 'var(--color-gray-500)' }}>
              #REC-{String(recoveryId).padStart(4, '0')}
            </span>
            <span style={{ color: 'var(--color-gray-300)' }}>•</span>
            <span style={{ fontWeight: 700, color: 'var(--color-gray-900)' }}>
              {recoveryItemName}
            </span>
          </div>
        </div>

        {/* Optional reason textarea */}
        <div style={{ padding: '0 24px', marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 6 }}>
            Optional Cancellation Reason
          </label>
          <textarea
            rows={3}
            placeholder="Tell the item owner why you are withdrawing this recovery report (optional)..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-gray-300)',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            margin: '0 24px 16px 24px',
            padding: '10px 14px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)',
            color: '#991B1B',
            fontSize: 12.5
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          padding: '16px 24px',
          background: 'var(--color-gray-50)',
          borderTop: '1px solid var(--color-gray-200)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '9px 18px',
              background: '#fff',
              border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700,
              fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'var(--color-gray-700)'
            }}
          >
            Keep Submission
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={loading}
            style={{
              padding: '9px 20px',
              background: '#DC2626',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700,
              fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
            }}
          >
            {loading ? 'Cancelling...' : 'Yes, Cancel Submission'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Image Lightbox Preview Modal ─────────────────────────────────────────────
const ImagePreviewModal = ({ url, title, onClose }) => {
  if (!url) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1400,
        padding: 24,
        cursor: 'zoom-out'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 900,
          maxHeight: '90vh',
          background: '#0F172A',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          cursor: 'default'
        }}
      >
        <div style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155',
          color: '#F8FAFC'
        }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{title || 'Image Preview'}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: 20,
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={url}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(85vh - 80px)',
              objectFit: 'contain',
              borderRadius: 8
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Main Recovery Details Page ───────────────────────────────────────────────
const RecoveryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [recovery, setRecovery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancellation modal state (NO browser popups)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalError, setCancelModalError] = useState('');

  // Image lightbox state
  const [enlargedImage, setEnlargedImage] = useState(null);

  // Handover state
  const [handoverData, setHandoverData] = useState(null);
  const [initiatingHandover, setInitiatingHandover] = useState(false);

  // ── Fetch recovery details ─────────────────────────────────────────────────
  const fetchRecovery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recoveryApi.getById(id);
      const data = res.data?.data || res.data;
      if (!data || !data.id) {
        setError('Recovery report not found.');
      } else {
        setRecovery(data);
        if (data.status === 'APPROVED') {
          try {
            const hRes = await handoverApi.getByRecoveryId(id);
            if (hRes.data?.handover) {
              setHandoverData(hRes.data.handover);
            }
          } catch (hErr) {
            // Handover not initiated yet
            setHandoverData(null);
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Recovery not found or access denied.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecovery();
  }, [fetchRecovery]);

  // ── Handle Cancellation ────────────────────────────────────────────────────
  const handleConfirmCancel = async (reason) => {
    setCancelling(true);
    setCancelModalError('');
    try {
      await recoveryApi.cancel(id, reason);
      toast('Recovery submission cancelled successfully.', 'success');
      setIsCancelModalOpen(false);
      // Refresh local recovery data immediately
      setRecovery(prev => ({
        ...prev,
        status: 'CANCELLED',
        decisionReason: reason ? `Cancelled by finder: ${reason}` : 'Cancelled by finder'
      }));
      fetchRecovery();
    } catch (err) {
      setCancelModalError(err.response?.data?.message || 'Failed to cancel submission.');
    } finally {
      setCancelling(false);
    }
  };

  const handleInitiateHandover = async () => {
    setInitiatingHandover(true);
    try {
      const res = await handoverApi.initiate(id);
      toast('Handover process initiated!', 'success');
      navigate(`/handovers/${res.data.handoverId}`);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to initiate handover.', 'error');
    } finally {
      setInitiatingHandover(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Navbar />
        <PageContainer maxWidth="1140px" style={{ paddingTop: '100px', flex: 1 }}>
          <PageLoader />
        </PageContainer>
        <Footer />
      </div>
    );
  }

  if (error || !recovery) {
    return (
      <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Navbar />
        <PageContainer maxWidth="640px" style={{ paddingTop: '100px', textAlign: 'center', flex: 1 }}>
          <div style={{
            background: '#fff',
            borderRadius: 'var(--radius-2xl)',
            padding: '48px 32px',
            border: '1px solid var(--color-gray-200)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: 'var(--color-gray-900)', fontSize: 20, fontWeight: 800, margin: '0 0 8px 0' }}>
              {error || 'Recovery Report Not Found'}
            </h2>
            <p style={{ color: 'var(--color-gray-500)', fontSize: 14, margin: '0 0 24px 0' }}>
              The requested recovery submission could not be retrieved. It may have been removed or you do not have permission to view it.
            </p>
            <button
              onClick={() => navigate('/my-recoveries')}
              style={{
                padding: '10px 24px',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ← Back to My Recoveries
            </button>
          </div>
        </PageContainer>
        <Footer />
      </div>
    );
  }

  // Participant checks
  const isFinder = user && (user.id === recovery.finderId || user.id === recovery.finder_id || recovery.userRole === 'FINDER');
  const isOwner  = user && (user.id === recovery.reporterId || user.id === recovery.owner_id || recovery.userRole === 'OWNER');
  const canCancel = isFinder && recovery.status === 'PENDING';

  const recoveryItemName = recovery.finderItemName || recovery.item_name || 'Found Item';
  const lostItemTitle = recovery.lostItemTitle || recovery.lost_title || 'Lost Item';
  const finderName = recovery.finderName || recovery.finder_name || 'Finder';
  const ownerName = recovery.ownerName || recovery.owner_name || 'Item Owner';

  // Images
  const lostItemPhoto = recovery.lostItemImage || recovery.lostImages?.[0]?.image_url;
  const finderPhotos = (recovery.images && recovery.images.length > 0)
    ? recovery.images
    : (recovery.primaryImage ? [{ image_url: recovery.primaryImage }] : []);

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Navbar />
      <PageContainer maxWidth="1140px" style={{ paddingTop: '100px', paddingBottom: 'var(--space-20)', flex: 1 }}>

        {/* ── Top Back Navigation ────────────────────────────────────────── */}
        <div style={{ marginBottom: 18 }}>
          <button
            onClick={() => navigate('/my-recoveries')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-gray-500)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 0'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-gray-500)'}
          >
            <span>←</span>
            <span>Back to My Recoveries</span>
          </button>
        </div>

        {/* ── 1. Recovery Overview Header Card ───────────────────────────── */}
        <div style={{
          background: '#fff',
          borderRadius: 'var(--radius-2xl)',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-gray-200)',
          marginBottom: 20
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
                flexWrap: 'wrap'
              }}>
                <span style={{
                  background: 'var(--color-gray-900)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 6,
                  letterSpacing: '0.04em'
                }}>
                  #REC-{String(recovery.id).padStart(4, '0')}
                </span>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isFinder ? 'var(--color-primary)' : '#059669',
                  background: isFinder ? '#EEF2FF' : '#ECFDF5',
                  padding: '3px 10px',
                  borderRadius: 6
                }}>
                  {isFinder ? 'Your Found Report' : 'Matching Your Lost Report'}
                </span>
              </div>

              <h1 style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                color: 'var(--color-gray-900)',
                letterSpacing: '-0.01em'
              }}>
                {recoveryItemName}
              </h1>

              <div style={{
                fontSize: 13,
                color: 'var(--color-gray-500)',
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                <span>Reported for lost item: <strong style={{ color: 'var(--color-gray-800)' }}>"{lostItemTitle}"</strong></span>
                <span>•</span>
                <span>Submitted by <strong>{finderName}</strong></span>
                <span>•</span>
                <span>{formatDate(recovery.createdAt || recovery.created_at)}</span>
              </div>
            </div>

            <StatusBadge status={recovery.status} />
          </div>
        </div>

        {/* ── 2. Recovery Journey 4-Stage Timeline ────────────────────────── */}
        <RecoveryJourneyTimeline status={recovery.status} />

        {/* ── 3. Administrative Determination / Status Banners ──────────── */}
        {recovery.status === 'APPROVED' && (
          <div style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '1.5px solid #A7F3D0',
            borderRadius: 'var(--radius-xl)',
            padding: '20px 24px',
            marginBottom: 24,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{ fontSize: 26, lineHeight: 1 }}>🎉</span>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 800, color: '#065F46' }}>
                  Recovery Verified &amp; Approved!
                </h4>
                <p style={{ margin: '0 0 10px 0', fontSize: 13.5, color: '#047857', lineHeight: 1.5 }}>
                  An administrator has reviewed the submitted photographs and distinguishing details and approved this recovery report.
                </p>
                {recovery.decisionReason && (
                  <div style={{
                    background: '#fff',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: '#065F46',
                    border: '1px solid #A7F3D0'
                  }}>
                    <strong>Administrator Note:</strong> "{recovery.decisionReason}"
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {recovery.status === 'REJECTED' && (
          <div style={{
            background: '#FEF2F2',
            border: '1.5px solid #FECACA',
            borderRadius: 'var(--radius-xl)',
            padding: '20px 24px',
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>❌</span>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 800, color: '#991B1B' }}>
                  Recovery Submission Rejected
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>
                  {recovery.decisionReason
                    ? `Reason: "${recovery.decisionReason}"`
                    : 'The submission did not match the original lost item details as verified by administrator review.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {recovery.status === 'CANCELLED' && (
          <div style={{
            background: '#F8FAFC',
            border: '1.5px solid #E2E8F0',
            borderRadius: 'var(--radius-xl)',
            padding: '18px 24px',
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>↩️</span>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 700, color: '#475569' }}>
                  Submission Cancelled
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
                  {recovery.decisionReason || 'This recovery report was voluntarily withdrawn by the finder.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 4. Side-by-Side Comparison Panels ───────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20,
          marginBottom: 24
        }}>
          {/* Panel 1: Original Lost Report */}
          <div style={{
            background: '#fff',
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid #BFDBFE',
            boxShadow: 'var(--shadow-sm)',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#1E40AF',
                textTransform: 'uppercase',
                letterSpacing: '0.07em'
              }}>
                📋 Original Lost Report
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-gray-500)' }}>
                Owner: {ownerName}
              </span>
            </div>

            {/* Lost item image */}
            <div style={{
              height: 160,
              background: '#F8FAFC',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-gray-200)',
              cursor: lostItemPhoto ? 'zoom-in' : 'default'
            }}
            onClick={() => lostItemPhoto && setEnlargedImage({ url: lostItemPhoto, title: `Lost Item: ${lostItemTitle}` })}
            >
              {lostItemPhoto ? (
                <img
                  src={lostItemPhoto}
                  alt={lostItemTitle}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ color: 'var(--color-gray-400)', fontSize: 12, fontWeight: 600 }}>
                  📦 No photo provided with lost report
                </div>
              )}
            </div>

            {/* Lost Details */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <InfoRow label="Item Title" value={lostItemTitle} highlight />
              <InfoRow label="Category" value={recovery.lostItemCategory || recovery.lost_category} />
              <InfoRow label="Lost Location" value={[recovery.lostItemLocation || recovery.lost_location, recovery.lostItemCity || recovery.city].filter(Boolean).join(', ')} />
              <InfoRow label="Lost Date" value={(recovery.lostDate || recovery.lost_date) ? formatDate(recovery.lostDate || recovery.lost_date) : null} />
              <InfoRow label="Brand / Model" value={[recovery.lost_brand, recovery.lost_model].filter(Boolean).join(' / ')} />
              <InfoRow label="Color" value={recovery.lost_color} />
            </div>

            {recovery.lost_description && (
              <div style={{
                marginTop: 14,
                padding: '10px 14px',
                background: '#F8FAFC',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-gray-200)'
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Original Description
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-gray-700)', lineHeight: 1.5 }}>
                  {recovery.lost_description}
                </div>
              </div>
            )}
          </div>

          {/* Panel 2: Finder's Submission */}
          <div style={{
            background: '#fff',
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid #A7F3D0',
            boxShadow: 'var(--shadow-sm)',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#065F46',
                textTransform: 'uppercase',
                letterSpacing: '0.07em'
              }}>
                🎁 Finder's Submission
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-gray-500)' }}>
                Finder: {finderName}
              </span>
            </div>

            {/* Finder evidence photos gallery */}
            <div style={{ marginBottom: 14 }}>
              {finderPhotos.length > 0 ? (
                <div>
                  {/* Primary large preview */}
                  <div
                    style={{
                      height: 160,
                      background: '#F0FDF4',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      marginBottom: 8,
                      border: '1px solid #BBF7D0',
                      cursor: 'zoom-in'
                    }}
                    onClick={() => setEnlargedImage({
                      url: finderPhotos[0].image_url || finderPhotos[0].imageUrl,
                      title: `Finder's Photo: ${recoveryItemName}`
                    })}
                  >
                    <img
                      src={finderPhotos[0].image_url || finderPhotos[0].imageUrl}
                      alt={recoveryItemName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Thumbnail gallery if multiple photos */}
                  {finderPhotos.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                      {finderPhotos.map((img, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: 54,
                            height: 54,
                            borderRadius: 8,
                            overflow: 'hidden',
                            cursor: 'zoom-in',
                            border: '1.5px solid #BBF7D0',
                            flexShrink: 0
                          }}
                          onClick={() => setEnlargedImage({
                            url: img.image_url || img.imageUrl,
                            title: `Finder's Photo #${idx + 1}`
                          })}
                        >
                          <img
                            src={img.image_url || img.imageUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  height: 160,
                  background: '#F0FDF4',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#065F46',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px dashed #A7F3D0'
                }}>
                  📸 No photographs uploaded with submission
                </div>
              )}
            </div>

            {/* Finder Details */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <InfoRow label="Item Name" value={recoveryItemName} highlight />
              <InfoRow label="Brand / Model" value={[recovery.brand, recovery.model].filter(Boolean).join(' / ')} />
              <InfoRow label="Color" value={recovery.color} />
              <InfoRow label="Found Location" value={[recovery.foundLocation || recovery.found_location, recovery.foundCity || recovery.city].filter(Boolean).join(', ')} />
              <InfoRow label="Found Date & Time" value={`${formatDate(recovery.foundDate || recovery.found_date)}${recovery.found_time ? ` at ${recovery.found_time}` : ''}`} />
              <InfoRow label="Item Condition" value={recovery.itemCondition || recovery.item_condition} />
              <InfoRow label="Identifying Marks" value={recovery.identifying_marks} />
            </div>

            {(recovery.additionalContext || recovery.additional_information) && (
              <div style={{
                marginTop: 14,
                padding: '10px 14px',
                background: '#F0FDF4',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #BBF7D0'
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: 4 }}>
                  How Found &amp; Safe Custody Notes
                </div>
                <div style={{ fontSize: 12.5, color: '#047857', lineHeight: 1.5 }}>
                  {recovery.additionalContext || recovery.additional_information}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 5. Handover Coordination & Actions ─────────────────────────── */}
        <div style={{
          background: '#fff',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 28px',
          border: '1px solid var(--color-gray-200)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 800, color: 'var(--color-gray-900)' }}>
                {recovery.status === 'APPROVED' ? '🤝 Handover Coordination' : 'Direct Communication'}
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-gray-500)', maxWidth: 540, lineHeight: 1.5 }}>
                {recovery.status === 'APPROVED'
                  ? 'Both parties can now message each other securely through FoundiT Messages to arrange physical handover.'
                  : recovery.status === 'PENDING' || recovery.status === 'UNDER_REVIEW'
                    ? '🔒 Direct messaging unlocks after an administrator verifies and approves the recovery submission.'
                    : 'Direct communication is disabled because this submission is no longer active.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Message button - ONLY active when APPROVED */}
              {recovery.status === 'APPROVED' ? (
                <Link
                  to={`/messages?recoveryId=${recovery.id}`}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 3px 12px rgba(67, 97, 238, 0.28)',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-primary-dark)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
                >
                  <span>💬</span>
                  <span>{isFinder ? 'Message Owner' : 'Message Finder'}</span>
                </Link>
              ) : (
                <button
                  disabled
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-gray-100)',
                    color: 'var(--color-gray-400)',
                    fontWeight: 700,
                    fontSize: 13,
                    border: '1px solid var(--color-gray-200)',
                    cursor: 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <span>🔒</span>
                  <span>Message {isFinder ? 'Owner' : 'Finder'} (Locked)</span>
                </button>
              )}

              {/* Handover Buttons when APPROVED */}
              {recovery.status === 'APPROVED' && (
                <>
                  {handoverData ? (
                    <Link
                      to={`/handovers/${handoverData.id}`}
                      style={{
                        padding: '10px 24px',
                        borderRadius: 'var(--radius-lg)',
                        background: '#059669',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 14,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 3px 12px rgba(5, 150, 105, 0.28)',
                      }}
                    >
                      <span>🤝</span>
                      <span>
                        {isOwner ? 'View Handover & Receive' : 'Track Handover'} ({handoverData.handover_status.replace(/_/g, ' ')})
                      </span>
                    </Link>
                  ) : isFinder ? (
                    <button
                      onClick={handleInitiateHandover}
                      disabled={initiatingHandover}
                      style={{
                        padding: '10px 24px',
                        borderRadius: 'var(--radius-lg)',
                        background: '#059669',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 14,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 3px 12px rgba(5, 150, 105, 0.28)',
                      }}
                    >
                      <span>🤝</span>
                      <span>{initiatingHandover ? 'Initiating...' : 'Initiate Handover & Location'}</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, color: '#059669', fontWeight: 600, background: '#ECFDF5', padding: '8px 14px', borderRadius: 8 }}>
                      ⏳ Waiting for finder to set handover details
                    </span>
                  )}
                </>
              )}

              {/* Cancel Submission Button (Only available to finder while PENDING) */}
              {canCancel && (
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-lg)',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}
                >
                  <span>↩️</span>
                  <span>Cancel Submission</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </PageContainer>
      <Footer />

      {/* ── Custom In-App Cancellation Modal (NO BROWSER POPUPS) ───────── */}
      <CancelRecoveryModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        recoveryItemName={recoveryItemName}
        recoveryId={recovery.id}
        loading={cancelling}
        error={cancelModalError}
      />

      {/* ── Image Lightbox Modal ───────────────────────────────────────── */}
      {enlargedImage && (
        <ImagePreviewModal
          url={enlargedImage.url}
          title={enlargedImage.title}
          onClose={() => setEnlargedImage(null)}
        />
      )}
    </div>
  );
};

export default RecoveryDetails;
