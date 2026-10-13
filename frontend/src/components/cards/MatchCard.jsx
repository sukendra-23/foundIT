import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';

const MatchCard = ({ match, onStatusUpdate }) => {
  return (
    <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--color-gray-200)', boxShadow: 'var(--shadow-sm)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>✨</span>
          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Suggested Match</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gray-500)', background: 'var(--color-gray-200)', padding: '2px 8px', borderRadius: 12 }}>
          Score: {Math.round(match.score)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>

        {/* Lost Item Side */}
        <Link to={`/lost-items/${match.lost_item_id}`} style={{ textDecoration: 'none', color: 'inherit', padding: 16, borderRight: '1px solid var(--color-gray-100)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', marginBottom: 8, textTransform: 'uppercase' }}>Lost Report</div>
          {match.lost_image ? (
            <div style={{ width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <img src={match.lost_image} alt="Lost" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
             <div style={{ width: '100%', height: 120, borderRadius: 8, background: 'var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 32, opacity: 0.5 }}>🔍</div>
          )}
          <div style={{ fontWeight: 700, fontSize: 14 }}>{match.lost_title}</div>
          <div style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>{match.lost_category}</div>
        </Link>

        {/* Found Item Side */}
        <Link to={`/found-items/${match.found_item_id}`} style={{ textDecoration: 'none', color: 'inherit', padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', marginBottom: 8, textTransform: 'uppercase' }}>Found Report</div>
          {match.found_image ? (
            <div style={{ width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <img src={match.found_image} alt="Found" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
             <div style={{ width: '100%', height: 120, borderRadius: 8, background: 'var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 32, opacity: 0.5 }}>📦</div>
          )}
          <div style={{ fontWeight: 700, fontSize: 14 }}>{match.found_title}</div>
          <div style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>{match.found_category}</div>
        </Link>
      </div>

      {/* Actions */}
      <div style={{ padding: 16, display: 'flex', gap: 12, borderTop: '1px solid var(--color-gray-100)' }}>
        <Button size="sm" style={{ flex: 1 }} onClick={() => onStatusUpdate(match.id, 'CONFIRMED')}>Looks Right</Button>
        <Button size="sm" variant="secondary" style={{ flex: 1, color: 'var(--color-error)' }} onClick={() => onStatusUpdate(match.id, 'DISMISSED')}>Not a Match</Button>
      </div>
    </div>
  );
};

export default MatchCard;
