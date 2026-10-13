import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApi } from '../services/authApi';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import './Home.css';

const HowItWorksStep = ({ step, icon, title, description, delay }) => (
  <div className={`how-step anim-fade-in-up anim-delay-${delay}`}>
    <div className="how-step-icon">{icon}</div>
    <div className="how-step-num">{step}</div>
    <h3 className="how-step-title">{title}</h3>
    <p className="how-step-desc">{description}</p>
  </div>
);

const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalItems: 0, totalReturned: 0, totalUsers: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => {
    publicApi.getStats()
      .then(res => setStats(res.data))
      .catch(() => {}); // fail silently — stats are non-critical
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search)}`);
  };

  return (
    <div className="home-page">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />

        <div className="container hero-content">
          <div className="hero-badge anim-fade-in-down">
            🌟 Community-powered lost &amp; found platform
          </div>

          <h1 className="hero-title anim-fade-in-up">
            Lost Something?<br />
            <span className="hero-title-accent">We'll Help You</span> Find It.
          </h1>

          <p className="hero-subtitle anim-fade-in-up anim-delay-1">
            Report lost items, discover found items, and connect with your community to get your belongings back safely.
          </p>

          {/* Search Bar */}
          <form className="hero-search anim-fade-in-up anim-delay-2" onSubmit={handleSearch}>
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder='Search "iPhone", "wallet", "backpack"...'
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button type="submit" className="search-btn">Search</button>
            </div>
          </form>

          {/* CTAs */}
          <div className="hero-ctas anim-fade-in-up anim-delay-3">
            <Link to={isAuthenticated ? '/report-lost' : '/register'} className="cta-lost">
              😟 Report Lost Item
            </Link>
            <Link to={isAuthenticated ? '/report-found' : '/register'} className="cta-found">
              🎉 Report Found Item
            </Link>
          </div>

          {/* Real Stats */}
          <div className="hero-stats anim-fade-in-up anim-delay-4">
            <div className="stat-item">
              <span className="stat-num">{stats.totalItems}</span>
              <span className="stat-label">Items Listed</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{stats.totalReturned}</span>
              <span className="stat-label">Items Returned</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{stats.totalUsers}</span>
              <span className="stat-label">Active Users</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="how-section" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Simple Process</span>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Three simple steps to recover your lost item or help someone else.</p>
          </div>

          <div className="how-grid">
            <HowItWorksStep
              step="1"
              icon={<img src="/animations/megaphone.gif" alt="Report It" style={{ display: 'block', width: '120px', height: '120px', objectFit: 'contain', margin: '0 auto' }} />}
              title="Report It"
              description="Report your lost item with photos, description, and last known location. Or report a found item to help the owner."
              delay={1}
            />
            <HowItWorksStep
              step="2"
              icon={<img src="/animations/Url%20Link.gif" alt="Get Matched" style={{ display: 'block', width: '120px', height: '120px', objectFit: 'contain', margin: '0 auto' }} />}
              title="Get Matched"
              description="Our system intelligently matches lost and found reports by category, location, date, and item details."
              delay={2}
            />
            <HowItWorksStep
              step="3"
              icon={<img src="/animations/Handshake.gif" alt="Get It Back" style={{ display: 'block', width: '120px', height: '120px', objectFit: 'contain', margin: '0 auto' }} />}
              title="Get It Back"
              description="Verify your ownership, connect with the finder, and arrange a safe return of your item."
              delay={3}
            />
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────── */}
      <section className="cta-banner">
        <div className="container">
          <div className="cta-banner-inner">
            <div>
              <h2 className="cta-banner-title">Ready to find your lost item?</h2>
              <p className="cta-banner-sub">Join the community. Report, discover, and recover.</p>
            </div>
            <div className="cta-banner-buttons">
              {isAuthenticated ? (
                <Link to="/dashboard" className="cta-banner-btn-primary">Go to Dashboard →</Link>
              ) : (
                <>
                  <Link to="/register" className="cta-banner-btn-primary">Create Account</Link>
                  <Link to="/login" className="cta-banner-btn-ghost">Log In</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
