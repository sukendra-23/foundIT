import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import MatchCard from '../components/cards/MatchCard';
import { matchApi } from '../services/itemApi';
import { Skeleton } from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

const MyMatches = () => {
  const toast = useToast();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    try {
      const res = await matchApi.getMyMatches();
      setMatches(res.data);
    } catch (err) {
      toast('Failed to load matches.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await matchApi.updateStatus(id, status);
      setMatches(prev => prev.filter(m => m.id !== id));
      toast(status === 'CONFIRMED' ? 'Match saved for reference!' : 'Match dismissed.', 'success');
    } catch (err) {
      toast('Failed to update match.', 'error');
    }
  };

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh' }}>
      <Navbar />
      <PageContainer style={{ paddingTop: '100px', paddingBottom: 'var(--space-16)' }}>

        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: 8 }}>
            My Matches
          </h1>
          <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-base)' }}>
            System-suggested matches between your reports and other items in the network.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
             {[1,2,3].map(i => <div key={i}><Skeleton height={280} style={{ borderRadius: 'var(--radius-xl)' }}/></div>)}
          </div>
        ) : matches.length === 0 ? (
          <EmptyState
            icon="✨"
            title="No new matches"
            description="We haven't found any new potential matches for your items yet. We'll keep looking!"
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
            {matches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}

      </PageContainer>
      <Footer />
    </div>
  );
};

export default MyMatches;
