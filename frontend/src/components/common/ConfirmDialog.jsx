import React from 'react';
import Button from './Button';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', confirmVariant = 'primary' }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 'var(--space-4)'
    }}>
      <div className="anim-scale-in" style={{
        background: '#fff', borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-6)', maxWidth: 400, width: '100%',
        boxShadow: 'var(--shadow-2xl)'
      }}>
        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, marginBottom: 8, color: 'var(--color-gray-900)' }}>
          {title}
        </h3>
        <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
