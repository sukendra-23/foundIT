import React, { useState } from 'react';
import { profileApi } from '../../services/profileApi';
import Button from '../common/Button';

// ── Password strength calculator ─────────────────────────────────────
const getStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const map = [
    { label: '',          color: 'transparent' },
    { label: 'Very Weak', color: '#EF4444' },
    { label: 'Weak',      color: '#F97316' },
    { label: 'Fair',      color: '#F59E0B' },
    { label: 'Strong',    color: '#10B981' },
    { label: 'Very Strong', color: '#059669' },
  ];
  return { score, ...map[score] };
};

const EyeIcon = ({ open }) => open
  ? <span>👁️</span>
  : <span style={{ opacity: 0.5 }}>👁️</span>;

const SecuritySection = ({ toast }) => {
  const [form, setForm]   = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow]   = useState({ current: false, new: false, confirm: false });
  const [errors, setErrs] = useState({});
  const [saving, setSaving] = useState(false);

  const strength = getStrength(form.newPassword);

  const toggle = (field) => setShow(s => ({ ...s, [field]: !s[field] }));

  const validate = () => {
    const e = {};
    if (!form.currentPassword)                        e.currentPassword = 'Current password is required.';
    if (!form.newPassword)                            e.newPassword = 'New password is required.';
    else if (form.newPassword.length < 8)             e.newPassword = 'Password must be at least 8 characters.';
    if (!form.confirmPassword)                        e.confirmPassword = 'Please confirm your new password.';
    else if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    if (form.currentPassword === form.newPassword && form.newPassword)
      e.newPassword = 'New password must be different from your current password.';
    return e;
  };

  const handleChange = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    setErrs(e => ({ ...e, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrs(errs);
      return;
    }

    try {
      setSaving(true);
      await profileApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      toast('Password changed successfully!', 'success');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrs({});
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password. Please try again.';
      if (msg.toLowerCase().includes('current') || msg.toLowerCase().includes('incorrect')) {
        setErrs({ currentPassword: msg });
      } else {
        toast(msg, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* ── Change Password ───────────────────────────────────────── */}
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">🔒</div>
          <div>
            <div className="psc-head-title">Change Password</div>
            <div className="psc-head-sub">Keep your account secure with a strong password</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="psc-body">
            <div className="profile-alert info" style={{ marginBottom: 'var(--space-5)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
              <span>Use at least 8 characters with a mix of letters, numbers and symbols for best security.</span>
            </div>

            {/* Current Password */}
            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label" htmlFor="sec-cur">Current Password</label>
              <div className="pw-input-wrap">
                <input
                  id="sec-cur"
                  type={show.current ? 'text' : 'password'}
                  className={`profile-input${errors.currentPassword ? ' error' : ''}`}
                  value={form.currentPassword}
                  onChange={e => handleChange('currentPassword', e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" className="pw-toggle-btn" onClick={() => toggle('current')}>
                  <EyeIcon open={show.current} />
                </button>
              </div>
              {errors.currentPassword && <span className="form-error">{errors.currentPassword}</span>}
            </div>

            {/* New Password */}
            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label" htmlFor="sec-new">New Password</label>
              <div className="pw-input-wrap">
                <input
                  id="sec-new"
                  type={show.new ? 'text' : 'password'}
                  className={`profile-input${errors.newPassword ? ' error' : ''}`}
                  value={form.newPassword}
                  onChange={e => handleChange('newPassword', e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" className="pw-toggle-btn" onClick={() => toggle('new')}>
                  <EyeIcon open={show.new} />
                </button>
              </div>
              {errors.newPassword && <span className="form-error">{errors.newPassword}</span>}

              {/* Strength bar */}
              {form.newPassword && (
                <>
                  <div className="pw-strength-bar">
                    <div
                      className="pw-strength-fill"
                      style={{
                        width: `${(strength.score / 5) * 100}%`,
                        background: strength.color,
                      }}
                    />
                  </div>
                  <span className="pw-strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="sec-confirm">Confirm New Password</label>
              <div className="pw-input-wrap">
                <input
                  id="sec-confirm"
                  type={show.confirm ? 'text' : 'password'}
                  className={`profile-input${errors.confirmPassword ? ' error' : ''}`}
                  value={form.confirmPassword}
                  onChange={e => handleChange('confirmPassword', e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" className="pw-toggle-btn" onClick={() => toggle('confirm')}>
                  <EyeIcon open={show.confirm} />
                </button>
              </div>
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
            </div>
          </div>

          <div className="profile-action-row">
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
              After changing, you'll stay logged in on this device.
            </span>
            <Button variant="primary" size="sm" type="submit" loading={saving}>
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* ── Security Tips ──────────────────────────────────────────── */}
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">💡</div>
          <div>
            <div className="psc-head-title">Security Tips</div>
            <div className="psc-head-sub">Best practices to keep your account safe</div>
          </div>
        </div>
        <div className="psc-body">
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              '🔑 Use a unique password you don\'t use on other sites.',
              '📏 Make it at least 12 characters for strong security.',
              '🔤 Mix uppercase, lowercase, numbers and symbols.',
              '🚫 Never share your password with anyone.',
              '📧 Contact support if you notice suspicious activity.',
            ].map((tip, i) => (
              <li key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-gray-700)',
              }}>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};

export default SecuritySection;
