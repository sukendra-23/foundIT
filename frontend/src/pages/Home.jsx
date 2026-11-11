import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApi } from '../services/authApi';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import './Home.css';
import '../components/home/HomeSections.css';

// Premium Startup Homepage Components
import InteractiveRecovery3D from '../components/home/InteractiveRecovery3D';
import RecoveryJourneys from '../components/home/RecoveryJourneys';
import FeatureShowcase from '../components/home/FeatureShowcase';
import TrustAndSafety from '../components/home/TrustAndSafety';
import RealWorldScenarios from '../components/home/RealWorldScenarios';
import FoundiTJournal from '../components/home/FoundiTJournal';
import FAQSection from '../components/home/FAQSection';
import FinalCTA from '../components/home/FinalCTA';

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

      {/* ── SECTION 1: INTERACTIVE 3D PRODUCT DEMO ─────────────────── */}
      <InteractiveRecovery3D />

      {/* ── SECTION 2: TWO JOURNEYS, ONE PLATFORM ───────────────────── */}
      <RecoveryJourneys />

      {/* ── SECTION 3: MORE THAN A LOST & FOUND WEBSITE ─────────────── */}
      <FeatureShowcase />

      {/* ── SECTION 4: BUILT AROUND TRUST AND SAFETY ────────────────── */}
      <TrustAndSafety />

      {/* ── SECTION 5: REAL-WORLD SITUATIONS WHERE FOUNDIT HELPS ────── */}
      <RealWorldScenarios />

      {/* ── SECTION 6: THE FOUNDIT JOURNAL ──────────────────────────── */}
      <FoundiTJournal />

      {/* ── SECTION 7: FREQUENTLY ASKED QUESTIONS ───────────────────── */}
      <FAQSection />

      {/* ── SECTION 8: FINAL CALL TO ACTION ─────────────────────────── */}
      <FinalCTA />

      <Footer />
    </div>
  );
};

export default Home;
