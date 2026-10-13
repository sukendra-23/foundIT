import React from 'react';

const StatusBadge = ({ status }) => {
  let config = { bg: '#F1F5F9', color: '#64748B', label: status };

  switch (status) {
    case 'OPEN':
      config = { bg: '#E0E7FF', color: '#4361EE', label: 'OPEN' }; // Primary
      break;
    case 'MATCHED':
      config = { bg: '#FEF3C7', color: '#D97706', label: 'MATCHED' }; // Warning
      break;
    case 'RETURNED':
      config = { bg: '#D1FAE5', color: '#059669', label: 'RETURNED' }; // Success
      break;
    case 'CLOSED':
      config = { bg: '#F1F5F9', color: '#64748B', label: 'CLOSED' }; // Gray
      break;
    case 'PENDING':
      config = { bg: '#FEF3C7', color: '#B45309', label: 'PENDING' };
      break;
    case 'FINDER_REVIEW':
      config = { bg: '#E0E7FF', color: '#3730A3', label: 'FINDER REVIEW' };
      break;
    case 'ADMIN_REVIEW':
      config = { bg: '#EDE9FE', color: '#6D28D9', label: 'ADMIN REVIEW' };
      break;
    case 'APPROVED':
      config = { bg: '#D1FAE5', color: '#047857', label: 'APPROVED' };
      break;
    case 'REJECTED':
      config = { bg: '#FEE2E2', color: '#B91C1C', label: 'REJECTED' };
      break;
    case 'WITHDRAWN':
      config = { bg: '#F1F5F9', color: '#475569', label: 'WITHDRAWN' };
      break;
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      background: config.bg,
      color: config.color,
      borderRadius: 'var(--radius-full)',
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
