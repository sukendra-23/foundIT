import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { useAuth } from './hooks/useAuth';
import { PageLoader } from './components/common/Loader';

// Pages
import Home        from './pages/Home';
import Login       from './pages/Login';
import Register    from './pages/Register';
import VerifyOtp   from './pages/VerifyOtp';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard   from './pages/Dashboard';

import ReportLost from './pages/ReportLost';
import ReportFound from './pages/ReportFound';
import LostItems from './pages/LostItems';
import FoundItems from './pages/FoundItems';
import MyReports from './pages/MyReports';
import ItemDetails from './pages/ItemDetails';
import SearchResults from './pages/SearchResults';
import MyMatches from './pages/MyMatches';
import MyClaims from './pages/MyClaims';
import ClaimDetails from './pages/ClaimDetails';
import AdminClaims from './pages/AdminClaims';
import Messages from './pages/Messages';
import MyRecoveries from './pages/MyRecoveries';
import RecoveryDetails from './pages/RecoveryDetails';
import HandoverDetails from './pages/HandoverDetails';
import Profile from './pages/Profile';

// ── Route Guards ──────────────────────────────────────────────────────

/** Redirects logged-in users away from public auth pages (login/register) */
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

/** Redirects unauthenticated users to login */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageLoader />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/** Restricts to ADMIN role */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

// ── App Shell ─────────────────────────────────────────────────────────

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/" element={<Home />} />
    <Route path="/verify-otp" element={<VerifyOtp />} />
    <Route path="/lost-items"  element={<LostItems />} />
    <Route path="/found-items" element={<FoundItems />} />
    <Route path="/lost-items/:id" element={<ItemDetails />} />
    <Route path="/found-items/:id" element={<ItemDetails />} />

    {/* Public-only (redirect if logged in) */}
    <Route path="/login"           element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
    <Route path="/register"        element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
    <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />

    {/* Protected (require login) */}
    <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/report-lost" element={<ProtectedRoute><ReportLost /></ProtectedRoute>} />
    <Route path="/report-found"element={<ProtectedRoute><ReportFound /></ProtectedRoute>} />
    <Route path="/my-reports"  element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
    <Route path="/search"      element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
    <Route path="/matches"     element={<ProtectedRoute><MyMatches /></ProtectedRoute>} />
    <Route path="/claims"      element={<ProtectedRoute><MyClaims /></ProtectedRoute>} />
    <Route path="/claims/:id"  element={<ProtectedRoute><ClaimDetails /></ProtectedRoute>} />
    <Route path="/messages"    element={<ProtectedRoute><Messages /></ProtectedRoute>} />
    <Route path="/my-recoveries" element={<ProtectedRoute><MyRecoveries /></ProtectedRoute>} />
    <Route path="/recoveries/:id" element={<ProtectedRoute><RecoveryDetails /></ProtectedRoute>} />
    <Route path="/handovers/:handoverId" element={<ProtectedRoute><HandoverDetails /></ProtectedRoute>} />
    <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />

    {/* Admin */}
    <Route path="/admin" element={<AdminRoute><AdminClaims /></AdminRoute>} />

    {/* 404 */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

// Placeholder for pages to be built in Phase 3+
const PlaceholderPage = ({ title }) => {
  const { isAuthenticated } = useAuth();
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-gray-50)',
      gap: 16, padding: 24,
      paddingTop: 'var(--navbar-height)',
    }}>
      <div style={{ fontSize: 48 }}>🚧</div>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-gray-900)' }}>{title}</h1>
      <p style={{ color: 'var(--color-gray-500)', textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
        This page is coming in the next phase. Authentication is fully working!
      </p>
      <a href={isAuthenticated ? '/dashboard' : '/'} style={{
        padding: '10px 24px', background: 'var(--color-primary)', color: '#fff',
        borderRadius: 'var(--radius-lg)', textDecoration: 'none', fontWeight: 600,
        fontSize: 'var(--font-size-sm)',
      }}>
        ← {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
      </a>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);

export default App;
