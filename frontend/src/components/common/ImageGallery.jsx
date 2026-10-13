import React, { useState } from 'react';

const ImageGallery = ({ images, isLost }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div style={{ width: '100%', height: 320, background: 'var(--color-gray-100)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--color-gray-200)' }}>
        <span style={{ fontSize: 64, opacity: 0.3, marginBottom: 12 }}>{isLost ? '🔍' : '📦'}</span>
        <span style={{ color: 'var(--color-gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No Image Uploaded</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#000', borderBottom: '1px solid var(--color-gray-200)' }}>
      {/* Main Image */}
      <div style={{ width: '100%', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={images[activeIndex].image_url}
          alt="Item"
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 8, padding: 12, overflowX: 'auto', background: '#111' }}>
          {images.map((img, idx) => (
            <button
              key={img.public_id}
              onClick={() => setActiveIndex(idx)}
              style={{
                width: 60, height: 60, flexShrink: 0, padding: 0,
                border: activeIndex === idx ? '2px solid var(--color-primary)' : '2px solid transparent',
                borderRadius: 8, overflow: 'hidden', cursor: 'pointer', opacity: activeIndex === idx ? 1 : 0.6,
                transition: 'all 0.2s'
              }}
            >
              <img src={img.image_url} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
