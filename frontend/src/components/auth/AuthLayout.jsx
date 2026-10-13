import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared layout for Login and Register pages.
 * Two-column: left = form card, right = gradient illustration panel.
 */
const AuthLayout = ({ children, title, subtitle, switchText, switchLinkText, switchLinkTo }) => (
  <div style={{
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    background: 'var(--color-white)',
  }}
    className="auth-layout-grid"
  >
    {/* ── Left: Form ── */}
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 'var(--space-10) var(--space-8)',
      overflowY: 'auto',
      minHeight: '100vh',
    }}>
      {/* Logo */}
      <Link to="/" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        textDecoration: 'none', marginBottom: 'var(--space-8)',
        alignSelf: 'flex-start',
      }}>
        <span style={{ fontSize: 22 }}>🔍</span>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-gray-900)' }}>
          Lost<span style={{ color: 'var(--color-primary)' }}>&amp;</span>Found
        </span>
      </Link>

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeInUp 0.4s ease' }}>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: 8 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-8)', fontSize: 'var(--font-size-base)' }}>
            {subtitle}
          </p>
        )}

        {children}

        {switchText && (
          <p style={{ marginTop: 'var(--space-6)', textAlign: 'center', color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
            {switchText}{' '}
            <Link to={switchLinkTo} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              {switchLinkText}
            </Link>
          </p>
        )}
      </div>
    </div>

    {/* ── Right: Gradient Panel ── */}
    <div style={{
      background: 'linear-gradient(135deg, #4361EE 0%, #7C3AED 50%, #EC4899 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-10)',
      position: 'relative', overflow: 'hidden',
    }}
      className="auth-right-panel"
    >
      {/* Decorative blobs */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', top: '50%', left: -80, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

      <div style={{ position: 'relative', textAlign: 'center', color: 'var(--color-white)', maxWidth: 380, animation: 'fadeIn 0.6s ease' }}>
        <div style={{ fontSize: 72, marginBottom: 24, lineHeight: 1 }}>🔍</div>
        <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-white)', marginBottom: 16, lineHeight: 1.2 }}>
          Reuniting People with Their Belongings
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, fontSize: 'var(--font-size-base)' }}>
          Join thousands of people who have successfully recovered their lost items through our community platform.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-6)', marginTop: 'var(--space-8)' }}>
          {[['📦', 'Items Listed'], ['🤝', 'Items Returned'], ['👥', 'Active Users']].map(([emoji, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <style>{`
      @media (max-width: 768px) {
        .auth-layout-grid { grid-template-columns: 1fr !important; }
        .auth-right-panel { display: none !important; }
      }
    `}</style>
  </div>
);

export default AuthLayout;
