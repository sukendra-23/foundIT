import React, { useState, useEffect } from 'react';
import { formatDate } from '../../utils/formatters';
import Button from '../common/Button';
import { Skeleton } from '../common/Loader';
import './RecoveryReviewModal.css';

/**
 * Helper to normalize string for comparison
 */
const normalizeText = (val) => {
  if (!val || typeof val !== 'string') return '';
  return val.trim().toLowerCase();
};

/**
 * Determine match status between lost report and found submission
 */
const getComparisonStatus = (lostVal, foundVal) => {
  const normLost = normalizeText(lostVal);
  const normFound = normalizeText(foundVal);

  if (!normLost && !normFound) {
    return { type: 'missing', label: '○ Not Provided' };
  }
  if (!normLost) {
    return { type: 'missing', label: '○ Missing in Lost Report' };
  }
  if (!normFound) {
    return { type: 'missing', label: '○ Missing in Found Report' };
  }

  if (normLost === normFound || normLost.includes(normFound) || normFound.includes(normLost)) {
    return { type: 'match', label: '✓ Consistent / Match' };
  }

  return { type: 'differ', label: '⚠️ Differing Details' };
};

const RecoveryReviewModal = ({
  isOpen,
  recoveryId,
  loading,
  data,
  onClose,
  decision,
  setDecision,
  decisionReason,
  setDecisionReason,
  adminNotes,
  setAdminNotes,
  submittingDecision,
  onSubmitDecision,
  showRevocationForm,
  setShowRevocationForm,
  revocationReason,
  setRevocationReason,
  onSubmitRevoke,
}) => {
  // Image carousels state
  const [activeLostImgIdx, setActiveLostImgIdx] = useState(0);
  const [activeFoundImgIdx, setActiveFoundImgIdx] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Reset indices when modal opens with new data
  useEffect(() => {
    setActiveLostImgIdx(0);
    setActiveFoundImgIdx(0);
    setLightboxImg(null);
  }, [recoveryId, data]);

  // Handle ESC key for closing lightbox or modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxImg) {
          setLightboxImg(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxImg, onClose]);

  if (!isOpen) return null;

  // Resolve arrays of images
  const lostImagesList = (() => {
    if (data?.lostImages && Array.isArray(data.lostImages) && data.lostImages.length > 0) {
      return data.lostImages;
    }
    if (data?.lostItemImage) {
      return [{ id: 'primary_lost', image_url: data.lostItemImage }];
    }
    return [];
  })();

  const foundImagesList = (() => {
    if (data?.images && Array.isArray(data.images) && data.images.length > 0) {
      return data.images.map(img => ({
        ...img,
        image_url: img.image_url || img.imageUrl
      }));
    }
    return [];
  })();

  const currentLostImg = lostImagesList[activeLostImgIdx] || lostImagesList[0];
  const currentFoundImg = foundImagesList[activeFoundImgIdx] || foundImagesList[0];

  // Resolve date comparison
  const lostDateObj = data?.lost_date ? new Date(data.lost_date) : null;
  const foundDateObj = data?.found_date ? new Date(data.found_date) : null;
  let dateDiffText = null;

  if (lostDateObj && foundDateObj && !isNaN(lostDateObj) && !isNaN(foundDateObj)) {
    const diffMs = foundDateObj.setHours(0,0,0,0) - lostDateObj.setHours(0,0,0,0);
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      dateDiffText = '📅 Same day: Discovered on the reported loss date';
    } else if (diffDays > 0) {
      dateDiffText = `📅 Chronology: Discovered ${diffDays} day${diffDays === 1 ? '' : 's'} after reported loss`;
    } else {
      dateDiffText = `⚠️ Note: Discovery date logged ${Math.abs(diffDays)} day(s) prior to reported loss`;
    }
  }

  // Comparison Table Attributes
  const comparisonAttributes = data ? [
    {
      attribute: 'Item Title / Name',
      lost: data.lost_title || data.lostItemTitle || '',
      found: data.item_name || data.finderItemName || '',
    },
    {
      attribute: 'Category',
      lost: data.lost_category || data.lostItemCategory || '',
      found: data.lost_category || data.lostItemCategory || '',
    },
    {
      attribute: 'Brand',
      lost: data.lost_brand || '',
      found: data.brand || '',
    },
    {
      attribute: 'Model',
      lost: data.lost_model || '',
      found: data.model || '',
    },
    {
      attribute: 'Color',
      lost: data.lost_color || '',
      found: data.color || '',
    },
    {
      attribute: 'Distinguishing Marks',
      lost: data.lost_identifying_details || '',
      found: data.identifying_marks || '',
    },
    {
      attribute: 'Incident Date',
      lost: data.lost_date ? formatDate(data.lost_date) : '',
      found: data.found_date ? formatDate(data.found_date) : '',
    },
    {
      attribute: 'Incident Location',
      lost: data.lost_location || data.lostItemLocation || '',
      found: [data.found_location || data.foundLocation, data.city || data.foundCity].filter(Boolean).join(', '),
    },
    {
      attribute: 'Description / Notes',
      lost: data.lost_description || data.lostItemDescription || '',
      found: data.additional_information || data.additionalContext || '',
    },
  ] : [];

  return (
    <div className="recovery-modal-backdrop" onClick={onClose}>
      <div className="recovery-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* ── SECTION A: Recovery Case Overview (Header Bar) ──────────────── */}
        <div className="recovery-modal-header">
          <div className="recovery-modal-header-left">
            <span className="recovery-ref-tag">
              Recovery Ref #{String(recoveryId).padStart(4, '0')}
            </span>
            <h2 className="recovery-case-title">
              Recovery Verification &amp; Comparison Workspace
            </h2>
            {data && (
              <span className={`recovery-status-pill ${(data.status || 'PENDING').toLowerCase()}`}>
                ● {data.status}
              </span>
            )}
          </div>

          <button
            type="button"
            className="recovery-close-btn"
            onClick={onClose}
            title="Close review modal (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Quick Meta Summary Bar */}
        {data && (
          <div className="recovery-summary-strip">
            <div className="recovery-summary-item">
              <span>🏷️ Item:</span>
              <strong>{data.lost_title || data.lostItemTitle || 'Untitled'}</strong>
            </div>
            <div className="recovery-summary-item">
              <span>📂 Category:</span>
              <strong>{data.lost_category || data.lostItemCategory || 'General'}</strong>
            </div>
            <div className="recovery-summary-item">
              <span>📅 Submitted:</span>
              <span>{formatDate(data.created_at)}</span>
            </div>
            {data.reviewed_at && (
              <div className="recovery-summary-item">
                <span>🕒 Last Reviewed:</span>
                <span>{formatDate(data.reviewed_at)}</span>
              </div>
            )}
            {data.reviewer_name && (
              <div className="recovery-summary-item">
                <span>👤 Reviewer:</span>
                <strong>{data.reviewer_name}</strong>
              </div>
            )}
          </div>
        )}

        {/* ── Modal Scrollable Body ───────────────────────────────────────── */}
        <div className="recovery-modal-body">
          {loading || !data ? (
            <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Skeleton height={200} />
              <Skeleton height={280} />
            </div>
          ) : (
            <>
              {/* ── SECTION B: Owner and Finder Information Panels ─────────── */}
              <div className="recovery-parties-grid">
                {/* Left: Original Owner / Lost Item Panel */}
                <div className="party-panel party-panel-owner">
                  <div className="party-header">
                    <div className="party-avatar party-avatar-owner">
                      👤
                    </div>
                    <div className="party-name-row">
                      <span className="party-role-tag owner">Original Owner / Reporter</span>
                      <h4 className="party-full-name">{data.owner_name || 'Owner Name Unavailable'}</h4>
                    </div>
                  </div>

                  <div className="party-contacts">
                    <div>
                      <strong>Email:</strong> {data.owner_email || 'Not available for this view'}
                    </div>
                    <div>
                      <strong>Phone:</strong> {data.owner_phone || 'Not available'}
                    </div>
                  </div>

                  <div className="party-item-details-box">
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      📋 Original Lost Item Report
                    </span>
                    <h5 className="party-item-title">{data.lost_title || data.lostItemTitle || '—'}</h5>

                    <div className="spec-grid">
                      <div>
                        <div className="spec-item-label">Category</div>
                        <div className="spec-item-value">{data.lost_category || data.lostItemCategory || '—'}</div>
                      </div>
                      <div>
                        <div className="spec-item-label">Brand / Model</div>
                        <div className="spec-item-value">
                          {[data.lost_brand, data.lost_model].filter(Boolean).join(' / ') || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="spec-item-label">Color</div>
                        <div className="spec-item-value">{data.lost_color || '—'}</div>
                      </div>
                      <div>
                        <div className="spec-item-label">Lost Date &amp; Time</div>
                        <div className="spec-item-value">
                          {data.lost_date ? formatDate(data.lost_date) : '—'}
                          {data.lost_time ? ` · ${data.lost_time}` : ''}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="spec-item-label">Reported Lost Location</div>
                      <div className="spec-item-value" style={{ fontSize: 13 }}>
                        📍 {data.lost_location || data.lostItemLocation || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="spec-item-label">Distinguishing Marks / Details</div>
                      <div className="spec-item-value" style={{ fontSize: 12.5, color: '#334155' }}>
                        {data.lost_identifying_details || 'None reported'}
                      </div>
                    </div>

                    {data.lost_description && (
                      <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid #E2E8F0', fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
                        <strong>Description:</strong> {data.lost_description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Finder / Found Item Submission Panel */}
                <div className="party-panel party-panel-finder">
                  <div className="party-header">
                    <div className="party-avatar party-avatar-finder">
                      🎁
                    </div>
                    <div className="party-name-row">
                      <span className="party-role-tag finder">Community Finder / Submitter</span>
                      <h4 className="party-full-name">{data.finder_name || 'Finder Name Unavailable'}</h4>
                    </div>
                  </div>

                  <div className="party-contacts">
                    <div>
                      <strong>Email:</strong> {data.finder_email || 'Not available for this view'}
                    </div>
                    <div>
                      <strong>Phone:</strong> {data.finder_phone || 'Not available'}
                    </div>
                  </div>

                  <div className="party-item-details-box">
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🎁 Finder's Submitted Item
                    </span>
                    <h5 className="party-item-title">{data.item_name || data.finderItemName || '—'}</h5>

                    <div className="spec-grid">
                      <div>
                        <div className="spec-item-label">Condition</div>
                        <div className="spec-item-value">
                          <span style={{
                            display: 'inline-block',
                            background: '#DCFCE7',
                            color: '#065F46',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 800
                          }}>
                            {data.item_condition || 'Not specified'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="spec-item-label">Brand / Model</div>
                        <div className="spec-item-value">
                          {[data.brand, data.model].filter(Boolean).join(' / ') || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="spec-item-label">Color</div>
                        <div className="spec-item-value">{data.color || '—'}</div>
                      </div>
                      <div>
                        <div className="spec-item-label">Found Date &amp; Time</div>
                        <div className="spec-item-value">
                          {data.found_date ? formatDate(data.found_date) : '—'}
                          {data.found_time ? ` · ${data.found_time}` : ''}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="spec-item-label">Found Location &amp; City</div>
                      <div className="spec-item-value" style={{ fontSize: 13 }}>
                        📍 {[data.found_location || data.foundLocation, data.city || data.foundCity].filter(Boolean).join(', ') || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="spec-item-label">Identified Marks Noted by Finder</div>
                      <div className="spec-item-value" style={{ fontSize: 12.5, color: '#334155' }}>
                        {data.identifying_marks || 'None noted'}
                      </div>
                    </div>

                    {data.location_description && (
                      <div style={{ marginTop: 2, fontSize: 12, color: '#475569' }}>
                        <strong>Landmarks / Context:</strong> {data.location_description}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── SECTION C: Large Side-by-Side Photo Comparison ─────────── */}
              <div className="recovery-section-card">
                <div className="recovery-section-title-wrap">
                  <h3 className="recovery-section-title">
                    <span>🖼️</span>
                    <span>High-Resolution Side-by-Side Photographic Comparison</span>
                  </h3>
                  <span className="recovery-section-subtitle">
                    Click any photograph to view in full-screen lightbox
                  </span>
                </div>

                <div className="photo-comparison-grid">
                  {/* Left: Owner Photos */}
                  <div className="photo-panel-wrapper">
                    <div className="photo-panel-topbar">
                      <span className="photo-panel-badge owner">Owner's Lost Report Photos</span>
                      <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                        {lostImagesList.length} {lostImagesList.length === 1 ? 'photo' : 'photos'}
                      </span>
                    </div>

                    {lostImagesList.length > 0 && currentLostImg ? (
                      <>
                        <div
                          className="photo-large-frame"
                          onClick={() => setLightboxImg({
                            url: currentLostImg.image_url,
                            title: `Owner's Lost Item Photo (${activeLostImgIdx + 1} of ${lostImagesList.length})`,
                            subtitle: `Item: ${data.lost_title || data.lostItemTitle}`
                          })}
                        >
                          <img
                            src={currentLostImg.image_url}
                            alt="Lost Item"
                          />
                          <div className="photo-zoom-hint">
                            🔍 Click to Enlarge
                          </div>
                        </div>

                        {lostImagesList.length > 1 && (
                          <div className="photo-thumb-strip">
                            {lostImagesList.map((img, idx) => (
                              <button
                                key={img.id || idx}
                                type="button"
                                className={`photo-thumb-btn ${activeLostImgIdx === idx ? 'active' : ''}`}
                                onClick={() => setActiveLostImgIdx(idx)}
                              >
                                <img src={img.image_url} alt={`Lost thumb ${idx + 1}`} />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="photo-empty-frame">
                        <span style={{ fontSize: 32, opacity: 0.5 }}>📷</span>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>
                          No Photographs Uploaded by Owner
                        </div>
                        <div style={{ fontSize: 11.5 }}>
                          The original lost item report did not contain image attachments.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Center VS Indicator */}
                  <div className="comparison-center-divider">
                    <div className="vs-badge">VS</div>
                  </div>

                  {/* Right: Finder Photos */}
                  <div className="photo-panel-wrapper">
                    <div className="photo-panel-topbar">
                      <span className="photo-panel-badge finder">Finder's Found Submission Photos</span>
                      <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                        {foundImagesList.length} {foundImagesList.length === 1 ? 'photo' : 'photos'}
                      </span>
                    </div>

                    {foundImagesList.length > 0 && currentFoundImg ? (
                      <>
                        <div
                          className="photo-large-frame"
                          onClick={() => setLightboxImg({
                            url: currentFoundImg.image_url,
                            title: `Finder's Uploaded Photo (${activeFoundImgIdx + 1} of ${foundImagesList.length})`,
                            subtitle: `Submitted Item: ${data.item_name || data.finderItemName}`
                          })}
                        >
                          <img
                            src={currentFoundImg.image_url}
                            alt="Found Item"
                          />
                          <div className="photo-zoom-hint">
                            🔍 Click to Enlarge
                          </div>
                        </div>

                        {foundImagesList.length > 1 && (
                          <div className="photo-thumb-strip">
                            {foundImagesList.map((img, idx) => (
                              <button
                                key={img.id || idx}
                                type="button"
                                className={`photo-thumb-btn ${activeFoundImgIdx === idx ? 'active' : ''}`}
                                onClick={() => setActiveFoundImgIdx(idx)}
                              >
                                <img src={img.image_url} alt={`Found thumb ${idx + 1}`} />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="photo-empty-frame">
                        <span style={{ fontSize: 32, opacity: 0.5 }}>📷</span>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#475569' }}>
                          No Photographs Uploaded by Finder
                        </div>
                        <div style={{ fontSize: 11.5 }}>
                          The finder submitted this report without attaching photographs.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── SECTION D: Item Detail Comparison Table ────────────────── */}
              <div className="recovery-section-card">
                <div className="recovery-section-title-wrap">
                  <h3 className="recovery-section-title">
                    <span>📊</span>
                    <span>Item Attribute Correlation Matrix</span>
                  </h3>
                  <span className="recovery-section-subtitle">
                    Automated alignment checks based strictly on provided records
                  </span>
                </div>

                <div className="recovery-table-wrap">
                  <table className="recovery-comparison-table">
                    <thead>
                      <tr>
                        <th style={{ width: '22%' }}>Attribute</th>
                        <th style={{ width: '32%', color: '#0369A1', background: '#F0F9FF' }}>
                          👤 Owner's Lost Report
                        </th>
                        <th style={{ width: '32%', color: '#047857', background: '#F0FDF4' }}>
                          🎁 Finder's Submission
                        </th>
                        <th style={{ width: '14%', textAlign: 'center' }}>Comparison Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonAttributes.map((row, idx) => {
                        const status = getComparisonStatus(row.lost, row.found);
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700, color: '#334155' }}>
                              {row.attribute}
                            </td>
                            <td style={{ color: '#0F172A', fontWeight: row.lost ? 600 : 400 }}>
                              {row.lost || <span style={{ color: '#94A3B8' }}>— Not specified —</span>}
                            </td>
                            <td style={{ color: '#0F172A', fontWeight: row.found ? 600 : 400 }}>
                              {row.found || <span style={{ color: '#94A3B8' }}>— Not specified —</span>}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`attr-indicator-pill ${status.type}`}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 12, fontSize: 11.5, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>ℹ️</span>
                  <span>
                    Status badges show raw string alignment between reports. The reviewing administrator makes the final verification determination.
                  </span>
                </div>
              </div>

              {/* ── SECTION E & F: Date, Location & Custody Deep-Dive ───────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Timeline & Location */}
                <div className="recovery-section-card">
                  <div className="recovery-section-title-wrap">
                    <h3 className="recovery-section-title">
                      <span>📍</span>
                      <span>Date &amp; Geographic Timeline</span>
                    </h3>
                  </div>

                  <div className="timeline-comparison-grid">
                    <div className="timeline-card lost">
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase' }}>
                        Reported Lost
                      </span>
                      <div style={{ marginTop: 4, fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>
                        {data.lost_date ? formatDate(data.lost_date) : 'Date not provided'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        {data.lost_time ? `🕒 Time: ${data.lost_time}` : 'Time unspecified'}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#334155', marginTop: 8 }}>
                        📍 {data.lost_location || data.lostItemLocation || 'Location unspecified'}
                      </div>
                    </div>

                    <div className="timeline-card found">
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                        Reported Discovered
                      </span>
                      <div style={{ marginTop: 4, fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>
                        {data.found_date ? formatDate(data.found_date) : 'Date not provided'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        {data.found_time ? `🕒 Time: ${data.found_time}` : 'Time unspecified'}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#334155', marginTop: 8 }}>
                        📍 {[data.found_location || data.foundLocation, data.city || data.foundCity].filter(Boolean).join(', ') || 'Location unspecified'}
                      </div>
                    </div>
                  </div>

                  {dateDiffText && (
                    <div style={{
                      marginTop: 14,
                      padding: '10px 14px',
                      background: '#F8FAFC',
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      fontSize: 12.5,
                      color: '#334155',
                      fontWeight: 600
                    }}>
                      {dateDiffText}
                    </div>
                  )}
                </div>

                {/* Custody and Finder's Explanation */}
                <div className="recovery-section-card">
                  <div className="recovery-section-title-wrap">
                    <h3 className="recovery-section-title">
                      <span>🔒</span>
                      <span>Finder's Statement &amp; Safe Custody</span>
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                        How The Item Was Discovered
                      </span>
                      <div style={{ fontSize: 13, color: '#0F172A', marginTop: 4, lineHeight: 1.5 }}>
                        {data.additional_information || data.additionalContext || 'No additional explanation provided by finder.'}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                          Physical Condition
                        </span>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                          {data.item_condition || 'Not specified'}
                        </div>
                      </div>

                      <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                          Current Custody
                        </span>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginTop: 2 }}>
                          Safely held by finder
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION G: Admin Review and Decision Panel ─────────────── */}
              <div className="decision-panel">
                {!['APPROVED', 'REJECTED', 'CANCELLED'].includes(data.status) ? (
                  /* Pending / Under Review Decision Form */
                  <form onSubmit={onSubmitDecision} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⚖️</span>
                        <span>Issue Administrative Determination</span>
                      </h4>
                      <span style={{ fontSize: 12, color: '#64748B' }}>
                        Reviewer determination will be permanently logged in audit trails
                      </span>
                    </div>

                    {/* Choice Selectors */}
                    <div className="decision-choice-grid">
                      <label
                        className={`decision-choice-label ${decision === 'APPROVED' ? 'approve-active' : 'inactive'}`}
                      >
                        <input
                          type="radio"
                          name="recovery_decision"
                          value="APPROVED"
                          checked={decision === 'APPROVED'}
                          onChange={() => setDecision('APPROVED')}
                          style={{ accentColor: '#059669', width: 18, height: 18 }}
                        />
                        <div>
                          <div style={{ color: decision === 'APPROVED' ? '#047857' : '#0F172A', fontWeight: 800 }}>
                            ✓ Approve Recovery
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 400, color: '#64748B', marginTop: 2 }}>
                            Authorizes match &amp; unlocks gated direct messaging between owner and finder
                          </div>
                        </div>
                      </label>

                      <label
                        className={`decision-choice-label ${decision === 'REJECTED' ? 'reject-active' : 'inactive'}`}
                      >
                        <input
                          type="radio"
                          name="recovery_decision"
                          value="REJECTED"
                          checked={decision === 'REJECTED'}
                          onChange={() => setDecision('REJECTED')}
                          style={{ accentColor: '#DC2626', width: 18, height: 18 }}
                        />
                        <div>
                          <div style={{ color: decision === 'REJECTED' ? '#991B1B' : '#0F172A', fontWeight: 800 }}>
                            ✕ Reject Recovery
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 400, color: '#64748B', marginTop: 2 }}>
                            Rejects submission due to mismatch, insufficient proof, or discrepancy
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Decision Reason Textarea */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Public Decision Reason <span style={{ color: '#EF4444' }}>*</span>{' '}
                        <span style={{ fontWeight: 400, color: '#64748B' }}>
                          (Visible to both the item owner and the community finder)
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={decisionReason}
                        onChange={(e) => setDecisionReason(e.target.value)}
                        required
                        placeholder="e.g. Serial numbers, distinctive marks, and date/location match owner records..."
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: '1px solid #CBD5E1',
                          fontSize: 13.5,
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Confidential Admin Notes */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Internal Administrator Notes{' '}
                        <span style={{ fontWeight: 400, color: '#64748B' }}>
                          (Confidential audit notes — visible only to administrators)
                        </span>
                      </label>
                      <textarea
                        rows={2}
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Optional internal audit notes..."
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: '1px solid #CBD5E1',
                          fontSize: 13.5,
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Footer Submit */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
                      <Button type="button" variant="ghost" onClick={onClose} disabled={submittingDecision}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        loading={submittingDecision}
                        style={{
                          background: decision === 'APPROVED' ? '#059669' : '#DC2626',
                          borderColor: 'transparent',
                          color: '#FFFFFF',
                          padding: '10px 28px',
                          fontWeight: 700
                        }}
                      >
                        {decision === 'APPROVED' ? 'Confirm & Approve Recovery' : 'Confirm & Reject Recovery'}
                      </Button>
                    </div>
                  </form>
                ) : data.status === 'APPROVED' ? (
                  /* Approved Recovery Banner & Revocation Action */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{
                      background: '#ECFDF5',
                      border: '1.5px solid #A7F3D0',
                      borderRadius: 12,
                      padding: '18px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 12
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>🎉</span>
                          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#065F46' }}>
                            Recovery Officially Approved
                          </h4>
                        </div>
                        <div style={{ fontSize: 13, color: '#047857', marginTop: 4 }}>
                          Direct communication between the finder and owner has been unlocked.
                        </div>
                        {data.decision_reason && (
                          <div style={{ marginTop: 10, fontSize: 13, color: '#1E293B', background: '#FFFFFF', padding: '10px 14px', borderRadius: 8, border: '1px solid #A7F3D0' }}>
                            <strong>Official Approval Reason:</strong> "{data.decision_reason}"
                          </div>
                        )}
                        {data.admin_notes && (
                          <div style={{ marginTop: 6, fontSize: 12, color: '#64748B' }}>
                            <strong>Internal Admin Note:</strong> {data.admin_notes}
                          </div>
                        )}
                        <div style={{ fontSize: 11.5, color: '#059669', marginTop: 8 }}>
                          Reviewed by {data.reviewer_name || 'Administrator'} on {formatDate(data.reviewed_at || data.updated_at)}
                        </div>
                      </div>

                      {!showRevocationForm && (
                        <button
                          type="button"
                          onClick={() => setShowRevocationForm(true)}
                          style={{
                            padding: '8px 16px',
                            background: '#FEF3C7',
                            color: '#92400E',
                            border: '1px solid #FDE68A',
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>⚠️</span>
                          <span>Revoke This Approval</span>
                        </button>
                      )}
                    </div>

                    {/* Revocation Sub-Form */}
                    {showRevocationForm && (
                      <form
                        onSubmit={onSubmitRevoke}
                        style={{
                          background: '#FFFBEB',
                          border: '1.5px solid #FDE68A',
                          borderRadius: 12,
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12
                        }}
                      >
                        <div style={{ fontWeight: 800, color: '#92400E', fontSize: 14 }}>
                          ⚠️ Revoke Recovery Approval
                        </div>
                        <p style={{ margin: 0, fontSize: 12.5, color: '#78350F' }}>
                          Revoking approval will lock communications and return the submission to a rejected/withdrawn state.
                        </p>

                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#78350F', marginBottom: 4 }}>
                            Mandatory Revocation Reason <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <textarea
                            rows={3}
                            value={revocationReason}
                            onChange={(e) => setRevocationReason(e.target.value)}
                            required
                            placeholder="State the formal justification for revoking this approval..."
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: '1px solid #FCD34D',
                              fontSize: 13,
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                          <button
                            type="button"
                            onClick={() => setShowRevocationForm(false)}
                            style={{
                              padding: '8px 16px',
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <Button
                            type="submit"
                            loading={submittingDecision}
                            style={{ background: '#D97706', borderColor: 'transparent', color: '#fff' }}
                          >
                            Confirm Revocation
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  /* Rejected or Cancelled Recovery Banner */
                  <div style={{
                    background: data.status === 'REJECTED' ? '#FEF2F2' : '#F8FAFC',
                    border: `1.5px solid ${data.status === 'REJECTED' ? '#FECACA' : '#E2E8F0'}`,
                    borderRadius: 12,
                    padding: '18px 20px'
                  }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 800,
                      color: data.status === 'REJECTED' ? '#991B1B' : '#475569'
                    }}>
                      {data.status === 'REJECTED' ? '❌ Recovery Rejected' : '⚪ Recovery Cancelled'}
                    </h4>

                    {data.decision_reason && (
                      <div style={{ marginTop: 8, fontSize: 13, color: '#334155' }}>
                        <strong>Decision Reason:</strong> "{data.decision_reason}"
                      </div>
                    )}

                    {data.admin_notes && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#64748B' }}>
                        <strong>Internal Admin Notes:</strong> {data.admin_notes}
                      </div>
                    )}

                    {data.reviewer_name && (
                      <div style={{ marginTop: 6, fontSize: 11.5, color: '#64748B' }}>
                        Decision logged by {data.reviewer_name} on {formatDate(data.reviewed_at || data.updated_at)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Lightbox Overlay (Full-Screen Image Preview) ───────────────────── */}
      {lightboxImg && (
        <div className="rec-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <div className="rec-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImg.url} alt="Enlarged" className="rec-lightbox-image" />
            <div className="rec-lightbox-caption">
              <strong>{lightboxImg.title}</strong>
              {lightboxImg.subtitle && <span> · {lightboxImg.subtitle}</span>}
            </div>
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              style={{
                position: 'fixed',
                top: 24,
                right: 24,
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                width: 40,
                height: 40,
                borderRadius: '50%',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecoveryReviewModal;
