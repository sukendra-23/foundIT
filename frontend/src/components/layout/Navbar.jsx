import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { messageApi } from '../../services/messageApi';
import NotificationBell from '../common/NotificationBell';
import './Navbar.css';

const Logo = () => (
  <Link to="/" className="navbar-logo">
    <span className="navbar-logo-icon">🔍</span>
    <span className="navbar-logo-text">Lost<span>&amp;</span>Found</span>
  </Link>
);

const NavLinks = ({ onClose }) => {
  const handleHowItWorks = (e) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    }
    if (onClose) onClose();
  };

  return (
    <nav className="navbar-links">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={onClose}>Home</NavLink>
      <NavLink to="/lost-items" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={onClose}>Lost Items</NavLink>
      <NavLink to="/found-items" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={onClose}>Found Items</NavLink>
      <Link to="/#how-it-works" className="nav-link" onClick={handleHowItWorks}>How It Works</Link>
    </nav>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Poll unread messages count when logged in
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      if (document.hidden) return; // Skip polling when tab is hidden
      try {
        const res = await messageApi.getUnreadCount();
        setUnreadCount(res.data.unreadCount || 0);
      } catch (err) {
        // Silent
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <>
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner container">
          <Logo />

          {/* Desktop nav */}
          <div className="navbar-desktop">
            <NavLinks />
            <div className="navbar-auth">
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Link
                    to="/messages"
                    className="nav-message-btn"
                    title="In-App Messages"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--color-gray-100)',
                      color: 'var(--color-gray-700)',
                      textDecoration: 'none',
                      fontSize: 17,
                      transition: 'background 0.2s',
                    }}
                  >
                    💬
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        background: '#EF4444',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 800,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        boxShadow: '0 0 0 2px #fff'
                      }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>

                  {/* In-App Notification Bell */}
                  <NotificationBell />

                  <div className="user-menu" ref={dropdownRef}>
                    <button
                      className="user-avatar-btn"
                      onClick={() => setDropdownOpen(o => !o)}
                      aria-expanded={dropdownOpen}
                    >
                      <div className="user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="user-name hidden-mobile">{user.name.split(' ')[0]}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {dropdownOpen && (
                      <div className="user-dropdown anim-fade-in-down">
                        <div className="dropdown-header">
                          <p className="dropdown-name">{user.name}</p>
                          <p className="dropdown-email">{user.email}</p>
                        </div>
                        <div className="dropdown-divider" />
                        <Link to="/dashboard" className="dropdown-item" onClick={() => setDropdownOpen(false)}>🏠 Dashboard</Link>
                        <Link to="/my-reports" className="dropdown-item" onClick={() => setDropdownOpen(false)}>📋 My Reports</Link>
                        <Link to="/matches" className="dropdown-item" onClick={() => setDropdownOpen(false)}>✨ My Matches</Link>
                        <Link to="/claims" className="dropdown-item" onClick={() => setDropdownOpen(false)}>🏷️ My Claims</Link>
                        <Link to="/messages" className="dropdown-item" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>💬 Messages</span>
                          {unreadCount > 0 && (
                            <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999 }}>
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                        {user.role === 'ADMIN' && (
                          <Link to="/admin" className="dropdown-item" onClick={() => setDropdownOpen(false)} style={{ color: '#7C3AED', fontWeight: 700 }}>
                            🛡️ Admin Portal
                          </Link>
                        )}
                        <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>👤 Profile</Link>
                        <div className="dropdown-divider" />
                        <button className="dropdown-item danger" onClick={handleLogout}>🚪 Log Out</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="auth-buttons">
                  <Link to="/login" className="btn-ghost-nav">Log In</Link>
                  <Link to="/register" className="btn-primary-nav">Get Started</Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className={`hamburger hidden-desktop ${mobileOpen ? 'open' : ''}`}
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="mobile-menu anim-fade-in-down hidden-desktop">
          <NavLinks onClose={() => setMobileOpen(false)} />
          <div className="mobile-menu-divider" />
          {user ? (
            <div className="mobile-auth">
              <div className="mobile-user-info">
                <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{user.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>{user.email}</p>
                </div>
              </div>
              <Link to="/dashboard" className="mobile-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link to="/my-reports" className="mobile-link" onClick={() => setMobileOpen(false)}>My Reports</Link>
              <Link to="/matches" className="mobile-link" onClick={() => setMobileOpen(false)}>My Matches</Link>
              <Link to="/claims" className="mobile-link" onClick={() => setMobileOpen(false)}>My Claims</Link>
              <Link to="/messages" className="mobile-link" onClick={() => setMobileOpen(false)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Messages</span>
                {unreadCount > 0 && (
                  <span style={{ background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
                    {unreadCount} new
                  </span>
                )}
              </Link>
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="mobile-link" onClick={() => setMobileOpen(false)} style={{ color: '#7C3AED', fontWeight: 700 }}>
                  Admin Portal
                </Link>
              )}
              <Link to="/profile" className="mobile-link" onClick={() => setMobileOpen(false)}>Profile</Link>
              <button className="mobile-link danger" onClick={handleLogout}>Log Out</button>
            </div>
          ) : (
            <div className="mobile-auth">
              <Link to="/login" className="mobile-link" onClick={() => setMobileOpen(false)}>Log In</Link>
              <Link to="/register" className="mobile-btn-primary" onClick={() => setMobileOpen(false)}>Get Started →</Link>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Navbar;
