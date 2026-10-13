import React, { useRef, useState } from 'react';

const ImageUploader = ({ images, setImages, existingImages = [], setRemovedImages }) => {
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');

  const MAX_IMAGES = 5;
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const totalImages = images.length + existingImages.length;

  const handleFileSelect = (e) => {
    setError('');
    const files = Array.from(e.target.files);

    if (totalImages + files.length > MAX_IMAGES) {
      setError(`You can only upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    const validFiles = [];
    for (let file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only JPG, PNG, and WEBP formats are allowed.');
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError('Each image must be smaller than 5MB.');
        continue;
      }
      validFiles.push(file);
    }

    setImages(prev => [...prev, ...validFiles]);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNewImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (publicId) => {
    if (setRemovedImages) {
      setRemovedImages(prev => [...prev, publicId]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <input
        type="file"
        multiple
        accept="image/jpeg, image/png, image/webp"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {error && <div style={{ color: 'var(--color-error)', fontSize: '13px', fontWeight: '600' }}>{error}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {/* Existing Images */}
        {existingImages.map((img) => (
          <div key={img.public_id} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-gray-200)' }}>
            <img src={img.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              type="button"
              onClick={() => removeExistingImage(img.public_id)}
              style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
            >
              ✕
            </button>
          </div>
        ))}

        {/* New Images */}
        {images.map((file, index) => (
          <div key={index} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-gray-200)' }}>
            <img src={URL.createObjectURL(file)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              type="button"
              onClick={() => removeNewImage(index)}
              style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
            >
              ✕
            </button>
          </div>
        ))}

        {/* Add Button */}
        {totalImages < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '100px', height: '100px', borderRadius: '12px', border: '2px dashed var(--color-gray-300)', background: 'var(--color-gray-50)', color: 'var(--color-gray-500)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--color-gray-300)'; e.currentTarget.style.color = 'var(--color-gray-500)'; }}
          >
            <span style={{ fontSize: '24px' }}>+</span>
            <span style={{ fontSize: '11px', fontWeight: '600' }}>Add Photo</span>
          </button>
        )}
      </div>

      <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>
        {totalImages} / {MAX_IMAGES} images selected. (Max 5MB each. JPG, PNG, WEBP)
      </div>
    </div>
  );
};

export default ImageUploader;
