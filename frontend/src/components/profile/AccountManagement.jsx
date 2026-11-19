import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { profileApi } from '../../services/profileApi';
import Button from '../common/Button';

const AccountManagement = ({ user, toast }) => {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);

  /* ── Download My Data ───────────────────────────────────────── */
  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await profileApi.downloadMyData();
      const data = res.data;

      // Build a JSON blob and trigger download
      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json' }
      );
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `foundit-my-data-${user.id}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast('Your data has been downloaded.', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to download data. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  /* ── Logout ─────────────────────────────────────────────────── */
  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate('/');
    } catch {
      navigate('/');
    }
  };

  return (
    <>
      {/* ── Data & Privacy ───────────────────────────────────────── */}
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">📦</div>
          <div>
            <div className="psc-head-title">Download My Data</div>
            <div className="psc-head-sub">Export a copy of your FoundiT account data</div>
          </div>
        </div>
        <div className="psc-body">
          <div className="profile-alert info" style={{ marginBottom: 'var(--space-5)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
            <div>
              Download a JSON file containing your profile details, lost item reports,
              found item reports, claims, and recovery submissions. No sensitive data
              such as passwords or tokens is included.
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={downloading}
            onClick={handleDownload}
            leftIcon={<span>⬇️</span>}
          >
            Download My Data
          </Button>
        </div>
      </div>

      {/* ── Privacy info ─────────────────────────────────────────── */}
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">🔐</div>
          <div>
            <div className="psc-head-title">Your Privacy on FoundiT</div>
            <div className="psc-head-sub">How we protect your personal information</div>
          </div>
        </div>
        <div className="psc-body">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
          }}>
            {[
              {
                icon: '📧',
                title: 'Email Privacy',
                desc: 'Your email is never shown publicly. It is only used for OTP verification and notifications.',
              },
              {
                icon: '📱',
                title: 'Phone Privacy',
                desc: 'Your phone number is used for OTP delivery only and is never displayed to other users.',
              },
              {
                icon: '🖼️',
                title: 'Image Storage',
                desc: 'Item images are stored securely on Cloudinary with access-controlled URLs.',
              },
              {
                icon: '🔑',
                title: 'Password Security',
                desc: 'Passwords are salted and hashed with bcrypt. We never store or access plaintext passwords.',
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                background: 'var(--color-gray-50)',
                border: '1px solid var(--color-gray-100)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-4)',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-900)', marginBottom: 4 }}>
                  {title}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', lineHeight: 1.6 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Session / Logout ─────────────────────────────────────── */}
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">🚪</div>
          <div>
            <div className="psc-head-title">Session Management</div>
            <div className="psc-head-sub">Log out of your current session</div>
          </div>
        </div>
        <div className="psc-body">
          <div className="profile-alert warning" style={{ marginBottom: 'var(--space-5)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div>
              Logging out will end your current session. You will be redirected to the
              home page and will need to log in again to access your account.
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            loading={loggingOut}
            onClick={handleLogout}
            leftIcon={<span>🚪</span>}
          >
            Log Out
          </Button>
        </div>
      </div>

      {/* ── Danger Zone ──────────────────────────────────────────── */}
      <div className="profile-section-card danger-zone">
        <div className="psc-head">
          <div className="psc-head-icon">⚠️</div>
          <div>
            <div className="psc-head-title" style={{ color: 'var(--color-error)' }}>Danger Zone</div>
            <div className="psc-head-sub">Irreversible account actions</div>
          </div>
        </div>
        <div className="psc-body">
          <div className="profile-alert warning" style={{ marginBottom: 'var(--space-5)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div>
              <strong>Account deactivation</strong> is not self-service at this time.
              If you wish to deactivate or delete your account, please contact our support team.
              Your data will be handled according to our Privacy Policy.
            </div>
          </div>
          <a
            href="mailto:support@foundit.app"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              border: '2px solid var(--color-error)',
              color: 'var(--color-error)',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 'var(--font-semibold)',
              fontSize: 'var(--font-size-sm)',
              textDecoration: 'none',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-error)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-error)'; }}
          >
            📧 Contact Support
          </a>
        </div>
      </div>
    </>
  );
};

export default AccountManagement;
