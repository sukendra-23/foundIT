import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/formatters';
import './ItemCard.css';

const ItemCard = ({ item, type }) => {
  const isLost = type === 'LOST';
  const detailUrl = isLost ? `/lost-items/${item.id}` : `/found-items/${item.id}`;
  const dateStr = isLost ? item.lost_date : item.found_date;
  const timeStr = isLost ? item.lost_time : item.found_time;

  return (
    <div className="item-card anim-fade-in-up">
      {/* Image Placeholder */}
      <div className="item-card-image">
        {item.images && item.images.length > 0 ? (
          <img src={item.images[0].image_url} alt={item.title} className="item-card-img-actual" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="image-placeholder">
            <span className="image-icon">{isLost ? '🔍' : '📦'}</span>
            <span className="image-text">No image available</span>
          </div>
        )}
        <div className="item-card-badges">
          <span className={`type-badge ${isLost ? 'lost' : 'found'}`}>
            {isLost ? 'LOST' : 'FOUND'}
          </span>
          <StatusBadge status={item.status} />
        </div>
      </div>

      <div className="item-card-content">
        <div className="item-card-category">{item.category}</div>
        <h3 className="item-card-title">{item.title}</h3>

        <div className="item-card-details">
          <div className="detail-row">
            <span className="detail-icon">📍</span>
            <span className="detail-text">{item.location}</span>
          </div>
          <div className="detail-row">
            <span className="detail-icon">📅</span>
            <span className="detail-text">{formatDate(dateStr)} {timeStr && `at ${timeStr.slice(0,5)}`}</span>
          </div>
        </div>

        <Link to={detailUrl} className="item-card-btn">
          View Details →
        </Link>
      </div>
    </div>
  );
};

export default ItemCard;
