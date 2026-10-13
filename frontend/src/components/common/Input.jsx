import React, { useState, forwardRef } from 'react';

const Input = forwardRef(({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  hint,
  required,
  disabled,
  leftIcon,
  rightElement,
  style,
  ...rest
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const borderColor = error
    ? 'var(--color-error)'
    : 'var(--color-gray-200)';

  const focusBorder = error
    ? 'var(--color-error)'
    : 'var(--color-primary)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {label && (
        <label style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-semibold)',
          color: 'var(--color-gray-700)',
        }}>
          {label}
          {required && <span style={{ color: 'var(--color-error)', marginLeft: 2 }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {leftIcon && (
          <span style={{
            position: 'absolute', left: 12,
            color: 'var(--color-gray-400)',
            display: 'flex', alignItems: 'center',
            pointerEvents: 'none',
          }}>
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={{
            width: '100%',
            padding: leftIcon ? '10px 40px 10px 40px' : isPassword ? '10px 44px 10px 14px' : '10px 14px',
            fontSize: 'var(--font-size-base)',
            border: `1.5px solid ${borderColor}`,
            borderRadius: 'var(--radius-lg)',
            background: disabled ? 'var(--color-gray-50)' : 'var(--color-white)',
            color: 'var(--color-gray-900)',
            transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
            outline: 'none',
          }}
          onFocus={e => {
            e.target.style.borderColor = focusBorder;
            e.target.style.boxShadow = `0 0 0 3px ${error ? 'rgba(239,68,68,0.12)' : 'rgba(67,97,238,0.12)'}`;
          }}
          onBlurCapture={e => {
            e.target.style.borderColor = borderColor;
            e.target.style.boxShadow = 'none';
            if (onBlur) onBlur(e);
          }}
          {...rest}
        />

        {/* Password toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            tabIndex={-1}
            style={{
              position: 'absolute', right: 12,
              background: 'none', border: 'none',
              cursor: 'pointer', padding: 4,
              color: 'var(--color-gray-400)',
              display: 'flex', alignItems: 'center',
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              /* Eye-off icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20C7 20 2.73 16.39 1 12a18.45 18.45 0 015.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c5 0 9.27 3.61 11 8a18.5 18.5 0 01-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              /* Eye icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}

        {/* Right element (non-password) */}
        {!isPassword && rightElement && (
          <span style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center' }}>
            {rightElement}
          </span>
        )}
      </div>

      {error  && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)',    margin: 0 }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', margin: 0 }}>{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
