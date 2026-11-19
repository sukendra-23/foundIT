import React, { useState, useEffect } from 'react';
import { profileApi } from '../../services/profileApi';
import Button from '../common/Button';

const AccountVerification = ({ user, onUpdate, toast }) => {
  const emailVerified = !!user.email_verified;

  // OTP flow states
  const [showOtpBox, setShowOtpBox]     = useState(false);
  const [sendingOtp, setSendingOtp]     = useState(false);
  const [otpCode, setOtpCode]           = useState('');
  const [verifying, setVerifying]       = useState(false);
  const [cooldown, setCooldown]         = useState(0);
  const [errorMsg, setErrorMsg]         = useState('');

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Send real OTP to user's email
  const handleSendOtp = async () => {
    try {
      setSendingOtp(true);
      setErrorMsg('');
      const res = await profileApi.sendEmailOtp();
      setShowOtpBox(true);
      setCooldown(60);
      toast(res.data.message || 'OTP verification code sent to your email!', 'info');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP code. Please try again.';
      setErrorMsg(msg);
      toast(msg, 'error');
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify entered OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const trimmed = otpCode.trim();
    if (!trimmed) {
      setErrorMsg('Please enter the 6-digit code received in your email.');
      return;
    }

    try {
      setVerifying(true);
      setErrorMsg('');
      const res = await profileApi.verifyEmailOtp(trimmed);
      toast(res.data.message || 'Email verified successfully!', 'success');
      setShowOtpBox(false);
      setOtpCode('');
      if (onUpdate && res.data.user) {
        onUpdate(res.data.user);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP. Please try again.';
      setErrorMsg(msg);
      toast(msg, 'error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      {/* ── Verification Status Card ──────────────────────────────── */}
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">🛡️</div>
          <div>
            <div className="psc-head-title">Account Verification</div>
            <div className="psc-head-sub">Verify your identity and email security</div>
          </div>
        </div>

        <div style={{ padding: '0 var(--space-6)' }}>

          {/* Email Row */}
          <div className="profile-info-row" style={{ padding: 'var(--space-5) 0', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 28 }}>📧</span>
              <div>
                <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-gray-900)', fontSize: 'var(--font-size-sm)' }}>
                  Email Address
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginTop: 2 }}>
                  {user.email}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={`status-pill ${emailVerified ? 'verified' : 'unverified'}`}>
                {emailVerified ? '✅ Verified' : '⚠️ Unverified'}
              </span>

              {!emailVerified && !showOtpBox && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={sendingOtp}
                  onClick={handleSendOtp}
                  leftIcon={<span>✉️</span>}
                >
                  Verify Email via OTP
                </Button>
              )}
            </div>
          </div>

          {/* Interactive OTP Verification Box */}
          {!emailVerified && showOtpBox && (
            <div style={{
              background: 'var(--color-primary-light)',
              border: '1.5px solid var(--color-primary)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              margin: 'var(--space-2) 0 var(--space-5)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                    Enter 6-Digit Email Code
                  </h4>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', marginTop: 2 }}>
                    We sent a one-time verification code to <strong>{user.email}</strong>. Code expires in 10 minutes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowOtpBox(false); setErrorMsg(''); }}
                  style={{ color: 'var(--color-gray-500)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setErrorMsg(''); }}
                  placeholder="123456"
                  style={{
                    width: 160,
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: 6,
                    textAlign: 'center',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '2px solid var(--color-primary)',
                    background: '#fff',
                    outline: 'none',
                  }}
                  autoFocus
                />

                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  loading={verifying}
                  disabled={otpCode.length < 4}
                >
                  Verify Code
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={cooldown > 0 || sendingOtp}
                  onClick={handleSendOtp}
                  loading={sendingOtp}
                >
                  {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
                </Button>
              </form>

              {errorMsg && (
                <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', marginTop: 8, fontWeight: 600 }}>
                  ⚠️ {errorMsg}
                </p>
              )}
            </div>
          )}

          {/* Phone Row (Not Required) */}
          <div className="profile-info-row" style={{ padding: 'var(--space-5) 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 28 }}>📱</span>
              <div>
                <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-gray-900)', fontSize: 'var(--font-size-sm)' }}>
                  Phone Number
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginTop: 2 }}>
                  {user.phone || 'Not provided'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="status-pill active" style={{ background: '#F1F5F9', color: '#475569' }}>
                Optional (Not Required)
              </span>
            </div>
          </div>

          {/* Account Status Row */}
          <div className="profile-info-row" style={{ padding: 'var(--space-5) 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 28 }}>🔐</span>
              <div>
                <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-gray-900)', fontSize: 'var(--font-size-sm)' }}>
                  Account Status
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginTop: 2 }}>
                  Platform privileges & standing
                </div>
              </div>
            </div>
            <span className={`status-pill ${user.status?.toLowerCase()}`}>
              {user.status === 'ACTIVE' ? '✅ Active' : user.status === 'BANNED' ? '🚫 Banned' : '⏳ Inactive'}
            </span>
          </div>

        </div>
      </div>

      {/* ── Security & Privacy Guarantees ─────────────────────────── */}
      <div className="profile-section-card">
        <div className="psc-head">
          <div className="psc-head-icon">ℹ️</div>
          <div>
            <div className="psc-head-title">Verification Guarantees</div>
            <div className="psc-head-sub">How FoundiT keeps the recovery community authentic</div>
          </div>
        </div>
        <div className="psc-body">
          <div className="profile-alert info" style={{ marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🛡️</span>
            <div>
              <strong>Email verification</strong> ensures you receive important recovery match alerts,
              claim notices, and security updates. Phone verification is optional.
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-4)',
          }}>
            {[
              { icon: '🔑', title: 'Real OTP Delivery', desc: 'Secure one-time passwords delivered directly to your registered inbox.' },
              { icon: '🔒', title: 'Privacy Shield', desc: 'Your email address is never shared publicly or displayed to other members.' },
              { icon: '⚡', title: 'Instant Activation', desc: 'Verifying unlocks recovery notifications and expedited claim processing.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                background: 'var(--color-gray-50)',
                border: '1px solid var(--color-gray-100)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-4)',
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-900)', marginBottom: 4 }}>
                  {title}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', lineHeight: 1.6 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountVerification;
