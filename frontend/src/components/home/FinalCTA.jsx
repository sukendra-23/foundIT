import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const FinalCTA = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="foundit-section foundit-section-muted" style={{ padding: '90px 0' }} id="get-started">
      <div className="foundit-container">
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 28,
            padding: '64px 32px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 45px -12px rgba(0, 0, 0, 0.06)'
          }}
        >
          {/* Subtle Ambient Background Accent Glows (Pink + Emerald) */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            left: '-50px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: '#FDA4AF',
            filter: 'blur(80px)',
            opacity: 0.35,
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-50px',
            right: '-50px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: '#A7F3D0',
            filter: 'blur(80px)',
            opacity: 0.35,
            pointerEvents: 'none'
          }} />

          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 700,
            color: '#0F172A',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 20
          }}>
            <span>✨</span>
            <span>Join the FoundiT Community</span>
          </div>

          {/* Headline */}
          <h2 style={{
            fontSize: 'clamp(28px, 4.5vw, 44px)',
            fontWeight: 800,
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
            margin: '0 auto 16px',
            maxWidth: '780px',
            color: '#0F172A'
          }}>
            Every Lost Item Has a Story. <br />
            <span style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #F43F5E 55%, #10B981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Help It Find Its Way Back.
            </span>
          </h2>

          {/* Supporting Description */}
          <p style={{
            fontSize: 'clamp(15px, 2vw, 17px)',
            color: '#64748B',
            lineHeight: 1.7,
            maxWidth: '680px',
            margin: '0 auto 36px'
          }}>
            Whether you've misplaced something important or found an item that belongs to someone else, FoundiT helps people connect through a structured and verified recovery process.
          </p>

          {/* Main Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 32
          }}>
            <Link
              to={isAuthenticated ? '/report-lost' : '/login'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                background: '#0F172A',
                color: '#FFFFFF',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14.5,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.2)';
              }}
            >
              <span>😟</span>
              <span>Report a Lost Item</span>
            </Link>

            <Link
              to={isAuthenticated ? '/report-found' : '/login'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                background: '#10B981',
                color: '#FFFFFF',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14.5,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#059669';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#10B981';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>🎉</span>
              <span>Report a Found Item</span>
            </Link>
          </div>

          {/* Secondary Quick Links */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            fontSize: 13.5,
            color: '#64748B',
            flexWrap: 'wrap'
          }}>
            <span>Or explore current community reports:</span>
            <Link
              to="/lost-items"
              style={{ color: '#F43F5E', textDecoration: 'underline', fontWeight: 600 }}
            >
              Browse Lost Items
            </Link>
            <span>•</span>
            <Link
              to="/found-items"
              style={{ color: '#059669', textDecoration: 'underline', fontWeight: 600 }}
            >
              Browse Found Items
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
