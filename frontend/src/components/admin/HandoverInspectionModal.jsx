import React, { useState, useEffect } from 'react';
import { adminHandoverApi } from '../../services/handoverApi';
import { formatDate } from '../../utils/formatters';
import { Skeleton } from '../common/Loader';
import Button from '../common/Button';

const HandoverInspectionModal = ({ isOpen, onClose, handoverId }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'ITEM' | 'HANDOVER' | 'TIMELINE' | 'FEEDBACK'
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);

  useEffect(() => {
    if (!isOpen || !handoverId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminHandoverApi.getById(handoverId);
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load handover details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, handoverId]);

  if (!isOpen) return null;

  const h = data?.handover;
  const lostItemImages = data?.lostItemImages || [];
  const recoveryImages = data?.recoveryImages || [];
  const locationSessions = data?.locationSessions || [];
  const handoverAuditLogs = data?.handoverAuditLogs || [];
  const feedbackList = data?.feedback || [];
  const issues = data?.issues || [];

  const statusStyles = {
    COMPLETED: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC', label: '✅ Successfully Returned' },
    VERIFIED: { bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD', label: '✓ Arrangements Verified' },
    SCHEDULED: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', label: '📅 Meeting Scheduled' },
    LOCATION_PUBLISHED: { bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE', label: '📍 Location Published' },
    INITIATED: { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: '⏳ Initiated (In Preparation)' },
    ISSUE_REPORTED: { bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5', label: '⚠️ Issue Reported' },
    CANCELLED: { bg: '#F3F4F6', color: '#4B5563', border: '#D1D5DB', label: '✕ Cancelled' },
  }[h?.handover_status] || { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB', label: h?.handover_status || 'Unknown' };

  // Map coordinates
  const hasCoords = Boolean(h?.latitude && h?.longitude);
  const mapLat = hasCoords ? parseFloat(h.latitude) : 28.6139;
  const mapLng = hasCoords ? parseFloat(h.longitude) : 77.2090;
  const addressQuery = [h?.address, h?.locality, h?.city, h?.state].filter(Boolean).join(', ');
  const mapEmbedUrl = hasCoords
    ? `https://maps.google.com/maps?q=${mapLat},${mapLng}&z=15&output=embed`
    : addressQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(addressQuery)}&z=15&output=embed`
    : `https://maps.google.com/maps?q=28.6139,77.2090&z=12&output=embed`;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      padding: 20
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 'var(--radius-2xl)',
        maxWidth: 980,
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-2xl)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🤝</span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff' }}>
                Handover &amp; Return Inspection
              </h3>
              <span style={{
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 800,
                background: statusStyles.bg,
                color: statusStyles.color,
                border: `1px solid ${statusStyles.border}`
              }}>
                {statusStyles.label}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
              Handover ID: <strong>#HND-{String(handoverId).padStart(4, '0')}</strong> &bull; Recovery Ref: <strong>#REC-{String(h?.recovery_id || '').padStart(4, '0')}</strong> &bull; Item: <strong>{h?.lost_title || h?.recovery_item_name}</strong>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 18,
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--color-gray-50)',
          borderBottom: '1px solid var(--color-gray-200)',
          padding: '0 20px',
          overflowX: 'auto',
          gap: 8
        }}>
          {[
            { id: 'OVERVIEW', label: '📊 Overview & Return', count: null },
            { id: 'ITEM', label: '📦 Original & Recovery', count: null },
            { id: 'HANDOVER', label: '📍 Location & Schedule', count: null },
            { id: 'TIMELINE', label: '📜 Chronological Audit', count: handoverAuditLogs.length },
            { id: 'FEEDBACK', label: '⭐ Ratings & Reviews', count: feedbackList.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === t.id ? '3px solid #2563EB' : '3px solid transparent',
                color: activeTab === t.id ? '#2563EB' : 'var(--color-gray-600)',
                fontWeight: activeTab === t.id ? 800 : 600,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {t.label} {t.count !== null && `(${t.count})`}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 30 }}>
              <Skeleton height={30} width="40%" style={{ marginBottom: 16 }} />
              <Skeleton height={120} style={{ borderRadius: 12, marginBottom: 16 }} />
              <Skeleton height={200} style={{ borderRadius: 12 }} />
            </div>
          ) : error || !h ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#DC2626' }}>
              <div style={{ fontSize: 32 }}>⚠️</div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>{error || 'Handover not found.'}</div>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & RETURN SUMMARY */}
              {activeTab === 'OVERVIEW' && (
                <div>
                  {/* Status Card */}
                  <div style={{
                    padding: 18,
                    borderRadius: 'var(--radius-xl)',
                    background: h.handover_status === 'COMPLETED' ? '#F0FDF4' : '#F8FAFC',
                    border: `1.5px solid ${h.handover_status === 'COMPLETED' ? '#86EFAC' : '#E2E8F0'}`,
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 14
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: h.handover_status === 'COMPLETED' ? '#166534' : 'var(--color-gray-500)', textTransform: 'uppercase' }}>
                        Physical Return Status
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: h.handover_status === 'COMPLETED' ? '#15803D' : 'var(--color-gray-900)', marginTop: 2 }}>
                        {statusStyles.label}
                      </div>
                      {h.completed_at && (
                        <div style={{ fontSize: 12.5, color: '#166534', marginTop: 4 }}>
                          Completed on: <strong>{new Date(h.completed_at).toLocaleString()}</strong> by owner ({h.owner_name})
                        </div>
                      )}
                      {h.owner_verified_at && !h.completed_at && (
                        <div style={{ fontSize: 12.5, color: '#0369A1', marginTop: 4 }}>
                          Arrangements reviewed and accepted on: {new Date(h.owner_verified_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>Handover Method</div>
                      <div style={{ fontWeight: 800, color: 'var(--color-gray-900)' }}>🤝 In-Person Handover</div>
                    </div>
                  </div>

                  {/* Owner Confirmation Notes & Supporting Photo Evidence */}
                  {(h.owner_confirmation_note || h.owner_evidence_url || h.finder_feedback) && (
                    <div style={{
                      padding: 18,
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: 'var(--radius-xl)',
                      marginBottom: 20
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', marginBottom: 8 }}>
                        Return Confirmation Statement &amp; Evidence
                      </div>

                      {h.owner_confirmation_note && (
                        <div style={{ fontSize: 13.5, color: '#78350F', lineHeight: 1.5, marginBottom: 10 }}>
                          <strong>Owner Note:</strong> "{h.owner_confirmation_note}"
                        </div>
                      )}

                      {h.finder_feedback && (
                        <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5, marginBottom: 10 }}>
                          <strong>Feedback for Finder:</strong> "{h.finder_feedback}"
                        </div>
                      )}

                      {h.owner_evidence_url && (
                        <div style={{ marginTop: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E', display: 'block', marginBottom: 6 }}>
                            Supporting Receipt Photo:
                          </span>
                          <img
                            src={h.owner_evidence_url}
                            alt="Receipt Evidence"
                            onClick={() => setEnlargedPhoto(h.owner_evidence_url)}
                            style={{
                              width: 120,
                              height: 120,
                              objectFit: 'cover',
                              borderRadius: 10,
                              border: '2px solid #F59E0B',
                              cursor: 'pointer'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Finder and Owner 2-Card Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    {/* Finder Card */}
                    <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: 6 }}>
                        Finder Information
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-gray-900)' }}>{h.finder_name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--color-gray-600)', marginTop: 2 }}>📧 {h.finder_email}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--color-gray-600)', marginTop: 2 }}>
                        📞 {h.finder_phone || 'None'}
                        <span style={{ marginLeft: 6, fontSize: 11, color: h.contact_sharing_consent ? '#059669' : '#DC2626', fontWeight: 700 }}>
                          ({h.contact_sharing_consent ? 'Phone Sharing: Consented' : 'Phone Sharing: Hidden'})
                        </span>
                      </div>
                    </div>

                    {/* Owner Card */}
                    <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', marginBottom: 6 }}>
                        Original Owner Information
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-gray-900)' }}>{h.owner_name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--color-gray-600)', marginTop: 2 }}>📧 {h.owner_email}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--color-gray-600)', marginTop: 2 }}>📞 {h.owner_phone || 'None'}</div>
                    </div>
                  </div>

                  {/* Summary Location & Map Preview */}
                  <div style={{ padding: 16, background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>
                        Handover Meeting Point ({h.location_type || 'MANUAL'})
                      </div>
                      {h.schedule_date && (
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>
                          📅 Scheduled: {h.schedule_date.split('T')[0]} at {h.schedule_time || ''}
                        </div>
                      )}
                    </div>

                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-gray-900)' }}>
                      {h.location_title || 'Meeting Location'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-gray-600)', marginTop: 2 }}>
                      {h.address ? `${h.address}, ${h.locality || ''}, ${h.city || ''} ${h.postal_code || ''}` : 'Location specified via GPS coordinates'}
                    </div>

                    <div style={{ marginTop: 12, height: 220, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-gray-200)' }}>
                      <iframe
                        title="Admin Map Preview"
                        src={mapEmbedUrl}
                        width="100%"
                        height="220"
                        style={{ border: 'none' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ORIGINAL & RECOVERY DETAILS */}
              {activeTab === 'ITEM' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Left: Original Lost Item */}
                  <div style={{ background: '#F8FAFC', padding: 18, borderRadius: 'var(--radius-xl)', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', marginBottom: 10 }}>
                      Original Lost Item Report
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-gray-900)' }}>{h.lost_title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-gray-500)', marginBottom: 12 }}>
                      Category: <strong>{h.lost_category}</strong> &bull; Status: <strong>{h.lost_status}</strong>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--color-gray-700)', lineHeight: 1.5, marginBottom: 12 }}>
                      {h.lost_description || 'No description provided.'}
                    </div>

                    <div style={{ fontSize: 12.5, color: 'var(--color-gray-600)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div>📍 Lost Location: <strong>{h.lost_location}</strong></div>
                      <div>📅 Lost Date: <strong>{formatDate(h.lost_date)}</strong></div>
                      {h.lost_brand && <div>Brand: <strong>{h.lost_brand}</strong></div>}
                      {h.lost_model && <div>Model: <strong>{h.lost_model}</strong></div>}
                      {h.lost_color && <div>Color: <strong>{h.lost_color}</strong></div>}
                      {h.lost_identifying_details && <div>Marks: <strong>{h.lost_identifying_details}</strong></div>}
                    </div>

                    {/* Lost Item Photos */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>
                        Original Photos ({lostItemImages.length})
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {lostItemImages.map((img, i) => (
                          <img
                            key={i}
                            src={img.image_url}
                            alt={`Lost ${i}`}
                            onClick={() => setEnlargedPhoto(img.image_url)}
                            style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1px solid #CBD5E1' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Recovery Submission */}
                  <div style={{ background: '#F8FAFC', padding: 18, borderRadius: 'var(--radius-xl)', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: 10 }}>
                      Finder Recovery Submission
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-gray-900)' }}>{h.recovery_item_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-gray-500)', marginBottom: 12 }}>
                      Condition: <strong>{h.recovery_condition || 'Normal'}</strong> &bull; Status: <strong>{h.recovery_status}</strong>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--color-gray-700)', lineHeight: 1.5, marginBottom: 12 }}>
                      {h.recovery_location_desc || h.recovery_additional_info || 'No description provided.'}
                    </div>

                    <div style={{ fontSize: 12.5, color: 'var(--color-gray-600)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div>📍 Found Location: <strong>{h.found_location} ({h.recovery_city || '—'})</strong></div>
                      <div>📅 Found Date: <strong>{formatDate(h.found_date)}</strong></div>
                      {h.recovery_brand && <div>Brand: <strong>{h.recovery_brand}</strong></div>}
                      {h.recovery_model && <div>Model: <strong>{h.recovery_model}</strong></div>}
                      {h.recovery_color && <div>Color: <strong>{h.recovery_color}</strong></div>}
                      {h.recovery_identifying_marks && <div>Marks: <strong>{h.recovery_identifying_marks}</strong></div>}
                    </div>

                    {/* Recovery Photos */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>
                        Recovery Photos ({recoveryImages.length})
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {recoveryImages.map((img, i) => (
                          <img
                            key={i}
                            src={img.image_url}
                            alt={`Recovery ${i}`}
                            onClick={() => setEnlargedPhoto(img.image_url)}
                            style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1px solid #CBD5E1' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LOCATION & SCHEDULE */}
              {activeTab === 'HANDOVER' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <div style={{ padding: 18, background: '#F8FAFC', borderRadius: 'var(--radius-xl)', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 8 }}>
                        Location Specifications
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{h.location_title || 'Handover Point'}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                        <div><strong>Address:</strong> {h.address || 'GPS coordinates broadcast'}</div>
                        {h.locality && <div><strong>Locality:</strong> {h.locality}</div>}
                        {h.city && <div><strong>City/State:</strong> {h.city}, {h.state || ''}</div>}
                        {h.postal_code && <div><strong>PIN Code:</strong> {h.postal_code}</div>}
                        {h.landmark && <div><strong>Nearby Landmark:</strong> {h.landmark}</div>}
                        {h.additional_directions && <div><strong>Directions:</strong> {h.additional_directions}</div>}
                        {h.meeting_instructions && <div><strong>Meeting Instructions:</strong> {h.meeting_instructions}</div>}
                      </div>
                    </div>

                    <div style={{ padding: 18, background: '#F8FAFC', borderRadius: 'var(--radius-xl)', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 8 }}>
                        Schedule &amp; Contact Permissions
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-gray-700)', lineHeight: 1.6 }}>
                        <div>📅 <strong>Proposed Date:</strong> {h.schedule_date ? h.schedule_date.split('T')[0] : 'Not specified'}</div>
                        <div>⏰ <strong>Proposed Time:</strong> {h.schedule_time || 'Not specified'}</div>
                        <div>📞 <strong>Finder Phone Sharing:</strong> {h.contact_sharing_consent ? '✅ Granted (Phone: ' + (h.finder_phone || 'N/A') + ')' : '❌ Disabled by Finder (Private)'}</div>
                        <div>⏱️ <strong>Publication Time:</strong> {h.published_at ? new Date(h.published_at).toLocaleString() : 'Pending'}</div>
                        <div>✓ <strong>Owner Verified At:</strong> {h.owner_verified_at ? new Date(h.owner_verified_at).toLocaleString() : 'Awaiting owner verification'}</div>
                      </div>
                    </div>
                  </div>

                  {/* GPS Sessions Record */}
                  <div style={{ padding: 18, background: '#fff', borderRadius: 'var(--radius-xl)', border: '1px solid #E2E8F0', marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-gray-700)', textTransform: 'uppercase', marginBottom: 10 }}>
                      📡 Live GPS Location Sessions ({locationSessions.length})
                    </div>
                    {locationSessions.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--color-gray-400)' }}>No live GPS sessions recorded for this handover.</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1', color: '#475569' }}>
                            <th style={{ padding: '8px 12px' }}>Session ID</th>
                            <th style={{ padding: '8px 12px' }}>Coordinates</th>
                            <th style={{ padding: '8px 12px' }}>Accuracy</th>
                            <th style={{ padding: '8px 12px' }}>Status</th>
                            <th style={{ padding: '8px 12px' }}>Started At</th>
                            <th style={{ padding: '8px 12px' }}>Expires At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locationSessions.map(sess => (
                            <tr key={sess.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700 }}>#{sess.id}</td>
                              <td style={{ padding: '8px 12px' }}>{parseFloat(sess.latitude).toFixed(5)}, {parseFloat(sess.longitude).toFixed(5)}</td>
                              <td style={{ padding: '8px 12px' }}>{sess.accuracy ? `~${Math.round(sess.accuracy)}m` : '—'}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                                  background: sess.session_status === 'ACTIVE' ? '#DCFCE7' : '#F1F5F9',
                                  color: sess.session_status === 'ACTIVE' ? '#166534' : '#64748B'
                                }}>
                                  {sess.session_status}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px' }}>{new Date(sess.started_at).toLocaleTimeString()}</td>
                              <td style={{ padding: '8px 12px' }}>{new Date(sess.expires_at).toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: CHRONOLOGICAL AUDIT TIMELINE */}
              {activeTab === 'TIMELINE' && (
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: 16 }}>
                    Chronological Audit Trail (Database Verifiable)
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
                    {handoverAuditLogs.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--color-gray-400)' }}>No audit events logged.</div>
                    ) : (
                      handoverAuditLogs.map((log, idx) => (
                        <div key={log.id} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 14,
                          position: 'relative',
                        }}>
                          {/* Stepper Circle */}
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: '#EFF6FF',
                            color: '#2563EB',
                            border: '2px solid #3B82F6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 800,
                            flexShrink: 0
                          }}>
                            {idx + 1}
                          </div>

                          <div style={{
                            flex: 1,
                            background: '#F8FAFC',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid #E2E8F0'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--color-gray-900)' }}>
                                {log.action.replace(/_/g, ' ')}
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--color-gray-400)' }}>
                                {new Date(log.created_at).toLocaleString()}
                              </div>
                            </div>
                            {log.description && (
                              <div style={{ fontSize: 12.5, color: 'var(--color-gray-600)', marginTop: 4, lineHeight: 1.4 }}>
                                {log.description}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: 'var(--color-gray-400)', marginTop: 4 }}>
                              Actor: <strong>{log.user_name}</strong> ({log.user_role})
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: RATINGS & FEEDBACK */}
              {activeTab === 'FEEDBACK' && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: 16 }}>
                    Community Handover Feedback &amp; Star Ratings
                  </div>

                  {feedbackList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, background: '#F8FAFC', borderRadius: 'var(--radius-xl)', color: 'var(--color-gray-500)' }}>
                      <div style={{ fontSize: 32 }}>⭐</div>
                      <div style={{ fontWeight: 700, marginTop: 8 }}>No feedback submitted yet.</div>
                      <p style={{ fontSize: 13, margin: '4px 0 0' }}>Participants can rate their experience after the physical handover is completed.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {feedbackList.map((fb, idx) => (
                        <div key={idx} style={{
                          padding: 18,
                          background: '#F8FAFC',
                          borderRadius: 'var(--radius-xl)',
                          border: '1px solid #E2E8F0'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontWeight: 800, fontSize: 14 }}>
                              {fb.reviewer_name}
                            </div>
                            <div style={{ color: '#F59E0B', fontSize: 16, fontWeight: 800 }}>
                              {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)} ({fb.rating}/5)
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--color-gray-700)', lineHeight: 1.5 }}>
                            "{fb.feedback_text || 'No written comment.'}"
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-gray-400)', marginTop: 8 }}>
                            Target: {fb.target_name} &bull; {new Date(fb.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--color-gray-100)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--color-gray-50)'
        }}>
          <Button variant="secondary" onClick={onClose}>
            Close Inspection
          </Button>
        </div>
      </div>

      {/* Lightbox photo preview */}
      {enlargedPhoto && (
        <div
          onClick={() => setEnlargedPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: 24,
            cursor: 'zoom-out'
          }}
        >
          <img
            src={enlargedPhoto}
            alt="Enlarged"
            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 12, objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
};

export default HandoverInspectionModal;
