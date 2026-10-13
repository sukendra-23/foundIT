import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import ItemCard from '../components/cards/ItemCard';
import { lostItemApi, foundItemApi } from '../services/itemApi';
import { useAuth } from '../hooks/useAuth';
import { Skeleton } from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import Button from '../components/common/Button';

const MyReports = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('ALL'); // ALL, LOST, FOUND
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, type }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lostRes, foundRes] = await Promise.all([
        lostItemApi.getAll(),
        foundItemApi.getAll()
      ]);
      // Filter by current user
      setLostItems(lostRes.data.filter(i => i.user_id === user.id));
      setFoundItems(foundRes.data.filter(i => i.user_id === user.id));
    } catch (err) {
      toast('Failed to load your reports.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'LOST') {
        await lostItemApi.delete(deleteTarget.id);
        setLostItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      } else {
        await foundItemApi.delete(deleteTarget.id);
        setFoundItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      }
      toast('Report deleted successfully.', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete report.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const getFilteredItems = () => {
    let combined = [];
    if (activeTab === 'ALL' || activeTab === 'LOST') {
      combined = [...combined, ...lostItems.map(i => ({ ...i, type: 'LOST' }))];
    }
    if (activeTab === 'ALL' || activeTab === 'FOUND') {
      combined = [...combined, ...foundItems.map(i => ({ ...i, type: 'FOUND' }))];
    }
    // Sort by created_at DESC
    return combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const displayItems = getFilteredItems();

  return (
    <div style={{ background: 'var(--color-gray-50)', minHeight: '100vh' }}>
      <Navbar />
      <PageContainer style={{ paddingTop: '100px', paddingBottom: 'var(--space-16)' }}>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-gray-900)' }}>My Reports</h1>
            <p style={{ color: 'var(--color-gray-500)' }}>Manage your lost and found listings.</p>
          </div>

          <div style={{ display: 'flex', background: '#fff', padding: 4, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-gray-200)' }}>
            {['ALL', 'LOST', 'FOUND'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px', border: 'none', background: activeTab === tab ? 'var(--color-gray-100)' : 'transparent',
                  color: activeTab === tab ? 'var(--color-gray-900)' : 'var(--color-gray-500)',
                  fontWeight: activeTab === tab ? 700 : 500, borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', transition: 'all 0.2s', fontSize: 'var(--font-size-sm)'
                }}
              >
                {tab === 'ALL' ? 'All Reports' : tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
             {[1,2,3].map(i => <div key={i}><Skeleton height={300} style={{ borderRadius: 'var(--radius-2xl)' }}/></div>)}
          </div>
        ) : displayItems.length === 0 ? (
          <EmptyState
            icon="📭"
            title={`No ${activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} reports found`}
            description="You haven't created any reports in this category yet."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
            {displayItems.map(item => (
              <div key={`${item.type}-${item.id}`} style={{ position: 'relative' }}>
                <ItemCard item={item} type={item.type} />
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 6 }}>
                  {/* Delete Button (floating over image) */}
                  <button
                    onClick={(e) => { e.preventDefault(); setDeleteTarget({ id: item.id, type: item.type }); }}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', background: '#fff', border: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: 'var(--color-error)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title="Delete Report"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </PageContainer>
      <Footer />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Report?"
        message="Are you sure you want to delete this report? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default MyReports;
