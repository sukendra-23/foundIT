import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
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

const DesktopNavLinks = () => {
  const handleHowItWorks = (e) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="navbar-links">
      <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Home</NavLink>
      <NavLink to="/lost-items" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Lost Items</NavLink>
      <NavLink to="/found-items" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Found Items</NavLink>
      <Link to="/#how-it-works" className="nav-link" onClick={handleHowItWorks}>How It Works</Link>
    </nav>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
      if (document.hidden) return;
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

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => document.body.classList.remove('mobile-menu-open');
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  const handleHowItWorksMobile = (e) => {
    setMobileOpen(false);
    if (window.location.pathname === '/') {
      e.preventDefault();
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner container">
          <Logo />

          {/* Desktop nav links only (Home, Lost Items, Found Items, How It Works) */}
          <div className="navbar-desktop-links hidden-mobile">
            <DesktopNavLinks />
          </div>

          {/* Right-side Navbar Actions */}
          <div className="navbar-actions">
            {user ? (
              <>
                {/* 1. Messages Action Icon */}
                <NavLink
                  to="/messages"
                  className={({ isActive }) => `nav-action-btn ${isActive ? 'active' : ''}`}
                  title="In-App Messages"
                  aria-label="Messages"
                >
                  <span className="nav-action-icon">💬</span>
                  {unreadCount > 0 && (
                    <span className="nav-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </NavLink>

                {/* 2. Notifications Bell Action Icon */}
                <NotificationBell />

                {/* 3. User Profile Icon & Account Dropdown */}
                <div className="user-menu" ref={dropdownRef}>
                  <button
                    className="user-avatar-btn"
                    onClick={() => setDropdownOpen(o => !o)}
                    aria-expanded={dropdownOpen}
                    aria-label="Account menu"
                    title="Account Menu"
                  >
                    <div className="user-avatar">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        user.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="user-name hidden-mobile">{user.name?.split(' ')[0]}</span>
                    <svg className="user-chevron hidden-mobile" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="user-dropdown anim-fade-in-down">
                      <div className="dropdown-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="user-avatar" style={{ width: 36, height: 36, flexShrink: 0 }}>
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              user.name?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <p className="dropdown-name">{user.name}</p>
                            <p className="dropdown-email">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="dropdown-divider" />
                      {/* Account Options ONLY: Dashboard, My Reports, My Matches, My Claims, My Recoveries, Profile */}
                      <NavLink
                        to="/dashboard"
                        className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                        onClick={() => setDropdownOpen(false)}
                      >
                        🏠 Dashboard
                      </NavLink>
                      <NavLink
                        to="/my-reports"
                        className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                        onClick={() => setDropdownOpen(false)}
                      >
                        📋 My Reports
                      </NavLink>
                      <NavLink
                        to="/matches"
                        className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                        onClick={() => setDropdownOpen(false)}
                      >
                        ✨ My Matches
                      </NavLink>
                      <NavLink
                        to="/claims"
                        className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                        onClick={() => setDropdownOpen(false)}
                      >
                        🏷️ My Claims
                      </NavLink>
                      <NavLink
                        to="/my-recoveries"
                        className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                        onClick={() => setDropdownOpen(false)}
                      >
                        🎁 My Recoveries
                      </NavLink>
                      {user.role === 'ADMIN' && (
                        <NavLink
                          to="/admin"
                          className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                          onClick={() => setDropdownOpen(false)}
                          style={{ color: '#7C3AED', fontWeight: 700 }}
                        >
                          🛡️ Admin Portal
                        </NavLink>
                      )}
                      <NavLink
                        to="/profile"
                        className={({ isActive }) => `dropdown-item ${isActive ? 'active' : ''}`}
                        onClick={() => setDropdownOpen(false)}
                      >
                        👤 Profile
                      </NavLink>
                      <div className="dropdown-divider" />
                      <button className="dropdown-item danger" onClick={handleLogout}>🚪 Log Out</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="auth-buttons hidden-mobile">
                <Link to="/login" className="btn-ghost-nav">Log In</Link>
                <Link to="/register" className="btn-primary-nav">Get Started</Link>
              </div>
            )}

            {/* 4. Hamburger Icon (Visible on Mobile only) */}
            <button
              className={`hamburger hidden-desktop ${mobileOpen ? 'open' : ''}`}
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle public navigation"
              aria-expanded={mobileOpen}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer — Public website navigation ONLY */}
      {mobileOpen && (
        <div className="mobile-drawer-overlay hidden-desktop" onClick={() => setMobileOpen(false)}>
          <div className="mobile-drawer-content anim-fade-in-down" onClick={e => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <span className="mobile-drawer-title">Navigation</span>
              <button
                className="mobile-drawer-close"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              <NavLink
                to="/"
                end
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Home
              </NavLink>
              <NavLink
                to="/lost-items"
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Lost Items
              </NavLink>
              <NavLink
                to="/found-items"
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Found Items
              </NavLink>
              <Link
                to="/#how-it-works"
                className="mobile-drawer-link"
                onClick={handleHowItWorksMobile}
              >
                How It Works
              </Link>
            </nav>

            {!user && (
              <div className="mobile-drawer-auth">
                <div className="mobile-drawer-divider" />
                <Link to="/login" className="mobile-drawer-link" onClick={() => setMobileOpen(false)}>
                  Log In
                </Link>
                <Link to="/register" className="mobile-btn-primary" onClick={() => setMobileOpen(false)}>
                  Get Started →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
