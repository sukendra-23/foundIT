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
        <div className="profile-hero-card">
          {/* Hidden file input for device/gallery upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleUploadFile(e.target.files?.[0])}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <div className="profile-hero-main">
            {/* Clickable Avatar that ENLARGES on click */}
            <div
              className="profile-avatar-wrap"
              onClick={() => setEnlargeModalOpen(true)}
              title="Click to view enlarged profile photo"
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
              <div className="profile-avatar-zoom-overlay">
                🔍
              </div>
            </div>

            <div className="profile-hero-details">
              <div className="profile-name-row">
                <h2 className="profile-hero-name">
                  {user.name}
                </h2>
                <button
                  type="button"
                  className="profile-change-photo-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload a new profile picture from your device"
                >
                  📷 Change Photo
                </button>
              </div>

              <p className="profile-hero-email">
                {user.email}
              </p>

              {/* Badges — clickable */}
              <div className="profile-hero-badges">
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
          </div>

          <div className="profile-hero-actions">
            <button
              type="button"
              className="profile-edit-btn"
              onClick={() => onNavigate('personal')}
            >
              ✏️ Edit Profile
            </button>
          </div>
        </div>

        {/* ── Info rows ─────────────────────────────────────────── */}
        <div className="profile-info-list">
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

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
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

      {/* ── Visual Activity & Recovery Analytics ────────────────────────────── */}
      <UserActivityAnalytics />
    </>
  );
};

export default ProfileOverview;
