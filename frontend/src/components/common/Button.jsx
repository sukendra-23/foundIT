import React from 'react';

const VARIANTS = {
  primary:   { bg: 'var(--color-primary)',    color: '#fff',                     border: 'var(--color-primary)',    hoverBg: 'var(--color-primary-dark)' },
  secondary: { bg: 'transparent',             color: 'var(--color-primary)',     border: 'var(--color-primary)',    hoverBg: 'var(--color-primary-light)' },
  danger:    { bg: 'var(--color-error)',       color: '#fff',                     border: 'var(--color-error)',      hoverBg: '#dc2626' },
  ghost:     { bg: 'transparent',             color: 'var(--color-gray-600)',    border: 'transparent',             hoverBg: 'var(--color-gray-100)' },
  success:   { bg: 'var(--color-success)',    color: '#fff',                     border: 'var(--color-success)',    hoverBg: '#059669' },
};

const SIZES = {
  sm: { padding: '7px 16px',  fontSize: 'var(--font-size-sm)',  gap: '6px'  },
  md: { padding: '10px 22px', fontSize: 'var(--font-size-base)',gap: '8px'  },
  lg: { padding: '13px 30px', fontSize: 'var(--font-size-lg)', gap: '10px' },
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  type = 'button',
  onClick,
  style,
  ...rest
}) => {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const s = SIZES[size] ?? SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 'var(--font-semibold)',
        borderRadius: 'var(--radius-lg)',
        border: `2px solid ${isDisabled ? 'var(--color-gray-200)' : v.border}`,
        background: isDisabled ? 'var(--color-gray-100)' : v.bg,
        color: isDisabled ? 'var(--color-gray-400)' : v.color,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition-base)',
        width: fullWidth ? '100%' : 'auto',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <span style={{
          width: 16, height: 16,
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.7s linear infinite',
          flexShrink: 0,
        }} />
      ) : leftIcon ? (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{leftIcon}</span>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
