import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
  <footer style={{
    background: 'var(--color-gray-900)',
    color: 'var(--color-gray-400)',
    padding: 'var(--space-12) 0 var(--space-8)',
  }}>
    <div className="container">
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-8)',
        marginBottom: 'var(--space-10)',
      }}>
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>🔍</span>
            <span style={{ fontWeight: 800, color: 'var(--color-white)', fontSize: '1.1rem' }}>
              Lost<span style={{ color: 'var(--color-primary)' }}>&amp;</span>Found
            </span>
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.7, maxWidth: 240 }}>
            A community platform helping people reunite with their lost belongings.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ color: 'var(--color-white)', fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Platform</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['/', 'Home'], ['/lost-items', 'Lost Items'], ['/found-items', 'Found Items'], ['/#how-it-works', 'How It Works']].map(([to, label]) => (
              <Link key={to} to={to} style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = 'var(--color-white)'}
                onMouseLeave={e => e.target.style.color = 'var(--color-gray-400)'}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Account */}
        <div>
          <h4 style={{ color: 'var(--color-white)', fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Account</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['/login', 'Log In'], ['/register', 'Register'], ['/dashboard', 'Dashboard']].map(([to, label]) => (
              <Link key={to} to={to} style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = 'var(--color-white)'}
                onMouseLeave={e => e.target.style.color = 'var(--color-gray-400)'}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        paddingTop: 'var(--space-6)',
        borderTop: '1px solid var(--color-gray-800)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
      }}>
        <p style={{ fontSize: 'var(--font-size-xs)' }}>
          © {new Date().getFullYear()} Lost & Found. Built with ❤️
        </p>
      <p style={{ fontSize: 'var(--font-size-xs)' }}>
        All items are reported by the community.
      </p>
    </div>
  </div>

  {/* Dynamic Back to Top Button */}
  <button
    onClick={scrollToTop}
    title="Back to top"
    style={{
      position: 'fixed', bottom: '30px', right: '30px',
      width: '56px', height: '56px', borderRadius: '50%',
      background: 'var(--color-primary)', color: '#fff',
      border: 'none', boxShadow: '0 10px 25px rgba(67,97,238,0.5)',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '28px', zIndex: 999,
      opacity: showTop ? 1 : 0,
      visibility: showTop ? 'visible' : 'hidden',
      pointerEvents: showTop ? 'auto' : 'none',
      transform: showTop ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
  >
    ↑
  </button>
</footer>
);
};

export default Footer;
