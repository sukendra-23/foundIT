import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import { lostItemApi, foundItemApi } from '../services/itemApi';
import { useAuth } from '../hooks/useAuth';
import StatusBadge from '../components/common/StatusBadge';
import { formatDate } from '../utils/formatters';
import { PageLoader } from '../components/common/Loader';
import Button from '../components/common/Button';
import ImageGallery from '../components/common/ImageGallery';
import ClaimModal from '../components/claims/ClaimModal';
import RecoveryModal from '../components/recovery/RecoveryModal';
import { claimApi } from '../services/claimApi';
import { recoveryApi } from '../services/recoveryApi';

const ItemDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isLost = location.pathname.includes('/lost-items');
  const type = isLost ? 'LOST' : 'FOUND';

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [eligibility, setEligibility] = useState({ checked: false, eligible: true, reason: '', existingClaim: null });

  // Recovery state (only for lost items)
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [recoveryEligibility, setRecoveryEligibility] = useState({
    checked: false, eligible: false, reason: '', existingRecovery: null
  });

  useEffect(() => {
    const api = isLost ? lostItemApi : foundItemApi;
    api.getById(id)
      .then(res => setItem(res.data))
      .catch(err => setError('Item not found or has been removed.'))
      .finally(() => setLoading(false));
  }, [id, isLost]);

  // Check claim eligibility for found items (non-owners)
  useEffect(() => {
    if (!isLost && item && user && user.id !== item.user_id) {
      claimApi.checkEligibility(item.id)
        .then(res => setEligibility({
          checked: true,
          eligible: res.data.eligible,
          reason: res.data.reason || '',
          existingClaim: res.data.existingClaim || null
        }))
        .catch(() => setEligibility({ checked: true, eligible: false, reason: 'Unable to verify eligibility.' }));
    }
  }, [isLost, item, user]);

  // Check recovery eligibility for lost items (non-owners who are logged in)
  useEffect(() => {
    if (isLost && item && user && user.id !== item.user_id) {
      recoveryApi.checkEligibility(item.id)
        .then(res => setRecoveryEligibility({
          checked: true,
          eligible: res.data.eligible,
          reason: res.data.reason || '',
          existingRecovery: res.data.existingRecovery || null
        }))
        .catch(() => setRecoveryEligibility({ checked: true, eligible: false, reason: 'Unable to verify eligibility.' }));
    }
  }, [isLost, item, user]);

  if (loading) return <><Navbar /><PageLoader /></>;

  if (error || !item) return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh' }}>
      <Navbar />
      <PageContainer style={{ paddingTop: 'var(--space-16)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-gray-900)' }}>{error || 'Item Not Found'}</h2>
        <Button onClick={() => navigate(-1)} style={{ marginTop: 16 }}>← Go Back</Button>
      </PageContainer>
    </div>
  );

  const dateStr = isLost ? item.lost_date : item.found_date;
  const timeStr = isLost ? item.lost_time : item.found_time;
  const isOwner = user && user.id === item.user_id;

  const handleFoundThisItem = () => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (recoveryEligibility.existingRecovery) {
      navigate(`/recoveries/${recoveryEligibility.existingRecovery.id}`);
      return;
    }
    setRecoveryModalOpen(true);
  };

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh' }}>
      <Navbar />
      <PageContainer style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-16)', maxWidth: 900 }}>

        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--color-gray-500)', fontWeight: 600, cursor: 'pointer', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back
        </button>

        <div style={{ background: '#fff', borderRadius: 'var(--radius-2xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-gray-200)' }}>
          {/* Image Gallery */}
          <ImageGallery images={item.images} isLost={isLost} />

          <div style={{ padding: 'var(--space-8)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-6)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    background: isLost ? '#FEF2F2' : '#F0FDF4',
                    color: isLost ? '#DC2626' : '#16A34A',
                  }}>
                    {isLost ? '🔴 LOST' : '🟢 FOUND'}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-gray-900)', marginTop: 8 }}>
                  {item.title}
                </h1>
              </div>
              {isOwner && (
                <Link
                  to="/my-reports"
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-gray-300)',
                    background: '#fff',
                    color: 'var(--color-gray-700)',
                    fontWeight: 600,
                    fontSize: 13,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Manage Report →
                </Link>
              )}
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 'var(--space-6)' }}>
              <div style={{ background: 'var(--color-gray-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Category</div>
                <div style={{ fontWeight: 700, color: 'var(--color-gray-800)' }}>{item.category}</div>
              </div>
              {item.brand && (
                <div style={{ background: 'var(--color-gray-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Brand / Make</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-gray-800)' }}>{item.brand}</div>
                </div>
              )}
              {item.color && (
                <div style={{ background: 'var(--color-gray-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Color</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-gray-800)' }}>{item.color}</div>
                </div>
              )}
              <div style={{ background: 'var(--color-gray-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                  {isLost ? 'Date Lost' : 'Date Found'}
                </div>
                <div style={{ fontWeight: 700, color: 'var(--color-gray-800)' }}>
                  {formatDate(dateStr)}{timeStr ? ` at ${timeStr}` : ''}
                </div>
              </div>
              <div style={{ background: 'var(--color-gray-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Location</div>
                <div style={{ fontWeight: 700, color: 'var(--color-gray-800)' }}>
                  {[item.location, item.city].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Description</h3>
                <p style={{ color: 'var(--color-gray-700)', lineHeight: 1.7 }}>{item.description}</p>
              </div>
            )}

            {item.identifying_details && (
              <div style={{ background: 'rgba(245,158,11,0.1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <h3 style={{ fontSize: 'var(--font-size-sm)', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Identifying Details</h3>
                <p style={{ color: 'var(--color-gray-800)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>{item.identifying_details}</p>
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-gray-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {item.reporter_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase' }}>Reported By</div>
                <div style={{ fontWeight: 700, color: 'var(--color-gray-800)' }}>{item.reporter_name}</div>
              </div>
            </div>

          </div>
        </div>

        {/* Actions for non-owners */}
        {!isOwner && (
          <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {isLost ? (
              /* ── Recovery workflow (for lost items) ── */
              <>
                {!user ? (
                  <div style={{ textAlign: 'center' }}>
                    <Button size="lg" leftIcon="🎁" onClick={() => navigate('/login', { state: { from: location } })}>
                      Log In to Report Finding
                    </Button>
                    <p style={{ fontSize: 12, color: 'var(--color-gray-500)', marginTop: 8 }}>
                      You must be logged in to report that you have found this item.
                    </p>
                  </div>
                ) : recoveryEligibility.existingRecovery ? (
                  <div style={{
                    background: 'rgba(67, 97, 238, 0.08)',
                    border: '1px solid rgba(67, 97, 238, 0.25)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '16px 24px',
                    textAlign: 'center',
                    maxWidth: 480,
                    width: '100%'
                  }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: 15, marginBottom: 4 }}>
                      🎁 You have an active recovery submission for this item
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-gray-600)', margin: '0 0 12px 0' }}>
                      Status: <strong>{recoveryEligibility.existingRecovery.status}</strong>. Track review progress in My Recoveries.
                    </p>
                    <Button size="sm" onClick={() => navigate(`/recoveries/${recoveryEligibility.existingRecovery.id}`)}>
                      View Recovery Progress →
                    </Button>
                  </div>
                ) : !recoveryEligibility.eligible && recoveryEligibility.reason ? (
                  <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 'var(--radius-xl)',
                    padding: '14px 20px',
                    color: '#991B1B',
                    fontSize: 13,
                    textAlign: 'center'
                  }}>
                    🚫 {recoveryEligibility.reason}
                  </div>
                ) : (
                  <Button
                    size="lg"
                    leftIcon="🎁"
                    onClick={handleFoundThisItem}
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    I've Found This Item
                  </Button>
                )}
              </>
            ) : (
              /* ── Claim workflow (for found items) ── */
              <>
                {!user ? (
                  <div style={{ textAlign: 'center' }}>
                    <Button size="lg" leftIcon="🔑" onClick={() => navigate('/login', { state: { from: location } })}>
                      Log In to Claim This Item
                    </Button>
                    <p style={{ fontSize: 12, color: 'var(--color-gray-500)', marginTop: 8 }}>
                      You must be an authenticated user to submit ownership claims.
                    </p>
                  </div>
                ) : eligibility.existingClaim ? (
                  <div style={{
                    background: 'rgba(67, 97, 238, 0.08)',
                    border: '1px solid rgba(67, 97, 238, 0.25)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '16px 24px',
                    textAlign: 'center',
                    maxWidth: 480,
                    width: '100%'
                  }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: 15, marginBottom: 4 }}>
                      📋 You have an active claim for this item
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-gray-600)', margin: '0 0 12px 0' }}>
                      Status: <strong>{eligibility.existingClaim.status}</strong>. Track review progress and updates in My Claims.
                    </p>
                    <Button size="sm" onClick={() => navigate(`/claims/${eligibility.existingClaim.id}`)}>
                      View Claim Progress →
                    </Button>
                  </div>
                ) : !eligibility.eligible && eligibility.reason ? (
                  <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 'var(--radius-xl)',
                    padding: '14px 20px',
                    color: '#991B1B',
                    fontSize: 13,
                    textAlign: 'center'
                  }}>
                    🚫 {eligibility.reason}
                  </div>
                ) : (
                  <Button
                    size="lg"
                    leftIcon="🏷️"
                    onClick={() => setClaimModalOpen(true)}
                    style={{
                      background: 'linear-gradient(135deg, #4361EE 0%, #3A0CA3 100%)',
                      boxShadow: '0 4px 14px rgba(67, 97, 238, 0.35)'
                    }}
                  >
                    Claim This Item (Verify Ownership)
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </PageContainer>
      <Footer />

      {/* Claim Modal */}
      <ClaimModal
        item={item}
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        onSuccess={(newClaimId) => navigate(`/claims/${newClaimId}`)}
      />

      {/* Recovery Modal */}
      {isLost && (
        <RecoveryModal
          item={item}
          isOpen={recoveryModalOpen}
          onClose={() => setRecoveryModalOpen(false)}
          onSuccess={(newRecoveryId) => navigate(`/recoveries/${newRecoveryId}`)}
        />
      )}
    </div>
  );
};

export default ItemDetails;
