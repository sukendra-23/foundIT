import React, { useRef, useState } from 'react';
import { profileApi } from '../../services/profileApi';
import AvatarModal from './AvatarModal';
import UserActivityAnalytics from './UserActivityAnalytics';

const ProfileOverview = ({ user, onUpdate, onNavigate, toast }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [enlargeModalOpen, setEnlargeModalOpen] = useState(false);

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
    : '—';

  // Handle avatar upload from device / gallery
  const handleUploadFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Please select an image file (PNG, JPG, WEBP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast('Image file size must be under 5MB.', 'error');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await profileApi.uploadAvatar(formData);
      toast(res.data.message || 'Profile picture updated!', 'success');
      if (onUpdate && res.data.user) {
        onUpdate(res.data.user);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to upload photo.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const res = await profileApi.deleteAvatar();
      toast(res.data.message || 'Profile picture removed.', 'success');
      if (onUpdate && res.data.user) {
        onUpdate(res.data.user);
      }
    } catch {
      toast('Failed to remove photo.', 'error');
    }
  };

  return (
    <>
      {/* ── Enlarged Avatar Modal ─────────────────────────────────── */}
      <AvatarModal
        isOpen={enlargeModalOpen}
        onClose={() => setEnlargeModalOpen(false)}
        user={user}
        onUpload={handleUploadFile}
        onRemove={handleRemovePhoto}
        uploading={uploading}
      />

      {/* ── Hero Card ─────────────────────────────────────────────── */}
      <div className="profile-section-card">
        <div style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', flexWrap: 'wrap' }}>

            {/* Hidden file input for device/gallery upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleUploadFile(e.target.files?.[0])}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {/* Clickable Avatar that ENLARGES on click */}
            <div
              onClick={() => setEnlargeModalOpen(true)}
              title="Click to view enlarged profile photo"
              style={{
                position: 'relative',
                width: 84,
                height: 84,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), #7C3AED)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 34,
                fontWeight: 800,
                boxShadow: '0 6px 20px rgba(67,97,238,0.3)',
                flexShrink: 0,
                cursor: 'pointer',
                overflow: 'hidden',
                border: '3px solid #fff',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                user.name?.charAt(0).toUpperCase()
              )}

              {/* Hover Enlarge badge overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  fontSize: 22,
                  color: '#fff',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}
              >
                🔍
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-gray-900)' }}>
                  {user.name}
                </h2>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-primary)',
                    background: 'var(--color-primary-light)',
                    border: '1px solid var(--color-primary-muted)',
                    borderRadius: 'var(--radius-full)',
                    padding: '3px 10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Upload a new profile picture from your device"
                >
                  📷 Change Photo
                </button>
              </div>

              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', marginBottom: 10 }}>
                {user.email}
              </p>

              {/* Badges — clickable */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="status-pill active">✅ Active Account</span>

                {user.email_verified ? (
                  <span className="status-pill verified">📧 Email Verified</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate('verification')}
                    className="status-pill unverified"
                    style={{ border: 'none', cursor: 'pointer', fontWeight: 700 }}
                    title="Click to verify email with OTP"
                  >
                    ⚠️ Unverified Email (Click to Verify)
                  </button>
                )}

                {user.role === 'ADMIN' && (
                  <span className="status-pill" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                    🛡️ Administrator
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigate('personal')}
              style={{
                padding: '10px 20px',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 'var(--font-semibold)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              ✏️ Edit Profile
            </button>
          </div>
        </div>

        {/* ── Info rows ─────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--color-gray-100)', padding: '0 var(--space-6)' }}>
          {[
            { label: 'Full Name',     value: user.name },
            { label: 'Email Address', value: user.email },
            { label: 'Phone Number',  value: user.phone || '—' },
            { label: 'Account Role',  value: user.role === 'ADMIN' ? 'Administrator' : 'User' },
            { label: 'Member Since',  value: memberSince },
          ].map(({ label, value }) => (
            <div key={label} className="profile-info-row">
              <span className="pir-label">{label}</span>
              <span className="pir-value">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Actions (View & Upload Photo removed as requested) ─────────── */}
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">⚡</div>
          <div>
            <div className="psc-head-title">Quick Actions</div>
            <div className="psc-head-sub">Common settings and shortcuts</div>
          </div>
        </div>
        <div className="psc-body">
          <div className="profile-quick-actions">
            {[
              { icon: '✏️', label: 'Edit Info',      action: () => onNavigate('personal') },
              { icon: '🔒', label: 'Security',       action: () => onNavigate('security') },
              { icon: '🛡️', label: 'Verification',   action: () => onNavigate('verification') },
              { icon: '🔔', label: 'Notifications',  action: () => onNavigate('notifications') },
              { icon: '👁️', label: 'Privacy',        action: () => onNavigate('privacy') },
              { icon: '⚙️', label: 'Account',        action: () => onNavigate('account') },
            ].map(({ icon, label, action }) => (
              <button key={label} className="pqa-btn" onClick={action}>
                <span className="pqa-icon">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Visual Activity & Recovery Analytics (in place of My Activity) ── */}
      <UserActivityAnalytics />
    </>
  );
};

export default ProfileOverview;
