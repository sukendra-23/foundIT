import React from 'react';

const EmptyState = ({ icon = '📭', title, description, action }) => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 'var(--space-16) var(--space-8)',
    textAlign: 'center',
    animation: 'fadeInUp 0.4s ease',
  }}>
    <div style={{
      fontSize: 52, marginBottom: 'var(--space-4)',
      lineHeight: 1,
    }}>
      {icon}
    </div>
    <h3 style={{
      fontSize: 'var(--font-size-lg)',
      fontWeight: 'var(--font-semibold)',
      color: 'var(--color-gray-800)',
      marginBottom: 'var(--space-2)',
    }}>
      {title}
    </h3>
    {description && (
      <p style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-gray-500)',
        maxWidth: 340,
        lineHeight: 1.6,
        marginBottom: action ? 'var(--space-6)' : 0,
      }}>
        {description}
      </p>
    )}
    {action}
  </div>
);

export default EmptyState;
