import React, { useState } from 'react';
import Button from '../common/Button';

const PrivacySettings = ({ toast }) => {
  const [privacy, setPrivacy] = useState(() => {
    try {
      const saved = localStorage.getItem('lf_privacy_settings');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      hideFullName: false,
      maskPhone: true,
      allowDirectMessages: true,
      showActivityStats: true,
    };
  });

  const [saving, setSaving] = useState(false);

  const toggle = (key) => {
    setPrivacy(p => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      try {
        localStorage.setItem('lf_privacy_settings', JSON.stringify(privacy));
        toast('Privacy settings updated.', 'success');
      } catch (_) {
        toast('Failed to save settings.', 'error');
      } finally {
        setSaving(false);
      }
    }, 400);
  };

  return (
    <>
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">👁️</div>
          <div>
            <div className="psc-head-title">Privacy Settings</div>
            <div className="psc-head-sub">Control your visibility and communication preferences</div>
          </div>
        </div>

        <div className="psc-body">
          <div className="profile-alert info" style={{ marginBottom: 'var(--space-5)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🛡️</span>
            <div>
              <strong>FoundiT Privacy Guarantee:</strong> Your contact details (phone, email address) are
              never publicly exposed on item listings. Communication occurs strictly through authenticated in-app messaging.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              {
                key: 'hideFullName',
                title: 'Abbreviate Display Name',
                desc: 'Display your first name and initial only (e.g., "John D.") on public listings.',
              },
              {
                key: 'maskPhone',
                title: 'Strict Phone Privacy',
                desc: 'Ensure phone number is never shared even during authorized recovery handovers.',
              },
              {
                key: 'allowDirectMessages',
                title: 'Allow Direct Item Inquiries',
                desc: 'Permit users with valid claims or recovery reports to message you regarding your items.',
              },
              {
                key: 'showActivityStats',
                title: 'Public Community Badges',
                desc: 'Show helpful finder/returner community badges on your public report summaries.',
              },
            ].map(({ key, title, desc }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-gray-50)',
                  border: '1px solid var(--color-gray-100)',
                }}
              >
                <div style={{ paddingRight: 'var(--space-4)' }}>
                  <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-900)' }}>
                    {title}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginTop: 2 }}>
                    {desc}
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!privacy[key]}
                    onChange={() => toggle(key)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', inset: 0,
                    background: privacy[key] ? 'var(--color-primary)' : 'var(--color-gray-300)',
                    borderRadius: 24,
                    transition: 'all 0.2s',
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: 2, left: privacy[key] ? 22 : 2,
                      width: 20, height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'all 0.2s',
                    }} />
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="profile-action-row">
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
            Settings apply to client-side display preferences.
          </span>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
            Save Privacy Settings
          </Button>
        </div>
      </div>
    </>
  );
};

export default PrivacySettings;
