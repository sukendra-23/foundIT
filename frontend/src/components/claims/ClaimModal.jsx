import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import { useToast } from '../common/Toast';
import { claimApi } from '../../services/claimApi';

const ClaimModal = ({ item, isOpen, onClose, onSuccess }) => {
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    claim_reason: '',
    ownership_details: '',
    identifying_marks: '',
    lost_date_claimed: '',
    lost_location_claimed: '',
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [agreed, setAgreed] = useState(false);

  if (!isOpen || !item) return null;

  const handleInputChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > 3) {
      toast('Maximum 3 evidence files allowed.', 'error');
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    for (const file of selected) {
      if (file.size > 5 * 1024 * 1024) {
        toast(`File ${file.name} exceeds 5MB limit.`, 'error');
        continue;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setFiles(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.ownership_details || form.ownership_details.trim().length < 15) {
      errs.ownership_details = 'Please provide detailed ownership proof (at least 15 characters).';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      toast('Please confirm that you are the rightful owner.', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('found_item_id', item.id);
      formData.append('claim_reason', form.claim_reason);
      formData.append('ownership_details', form.ownership_details);
      formData.append('identifying_marks', form.identifying_marks);
      if (form.lost_date_claimed) formData.append('lost_date_claimed', form.lost_date_claimed);
      if (form.lost_location_claimed) formData.append('lost_location_claimed', form.lost_location_claimed);

      files.forEach(file => {
        formData.append('evidence', file);
      });

      const res = await claimApi.create(formData);
      toast('Claim submitted successfully! Finder and Admin review initiated.', 'success');
      onSuccess?.(res.data.claimId);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit claim. Please try again.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 'var(--radius-2xl)',
        maxWidth: 620,
        width: '100%',
        boxShadow: 'var(--shadow-2xl)',
        border: '1px solid var(--color-gray-200)',
        overflow: 'hidden',
        animation: 'fadeInUp 0.25s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-gray-100)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--color-gray-50)'
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Phase 6 Ownership Verification
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-gray-900)', margin: '2px 0 0 0' }}>
              Claim "{item.title}"
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 22, color: 'var(--color-gray-400)',
              cursor: 'pointer', padding: 4, borderRadius: 6
            }}
          >
            ✕
          </button>
        </div>

        {/* Stepper Indicator */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-gray-100)', background: '#fff' }}>
          {[
            { num: 1, label: '1. Ownership Proof' },
            { num: 2, label: '2. Evidence Photos' },
            { num: 3, label: '3. Review & Submit' }
          ].map(s => (
            <div
              key={s.num}
              style={{
                flex: 1,
                padding: '12px 8px',
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: step === s.num ? 'var(--color-primary)' : (step > s.num ? 'var(--color-success)' : 'var(--color-gray-400)'),
                borderBottom: step === s.num ? '2px solid var(--color-primary)' : '2px solid transparent',
                background: step === s.num ? 'var(--color-primary-light)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Item to Claim</div>
                <div style={{ fontWeight: 800, color: 'var(--color-gray-900)', fontSize: 14 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--color-gray-600)', marginTop: 2 }}>📍 Found at {item.location} &nbsp;·&nbsp; Category: {item.category}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-gray-800)', marginBottom: 6 }}>
                  Why does this item belong to you? <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. I left my brown leather wallet on the bench near library"
                  value={form.claim_reason}
                  onChange={handleInputChange('claim_reason')}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-gray-300)', fontSize: 14
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-gray-800)', marginBottom: 6 }}>
                  Detailed Ownership Description <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <p style={{ fontSize: 12, color: 'var(--color-gray-500)', margin: '0 0 6px 0' }}>
                  Describe specific contents, scratches, unique features, serial numbers, or purchase details that only the true owner would know.
                </p>
                <textarea
                  rows={4}
                  placeholder="Detailed description proving your ownership..."
                  value={form.ownership_details}
                  onChange={handleInputChange('ownership_details')}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    border: errors.ownership_details ? '1px solid var(--color-error)' : '1px solid var(--color-gray-300)',
                    fontSize: 14, fontFamily: 'inherit'
                  }}
                />
                {errors.ownership_details && (
                  <span style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 4, display: 'block' }}>
                    {errors.ownership_details}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 4 }}>
                    Approx. Date Lost
                  </label>
                  <input
                    type="date"
                    value={form.lost_date_claimed}
                    onChange={handleInputChange('lost_date_claimed')}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 4 }}>
                    Approx. Location Lost
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Science Block, 2nd Floor"
                    value={form.lost_location_claimed}
                    onChange={handleInputChange('lost_location_claimed')}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 4 }}>
                  Secret Identifying Marks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Small red sticker inside, scratch near top-left"
                  value={form.identifying_marks}
                  onChange={handleInputChange('identifying_marks')}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-300)', fontSize: 13 }}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: 'rgba(67, 97, 238, 0.06)',
                border: '1px solid rgba(67, 97, 238, 0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 18px',
                fontSize: 13,
                color: 'var(--color-gray-700)',
                lineHeight: 1.5
              }}>
                🔒 <strong>Private Evidence Upload</strong><br />
                Attach purchase invoices, older photographs of the item in your possession, or receipt screenshots.
                <div style={{ fontSize: 11, color: 'var(--color-gray-500)', marginTop: 4 }}>
                  Maximum 3 files (JPG, PNG, WEBP), up to 5MB each. Strictly accessible only to the finder and reviewing administrator.
                </div>
              </div>

              {/* Upload Drop Zone */}
              {files.length < 3 && (
                <label style={{
                  border: '2px dashed var(--color-gray-300)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--color-gray-50)',
                  transition: 'all 0.2s'
                }}>
                  <span style={{ fontSize: 32 }}>📁</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                    Choose Evidence Photos or Documents
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-gray-400)' }}>
                    JPG, PNG, or WEBP (Max 5MB)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}

              {/* Previews */}
              {previews.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gray-700)', marginBottom: 8 }}>
                    Attached Evidence ({previews.length}/3)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {previews.map((src, idx) => (
                      <div key={idx} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height: 90, border: '1px solid var(--color-gray-200)' }}>
                        <img src={src} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          style={{
                            position: 'absolute', top: 4, right: 4, width: 22, height: 22,
                            borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff',
                            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-xl)', padding: 18, border: '1px solid var(--color-gray-200)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 800, color: 'var(--color-gray-900)' }}>
                  Summary of Claim
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div><strong>Item:</strong> {item.title}</div>
                  <div><strong>Reason:</strong> {form.claim_reason || 'Ownership assertion'}</div>
                  <div><strong>Ownership Details:</strong> {form.ownership_details}</div>
                  {form.identifying_marks && <div><strong>Identifying Marks:</strong> {form.identifying_marks}</div>}
                  {form.lost_date_claimed && <div><strong>Date Lost:</strong> {form.lost_date_claimed}</div>}
                  <div><strong>Evidence Files Attached:</strong> {files.length} document(s)</div>
                </div>
              </div>

              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 16px',
                fontSize: 12,
                color: '#991B1B',
                lineHeight: 1.5
              }}>
                ⚠️ <strong>Legal & Ownership Notice:</strong><br />
                Submitting fraudulent claims for items that do not belong to you violates platform policies and is subject to account ban and referral to authorities.
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--color-gray-800)', marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>I certify that I am the legal owner of this item and the information provided is accurate and truthful.</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-gray-100)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--color-gray-50)'
        }}>
          {step > 1 ? (
            <Button variant="secondary" size="sm" onClick={() => setStep(s => s - 1)}>
              ← Back
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button size="sm" onClick={() => {
              if (step === 1 && validateStep1()) setStep(2);
              else if (step === 2) setStep(3);
            }}>
              Next Step →
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} loading={loading} disabled={!agreed}>
              Confirm & Submit Claim
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimModal;
