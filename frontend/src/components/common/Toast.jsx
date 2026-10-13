import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const COLORS = {
    success: { bg: '#ECFDF5', border: '#10B981', color: '#065F46', icon: '✅' },
    error:   { bg: '#FEF2F2', border: '#EF4444', color: '#991B1B', icon: '❌' },
    warning: { bg: '#FFFBEB', border: '#F59E0B', color: '#92400E', icon: '⚠️' },
    info:    { bg: '#EFF6FF', border: '#3B82F6', color: '#1E40AF', icon: 'ℹ️' },
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        top: 80, right: 16,
        zIndex: 'var(--z-toast)',
        display: 'flex', flexDirection: 'column', gap: 10,
        maxWidth: 380, width: '100%',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type] ?? COLORS.info;
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 16px',
              background: c.bg,
              border: `1.5px solid ${c.border}`,
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideInRight 0.25s ease',
              pointerEvents: 'auto',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
              <p style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: c.color, lineHeight: 1.5 }}>
                {t.message}
              </p>
              <button
                onClick={() => removeToast(t.id)}
                style={{ color: c.color, opacity: 0.6, flexShrink: 0, fontSize: 16, padding: '0 2px', cursor: 'pointer', background: 'none', border: 'none' }}
              >×</button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
};
