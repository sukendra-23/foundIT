import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { handoverApi } from '../services/handoverApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { PageLoader } from '../components/common/Loader';
import './HandoverDetails.css';

const HandoverDetails = () => {
  const { handoverId } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // === FINDER MULTI-STEP STATE ===
  // null = not yet chosen | 'MANUAL' | 'GPS'
  const [locationMethod, setLocationMethod] = useState(null);

  // Manual address form
  const [locationForm, setLocationForm] = useState({
    location_title: '',
    address: '',
    locality: '',
    city: '',
    state: '',
    postal_code: '',
    landmark: '',
    additional_directions: '',
    meeting_instructions: '',
  });

  // Schedule
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Contact sharing consent
  const [contactConsent, setContactConsent] = useState(false);

  // Publishing
  const [publishing, setPublishing] = useState(false);

  // Owner verify-arrangements
  const [verifyingArrangements, setVerifyingArrangements] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [showVerifyForm, setShowVerifyForm] = useState(false);

  // Receipt confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmNote, setConfirmNote] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Report issue modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueType, setIssueType] = useState('FINDER_NO_SHOW');
  const [issueDesc, setIssueDesc] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // Star rating / feedback modal
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [myFeedback, setMyFeedback] = useState(null);

  // Live GPS state
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [remainingMin, setRemainingMin] = useState(30);
  const [acquiringGps, setAcquiringGps] = useState(false);

  const watchIdRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await handoverApi.getById(handoverId);
      const h = res.data.handover;
      setData(res.data);

      setLocationForm({
        location_title: h.location_title || '',
        address: h.address || '',
        locality: h.locality || '',
        city: h.city || '',
        state: h.state || '',
        postal_code: h.postal_code || '',
        landmark: h.landmark || '',
        additional_directions: h.additional_directions || '',
        meeting_instructions: h.meeting_instructions || '',
      });

      setContactConsent(Boolean(h.contact_sharing_consent));
      if (h.schedule_date) setScheduleDate(h.schedule_date.split('T')[0]);
      if (h.schedule_time) setScheduleTime(h.schedule_time.slice(0, 5));

      if (h.latitude && h.longitude) {
        setCurrentCoords({ lat: parseFloat(h.latitude), lng: parseFloat(h.longitude) });
      }

      if (res.data.activeSession && res.data.activeSession.session_status === 'ACTIVE') {
        setIsGpsActive(true);
        setCurrentCoords({
          lat: parseFloat(res.data.activeSession.latitude),
          lng: parseFloat(res.data.activeSession.longitude),
        });
        setGpsAccuracy(res.data.activeSession.accuracy);
      }

      // Auto-restore location method so returning finder sees correct UI
      if (h.location_type === 'GPS' || (h.latitude && h.longitude && !h.address)) {
        setLocationMethod('GPS');
      } else if (h.address || h.location_title || h.locality) {
        setLocationMethod('MANUAL');
      }

      // Load feedback if completed
      if (h.handover_status === 'COMPLETED') {
        try {
          const fbRes = await handoverApi.getFeedback(handoverId);
          const feedbacks = fbRes.data?.feedback || [];
          const mine = feedbacks.find(fb => fb.user_id === res.data.currentUserId);
          if (mine) setMyFeedback(mine);
        } catch (_e) { /* silent */ }
      }
    } catch (err) {
      console.error(err);
      toast('Failed to load handover details.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [handoverId]);

  // Poll live location every 15 s
  useEffect(() => {
    if (!data) return;
    const poll = async () => {
      try {
        const res = await handoverApi.getCurrentLocation(handoverId);
        if (res.data.hasActiveSession && res.data.latitude && res.data.longitude) {
          setIsGpsActive(true);
          setCurrentCoords({ lat: parseFloat(res.data.latitude), lng: parseFloat(res.data.longitude) });
          setGpsAccuracy(res.data.accuracy);
          setRemainingMin(res.data.remainingMinutes || 30);
        } else {
          setIsGpsActive(false);
        }
      } catch (_e) { /* silent */ }
    };
    pollIntervalRef.current = setInterval(poll, 15000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [data, handoverId]);

  useEffect(() => {
    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  // Mode switchers ensuring finder cannot enter or submit both simultaneously
  const handleSelectManualMode = () => {
    if (isGpsActive) {
      handleStopGps();
    }
    setLocationMethod('MANUAL');
    toast('Manual Address mode selected. Live GPS sharing is paused.', 'info');
  };

  const handleSelectGpsMode = () => {
    setLocationMethod('GPS');
    toast('Live GPS mode selected. Manual address entry is disabled.', 'info');
  };

  // Finder: one-click consolidated publish (saves + publishes + 1 notification + 1 email)
  const handlePublishAll = async () => {
    if (!locationMethod) {
      toast('Please choose either Live GPS or Add Manually first.', 'warning');
      return;
    }

    if (locationMethod === 'MANUAL') {
      if (!locationForm.address?.trim() && !locationForm.landmark?.trim()) {
        toast('Please enter a street address or landmark.', 'error');
        return;
      }
    }

    if (locationMethod === 'GPS') {
      if (!currentCoords || !currentCoords.lat || !currentCoords.lng) {
        toast('Please acquire your device GPS location first.', 'error');
        return;
      }
    }

    setPublishing(true);
    try {
      const payload = {
        location_type: locationMethod,
        schedule_date: scheduleDate || undefined,
        schedule_time: scheduleTime || undefined,
        contact_sharing_consent: contactConsent,
        meeting_instructions: locationForm.meeting_instructions || undefined,
      };

      if (locationMethod === 'MANUAL') {
        // Strictly send address fields and clear coordinates to prevent confusion
        payload.location_title = locationForm.location_title || null;
        payload.address = locationForm.address || null;
        payload.locality = locationForm.locality || null;
        payload.city = locationForm.city || null;
        payload.state = locationForm.state || null;
        payload.postal_code = locationForm.postal_code || null;
        payload.landmark = locationForm.landmark || null;
        payload.additional_directions = locationForm.additional_directions || null;
        payload.latitude = null;
        payload.longitude = null;
      } else if (locationMethod === 'GPS') {
        // Strictly send GPS coordinates and clear address fields
        payload.location_title = locationForm.location_title || 'Live Device Location';
        payload.address = null;
        payload.locality = null;
        payload.city = null;
        payload.state = null;
        payload.postal_code = null;
        payload.landmark = null;
        payload.additional_directions = null;
        payload.latitude = currentCoords.lat;
        payload.longitude = currentCoords.lng;
      }

      await handoverApi.publishAll(handoverId, payload);
      toast('🚀 Handover details published! Owner has been notified by email.', 'success');
      fetchData(true);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to publish handover details.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Finder: start live GPS
  const handleStartGps = () => {
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setLocationMethod('GPS');
    setAcquiringGps(true);
    toast('Acquiring your device GPS position...', 'info');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          await handoverApi.startLocationSession(handoverId, { latitude, longitude, accuracy });
          setIsGpsActive(true);
          setCurrentCoords({ lat: latitude, lng: longitude });
          setGpsAccuracy(accuracy);
          setRemainingMin(30);
          toast('Live GPS sharing active! Owner can now see your location.', 'success');
          fetchData(true);
          if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = navigator.geolocation.watchPosition(
            async (p) => {
              setCurrentCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
              setGpsAccuracy(p.coords.accuracy);
              try {
                await handoverApi.updateLocationSession(handoverId, {
                  latitude: p.coords.latitude,
                  longitude: p.coords.longitude,
                  accuracy: p.coords.accuracy,
                });
              } catch (e) {
                if (e.response?.status === 410) { setIsGpsActive(false); toast('Live GPS session expired.', 'warning'); }
              }
            },
            (e) => console.warn('WatchPosition error:', e),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
          );
        } catch (err) {
          toast(err.response?.data?.message || 'Failed to start GPS session.', 'error');
        } finally {
          setAcquiringGps(false);
        }
      },
      () => {
        setAcquiringGps(false);
        toast('Could not access device GPS. Check browser location permissions.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleStopGps = async () => {
    if (watchIdRef.current) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    try {
      await handoverApi.stopLocationSession(handoverId);
      setIsGpsActive(false);
      toast('Live GPS sharing stopped.', 'info');
      fetchData(true);
    } catch (_err) { toast('Failed to stop GPS session.', 'error'); }
  };

  const handleToggleConsent = async () => {
    const next = !contactConsent;
    setContactConsent(next);
    try {
      await handoverApi.updateContactConsent(handoverId, next);
      toast(next ? 'Phone shared with owner.' : 'Phone is now private.', 'success');
      fetchData(true);
    } catch (_err) {
      setContactConsent(!next);
      toast('Failed to update phone sharing preference.', 'error');
    }
  };

  // Owner: verify arrangements
  const handleVerifyArrangements = async () => {
    setVerifyingArrangements(true);
    try {
      await handoverApi.verifyArrangements(handoverId, { notes: verifyNotes });
      toast('✅ Handover arrangements verified! Finder has been notified.', 'success');
      setShowVerifyForm(false);
      fetchData(true);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to verify arrangements.', 'error');
    } finally {
      setVerifyingArrangements(false);
    }
  };

  // Owner: confirm receipt
  const handleConfirmReceipt = async () => {
    if (!confirmCheckbox) { toast('Please certify that you have received your item.', 'error'); return; }
    setIsConfirming(true);
    try {
      let evidenceUrl = null;
      if (evidenceFile) {
        setUploadingEvidence(true);
        try {
          const fd = new FormData();
          fd.append('evidence', evidenceFile);
          const upRes = await handoverApi.uploadEvidence(handoverId, fd);
          evidenceUrl = upRes.data?.url;
        } catch (_e) { toast('Evidence upload failed, proceeding without it.', 'warning'); }
        finally { setUploadingEvidence(false); }
      }
      await handoverApi.confirmReceipt(handoverId, { feedback: confirmNote, owner_evidence_url: evidenceUrl });
      toast('🎉 Item receipt confirmed! Recovery is officially complete.', 'success');
      setIsConfirmModalOpen(false);
      fetchData(true);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to confirm receipt.', 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  // Report issue
  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!issueDesc.trim()) { toast('Please describe the problem.', 'error'); return; }
    setIsSubmittingIssue(true);
    try {
      await handoverApi.reportIssue(handoverId, { issue_type: issueType, description: issueDesc });
      toast('Issue reported to FoundiT administrators.', 'success');
      setIsIssueModalOpen(false);
      setIssueDesc('');
      fetchData(true);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to report issue.', 'error');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Star rating submit
  const handleSubmitFeedback = async () => {
    if (!feedbackRating) { toast('Please select a star rating (1–5).', 'error'); return; }
    setSubmittingFeedback(true);
    try {
      await handoverApi.submitFeedback(handoverId, { rating: feedbackRating, feedback_text: feedbackText });
      toast('⭐ Thank you for your feedback!', 'success');
      setIsFeedbackModalOpen(false);
      fetchData(true);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to submit feedback.', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // EARLY RETURNS
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) return <PageLoader />;
  if (!data || !data.handover) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2>Handover not found</h2>
        <Link to="/my-recoveries" style={{ marginTop: 16, display: 'inline-block' }}>Back to My Recoveries</Link>
      </div>
    );
  }

  const { handover, role, auditLogs = [] } = data;
  const { isFinder, isOwner } = role;

  // Map helpers
  const isManualMode = locationMethod === 'MANUAL';
  const hasCoords = !isManualMode && Boolean(currentCoords?.lat && currentCoords?.lng && !isNaN(currentCoords.lat) && !isNaN(currentCoords.lng));
  const mapLat = hasCoords ? currentCoords.lat : 28.6139;
  const mapLng = hasCoords ? currentCoords.lng : 77.2090;
  const addressQuery = [
    locationForm.address || handover.address,
    locationForm.locality || handover.locality,
    locationForm.city || handover.city,
    locationForm.state || handover.state
  ].filter(Boolean).join(', ');
  const mapEmbedUrl = hasCoords
    ? `https://maps.google.com/maps?q=${mapLat},${mapLng}&z=16&output=embed`
    : addressQuery
      ? `https://maps.google.com/maps?q=${encodeURIComponent(addressQuery)}&z=15&output=embed`
      : `https://maps.google.com/maps?q=28.6139,77.2090&z=12&output=embed`;
  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${mapLat},${mapLng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(addressQuery || 'India')}`;

  // Stepper
  const stepIndex = (() => {
    if (handover.handover_status === 'COMPLETED') return 3;
    if (handover.handover_status === 'SCHEDULED') return 2;
    if (['LOCATION_PUBLISHED', 'VERIFIED'].includes(handover.handover_status)) return 1;
    return 0;
  })();

  const isPublished = ['LOCATION_PUBLISHED', 'VERIFIED', 'SCHEDULED', 'AWAITING_CONFIRMATION', 'COMPLETED'].includes(handover.handover_status);

  // Status badge colours
  const statusColor = {
    COMPLETED: { bg: '#DCFCE7', color: '#15803D' },
    ISSUE_REPORTED: { bg: '#FEE2E2', color: '#B91C1C' },
    VERIFIED: { bg: '#E0F2FE', color: '#0369A1' },
  }[handover.handover_status] || { bg: '#EEF2FF', color: '#4338CA' };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="handover-page">
      <Navbar />

      <div className="handover-container">

        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        <div className="handover-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 26 }}>🤝</span>
              <h1 className="handover-title">Smart Item Handover &amp; Return</h1>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, ...statusColor }}>
                {handover.handover_status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="handover-sub">
              Recovery #{handover.recovery_id} &bull; Item: <strong>{handover.lost_item_title || handover.recovery_item_name}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              to={`/messages?recoveryId=${handover.recovery_id}`}
              style={{ padding: '9px 18px', borderRadius: 'var(--radius-lg)', background: '#EEF2FF', color: 'var(--color-primary)', fontWeight: 700, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>💬</span><span>Open Chat</span>
            </Link>
            {handover.handover_status === 'COMPLETED' && !myFeedback && (
              <button onClick={() => setIsFeedbackModalOpen(true)} style={{ padding: '9px 16px', borderRadius: 'var(--radius-lg)', background: '#FFF7ED', color: '#B45309', border: '1px solid #FED7AA', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                ⭐ Leave Feedback
              </button>
            )}
            <button onClick={() => setIsIssueModalOpen(true)} style={{ padding: '9px 16px', borderRadius: 'var(--radius-lg)', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              ⚠️ Report Problem
            </button>
          </div>
        </div>

        {/* ── Stepper ─────────────────────────────────────────────────────────── */}
        <div className="handover-stepper">
          {[
            { label: '1. Initiated', sub: 'Admin Approved' },
            { label: '2. Location Published', sub: 'Address or Live GPS' },
            { label: '3. Verified / Scheduled', sub: 'Owner Confirmed Details' },
            { label: '4. Return Confirmed', sub: 'Owner Got Their Item' },
          ].map((s, i) => (
            <div key={i} className="stepper-step">
              <div className={`stepper-circle ${i < stepIndex ? 'completed' : i === stepIndex ? 'active' : ''}`}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <div>
                <div className={`stepper-label ${i === stepIndex ? 'active' : ''}`}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--color-gray-400)' }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Completion Banner ────────────────────────────────────────────────── */}
        {handover.handover_status === 'COMPLETED' && (
          <div style={{ background: '#F0FDF4', border: '2px solid #86EFAC', borderRadius: 'var(--radius-xl)', padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: 44 }}>🎉</div>
            <div>
              <h3 style={{ margin: '0 0 4px', color: '#166534', fontSize: 18, fontWeight: 900 }}>Item Successfully Returned &amp; Verified!</h3>
              <p style={{ margin: 0, color: '#15803D', fontSize: 14 }}>
                The owner confirmed receipt on {handover.completed_at ? new Date(handover.completed_at).toLocaleString() : '—'}. Thank you!
              </p>
              {!myFeedback ? (
                <button onClick={() => setIsFeedbackModalOpen(true)} style={{ marginTop: 12, padding: '8px 18px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  ⭐ Rate This Experience
                </button>
              ) : (
                <div style={{ marginTop: 10, fontSize: 13, color: '#15803D', fontWeight: 600 }}>
                  You rated: {'★'.repeat(myFeedback.rating)}{'☆'.repeat(5 - myFeedback.rating)} — Thank you!
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Main Grid ───────────────────────────────────────────────────────── */}
        <div className="handover-grid">

          {/* Left / Main Column */}
          <div>

            {/* ═══════════════════════════════════════════════════════════════════
                FINDER PANEL — Multi-Step
            ═══════════════════════════════════════════════════════════════════ */}
            {isFinder && handover.handover_status !== 'COMPLETED' && (
              <div className="handover-card">
                <div className="handover-card-header">
                  <div>
                    <h3 className="handover-card-title"><span>📍</span> Handover Coordination</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-gray-500)' }}>
                      Choose your location method below: stream Live GPS or enter a meeting address manually.
                    </p>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 14,
                    fontSize: 12,
                    fontWeight: 800,
                    background: locationMethod === 'GPS' ? '#ECFDF5' : locationMethod === 'MANUAL' ? '#FFF7ED' : '#F1F5F9',
                    color: locationMethod === 'GPS' ? '#059669' : locationMethod === 'MANUAL' ? '#EA580C' : '#64748B',
                    border: `1px solid ${locationMethod === 'GPS' ? '#A7F3D0' : locationMethod === 'MANUAL' ? '#FED7AA' : '#E2E8F0'}`,
                  }}>
                    {locationMethod === 'GPS' ? '📡 Live GPS Active' : locationMethod === 'MANUAL' ? '📍 Manual Address Active' : 'Select a Method'}
                  </span>
                </div>

                {/* ── 1. LIVE GPS LOCATION SHARING OPTION ── */}
                <div style={{
                  padding: 18,
                  borderRadius: 'var(--radius-xl)',
                  background: locationMethod === 'GPS' ? '#F0FDF4' : '#F8FAFC',
                  border: `2px solid ${locationMethod === 'GPS' ? '#86EFAC' : '#E2E8F0'}`,
                  transition: 'all 0.2s ease',
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>📡</span>
                      <strong style={{ fontSize: 15, color: locationMethod === 'GPS' ? '#065F46' : 'var(--color-gray-800)' }}>
                        Live GPS Location Sharing
                      </strong>
                      {isGpsActive && (
                        <span className="live-badge">
                          <span className="live-pulse"></span> ACTIVE ({remainingMin}m left)
                        </span>
                      )}
                    </div>
                    {locationMethod === 'GPS' && (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', background: '#DCFCE7', padding: '2px 8px', borderRadius: 8 }}>
                        Selected Mode
                      </span>
                    )}
                  </div>

                  <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                    Click the button below to acquire your device GPS position and stream it to the owner for 30 minutes.
                  </p>

                  <div style={{
                    padding: 16,
                    background: '#fff',
                    borderRadius: 'var(--radius-lg)',
                    border: `1.5px ${isGpsActive ? 'solid #10B981' : 'dashed var(--color-gray-300)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: isGpsActive ? '#065F46' : 'var(--color-gray-700)', marginBottom: 2 }}>
                        {isGpsActive ? '🟢 Broadcasting your live location to the owner' : locationMethod === 'MANUAL' ? '📍 Live GPS is paused (Manual Address selected)' : '📍 GPS not started yet'}
                      </div>
                      {isGpsActive && currentCoords ? (
                        <div style={{ fontSize: 12, color: '#059669' }}>
                          Position: {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)} {gpsAccuracy ? `(±${Math.round(gpsAccuracy)}m)` : ''}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>
                          {locationMethod === 'MANUAL'
                            ? 'Click "Share My Live Location" to switch to GPS mode.'
                            : 'Click the button to begin live sharing.'}
                        </div>
                      )}
                    </div>

                    <div>
                      {!isGpsActive ? (
                        <button
                          type="button"
                          onClick={handleStartGps}
                          disabled={acquiringGps}
                          style={{
                            padding: '11px 22px',
                            background: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-lg)',
                            fontWeight: 800,
                            fontSize: 13.5,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.28)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>📍</span>
                          <span>{acquiringGps ? '⏳ Acquiring...' : 'Share My Live Location'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStopGps}
                          style={{
                            padding: '10px 20px',
                            background: '#EF4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-lg)',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span>⏹️</span>
                          <span>Stop Sharing</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── 2. ADD MEETING ADDRESS MANUALLY (DIRECTLY BELOW LIVE GPS) ── */}
                <div style={{
                  padding: 18,
                  borderRadius: 'var(--radius-xl)',
                  background: locationMethod === 'MANUAL' ? '#FFFBF5' : '#FFFDF9',
                  border: `2px solid ${locationMethod === 'MANUAL' ? '#FB923C' : '#FED7AA'}`,
                  boxShadow: locationMethod === 'MANUAL'
                    ? '0 4px 20px rgba(249, 115, 22, 0.14)'
                    : '0 2px 8px rgba(249, 115, 22, 0.06)',
                  transition: 'all 0.25s ease',
                  marginBottom: 20,
                }}>
                  {/* Option Header row with Attractive Orange Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 20 }}>📍</span>
                        <strong style={{ fontSize: 15, color: '#9A3412' }}>
                          Add Meeting Address Manually
                        </strong>
                        {locationMethod === 'MANUAL' && (
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: '#C2410C', background: '#FFEDD5', padding: '2px 8px', borderRadius: 8 }}>
                            Selected Option
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 12.5, color: '#9A3412', opacity: 0.9, lineHeight: 1.45 }}>
                        Not at home or prefer a specific location? Enter a public place, metro gate, or building address manually instead of live GPS.
                      </p>
                    </div>

                    <div>
                      {/* ATTRACTIVE EYE-CATCHING ORANGE BUTTON (Mixed Orange Gradient) */}
                      <button
                        type="button"
                        onClick={handleSelectManualMode}
                        style={{
                          padding: '12px 24px',
                          borderRadius: 'var(--radius-lg)',
                          border: 'none',
                          background: locationMethod === 'MANUAL'
                            ? 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)'
                            : 'linear-gradient(135deg, #FF6A00 0%, #FF8533 48%, #EA580C 100%)',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: 13.5,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          boxShadow: '0 4px 16px rgba(249, 115, 22, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                          transition: 'all 0.2s ease',
                          letterSpacing: '0.01em',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(249, 115, 22, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.35)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(249, 115, 22, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                        }}
                      >
                        <span style={{ fontSize: 16 }}>✏️</span>
                        <span>{locationMethod === 'MANUAL' ? '✓ Manual Address Active' : 'Add Address Manually'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Manual Address Form Fields — Expands when Manual Mode is selected */}
                  {locationMethod === 'MANUAL' && (
                    <div style={{
                      marginTop: 18,
                      paddingTop: 16,
                      borderTop: '1px dashed #FDBA74',
                      animation: 'modalIn 0.2s ease-out',
                    }}>
                      <div style={{
                        padding: '10px 14px',
                        background: '#FFF7ED',
                        borderRadius: 8,
                        border: '1px solid #FED7AA',
                        fontSize: 12,
                        color: '#9A3412',
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <span>🔒</span>
                        <span>
                          <strong>Manual Address Mode:</strong> Live GPS is deactivated so owner receives only your specified meeting address without confusion.
                        </span>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Meeting Place Title / Building Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Metro Station Gate 2, Campus Security Office, City Library Entrance"
                          value={locationForm.location_title}
                          onChange={e => setLocationForm({ ...locationForm, location_title: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Full Street Address / Landmark <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <textarea
                          rows={2}
                          className="form-textarea"
                          placeholder="Detailed address, floor, or visible landmark..."
                          value={locationForm.address}
                          onChange={e => setLocationForm({ ...locationForm, address: e.target.value })}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                        {[
                          { key: 'locality', label: 'Locality / Area', ph: 'e.g. Connaught Place' },
                          { key: 'city', label: 'City', ph: 'e.g. New Delhi' },
                          { key: 'postal_code', label: 'PIN / Postal Code', ph: 'e.g. 110001' },
                        ].map(({ key, label, ph }) => (
                          <div key={key} className="form-group">
                            <label className="form-label">{label}</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder={ph}
                              value={locationForm[key]}
                              onChange={e => setLocationForm({ ...locationForm, [key]: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 3. COMMON MEETING DETAILS (INSTRUCTIONS, SCHEDULE, PHONE, PUBLISH) ── */}
                <div className="form-group">
                  <label className="form-label">Meeting Instructions for Owner (Optional)</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="e.g. Please bring an ID, I will be waiting by the bench outside."
                    value={locationForm.meeting_instructions}
                    onChange={e => setLocationForm({ ...locationForm, meeting_instructions: e.target.value })}
                  />
                </div>

                {/* Proposed Meeting Date & Time */}
                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '16px 18px', marginBottom: 18, border: '1px solid var(--color-gray-200)' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: 'var(--color-gray-800)' }}>
                    📅 Proposed Meeting Date &amp; Time (Optional)
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={scheduleDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setScheduleDate(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label className="form-label">Time</label>
                      <input
                        type="time"
                        className="form-input"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Phone share toggle */}
                <div
                  onClick={handleToggleConsent}
                  style={{
                    padding: '14px 18px',
                    background: contactConsent ? '#F0FDF4' : '#F8FAFC',
                    borderRadius: 'var(--radius-lg)',
                    border: `1.5px solid ${contactConsent ? '#86EFAC' : 'var(--color-gray-300)'}`,
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{contactConsent ? '📞' : '🔒'}</span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: contactConsent ? '#166534' : 'var(--color-gray-800)' }}>
                        Share my phone number with the owner
                      </div>
                      <div style={{ fontSize: 12, color: contactConsent ? '#15803D' : 'var(--color-gray-500)' }}>
                        {contactConsent ? '✅ Phone visible to owner for direct calling.' : 'Recommended — allows owner to call you when meeting.'}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: 48, height: 26, borderRadius: 13, background: contactConsent ? '#10B981' : '#CBD5E1', position: 'relative', flexShrink: 0, transition: 'background 0.2s ease' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: contactConsent ? 25 : 3, transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>

                {/* One-Click Consolidated Publish CTA Button */}
                <button
                  type="button"
                  onClick={handlePublishAll}
                  disabled={publishing || !locationMethod || (locationMethod === 'GPS' && !isGpsActive)}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    background: !locationMethod
                      ? 'var(--color-gray-300)'
                      : locationMethod === 'MANUAL'
                      ? 'linear-gradient(135deg, #EA580C 0%, #C2410C 50%, #7C3AED 100%)'
                      : isGpsActive
                      ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                      : 'var(--color-gray-300)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: (!locationMethod || (locationMethod === 'GPS' && !isGpsActive) || publishing) ? 'not-allowed' : 'pointer',
                    boxShadow: (locationMethod === 'MANUAL' || (locationMethod === 'GPS' && isGpsActive))
                      ? '0 4px 14px rgba(0,0,0,0.2)'
                      : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {publishing
                    ? '⏳ Publishing...'
                    : !locationMethod
                    ? '👉 Please Choose Live GPS or Add Manually Above'
                    : locationMethod === 'GPS' && !isGpsActive
                    ? '📡 Activate Live GPS Above to Publish'
                    : locationMethod === 'MANUAL'
                    ? '🚀 Publish Meeting Address to Owner'
                    : '🚀 Publish Live Location to Owner'}
                </button>
                <p style={{ fontSize: 12, color: 'var(--color-gray-400)', textAlign: 'center', marginTop: 8 }}>
                  Immediately notifies the owner by in-app notification and email.
                </p>

                {/* Published success notice */}
                {isPublished && (
                  <div style={{ marginTop: 16, padding: '14px 18px', background: '#F0FDF4', borderRadius: 12, border: '1.5px solid #86EFAC', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 800, color: '#166534', fontSize: 14 }}>Details published to the owner!</div>
                      <div style={{ fontSize: 12, color: '#15803D' }}>
                        Published {handover.published_at ? new Date(handover.published_at).toLocaleString() : 'recently'}. (Mode: {handover.location_type || locationMethod})
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                MAP CARD — shown to everyone
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="handover-card">
              <div className="handover-card-header">
                <h3 className="handover-card-title"><span>🗺️</span> Handover Location &amp; Directions</h3>
                {isGpsActive
                  ? <span className="live-badge"><span className="live-pulse"></span> LIVE BROADCAST</span>
                  : <span style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>{handover.location_type || 'In-Person'}</span>
                }
              </div>

              {handover.location_title && (
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: 4 }}>{handover.location_title}</div>
              )}

              {handover.address ? (
                <div style={{ fontSize: 14, color: 'var(--color-gray-600)', lineHeight: 1.5, marginBottom: 8 }}>
                  {[handover.address, handover.locality, handover.city, handover.postal_code && `- ${handover.postal_code}`].filter(Boolean).join(', ')}
                </div>
              ) : !isGpsActive ? (
                <div style={{ fontSize: 13, color: 'var(--color-gray-400)', fontStyle: 'italic', marginBottom: 8 }}>Awaiting finder to publish meeting location.</div>
              ) : null}

              {handover.meeting_instructions && (
                <div style={{ marginBottom: 14, padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, borderLeft: '4px solid var(--color-primary)', fontSize: 13, color: 'var(--color-gray-700)' }}>
                  <strong>Instructions:</strong> {handover.meeting_instructions}
                </div>
              )}

              {handover.schedule_date && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: '#FEF3C7', borderRadius: 10, border: '1px solid #FDE68A', fontSize: 13, color: '#B45309', fontWeight: 700 }}>
                  📅 Proposed: {new Date(handover.schedule_date).toLocaleDateString()}{handover.schedule_time ? ` at ${handover.schedule_time}` : ''}
                </div>
              )}

              <div className="map-container" style={{ minHeight: 320, marginTop: 8 }}>
                <iframe title="Handover Map" src={mapEmbedUrl} width="100%" height="320"
                  style={{ border: 'none', display: 'block', borderRadius: 'var(--radius-lg)' }} loading="lazy" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>
                  {hasCoords ? `GPS: ${mapLat.toFixed(5)}, ${mapLng.toFixed(5)}` : addressQuery || 'Location on map'}
                </span>
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', background: '#2563EB', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>
                  <span>🗺️</span><span>Open in Google Maps</span>
                </a>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                OWNER: VERIFY ARRANGEMENTS
            ═══════════════════════════════════════════════════════════════════ */}
            {isOwner && ['LOCATION_PUBLISHED', 'SCHEDULED'].includes(handover.handover_status) && (
              <div style={{ background: 'linear-gradient(135deg,#E0F2FE 0%,#BFDBFE 100%)', borderRadius: 'var(--radius-xl)', border: '2px solid #93C5FD', padding: 24, marginBottom: 24, boxShadow: 'var(--shadow-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <span style={{ fontSize: 32 }}>✅</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#1E40AF' }}>Verify Handover Arrangements</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#1D4ED8', lineHeight: 1.4 }}>
                      Review the finder's location and schedule above, then confirm you've seen the details.
                    </p>
                  </div>
                </div>

                {handover.owner_verified_at ? (
                  <div style={{ padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #93C5FD', fontSize: 13, color: '#1E40AF', fontWeight: 600 }}>
                    ✅ You verified arrangements on {new Date(handover.owner_verified_at).toLocaleString()}
                    {handover.owner_verification_notes && <div style={{ fontWeight: 400, marginTop: 4, color: '#1D4ED8' }}>Note: {handover.owner_verification_notes}</div>}
                  </div>
                ) : !showVerifyForm ? (
                  <button onClick={() => setShowVerifyForm(true)} style={{ padding: '12px 24px', background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 'var(--radius-lg)', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(29,78,216,0.3)' }}>
                    ✅ Verify Handover Details
                  </button>
                ) : (
                  <div>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Optional note for the finder</label>
                      <textarea rows={2} className="form-textarea" placeholder="e.g. 'Looks good, see you at 3pm' or 'Can we meet at 4pm instead?'"
                        value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setShowVerifyForm(false)} style={{ padding: '9px 18px', background: 'var(--color-gray-100)', color: 'var(--color-gray-700)', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                      <button onClick={handleVerifyArrangements} disabled={verifyingArrangements} style={{ padding: '9px 24px', background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
                        {verifyingArrangements ? 'Verifying...' : '✅ Confirm Arrangements'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                OWNER: CONFIRM RECEIPT
            ═══════════════════════════════════════════════════════════════════ */}
            {isOwner && handover.handover_status !== 'COMPLETED' && (
              <div style={{ background: 'linear-gradient(135deg,#ECFDF5 0%,#D1FAE5 100%)', borderRadius: 'var(--radius-xl)', border: '2px solid #6EE7B7', padding: 24, boxShadow: 'var(--shadow-md)', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <span style={{ fontSize: 32 }}>📦</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#065F46' }}>Item Handover Confirmation</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#047857', lineHeight: 1.4 }}>
                      Once you have met the finder and verified your item is in hand, confirm receipt to complete the recovery.
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginTop: 16 }}>
                  <button onClick={() => setIsConfirmModalOpen(true)} style={{ padding: '12px 28px', borderRadius: 'var(--radius-lg)', background: '#059669', color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}>
                    ✅ I Have Received My Item
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Right Sidebar */}
          <div>

            {/* Contact Card */}
            <div className="handover-card">
              <div className="handover-card-header">
                <h4 className="handover-card-title"><span>👤</span> {isOwner ? 'Finder Contact' : 'Original Owner'}</h4>
              </div>
              {isOwner ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, overflow: 'hidden' }}>
                      {handover.finder_avatar ? <img src={handover.finder_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : handover.finder_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--color-gray-900)', fontSize: 15 }}>{handover.finder_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>FoundiT Finder</div>
                    </div>
                  </div>
                  {handover.contact_sharing_consent && handover.finder_phone ? (
                    <div style={{ padding: '12px 14px', background: '#F0FDF4', borderRadius: 'var(--radius-md)', fontSize: 13, color: '#15803D', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div><strong>📞 Phone:</strong> {handover.finder_phone}</div>
                      <a href={`tel:${handover.finder_phone}`} style={{ padding: '4px 10px', background: '#10B981', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>Call</a>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-gray-500)', marginBottom: 12 }}>
                      🔒 Phone hidden by finder. Coordinate via in-app chat.
                    </div>
                  )}
                  <Link to={`/messages?recoveryId=${handover.recovery_id}`} style={{ display: 'block', textAlign: 'center', padding: '10px 14px', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                    💬 Message Finder Directly
                  </Link>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, overflow: 'hidden' }}>
                      {handover.owner_avatar ? <img src={handover.owner_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : handover.owner_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--color-gray-900)', fontSize: 15 }}>{handover.owner_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>Item Owner</div>
                    </div>
                  </div>
                  <Link to={`/messages?recoveryId=${handover.recovery_id}`} style={{ display: 'block', textAlign: 'center', padding: '10px 14px', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                    💬 Message Owner Directly
                  </Link>
                </div>
              )}
            </div>

            {/* Status Summary */}
            <div className="handover-card">
              <div className="handover-card-header">
                <h4 className="handover-card-title"><span>📊</span> Status Summary</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Handover ID', val: `#${String(handoverId).padStart(4, '0')}`, color: null },
                  { label: 'Status', val: handover.handover_status.replace(/_/g, ' '), color: null },
                  handover.initiated_at && { label: 'Initiated', val: new Date(handover.initiated_at).toLocaleDateString(), color: null },
                  handover.published_at && { label: 'Published', val: new Date(handover.published_at).toLocaleDateString(), color: '#4F46E5' },
                  handover.owner_verified_at && { label: 'Verified', val: new Date(handover.owner_verified_at).toLocaleDateString(), color: '#1D4ED8' },
                  handover.completed_at && { label: 'Completed', val: new Date(handover.completed_at).toLocaleDateString(), color: '#059669' },
                ].filter(Boolean).map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-gray-500)' }}>{row.label}</span>
                    <span style={{ fontWeight: row.color ? 700 : 600, color: row.color || 'var(--color-gray-800)' }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit / Timeline */}
            <div className="handover-card">
              <div className="handover-card-header">
                <h4 className="handover-card-title"><span>📜</span> Handover History</h4>
                {auditLogs.length > 0 && (
                  <span style={{ fontSize: 11, background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                    {auditLogs.length} events
                  </span>
                )}
              </div>
              <div
                className="handover-history-scroll"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  maxHeight: 300,
                  overflowY: 'auto',
                  paddingRight: 6,
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#CBD5E1 transparent',
                }}
              >
                {auditLogs.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--color-gray-400)' }}>No actions logged yet.</div>
                ) : auditLogs.map(log => (
                  <div key={log.id} style={{ borderLeft: '2px solid var(--color-primary-light)', paddingLeft: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-gray-800)' }}>{log.action.replace(/_/g, ' ')}</div>
                    {log.description && <div style={{ fontSize: 12, color: 'var(--color-gray-600)', marginTop: 2 }}>{log.description}</div>}
                    <div style={{ fontSize: 11, color: 'var(--color-gray-400)', marginTop: 2 }}>
                      {new Date(log.created_at).toLocaleString()} &bull; {log.user_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL: Owner Confirms Receipt
      ══════════════════════════════════════════════════════════════════════════ */}
      {isConfirmModalOpen && (
        <div className="modal-overlay" onClick={() => setIsConfirmModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 900, color: '#065F46' }}>Confirm Physical Return of Item</h3>
            <p style={{ fontSize: 14, color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
              Only confirm if you have met finder <strong>{handover.finder_name}</strong> and are holding your returned item.
            </p>
            <div style={{ background: '#F8FAFC', borderRadius: 'var(--radius-lg)', padding: 14, margin: '16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>🎁</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{handover.lost_item_title || handover.recovery_item_name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>Recovery ID: #{handover.recovery_id}</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Thank-you note for finder (Optional)</label>
              <textarea rows={2} className="form-textarea" placeholder="Write a message of thanks..."
                value={confirmNote} onChange={e => setConfirmNote(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Upload Proof Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={e => setEvidenceFile(e.target.files[0])} style={{ fontSize: 13, display: 'block', marginTop: 4 }} />
              {evidenceFile && <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>📎 {evidenceFile.name}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '16px 0' }}>
              <input type="checkbox" id="cert" checked={confirmCheckbox} onChange={e => setConfirmCheckbox(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, cursor: 'pointer' }} />
              <label htmlFor="cert" style={{ fontSize: 13, color: 'var(--color-gray-700)', cursor: 'pointer', lineHeight: 1.4 }}>
                I confirm I have physically received my lost item in satisfactory condition. This finalises the recovery.
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setIsConfirmModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 'var(--radius-md)', background: 'var(--color-gray-100)', color: 'var(--color-gray-700)', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button disabled={!confirmCheckbox || isConfirming || uploadingEvidence} onClick={handleConfirmReceipt}
                style={{ padding: '9px 24px', borderRadius: 'var(--radius-md)', background: confirmCheckbox ? '#059669' : 'var(--color-gray-300)', color: '#fff', border: 'none', fontWeight: 800, cursor: confirmCheckbox ? 'pointer' : 'not-allowed' }}>
                {uploadingEvidence ? 'Uploading...' : isConfirming ? 'Confirming...' : 'Yes, I Have Received It'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL: Star Rating / Feedback
      ══════════════════════════════════════════════════════════════════════════ */}
      {isFeedbackModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFeedbackModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: '#1E293B' }}>Rate Your Handover Experience</h3>
            <p style={{ fontSize: 13.5, color: 'var(--color-gray-600)', margin: '0 0 20px' }}>
              Your feedback helps improve FoundiT and recognises good finders &amp; owners.
            </p>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gray-500)', marginBottom: 10, textTransform: 'uppercase' }}>Tap to rate</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setFeedbackRating(star)}
                    style={{ fontSize: 36, background: 'none', border: 'none', cursor: 'pointer', color: star <= feedbackRating ? '#F59E0B' : '#D1D5DB', transform: star <= feedbackRating ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.1s' }}>
                    ★
                  </button>
                ))}
              </div>
              {feedbackRating > 0 && (
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: feedbackRating >= 4 ? '#059669' : feedbackRating >= 3 ? '#D97706' : '#DC2626' }}>
                  {['', 'Poor 😞', 'Fair 😐', 'Good 👍', 'Great 😊', 'Excellent 🌟'][feedbackRating]}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Share your experience (Optional)</label>
              <textarea rows={3} className="form-textarea" placeholder="Describe your handover experience..."
                value={feedbackText} onChange={e => setFeedbackText(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setIsFeedbackModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 'var(--radius-md)', background: 'var(--color-gray-100)', color: 'var(--color-gray-700)', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button disabled={feedbackRating < 1 || submittingFeedback} onClick={handleSubmitFeedback}
                style={{ padding: '9px 24px', borderRadius: 'var(--radius-md)', background: feedbackRating > 0 ? '#F59E0B' : 'var(--color-gray-300)', color: '#fff', border: 'none', fontWeight: 800, cursor: feedbackRating > 0 ? 'pointer' : 'not-allowed' }}>
                {submittingFeedback ? 'Submitting...' : '⭐ Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL: Report Problem
      ══════════════════════════════════════════════════════════════════════════ */}
      {isIssueModalOpen && (
        <div className="modal-overlay" onClick={() => setIsIssueModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 900, color: '#DC2626' }}>Report Handover Problem</h3>
            <p style={{ fontSize: 13.5, color: 'var(--color-gray-600)' }}>
              FoundiT Administrators will be alerted and can review conversation logs and location sessions.
            </p>
            <form onSubmit={handleReportIssue}>
              <div className="form-group">
                <label className="form-label">Issue Category</label>
                <select className="form-select" value={issueType} onChange={e => setIssueType(e.target.value)}>
                  <option value="FINDER_NO_SHOW">The other party did not show up</option>
                  <option value="WRONG_LOCATION">Incorrect / unsafe meeting location</option>
                  <option value="ITEM_NOT_RECEIVED">Item was not handed over</option>
                  <option value="ITEM_CONDITION">Item damaged or different from report</option>
                  <option value="COMMUNICATION">Unresponsive or improper communication</option>
                  <option value="OTHER">Other issue</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Detailed Description</label>
                <textarea rows={4} required className="form-textarea" placeholder="Provide complete details about what went wrong..."
                  value={issueDesc} onChange={e => setIssueDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" onClick={() => setIsIssueModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 'var(--radius-md)', background: 'var(--color-gray-100)', color: 'var(--color-gray-700)', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmittingIssue} style={{ padding: '9px 24px', borderRadius: 'var(--radius-md)', background: '#DC2626', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                  {isSubmittingIssue ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HandoverDetails;
