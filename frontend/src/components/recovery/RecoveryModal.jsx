import React, { useState, useRef, useCallback } from 'react';
import { recoveryApi } from '../../services/recoveryApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Item Details', icon: '📋' },
  { label: 'Photographs', icon: '📷' },
  { label: 'Date & Location', icon: '📍' },
  { label: 'Extra Info', icon: '💬' },
  { label: 'Review & Submit', icon: '✅' },
];

const MAX_FILES = 5;
const MAX_MB = 5;
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const validateFile = (file) => {
  if (!ACCEPTED.includes(file.type)) return 'Only JPG, PNG, and WebP images are allowed.';
  if (file.size > MAX_MB * 1024 * 1024) return `${file.name} exceeds the ${MAX_MB}MB size limit.`;
  return null;
};

const statusColor = {
  PENDING: '#F59E0B',
  UNDER_REVIEW: '#3B82F6',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  CANCELLED: '#6B7280',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StepBar = ({ current }) => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
    {STEPS.map((s, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            minWidth: 60,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: done ? '#10B981' : active ? '#4361EE' : '#E2E8F0',
              color: done || active ? '#fff' : '#94A3B8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: done ? 14 : 13, fontWeight: 800,
              transition: 'all 0.25s',
            }}>
              {done ? '✓' : s.icon}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: active ? '#4361EE' : done ? '#10B981' : '#94A3B8',
              whiteSpace: 'nowrap', textAlign: 'center',
            }}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              width: 32, height: 2,
              background: done ? '#10B981' : '#E2E8F0',
              marginBottom: 20, flexShrink: 0,
              transition: 'background 0.25s',
            }} />
          )}
        </div>
      );
    })}
  </div>
);

