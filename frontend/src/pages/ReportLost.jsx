import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import ImageUploader from '../components/common/ImageUploader';
import { lostItemApi } from '../services/itemApi';
import { useToast } from '../components/common/Toast';
import './ReportForm.css';

const CATEGORIES = [
  { label: 'Electronics', icon: '📱' },
  { label: 'Wallets & Bags', icon: '👜' },
  { label: 'Keys', icon: '🔑' },
  { label: 'Documents', icon: '📄' },
  { label: 'Jewelry', icon: '💍' },
  { label: 'Clothing', icon: '👕' },
  { label: 'Other', icon: '📦' },
];

const STEPS = [
  { num: 1, label: 'Basic Info',  icon: '📋' },
  { num: 2, label: 'Details',     icon: '🔍' },
  { num: 3, label: 'Location',    icon: '📍' },
  { num: 4, label: 'Review',      icon: '✅' },
];

const ReportLost = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '', category: '', brand: '', model: '', color: '',
    description: '', identifying_details: '',
    lost_date: '', lost_time: '', location: ''
  });
  const [images, setImages] = useState([]); // Array of File objects

  const upd = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const validateStep = () => {
    if (step === 1) return formData.title.trim() && formData.category;
    if (step === 2) return formData.description.trim();
    if (step === 3) return formData.lost_date && formData.location.trim();
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key]) data.append(key, formData[key]);
      });
      images.forEach(img => {
        data.append('images', img);
      });

      await lostItemApi.create(data);
      setStep(5);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to submit report. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rf-page">
      <Navbar />

      <div className="rf-hero lost-hero">
        <div className="rf-hero-content">
          <div className="rf-hero-icon">🔍</div>
          <h1>Report a Lost Item</h1>
          <p>Fill in the details — our community will help you find it.</p>
        </div>
      </div>

      <div className="rf-body">
        {step < 5 && (
          <div className="rf-stepper">
            {STEPS.map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className={`rf-step ${step === s.num ? 'current' : step > s.num ? 'done' : ''}`}>
                  <div className="rf-step-circle">
                    {step > s.num ? '✓' : s.icon}
                  </div>
                  <span className="rf-step-label">{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`rf-step-connector ${step > s.num ? 'done' : ''}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="rf-card">

          {step === 1 && (
            <div className="rf-step-content anim-fade-in">
              <div className="rf-step-header lost-accent">
                <span className="rf-step-badge">Step 1 of 4</span>
                <h2>What did you lose?</h2>
                <p>Give us a quick snapshot of the item.</p>
              </div>

              <div className="rf-field-full">
                <Input
                  label="Item Name *"
                  placeholder="e.g. iPhone 15 Pro, Black Wallet, Airpods"
                  value={formData.title}
                  onChange={e => upd('title', e.target.value)}
                />
              </div>

              <div className="rf-category-grid">
                <label className="rf-label">Category *</label>
                <div className="rf-cats">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.label}
                      type="button"
                      className={`rf-cat-btn ${formData.category === c.label ? 'selected' : ''}`}
                      onClick={() => upd('category', c.label)}
                    >
                      <span className="rf-cat-icon">{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rf-row">
                <Input label="Brand" placeholder="e.g. Apple, Samsung" value={formData.brand} onChange={e => upd('brand', e.target.value)} />
                <Input label="Model" placeholder="e.g. 15 Pro Max" value={formData.model} onChange={e => upd('model', e.target.value)} />
                <Input label="Color" placeholder="e.g. Space Black" value={formData.color} onChange={e => upd('color', e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rf-step-content anim-fade-in">
              <div className="rf-step-header lost-accent">
                <span className="rf-step-badge">Step 2 of 4</span>
                <h2>Describe the item</h2>
                <p>More detail = faster recovery. Be specific!</p>
              </div>

              <div className="rf-field-full">
                <label className="rf-label">Description *</label>
                <textarea
                  className="rf-textarea"
                  rows={4}
                  placeholder="Describe the item in detail — condition, usage, anything notable..."
                  value={formData.description}
                  onChange={e => upd('description', e.target.value)}
                />
              </div>

              <div className="rf-field-full">
                <label className="rf-label">Identifying Details <span className="rf-optional">(optional but recommended)</span></label>
                <textarea
                  className="rf-textarea"
                  rows={3}
                  placeholder="Serial number, engravings, stickers, lock screen wallpaper, scratches, unique marks..."
                  value={formData.identifying_details}
                  onChange={e => upd('identifying_details', e.target.value)}
                />
              </div>

              <div className="rf-field-full" style={{ marginTop: '16px' }}>
                <label className="rf-label">Photos <span className="rf-optional">(Max 5 images)</span></label>
                <ImageUploader images={images} setImages={setImages} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rf-step-content anim-fade-in">
              <div className="rf-step-header lost-accent">
                <span className="rf-step-badge">Step 3 of 4</span>
                <h2>Where & when?</h2>
                <p>Tell us where you last saw it.</p>
              </div>

              <div className="rf-row">
                <Input type="date" label="Date Lost *" value={formData.lost_date} onChange={e => upd('lost_date', e.target.value)} />
                <Input type="time" label="Approximate Time" value={formData.lost_time} onChange={e => upd('lost_time', e.target.value)} />
              </div>
              <div className="rf-field-full">
                <Input
                  label="Location *"
                  placeholder="e.g. Nandi Bavan, Chamaraja Nagar — be as specific as possible"
                  value={formData.location}
                  onChange={e => upd('location', e.target.value)}
                />
              </div>

              <div className="rf-map-hint">
                <span>📌</span>
                <p>The more specific the location, the better your chances of recovery.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="rf-step-content anim-fade-in">
              <div className="rf-step-header lost-accent">
                <span className="rf-step-badge">Step 4 of 4</span>
                <h2>Review & Submit</h2>
                <p>Double-check before posting to the network.</p>
              </div>

              <div className="rf-review-card">
                <div className="rf-review-badge-row">
                  <span className="rf-type-pill lost">🔍 LOST ITEM</span>
                  <span className="rf-status-pill">OPEN</span>
                </div>

                <h3 className="rf-review-title">{formData.title}</h3>

                <div className="rf-review-grid">
                  <div className="rf-review-cell">
                    <span className="rf-cell-label">Category</span>
                    <span className="rf-cell-val">{formData.category}</span>
                  </div>
                  <div className="rf-review-cell">
                    <span className="rf-cell-label">Brand / Model</span>
                    <span className="rf-cell-val">{[formData.brand, formData.model].filter(Boolean).join(' / ') || '—'}</span>
                  </div>
                  <div className="rf-review-cell">
                    <span className="rf-cell-label">Color</span>
                    <span className="rf-cell-val">{formData.color || '—'}</span>
                  </div>
                  <div className="rf-review-cell">
                    <span className="rf-cell-label">Date / Time</span>
                    <span className="rf-cell-val">{formData.lost_date} {formData.lost_time && `at ${formData.lost_time}`}</span>
                  </div>
                  <div className="rf-review-cell rf-cell-wide">
                    <span className="rf-cell-label">📍 Location</span>
                    <span className="rf-cell-val">{formData.location}</span>
                  </div>
                  <div className="rf-review-cell rf-cell-wide">
                    <span className="rf-cell-label">Description</span>
                    <span className="rf-cell-val">{formData.description}</span>
                  </div>
                  {formData.identifying_details && (
                    <div className="rf-review-cell rf-cell-wide">
                      <span className="rf-cell-label">Identifying Details</span>
                      <span className="rf-cell-val">{formData.identifying_details}</span>
                    </div>
                  )}
                  {images.length > 0 && (
                    <div className="rf-review-cell rf-cell-wide">
                      <span className="rf-cell-label">Photos ({images.length})</span>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {images.map((img, i) => (
                          <img key={i} src={URL.createObjectURL(img)} alt="preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-gray-200)' }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="rf-success anim-fade-in">
              <div className="rf-success-anim">🎉</div>
              <h2>Lost report posted!</h2>
              <p>Your report is now live across the Lost & Found network. We hope you get it back soon!</p>
              <div className="rf-success-btns">
                <Button size="lg" onClick={() => navigate('/my-reports')}>📋 View My Reports</Button>
                <Button size="lg" variant="secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
              </div>
            </div>
          )}

          {step < 5 && (
            <div className="rf-nav">
              {step > 1
                ? <button className="rf-back-btn" onClick={() => setStep(s => s - 1)} disabled={loading}>← Back</button>
                : <div />
              }
              {step < 4
                ? <button className="rf-next-btn" onClick={() => setStep(s => s + 1)} disabled={!validateStep()}>
                    Continue →
                  </button>
                : <button className="rf-submit-btn" onClick={handleSubmit} disabled={loading || !validateStep()}>
                    {loading ? 'Uploading & Submitting...' : '🚀 Submit Report'}
                  </button>
              }
            </div>
          )}

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ReportLost;
