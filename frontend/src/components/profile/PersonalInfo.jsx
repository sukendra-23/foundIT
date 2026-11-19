import React, { useState, useRef } from 'react';
import { profileApi } from '../../services/profileApi';
import Button from '../common/Button';
import AvatarModal from './AvatarModal';

const PersonalInfo = ({ user, onUpdate, toast }) => {
  const fileInputRef = useRef(null);

  const [name, setName]               = useState(user.name || '');
  const [saving, setSaving]           = useState(false);
  const [nameErr, setNameErr]         = useState('');
  const [edited, setEdited]           = useState(false);
  const [uploadingAvatar, setUploading] = useState(false);
  const [removingAvatar, setRemoving]  = useState(false);
  const [enlargeModalOpen, setEnlargeModalOpen] = useState(false);

  const handleNameChange = (e) => {
    setName(e.target.value);
    setNameErr('');
    setEdited(e.target.value.trim() !== user.name?.trim());
  };

  // Upload avatar from device / gallery
  const handleAvatarFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Please select an image file (JPEG, PNG, or WEBP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast('Image file size must be less than 5MB.', 'error');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await profileApi.uploadAvatar(formData);
      toast(res.data.message || 'Profile picture updated successfully!', 'success');
      if (onUpdate && res.data.user) {
        onUpdate(res.data.user);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload image. Please try again.';
      toast(msg, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    try {
      setRemoving(true);
      const res = await profileApi.deleteAvatar();
      toast(res.data.message || 'Profile picture removed.', 'success');
      if (onUpdate && res.data.user) {
        onUpdate(res.data.user);
      }
    } catch (err) {
      toast('Failed to remove picture.', 'error');
    } finally {
      setRemoving(false);
    }
  };

  // Save Name
  const handleSaveName = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameErr('Name cannot be empty.');
      return;
    }
    if (trimmed.length < 2) {
      setNameErr('Name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 60) {
      setNameErr('Name must be under 60 characters.');
      return;
    }

    try {
      setSaving(true);
      const res = await profileApi.updateProfile({ name: trimmed });
      if (onUpdate && res.data.user) {
        onUpdate(res.data.user);
      }
      setEdited(false);
      toast('Name updated successfully!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update name. Please try again.';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setName(user.name || '');
    setNameErr('');
    setEdited(false);
  };

  return (
    <>
      {/* ── Enlarged Avatar Modal ─────────────────────────────────── */}
      <AvatarModal
        isOpen={enlargeModalOpen}
        onClose={() => setEnlargeModalOpen(false)}
        user={user}
        onUpload={handleAvatarFile}
        onRemove={handleRemoveAvatar}
        uploading={uploadingAvatar}
      />

      {/* ── Profile Picture Section ──────────────────────────────── */}
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">🖼️</div>
          <div>
            <div className="psc-head-title">Profile Picture</div>
            <div className="psc-head-sub">Click icon to enlarge, or use the button to upload from your device</div>
          </div>
        </div>

        <div className="psc-body">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleAvatarFile(e.target.files?.[0])}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
            {/* Clickable Avatar that ENLARGES */}
            <div
              onClick={() => setEnlargeModalOpen(true)}
              title="Click to enlarge profile picture"
              style={{
                position: 'relative',
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), #7C3AED)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                fontWeight: 800,
                boxShadow: '0 4px 18px rgba(67,97,238,0.25)',
                cursor: 'pointer',
                flexShrink: 0,
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

              {/* Hover Zoom Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: '#fff',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}
              >
                🔍
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="sm"
                  loading={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<span>📁</span>}
                >
                  Upload from Gallery / Device
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEnlargeModalOpen(true)}
                  leftIcon={<span>🔍</span>}
                >
                  Enlarge Photo
                </Button>

                {user.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={removingAvatar}
                    onClick={handleRemoveAvatar}
                    style={{ color: 'var(--color-error)' }}
                  >
                    Remove Photo
                  </Button>
                )}
              </div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                Click the profile icon to enlarge it. Use the upload button to choose a new photo.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Personal Details Section ─────────────────────────────── */}
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">✏️</div>
          <div>
            <div className="psc-head-title">Personal Information</div>
            <div className="psc-head-sub">Update your account name and review credentials</div>
          </div>
        </div>

        <form onSubmit={handleSaveName}>
          <div className="psc-body">
            {/* Name — editable */}
            <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="form-label" htmlFor="pf-name">Full Name</label>
              <input
                id="pf-name"
                className={`profile-input${nameErr ? ' error' : ''}`}
                value={name}
                onChange={handleNameChange}
                maxLength={60}
                placeholder="Your full name"
                autoComplete="name"
              />
              {nameErr && <span className="form-error">{nameErr}</span>}
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', marginTop: 4 }}>
                {name.length}/60 characters
              </span>
            </div>

            {/* Email — read-only */}
            <div className="profile-field-row">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="profile-input"
                  value={user.email}
                  readOnly
                  disabled
                />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', marginTop: 4 }}>
                  Verified via OTP in Verification tab.
                </span>
              </div>

              {/* Phone — read-only */}
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="profile-input"
                  value={user.phone || 'Not provided'}
                  readOnly
                  disabled
                />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', marginTop: 4 }}>
                  Phone is optional.
                </span>
              </div>
            </div>
          </div>

          {edited && (
            <div className="profile-action-row">
              <Button variant="ghost" size="sm" onClick={handleDiscard} type="button">
                Discard
              </Button>
              <Button variant="primary" size="sm" loading={saving} type="submit">
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* ── Account Info (read-only) ─────────────────────────────── */}
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">📋</div>
          <div>
            <div className="psc-head-title">Account Details</div>
            <div className="psc-head-sub">Read-only account metadata</div>
          </div>
        </div>
        <div style={{ padding: '0 var(--space-6)' }}>
          {[
            { label: 'Account ID',   value: `#${user.id}` },
            { label: 'Role',         value: user.role === 'ADMIN' ? '🛡️ Administrator' : '👤 User' },
            { label: 'Status',       value: <span className={`status-pill ${user.status?.toLowerCase()}`}>{user.status}</span> },
            { label: 'Member Since', value: user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="profile-info-row">
              <span className="pir-label">{label}</span>
              <span className="pir-value">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default PersonalInfo;