const Field = ({ label, required, children, hint }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
      {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
    </label>
    {children}
    {hint && <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{hint}</p>}
  </div>
);

const Input = (props) => (
  <input {...props} style={{
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: '#FAFAFA',
    transition: 'border-color 0.15s',
    ...(props.style || {}),
  }}
    onFocus={e => e.target.style.borderColor = '#4361EE'}
    onBlur={e => e.target.style.borderColor = '#E2E8F0'}
  />
);

const Textarea = (props) => (
  <textarea {...props} style={{
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', background: '#FAFAFA', resize: 'vertical', minHeight: 90,
    ...(props.style || {}),
  }}
    onFocus={e => e.target.style.borderColor = '#4361EE'}
    onBlur={e => e.target.style.borderColor = '#E2E8F0'}
  />
);

// ─── Main Modal ───────────────────────────────────────────────────────────────

const RecoveryModal = ({ item, isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [declared, setDeclared] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newRecoveryId, setNewRecoveryId] = useState(null);
  const fileInputRef = useRef();
  const [photoError, setPhotoError] = useState('');

  // Form state
  const [form, setForm] = useState({
    finderItemName: '',
    brand: '',
    model: '',
    color: '',
    distinguishingMarks: '',
    foundDate: '',
    foundTime: '',
    foundLocation: '',
    foundCity: '',
    locationDescription: '',
    additionalContext: '',
    itemCondition: 'GOOD',
    safeCustodyDetails: '',
  });
  const [photos, setPhotos] = useState([]); // { file, preview }[]

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  // ── Photo handling ─────────────────────────────────────────────────────
  const addFiles = useCallback((files) => {
    setPhotoError('');
    const remaining = MAX_FILES - photos.length;
    if (remaining <= 0) { setPhotoError(`Maximum ${MAX_FILES} photos allowed.`); return; }
    const toAdd = Array.from(files).slice(0, remaining);
    const errors = [];
    const valid = [];
    for (const f of toAdd) {
      const err = validateFile(f);
      if (err) errors.push(err);
      else valid.push({ file: f, preview: URL.createObjectURL(f) });
    }
    if (errors.length) setPhotoError(errors[0]);
    setPhotos(prev => [...prev, ...valid]);
  }, [photos.length]);

  const removePhoto = (idx) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  // ── Validation per step ────────────────────────────────────────────────
  const validateStep = () => {
    if (step === 0 && !form.finderItemName.trim()) return 'Please enter the item name.';
    if (step === 2) {
      if (!form.foundDate) return 'Please enter the date you found the item.';
      if (!form.foundLocation.trim()) return 'Please enter the location where you found the item.';
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { setSubmitError(err); return; }
    setSubmitError('');
    setStep(s => s + 1);
  };

  const back = () => { setSubmitError(''); setStep(s => s - 1); };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!declared) { setSubmitError('Please confirm the declaration before submitting.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const fd = new FormData();
      fd.append('lost_item_id', item.id);
      fd.append('lostItemId', item.id);
      fd.append('item_name', form.finderItemName);
      fd.append('finderItemName', form.finderItemName);
      if (form.brand) fd.append('brand', form.brand);
      if (form.model) fd.append('model', form.model);
      if (form.color) fd.append('color', form.color);
      if (form.distinguishingMarks) {
        fd.append('identifying_marks', form.distinguishingMarks);
        fd.append('distinguishingMarks', form.distinguishingMarks);
      }
      fd.append('found_date', form.foundDate);
      fd.append('foundDate', form.foundDate);
      if (form.foundTime) {
        fd.append('found_time', form.foundTime);
        fd.append('foundTime', form.foundTime);
      }
      fd.append('found_location', form.foundLocation);
      fd.append('foundLocation', form.foundLocation);
      if (form.foundCity) {
        fd.append('city', form.foundCity);
        fd.append('foundCity', form.foundCity);
      }
      if (form.locationDescription) {
        fd.append('location_description', form.locationDescription);
        fd.append('locationDescription', form.locationDescription);
      }
      fd.append('item_condition', form.itemCondition || 'GOOD');
      fd.append('itemCondition', form.itemCondition || 'GOOD');

      const extraInfo = [
        form.additionalContext,
        form.safeCustodyDetails ? `Safe Custody: ${form.safeCustodyDetails}` : ''
      ].filter(Boolean).join('\n\n');
      if (extraInfo) {
        fd.append('additional_information', extraInfo);
        fd.append('additionalInformation', extraInfo);
        fd.append('additionalContext', extraInfo);
      }

      photos.forEach(p => {
        fd.append('photos', p.file);
      });

      const res = await recoveryApi.create(fd);
      const createdId = res.data.recoveryId || res.data.data?.id;
      setNewRecoveryId(createdId);
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission failed. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    photos.forEach(p => URL.revokeObjectURL(p.preview));
    setStep(0);
    setSubmitting(false);
    setSubmitError('');
    setDeclared(false);
    setSubmitted(false);
    setNewRecoveryId(null);
    setPhotos([]);
    setForm({
      finderItemName: '', brand: '', model: '', color: '', distinguishingMarks: '',
      foundDate: '', foundTime: '', foundLocation: '', foundCity: '', locationDescription: '',
      additionalContext: '', itemCondition: 'GOOD', safeCustodyDetails: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  // ── Step content ───────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div>
          <div style={{
            background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20,
          }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1E40AF', marginBottom: 6 }}>
              📋 Reference: Lost Item Details
            </p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1E3A8A' }}>{item.title}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#3B82F6' }}>
              {item.category} {item.brand ? `· ${item.brand}` : ''} {item.color ? `· ${item.color}` : ''}
            </p>
          </div>

          <Field label="Item Name (as you found it)" required>
            <Input
              placeholder="e.g., Black leather wallet"
              value={form.finderItemName}
              onChange={e => set('finderItemName', e.target.value)}
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Brand / Make">
              <Input placeholder="e.g., Louis Vuitton" value={form.brand} onChange={e => set('brand', e.target.value)} />
            </Field>
            <Field label="Model / Series">
              <Input placeholder="e.g., Damier Ebene" value={form.model} onChange={e => set('model', e.target.value)} />
            </Field>
            <Field label="Color">
              <Input placeholder="e.g., Dark brown" value={form.color} onChange={e => set('color', e.target.value)} />
            </Field>
            <Field label="Distinguishing Marks">
              <Input placeholder="e.g., Monogram initials" value={form.distinguishingMarks} onChange={e => set('distinguishingMarks', e.target.value)} />
            </Field>
          </div>
        </div>
      );

      case 1: return (
        <div>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            Upload clear photos of the item you found. Up to {MAX_FILES} photos, {MAX_MB}MB each. These will help the admin verify your submission.
          </p>

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => photos.length < MAX_FILES && fileInputRef.current?.click()}
            style={{
              border: '2px dashed #BFDBFE', borderRadius: 12, padding: '28px 20px',
              textAlign: 'center', cursor: photos.length < MAX_FILES ? 'pointer' : 'not-allowed',
              background: '#F0F9FF', marginBottom: 16, transition: 'border-color 0.15s',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>
              {photos.length < MAX_FILES ? 'Drag & drop or click to browse' : 'Maximum photos reached'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6B7280' }}>
              {photos.length}/{MAX_FILES} photos · JPG, PNG, WebP · Max {MAX_MB}MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED.join(',')}
              multiple
              style={{ display: 'none' }}
              onChange={e => addFiles(e.target.files)}
            />
          </div>

          {photoError && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>⚠️ {photoError}</p>}

          {/* Preview grid */}
          {photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', paddingTop: '100%', background: '#F1F5F9' }}>
                  <img src={p.preview} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => removePhoto(i)}
                    style={{
                      position: 'absolute', top: 4, right: 4, width: 22, height: 22,
                      borderRadius: '50%', background: 'rgba(0,0,0,0.65)', color: '#fff',
                      border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      case 2: return (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Date Found" required>
              <Input type="date" value={form.foundDate} max={new Date().toISOString().split('T')[0]} onChange={e => set('foundDate', e.target.value)} />
            </Field>
            <Field label="Approximate Time">
              <Input type="time" value={form.foundTime} onChange={e => set('foundTime', e.target.value)} />
            </Field>
          </div>
          <Field label="Location Found" required>
            <Input placeholder="e.g., Near Main Library entrance" value={form.foundLocation} onChange={e => set('foundLocation', e.target.value)} />
          </Field>
          <Field label="City / Area">
            <Input placeholder="e.g., Bangalore" value={form.foundCity} onChange={e => set('foundCity', e.target.value)} />
          </Field>
          <Field label="Location Description" hint="Describe the exact spot in more detail.">
            <Textarea
              placeholder="e.g., Found on the bench near the coffee cart on the second floor…"
              value={form.locationDescription}
              onChange={e => set('locationDescription', e.target.value)}
            />
          </Field>
        </div>
      );

      case 3: return (
        <div>
          <Field label="How did you find it?" hint="Describe the circumstances under which you discovered the item.">
            <Textarea
              placeholder="e.g., I noticed it tucked under a bench while waiting for the bus…"
              value={form.additionalContext}
              onChange={e => set('additionalContext', e.target.value)}
            />
          </Field>
          <Field label="Item Condition">
            <select
              value={form.itemCondition}
              onChange={e => set('itemCondition', e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 14, background: '#FAFAFA' }}
            >
              <option value="EXCELLENT">Excellent – No visible damage</option>
              <option value="GOOD">Good – Minor wear only</option>
              <option value="FAIR">Fair – Some visible damage</option>
              <option value="POOR">Poor – Significant damage</option>
            </select>
          </Field>
          <Field label="Safe Custody Details" hint="Where is the item currently being kept?">
            <Textarea
              placeholder="e.g., Handed to the campus security office, receipt number 2341…"
              value={form.safeCustodyDetails}
              onChange={e => set('safeCustodyDetails', e.target.value)}
            />
          </Field>
        </div>
      );

      case 4: return (
        <div>
          <div style={{
            background: '#F8FAFF', border: '1px solid #DBEAFE',
            borderRadius: 10, padding: '14px 16px', marginBottom: 20,
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800, color: '#1E40AF' }}>📋 Recovery Summary</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  ['Item Name', form.finderItemName],
                  ['Brand / Model', [form.brand, form.model].filter(Boolean).join(' / ') || '—'],
                  ['Color', form.color || '—'],
                  ['Found Date', form.foundDate ? `${form.foundDate}${form.foundTime ? ' at ' + form.foundTime : ''}` : '—'],
                  ['Found Location', [form.foundLocation, form.foundCity].filter(Boolean).join(', ') || '—'],
                  ['Condition', form.itemCondition],
                  ['Photos', `${photos.length} photo${photos.length !== 1 ? 's' : ''}`],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td style={{ padding: '5px 8px 5px 0', fontWeight: 600, color: '#374151', width: '40%' }}>{label}</td>
                    <td style={{ padding: '5px 0', color: '#1E3A8A' }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
            <input
              type="checkbox"
              checked={declared}
              onChange={e => setDeclared(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <span>
              I confirm that I have genuinely found this item and all information provided is accurate and truthful.
              I understand that providing false information may result in account suspension.
            </span>
          </label>
        </div>
      );

      default: return null;
    }
  };

  // ── Success view ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={overlayStyle} onClick={handleClose}>
        <div style={{ ...modalStyle, maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontWeight: 800, color: '#064E3B', marginBottom: 8 }}>Recovery Submitted!</h2>
          <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            Your recovery report has been submitted. The item owner and admin have been notified.
            You can track the status in <strong>My Recoveries</strong>.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => { handleClose(); onSuccess(newRecoveryId); }}
              style={btnPrimary}
            >
              View My Submission →
            </button>
            <button onClick={handleClose} style={btnSecondary}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontWeight: 800, color: '#0F172A', fontSize: 18, margin: 0 }}>
              🎁 Report Found Item
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
              Matching: <strong>{item.title}</strong>
            </p>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280', padding: '4px 8px' }}>
            ✕
          </button>
        </div>

        <StepBar current={step} />

        {/* Body */}
        <div style={{ minHeight: 300 }}>
          {renderStep()}
        </div>

        {/* Error */}
        {submitError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginTop: 12 }}>
            ⚠️ {submitError}
          </div>
        )}

        {/* Footer Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
          <button
            onClick={step === 0 ? handleClose : back}
            style={btnSecondary}
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button onClick={next} style={btnPrimary}>
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !declared}
              style={{ ...btnPrimary, opacity: submitting || !declared ? 0.6 : 1, cursor: submitting || !declared ? 'not-allowed' : 'pointer' }}
            >
              {submitting ? 'Submitting…' : '🎁 Submit Recovery'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const overlayStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 10000, padding: 16,
};

const modalStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: '28px 28px 24px',
  width: '100%',
  maxWidth: 580,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
};

const btnPrimary = {
  padding: '10px 22px', borderRadius: 8,
  background: '#4361EE', color: '#fff',
  border: 'none', fontWeight: 700, fontSize: 14,
  cursor: 'pointer',
};

const btnSecondary = {
  padding: '10px 20px', borderRadius: 8,
  background: '#F1F5F9', color: '#374151',
  border: 'none', fontWeight: 600, fontSize: 14,
  cursor: 'pointer',
};

export default RecoveryModal;
