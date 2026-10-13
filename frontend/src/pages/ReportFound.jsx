import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import ImageUploader from '../components/common/ImageUploader';
import { foundItemApi } from '../services/itemApi';
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
  { num: 1, label: 'Basic Info', icon: '📋' },
  { num: 2, label: 'Details',    icon: '🔍' },
  { num: 3, label: 'Location',   icon: '📍' },
  { num: 4, label: 'Review',     icon: '✅' },
];

const ReportFound = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '', category: '', brand: '', model: '', color: '',
    description: '', identifying_details: '',
    found_date: '', found_time: '', location: ''
  });
  const [images, setImages] = useState([]);

  const upd = (f, v) => setFormData(p => ({ ...p, [f]: v }));

  const validateStep = () => {
    if (step === 1) return formData.title.trim() && formData.category;
    if (step === 2) return formData.description.trim();
    if (step === 3) return formData.found_date && formData.location.trim();
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

      await foundItemApi.create(data);
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

      <div className="rf-hero found-hero">
        <div className="rf-hero-content">
          <div className="rf-hero-icon">📦</div>
          <h1>Report a Found Item</h1>
          <p>Help someone reunite with their lost belongings.</p>
        </div>
      </div>

      <div className="rf-body">
        {step < 5 && (
          <div className="rf-stepper found-theme">
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

        <div className="rf-card" style={{ borderTop: step < 5 ? '4px solid var(--color-success)' : 'none' }}>

          {step === 1 && (
            <div className="rf-step-content anim-fade-in">
              <div className="rf-step-header found-accent">
                <span className="rf-step-badge found-badge">Step 1 of 4</span>
                <h2>What did you find?</h2>
                <p>Give us a quick snapshot of the found item.</p>
              </div>
              <div className="rf-field-full">
                <Input label="Item Name *" placeholder="e.g. iPhone 15, Black Wallet, Car Keys" value={formData.title} onChange={e => upd('title', e.target.value)} />
              </div>
              <div className="rf-category-grid">
                <label className="rf-label">Category *</label>
                <div className="rf-cats">
                  {CATEGORIES.map(c => (
                    <button key={c.label} type="button" className={`rf-cat-btn found-cat ${formData.category === c.label ? 'selected found-selected' : ''}`} onClick={() => upd('category', c.label)}>
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
              <div className="rf-step-header found-accent">
                <span className="rf-step-badge found-badge">Step 2 of 4</span>
                <h2>Describe the item</h2>
                <p>Help the real owner identify their item.</p>
              </div>
              <div className="rf-field-full">
                <label className="rf-label">Description *</label>
                <textarea className="rf-textarea" rows={4} placeholder="Describe what you found in detail..." value={formData.description} onChange={e => upd('description', e.target.value)} />
              </div>
              <div className="rf-field-full">
                <label className="rf-label">Identifying Details <span className="rf-optional">(keep some hints private to verify the real owner!)</span></label>
                <textarea className="rf-textarea" rows={3} placeholder="Note 1-2 general features but keep specific identifiers (like lock screen wallpaper) private..." value={formData.identifying_details} onChange={e => upd('identifying_details', e.target.value)} />
              </div>
              <div className="rf-field-full" style={{ marginTop: '16px' }}>
                <label className="rf-label">Photos <span className="rf-optional">(Max 5 images)</span></label>
                <ImageUploader images={images} setImages={setImages} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rf-step-content anim-fade-in">
              <div className="rf-step-header found-accent">
                <span className="rf-step-badge found-badge">Step 3 of 4</span>
                <h2>Where & when?</h2>
                <p>Where did you find it?</p>
              </div>
              <div className="rf-row">
                <Input type="date" label="Date Found *" value={formData.found_date} onChange={e => upd('found_date', e.target.value)} />
                <Input type="time" label="Approximate Time" value={formData.found_time} onChange={e => upd('found_time', e.target.value)} />
              </div>
              <div className="rf-field-full">
                <Input label="Location *" placeholder="e.g. Nandi Bavan, Chamaraja Nagar" value={formData.location} onChange={e => upd('location', e.target.value)} />
              </div>
              <div className="rf-map-hint found-hint">
                <span>📌</span>
                <p>Specific location helps the owner recognize and claim their item quickly.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="rf-step-content anim-fade-in">
              <div className="rf-step-header found-accent">
                <span className="rf-step-badge found-badge">Step 4 of 4</span>
                <h2>Review & Submit</h2>
                <p>Almost done! Review before posting.</p>
              </div>
              <div className="rf-review-card found-review">
                <div className="rf-review-badge-row">
                  <span className="rf-type-pill found">📦 FOUND ITEM</span>
                  <span className="rf-status-pill">OPEN</span>
                </div>
                <h3 className="rf-review-title">{formData.title}</h3>
                <div className="rf-review-grid">
                  <div className="rf-review-cell"><span className="rf-cell-label">Category</span><span className="rf-cell-val">{formData.category}</span></div>
                  <div className="rf-review-cell"><span className="rf-cell-label">Brand / Model</span><span className="rf-cell-val">{[formData.brand, formData.model].filter(Boolean).join(' / ') || '—'}</span></div>
                  <div className="rf-review-cell"><span className="rf-cell-label">Color</span><span className="rf-cell-val">{formData.color || '—'}</span></div>
                  <div className="rf-review-cell"><span className="rf-cell-label">Date / Time</span><span className="rf-cell-val">{formData.found_date} {formData.found_time && `at ${formData.found_time}`}</span></div>
                  <div className="rf-review-cell rf-cell-wide"><span className="rf-cell-label">📍 Location</span><span className="rf-cell-val">{formData.location}</span></div>
                  <div className="rf-review-cell rf-cell-wide"><span className="rf-cell-label">Description</span><span className="rf-cell-val">{formData.description}</span></div>
                  {formData.identifying_details && <div className="rf-review-cell rf-cell-wide"><span className="rf-cell-label">Identifying Details</span><span className="rf-cell-val">{formData.identifying_details}</span></div>}
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
              <div className="rf-success-anim">🌟</div>
              <h2>Found report posted!</h2>
              <p>Thank you for being a hero! Your report is now live and helping someone find their belongings.</p>
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
                ? <button className="rf-next-btn found-next" onClick={() => setStep(s => s + 1)} disabled={!validateStep()}>Continue →</button>
                : <button className="rf-submit-btn found-submit" onClick={handleSubmit} disabled={loading || !validateStep()}>{loading ? 'Uploading...' : '🌟 Submit Report'}</button>
              }
            </div>
          )}

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ReportFound;
