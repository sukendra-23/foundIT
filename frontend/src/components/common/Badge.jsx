import React from 'react';

const VARIANTS = {
  default: { bg: 'var(--color-gray-100)',         color: 'var(--color-gray-600)' },
  primary: { bg: 'var(--color-primary-light)',    color: 'var(--color-primary)' },
  lost:    { bg: 'var(--color-lost-light)',        color: 'var(--color-lost)' },
  found:   { bg: 'var(--color-found-light)',       color: 'var(--color-found)' },
  success: { bg: 'var(--color-success-light)',    color: 'var(--color-success)' },
  warning: { bg: 'var(--color-warning-light)',    color: 'var(--color-warning)' },
  error:   { bg: 'var(--color-error-light)',      color: 'var(--color-error)' },
};

const Badge = ({ children, variant = 'default', style }) => {
  const v = VARIANTS[variant] ?? VARIANTS.default;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'var(--font-semibold)',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      background: v.bg,
      color: v.color,
      ...style,
    }}>
      {children}
    </span>
  );
};

export default Badge;
