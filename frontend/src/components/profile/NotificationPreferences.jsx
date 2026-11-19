import React, { useState } from 'react';
import Button from '../common/Button';

const NotificationPreferences = ({ toast }) => {
  // Saved in localStorage since DB schema has no notification_preferences column
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('lf_notification_prefs');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      emailClaimUpdates: true,
      emailRecoveryUpdates: true,
      emailNewMatches: true,
      emailWeeklyDigest: false,
      browserMessages: true,
      browserClaimAlerts: true,
    };
  });

  const [saving, setSaving] = useState(false);

  const toggle = (key) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      try {
        localStorage.setItem('lf_notification_prefs', JSON.stringify(prefs));
        toast('Notification preferences saved locally.', 'success');
      } catch (_) {
        toast('Failed to save preferences.', 'error');
      } finally {
        setSaving(false);
      }
    }, 400);
  };

  return (
    <>
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">🔔</div>
          <div>
            <div className="psc-head-title">Notification Preferences</div>
            <div className="psc-head-sub">Choose which notifications and alerts you receive</div>
          </div>
        </div>

        <div className="psc-body">
          <div className="profile-alert info" style={{ marginBottom: 'var(--space-5)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
            <div>
              <strong>Email & Real-time Alerts:</strong> Critical system emails (such as login OTPs and password resets)
              are always sent. You can customize informational notifications below.
            </div>
          </div>

          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
            Email Notifications
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            {[
              {
                key: 'emailClaimUpdates',
                title: 'Claim Status Updates',
                desc: 'Get notified when an administrator or finder reviews your claim.',
              },
              {
                key: 'emailRecoveryUpdates',
                title: 'Recovery Submissions',
                desc: 'Alerts when someone submits a found recovery match for your lost item.',
              },
              {
                key: 'emailNewMatches',
                title: 'Item Match Suggestions',
                desc: 'Receive alerts when our system detects a potential match for your reports.',
              },
              {
                key: 'emailWeeklyDigest',
                title: 'Platform Activity Digest',
                desc: 'Occasional summaries of recently resolved lost and found reports.',
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
                    checked={!!prefs[key]}
                    onChange={() => toggle(key)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', inset: 0,
                    background: prefs[key] ? 'var(--color-primary)' : 'var(--color-gray-300)',
                    borderRadius: 24,
                    transition: 'all 0.2s',
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: 2, left: prefs[key] ? 22 : 2,
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

          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
            In-App & Message Notifications
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              {
                key: 'browserMessages',
                title: 'New In-App Chat Messages',
                desc: 'Show unread badge and alerts when another user messages you about an item.',
              },
              {
                key: 'browserClaimAlerts',
                title: 'Verification & Match Badges',
                desc: 'Display real-time notifications in the top bar bell icon.',
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
                    checked={!!prefs[key]}
                    onChange={() => toggle(key)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', inset: 0,
                    background: prefs[key] ? 'var(--color-primary)' : 'var(--color-gray-300)',
                    borderRadius: 24,
                    transition: 'all 0.2s',
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: 2, left: prefs[key] ? 22 : 2,
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
            Preferences are saved for this device/browser.
          </span>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </div>
    </>
  );
};

export default NotificationPreferences;
