import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import ItemCard from '../components/cards/ItemCard';
import { searchApi } from '../services/itemApi';
import { Skeleton } from '../components/common/Loader';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';

  const [results, setResults] = useState({ lost: [], found: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('FOUND');

  useEffect(() => {
    if (!q) {
      setResults({ lost: [], found: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    searchApi.globalSearch(q)
      .then(res => setResults(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [q]);

  const activeItems = activeTab === 'LOST' ? results.lost : results.found;

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh' }}>
      <Navbar />
      <PageContainer style={{ paddingTop: '100px', paddingBottom: 'var(--space-16)' }}>

        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 'var(--space-8)' }}>
          Search Results for <span style={{ color: 'var(--color-primary)' }}>"{q}"</span>
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-8)', borderBottom: '1px solid var(--color-gray-200)' }}>
          <button
            onClick={() => setActiveTab('FOUND')}
            style={{
              padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 16, color: activeTab === 'FOUND' ? 'var(--color-primary)' : 'var(--color-gray-500)',
              borderBottom: activeTab === 'FOUND' ? '3px solid var(--color-primary)' : '3px solid transparent'
            }}
          >
            Found Items ({results.found.length})
          </button>
          <button
            onClick={() => setActiveTab('LOST')}
            style={{
              padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 16, color: activeTab === 'LOST' ? 'var(--color-primary)' : 'var(--color-gray-500)',
              borderBottom: activeTab === 'LOST' ? '3px solid var(--color-primary)' : '3px solid transparent'
            }}
          >
            Lost Items ({results.lost.length})
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
             {[1,2,3].map(i => <div key={i}><Skeleton height={300} style={{ borderRadius: 'var(--radius-xl)' }}/></div>)}
          </div>
        ) : activeItems.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No results found</h3>
            <p style={{ color: 'var(--color-gray-500)' }}>Try adjusting your search terms.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
            {activeItems.map(item => (
              <ItemCard key={item.id} item={item} type={activeTab} />
            ))}
          </div>
        )}

      </PageContainer>
      <Footer />
    </div>
  );
};

export default SearchResults;
