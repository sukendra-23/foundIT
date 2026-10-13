import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import OtpInput from '../components/auth/OtpInput';
import Button from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { authApi } from '../services/authApi';

const OTP_EXPIRY = 10 * 60; // 10 minutes in seconds

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const { userId, email } = location.state || {};

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60); // 60s cooldown
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY);
  const [verified, setVerified] = useState(false);

  // Redirect if no userId
  useEffect(() => {
    if (!userId) navigate('/register');
  }, [userId, navigate]);

  // OTP expiry countdown
  useEffect(() => {
    if (verified) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [verified]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) { setError('Please enter the complete 6-digit OTP.'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.verifyOtp(userId, otp);
      setVerified(true);
      toast('Account verified successfully! You can now log in.', 'success');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');
    try {
      await authApi.resendOtp(userId);
      setResendCooldown(60);
      setTimeLeft(OTP_EXPIRY);
      setOtp('');
      toast('New OTP sent to your email and phone.', 'info');
    } catch (err) {
      const data = err.response?.data;
      if (data?.waitSeconds) setResendCooldown(data.waitSeconds);
      setError(data?.message || 'Failed to resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  // Auto-verify when all 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && !loading && !verified) handleVerify();
  }, [otp]);

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c)
    : '';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--color-gray-50) 0%, var(--color-primary-light) 100%)',
      padding: 'var(--space-6)',
    }}>
      <div style={{
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-10)',
        maxWidth: 440, width: '100%',
        boxShadow: 'var(--shadow-xl)',
        animation: 'scaleIn 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ fontSize: 24 }}>🔍</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-gray-900)' }}>
              Lost<span style={{ color: 'var(--color-primary)' }}>&amp;</span>Found
            </span>
          </Link>
        </div>

        {!verified ? (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
              <div style={{ fontSize: 48, marginBottom: 'var(--space-4)' }}>📱</div>
              <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 8 }}>
                Verify your account
              </h1>
              <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>
                We sent a 6-digit OTP to<br />
                <strong style={{ color: 'var(--color-gray-700)' }}>{maskedEmail}</strong>
                {' '}and your phone number.
              </p>
            </div>

            {/* OTP Input */}
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <OtpInput value={otp} onChange={setOtp} disabled={loading || timeLeft === 0} error={error} />

              {/* Timer */}
              <div style={{ textAlign: 'center' }}>
                {timeLeft > 0 ? (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                    OTP expires in{' '}
                    <span style={{ fontWeight: 700, color: timeLeft < 60 ? 'var(--color-error)' : 'var(--color-primary)' }}>
                      {formatTime(timeLeft)}
                    </span>
                  </p>
                ) : (
                  <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                    OTP expired. Please request a new one.
                  </p>
                )}
              </div>

              <Button type="submit" fullWidth loading={loading} size="lg" disabled={otp.length !== 6 || timeLeft === 0}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>

              {/* Resend */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                  Didn't receive it?{' '}
                  {resendCooldown > 0 ? (
                    <span style={{ color: 'var(--color-gray-400)' }}>
                      Resend in <strong>{resendCooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendLoading}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-primary)', fontWeight: 600,
                        fontSize: 'inherit',
                      }}
                    >
                      {resendLoading ? 'Sending...' : 'Resend OTP'}
                    </button>
                  )}
                </p>
              </div>
            </form>
          </>
        ) : (
          /* Success State */
          <div style={{ textAlign: 'center', animation: 'bounceIn 0.5s ease' }}>
            <div style={{ fontSize: 64, marginBottom: 'var(--space-4)' }}>🎉</div>
            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 8 }}>
              Account Verified!
            </h2>
            <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-8)', lineHeight: 1.6 }}>
              Your account has been successfully verified. You can now log in.
            </p>
            <Button fullWidth size="lg" onClick={() => navigate('/login')}>
              Continue to Login →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyOtp;
