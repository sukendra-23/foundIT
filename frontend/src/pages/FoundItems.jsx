import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import ItemCard from '../components/cards/ItemCard';
import { foundItemApi } from '../services/itemApi';
import { Skeleton } from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';

const FoundItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQ, setSearchQ] = useState('');
  const [category, setCategory] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(searchQ), 500);
    return () => clearTimeout(timer);
  }, [searchQ]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (debouncedQ) params.q = debouncedQ;
    if (category) params.category = category;

    foundItemApi.getAll(params)
      .then(res => setItems(res.data))
      .catch(err => setError('Failed to load found items. Please try again later.'))
      .finally(() => setLoading(false));
  }, [debouncedQ, category]);

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh' }}>
      <Navbar />
      <PageContainer style={{ paddingTop: '100px', paddingBottom: 'var(--space-16)' }}>
        <div style={{ marginBottom: 'var(--space-10)', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: 8 }}>
            Found Items
          </h1>
          <p style={{ color: 'var(--color-gray-500)', maxWidth: 600, margin: '0 auto', fontSize: 'var(--font-size-base)' }}>
            Browse through items that have been found by the community. See if someone has found what you lost.
          </p>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search found items..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-300)' }}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-300)', background: '#fff' }}
          >
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Wallets & Bags">Wallets & Bags</option>
            <option value="Keys">Keys</option>
            <option value="Documents">Documents</option>
            <option value="Clothing">Clothing</option>
            <option value="Jewelry">Jewelry</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 'var(--radius-2xl)', overflow: 'hidden' }}>
                <Skeleton height={200} />
                <div style={{ padding: 'var(--space-5)' }}>
                  <Skeleton height={16} width={80} style={{ marginBottom: 12 }} />
                  <Skeleton height={24} width="90%" style={{ marginBottom: 20 }} />
                  <Skeleton height={16} width="70%" style={{ marginBottom: 8 }} />
                  <Skeleton height={16} width="50%" style={{ marginBottom: 20 }} />
                  <Skeleton height={40} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-error)', background: 'var(--color-error-light)', borderRadius: 'var(--radius-xl)' }}>
            {error}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="🎉"
            title="No found items reported yet"
            description="There are currently no found items in the network."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
            {items.map(item => <ItemCard key={item.id} item={item} type="FOUND" />)}
          </div>
        )}
      </PageContainer>
      <Footer />
    </div>
  );
};

export default FoundItems;
