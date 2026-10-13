import React from 'react';

/** Full-page centered spinner */
export const PageLoader = () => (
  <div style={{
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--color-white)',
    zIndex: 9999,
  }}>
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44,
        border: '4px solid var(--color-primary-light)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>Loading...</p>
    </div>
  </div>
);

/** Inline spinner */
export const Spinner = ({ size = 20, color = 'var(--color-primary)' }) => (
  <div style={{
    width: size, height: size,
    border: `3px solid rgba(67,97,238,0.2)`,
    borderTopColor: color,
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
    flexShrink: 0,
  }} />
);

/** Skeleton shimmer block */
export const Skeleton = ({ width = '100%', height = 20, borderRadius = 'var(--radius-md)', style }) => (
  <div className="skeleton" style={{ width, height, borderRadius, ...style }} />
);

export default PageLoader;
