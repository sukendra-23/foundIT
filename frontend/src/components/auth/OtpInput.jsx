import React, { useRef } from 'react';

/**
 * 6-box OTP input component.
 * - Auto-advances on digit entry
 * - Backspace goes to previous box
 * - Supports paste of full 6-digit OTP
 */
const OtpInput = ({ value, onChange, disabled, error }) => {
  const digits = Array(6).fill('');
  const values = value.split('').slice(0, 6);
  const refs = useRef([]);

  const handleChange = (idx, e) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1); // only digits
    const newVal = values.slice();
    newVal[idx] = char;
    const combined = newVal.join('').padEnd(idx + (char ? 1 : 0), '').slice(0, 6);
    // Build full string
    const arr = Array(6).fill('');
    combined.split('').forEach((c, i) => { arr[i] = c; });
    onChange(arr.join(''));
    if (char && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (!values[idx] && idx > 0) {
        const newArr = values.slice();
        newArr[idx - 1] = '';
        onChange(newArr.join(''));
        refs.current[idx - 1]?.focus();
      } else {
        const newArr = values.slice();
        newArr[idx] = '';
        onChange(newArr.join(''));
      }
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(text.padEnd(6, '').slice(0, 6));
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const borderColor = error ? 'var(--color-error)' : 'var(--color-gray-300)';
  const focusBorder = error ? 'var(--color-error)' : 'var(--color-primary)';

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {digits.map((_, idx) => (
          <input
            key={idx}
            ref={el => refs.current[idx] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={values[idx] || ''}
            onChange={e => handleChange(idx, e)}
            onKeyDown={e => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            disabled={disabled}
            style={{
              width: 48, height: 56,
              textAlign: 'center',
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 700,
              border: `2px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              background: disabled ? 'var(--color-gray-50)' : 'var(--color-white)',
              color: 'var(--color-gray-900)',
              outline: 'none',
              transition: 'all var(--transition-fast)',
              caretColor: 'var(--color-primary)',
            }}
            onFocus={e => {
              e.target.style.borderColor = focusBorder;
              e.target.style.boxShadow = `0 0 0 3px ${error ? 'rgba(239,68,68,0.12)' : 'rgba(67,97,238,0.12)'}`;
              e.target.select();
            }}
            onBlur={e => {
              e.target.style.borderColor = borderColor;
              e.target.style.boxShadow = 'none';
            }}
          />
        ))}
      </div>
      {error && (
        <p style={{ textAlign: 'center', color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default OtpInput;
