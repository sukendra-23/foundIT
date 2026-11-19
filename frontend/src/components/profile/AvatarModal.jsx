import React, { useEffect, useRef } from 'react';
import Button from '../common/Button';

const AvatarModal = ({ isOpen, onClose, user, onUpload, onRemove, uploading }) => {
  const fileInputRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-2xl)',
          maxWidth: 420,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--color-gray-200)',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-gray-100)',
        }}>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-gray-900)' }}>
              Profile Photo
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
              {user.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-gray-100)',
              color: 'var(--color-gray-600)',
              fontSize: 16,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-gray-200)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-gray-100)'; }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Enlarged Avatar Display */}
        <div style={{
          padding: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'var(--color-gray-50)',
        }}>
          <div style={{
            width: 240,
            height: 240,
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
            border: '4px solid #fff',
            background: 'linear-gradient(135deg, var(--color-primary), #7C3AED)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 90,
            fontWeight: 800,
            userSelect: 'none',
          }}>
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              user.name?.charAt(0).toUpperCase()
            )}
          </div>

          <h4 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: 'var(--color-gray-900)', marginTop: 16 }}>
            {user.name}
          </h4>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginTop: 2 }}>
            {user.email}
          </p>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--color-gray-100)',
          background: '#fff',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<span>📷</span>}
            >
              Change Photo
            </Button>

            {user.avatar_url && onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                style={{ color: 'var(--color-error)' }}
              >
                Remove
              </Button>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AvatarModal;
