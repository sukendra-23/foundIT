import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { profileApi } from '../services/profileApi';
import AvatarModal from '../components/profile/AvatarModal';
import './Profile.css';

// ── Section components ───────────────────────────────────────────────
import ProfileOverview         from '../components/profile/ProfileOverview';
import PersonalInfo            from '../components/profile/PersonalInfo';
import AccountVerification     from '../components/profile/AccountVerification';
import SecuritySection         from '../components/profile/SecuritySection';
import NotificationPreferences from '../components/profile/NotificationPreferences';
import PrivacySettings         from '../components/profile/PrivacySettings';
import AccountManagement       from '../components/profile/AccountManagement';

// ── Sidebar nav config ───────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview',      icon: '👤', label: 'Overview' },
  { id: 'personal',      icon: '✏️', label: 'Personal Info' },
  { id: 'verification',  icon: '🛡️', label: 'Verification' },
  { id: 'security',      icon: '🔒', label: 'Security' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'privacy',       icon: '👁️', label: 'Privacy' },
  { id: 'account',       icon: '⚙️', label: 'Account' },
];

const Profile = () => {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('overview');
  const [profileData, setProfileData]     = useState(null);
  const [loading, setLoading]             = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarModalOpen, setSidebarModalOpen] = useState(false);
  const [sidebarUploading, setSidebarUploading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await profileApi.getProfile();
      setProfileData(res.data.user);
      if (res.data.user) {
        setUser(res.data.user);
      }
    } catch (err) {
      toast('Failed to load profile. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, setUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileUpdate = (updatedUser) => {
    setProfileData(updatedUser);
    setUser(updatedUser); // sync auth context system-wide
  };

  // Avatar upload handler for modal
  const handleModalAvatarUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Please select an image file (PNG, JPG, WEBP).', 'error');
      return;
    }

    try {
      setSidebarUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await profileApi.uploadAvatar(formData);
      toast(res.data.message || 'Profile picture updated!', 'success');
      if (res.data.user) {
        handleProfileUpdate(res.data.user);
      }
    } catch (err) {
      toast('Failed to upload image.', 'error');
    } finally {
      setSidebarUploading(false);
    }
  };

  const handleModalAvatarRemove = async () => {
    try {
      const res = await profileApi.deleteAvatar();
      toast(res.data.message || 'Profile picture removed.', 'success');
      if (res.data.user) {
        handleProfileUpdate(res.data.user);
      }
    } catch {
      toast('Failed to remove picture.', 'error');
    }
  };

  const activeLabel = NAV_ITEMS.find(n => n.id === activeSection)?.label ?? '';

  const renderSection = () => {
    if (loading) return <ProfileSkeleton />;
    if (!profileData) return null;

    const props = {
      user: profileData,
      onUpdate: handleProfileUpdate,
      onNavigate: setActiveSection,
      toast,
    };

    switch (activeSection) {
      case 'overview':      return <ProfileOverview         {...props} />;
      case 'personal':      return <PersonalInfo            {...props} />;
      case 'verification':  return <AccountVerification     {...props} />;
      case 'security':      return <SecuritySection         {...props} />;
      case 'notifications': return <NotificationPreferences {...props} />;
      case 'privacy':       return <PrivacySettings         {...props} />;
      case 'account':       return <AccountManagement       {...props} />;
      default:              return null;
    }
  };

  return (
    <div className="profile-page">
      <Navbar />

      {/* Enlarged Avatar Lightbox Modal */}
      {profileData && (
        <AvatarModal
          isOpen={sidebarModalOpen}
          onClose={() => setSidebarModalOpen(false)}
          user={profileData}
          onUpload={handleModalAvatarUpload}
          onRemove={handleModalAvatarRemove}
          uploading={sidebarUploading}
        />
      )}

      <main className="profile-main page-wrapper">
        <div className="container profile-container">

          {/* ── Page Header ─────────────────────────── */}
          <div className="profile-page-header">
            <div>
              <h1 className="profile-page-title">My Profile</h1>
              <p className="profile-page-sub">Manage your account settings, verification, and preferences</p>
            </div>
          </div>

          <div className="profile-layout">
            {/* ── Sidebar ─────────────────────────────── */}
            <aside className="profile-sidebar">
              {/* Mobile: active section pill that opens nav */}
              <button
                className="profile-mobile-nav-toggle"
                onClick={() => setMobileNavOpen(o => !o)}
              >
                <span>{NAV_ITEMS.find(n => n.id === activeSection)?.icon} {activeLabel}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: mobileNavOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              <nav className={`profile-nav ${mobileNavOpen ? 'mobile-open' : ''}`}>
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.id}
                    className={`profile-nav-item ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => { setActiveSection(item.id); setMobileNavOpen(false); }}
                  >
                    <span className="pni-icon">{item.icon}</span>
                    <span className="pni-label">{item.label}</span>
                    {activeSection === item.id && <span className="pni-indicator" />}
                  </button>
                ))}
              </nav>

              {/* Quick info card with clickable avatar to ENLARGE */}
              {profileData && !loading && (
                <div className="profile-sidebar-card">
                  <div
                    className="psc-avatar"
                    onClick={() => setSidebarModalOpen(true)}
                    title="Click to enlarge profile photo"
                    style={{
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '2px solid #fff',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {profileData.avatar_url ? (
                      <img
                        src={profileData.avatar_url}
                        alt={profileData.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      profileData.name?.charAt(0).toUpperCase()
                    )}

                    {/* Subtle zoom indicator on hover */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        color: '#fff',
                        fontSize: 16,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}
                    >
                      🔍
                    </div>
                  </div>

                  <p className="psc-name">{profileData.name}</p>
                  <p className="psc-email">{profileData.email}</p>

                  <div className="psc-badges">
                    <span className={`psc-badge ${profileData.role === 'ADMIN' ? 'admin' : 'user'}`}>
                      {profileData.role === 'ADMIN' ? '🛡️ Admin' : '👤 User'}
                    </span>
                    {profileData.email_verified ? (
                      <span className="psc-badge verified">✅ Verified</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveSection('verification')}
                        className="psc-badge"
                        style={{
                          background: 'var(--color-warning-light)',
                          color: 'var(--color-warning)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        ⚠️ Unverified
                      </button>
                    )}
                  </div>
                </div>
              )}
            </aside>

            {/* ── Content ─────────────────────────────── */}
            <section className="profile-content">
              {renderSection()}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

// ── Skeleton loader ──────────────────────────────────────────────────
const ProfileSkeleton = () => (
  <div className="profile-skeleton">
    <div className="psk-header">
      <div className="skeleton" style={{ width: 72, height: 72, borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '50%', height: 22, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: '70%', height: 16 }} />
      </div>
    </div>
    <div className="skeleton" style={{ height: 1, margin: '24px 0' }} />
    {[1,2,3].map(i => (
      <div key={i} className="psk-row">
        <div className="skeleton" style={{ width: 100, height: 14 }} />
        <div className="skeleton" style={{ flex: 1, height: 42 }} />
      </div>
    ))}
  </div>
);

export default Profile;
