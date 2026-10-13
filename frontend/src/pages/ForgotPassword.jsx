import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OtpInput from '../components/auth/OtpInput';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { authApi } from '../services/authApi';

// ─── Steps ─────────────────────────────────────────────────────────────────
// 1 = enter email
// 2 = enter OTP
// 3 = enter new password
// 4 = success

const OTP_EXPIRY = 10 * 60; // 10 minutes in seconds

const ForgotPassword = () => {
    const navigate = useNavigate();
    const toast = useToast();

    const [step, setStep] = useState(1);

    // Step 1 state
    const [email, setEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState('');

    // Step 2 state
    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY);
    const [resendCooldown, setResendCooldown] = useState(60);
    const [resendLoading, setResendLoading] = useState(false);

    // Step 3 state
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordLoading, setPasswordLoading] = useState(false);

    // ── OTP countdown (step 2) ──────────────────────────────────────────────
    useEffect(() => {
        if (step !== 2) return;
        if (timeLeft <= 0) return;
        const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [step, timeLeft]);

    // ── Resend cooldown ─────────────────────────────────────────────────────
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
        return () => clearInterval(t);
    }, [resendCooldown]);

    // ── Auto-verify OTP when 6 digits entered ──────────────────────────────
    useEffect(() => {
        if (otp.length === 6 && !otpLoading && step === 2) {
            handleVerifyOtp();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otp]);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    const maskedEmail = email
        ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c)
        : '';

    // ── Step 1: request OTP ─────────────────────────────────────────────────
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!email.trim()) { setEmailError('Email address is required.'); return; }
        if (!email.includes('@')) { setEmailError('Enter a valid email address.'); return; }
        setEmailLoading(true);
        setEmailError('');
        try {
            await authApi.forgotPassword(email.trim().toLowerCase());
            // Always succeed (generic response — no user enumeration)
            toast('Reset code sent! Check your inbox.', 'success');
            setTimeLeft(OTP_EXPIRY);
            setResendCooldown(60);
            setOtp('');
            setStep(2);
        } catch {
            // Even on network errors, show generic message (don't reveal anything)
            setEmailError('Unable to send reset code. Please try again.');
        } finally {
            setEmailLoading(false);
        }
    };

    // ── Step 2: verify OTP ──────────────────────────────────────────────────
    const handleVerifyOtp = async (e) => {
        e?.preventDefault?.();
        if (otp.length !== 6) { setOtpError('Please enter the complete 6-digit code.'); return; }
        setOtpLoading(true);
        setOtpError('');
        try {
            const res = await authApi.verifyResetOtp(email.trim().toLowerCase(), otp);
            setResetToken(res.data.resetToken);
            setStep(3);
        } catch (err) {
            const msg = err.response?.data?.message || 'Incorrect code. Please try again.';
            setOtpError(msg);
            setOtp('');
        } finally {
            setOtpLoading(false);
        }
    };

    // ── Step 2: resend OTP ──────────────────────────────────────────────────
    const handleResendOtp = async () => {
        setResendLoading(true);
        setOtpError('');
        try {
            await authApi.forgotPassword(email.trim().toLowerCase());
            setOtp('');
            setTimeLeft(OTP_EXPIRY);
            setResendCooldown(60);
            toast('New reset code sent.', 'info');
        } catch {
            setOtpError('Failed to resend code. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    // ── Step 3: set new password ────────────────────────────────────────────
    const handleResetPassword = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!newPassword) errs.newPassword = 'New password is required.';
        else if (newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters.';
        if (!confirmPassword) errs.confirmPassword = 'Please confirm your password.';
        else if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
        setPasswordErrors(errs);
        if (Object.keys(errs).length) return;

        setPasswordLoading(true);
        try {
            await authApi.resetPassword(resetToken, newPassword, confirmPassword);
            setStep(4);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to reset password. Please start over.';
            if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('start over')) {
                // Session expired — send back to step 1
                toast(msg, 'error');
                setStep(1);
                setOtp('');
                setResetToken('');
            } else {
                setPasswordErrors({ general: msg });
            }
        } finally {
            setPasswordLoading(false);
        }
    };

    // ── Shared card shell ───────────────────────────────────────────────────
    const cardStyle = {
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--color-gray-50) 0%, var(--color-primary-light) 100%)',
        padding: 'var(--space-6)',
    };
    const innerStyle = {
        background: 'var(--color-white)',
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-10)',
        maxWidth: 440, width: '100%',
        boxShadow: 'var(--shadow-xl)',
        animation: 'scaleIn 0.3s ease',
    };
    const logoStyle = { textAlign: 'center', marginBottom: 'var(--space-8)' };
    const backLinkStyle = {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)',
        textDecoration: 'none', marginBottom: 'var(--space-6)',
    };

    // ── Step progress dots ──────────────────────────────────────────────────
    const StepDots = () => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 'var(--space-8)' }}>
            {[1, 2, 3].map(n => (
                <div key={n} style={{
                    width: step > n ? 28 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: step > n
                        ? 'var(--color-primary)'
                        : step === n
                            ? 'var(--color-primary)'
                            : 'var(--color-gray-200)',
                    opacity: step === n ? 1 : 0.5,
                    transition: 'width 0.3s ease, background 0.3s ease',
                }} />
            ))}
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1 — Email Input
    // ═══════════════════════════════════════════════════════════════════════
    if (step === 1) return (
        <div style={cardStyle}>
            <div style={innerStyle}>
                <div style={logoStyle}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                        <span style={{ fontSize: 24 }}>🔍</span>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-gray-900)' }}>
                            Lost<span style={{ color: 'var(--color-primary)' }}>&</span>Found
                        </span>
                    </Link>
                </div>

                <StepDots />

                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <div style={{ fontSize: 48, marginBottom: 'var(--space-4)' }}>🔐</div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 8 }}>
                        Forgot your password?
                    </h1>
                    <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>
                        No worries! Enter your email and we'll send you a reset code.
                    </p>
                </div>

                <form onSubmit={handleRequestOtp} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                    {emailError && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'var(--color-error-light)',
                            border: '1px solid var(--color-error)',
                            borderRadius: 'var(--radius-lg)',
                            color: 'var(--color-error)',
                            fontSize: 'var(--font-size-sm)',
                        }}>
                            {emailError}
                        </div>
                    )}
                    <Input
                        label="Email address"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                        error={emailError && ''}
                        required
                        autoComplete="email"
                        leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                    />
                    <Button type="submit" fullWidth loading={emailLoading} size="lg">
                        {emailLoading ? 'Sending code...' : 'Send Reset Code →'}
                    </Button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                    Remembered your password?{' '}
                    <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2 — OTP Verification
    // ═══════════════════════════════════════════════════════════════════════
    if (step === 2) return (
        <div style={cardStyle}>
            <div style={innerStyle}>
                <div style={logoStyle}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                        <span style={{ fontSize: 24 }}>🔍</span>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-gray-900)' }}>
                            Lost<span style={{ color: 'var(--color-primary)' }}>&</span>Found
                        </span>
                    </Link>
                </div>

                <StepDots />

                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <div style={{ fontSize: 48, marginBottom: 'var(--space-4)' }}>📬</div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 8 }}>
                        Check your inbox
                    </h1>
                    <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>
                        We sent a 6-digit reset code to<br />
                        <strong style={{ color: 'var(--color-gray-700)' }}>{maskedEmail}</strong>
                    </p>
                </div>

                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                    <OtpInput
                        value={otp}
                        onChange={setOtp}
                        disabled={otpLoading || timeLeft === 0}
                        error={otpError}
                    />

                    {/* Timer */}
                    <div style={{ textAlign: 'center' }}>
                        {timeLeft > 0 ? (
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                                Code expires in{' '}
                                <span style={{ fontWeight: 700, color: timeLeft < 60 ? 'var(--color-error)' : 'var(--color-primary)' }}>
                                    {formatTime(timeLeft)}
                                </span>
                            </p>
                        ) : (
                            <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                Code expired. Please request a new one.
                            </p>
                        )}
                    </div>

                    <Button type="submit" fullWidth loading={otpLoading} size="lg" disabled={otp.length !== 6 || timeLeft === 0}>
                        {otpLoading ? 'Verifying...' : 'Verify Code'}
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
                                    onClick={handleResendOtp}
                                    disabled={resendLoading}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--color-primary)', fontWeight: 600,
                                        fontSize: 'inherit',
                                    }}
                                >
                                    {resendLoading ? 'Sending...' : 'Resend code'}
                                </button>
                            )}
                        </p>
                    </div>
                </form>

                {/* Back */}
                <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
                    <button
                        type="button"
                        onClick={() => { setStep(1); setOtp(''); setOtpError(''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}
                    >
                        ← Use a different email
                    </button>
                </div>
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3 — New Password
    // ═══════════════════════════════════════════════════════════════════════
    if (step === 3) return (
        <div style={cardStyle}>
            <div style={innerStyle}>
                <div style={logoStyle}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                        <span style={{ fontSize: 24 }}>🔍</span>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-gray-900)' }}>
                            Lost<span style={{ color: 'var(--color-primary)' }}>&</span>Found
                        </span>
                    </Link>
                </div>

                <StepDots />

                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <div style={{ fontSize: 48, marginBottom: 'var(--space-4)' }}>🛡️</div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 8 }}>
                        Create new password
                    </h1>
                    <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>
                        Choose a strong password you haven't used before.
                    </p>
                </div>

                <form onSubmit={handleResetPassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                    {passwordErrors.general && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'var(--color-error-light)',
                            border: '1px solid var(--color-error)',
                            borderRadius: 'var(--radius-lg)',
                            color: 'var(--color-error)',
                            fontSize: 'var(--font-size-sm)',
                        }}>
                            {passwordErrors.general}
                        </div>
                    )}
                    <Input
                        label="New password"
                        type="password"
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setPasswordErrors(p => ({ ...p, newPassword: '', general: '' })); }}
                        error={passwordErrors.newPassword}
                        required
                        autoComplete="new-password"
                    />
                    <Input
                        label="Confirm new password"
                        type="password"
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setPasswordErrors(p => ({ ...p, confirmPassword: '', general: '' })); }}
                        error={passwordErrors.confirmPassword}
                        required
                        autoComplete="new-password"
                    />

                    {/* Password strength hint */}
                    {newPassword.length > 0 && (
                        <div style={{ display: 'flex', gap: 4 }}>
                            {['weak', 'fair', 'good', 'strong'].map((_, i) => {
                                const score = Math.min(
                                    [newPassword.length >= 8, /[A-Z]/.test(newPassword), /[0-9]/.test(newPassword), /[^a-zA-Z0-9]/.test(newPassword)]
                                        .filter(Boolean).length,
                                    4
                                );
                                const colors = ['var(--color-error)', '#F59E0B', '#3B82F6', '#10B981'];
                                return (
                                    <div key={i} style={{
                                        flex: 1, height: 4, borderRadius: 2,
                                        background: i < score ? colors[score - 1] : 'var(--color-gray-200)',
                                        transition: 'background 0.2s ease',
                                    }} />
                                );
                            })}
                        </div>
                    )}

                    <Button type="submit" fullWidth loading={passwordLoading} size="lg">
                        {passwordLoading ? 'Updating password...' : 'Reset Password'}
                    </Button>
                </form>
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4 — Success
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div style={cardStyle}>
            <div style={innerStyle}>
                <div style={logoStyle}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                        <span style={{ fontSize: 24 }}>🔍</span>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-gray-900)' }}>
                            Lost<span style={{ color: 'var(--color-primary)' }}>&</span>Found
                        </span>
                    </Link>
                </div>

                <div style={{ textAlign: 'center', animation: 'bounceIn 0.5s ease' }}>
                    {/* Animated checkmark */}
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--space-6)',
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                        animation: 'scaleIn 0.4s ease',
                    }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>

                    <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: 8, color: 'var(--color-gray-900)' }}>
                        Password reset!
                    </h2>
                    <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-8)', lineHeight: 1.6, fontSize: 'var(--font-size-sm)' }}>
                        Your password has been updated successfully.<br />
                        Sign in with your new password to continue.
                    </p>

                    {/* Security note */}
                    <div style={{
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: 'var(--radius-lg)',
                        padding: '12px 16px',
                        marginBottom: 'var(--space-8)',
                        textAlign: 'left',
                    }}>
                        <p style={{ color: '#166534', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                            💡 <strong>Security tip:</strong> If you didn't request this reset, your old sessions will remain active for up to 7 days. Consider logging out of all devices.
                        </p>
                    </div>

                    <Button fullWidth size="lg" onClick={() => navigate('/login')}>
                        Continue to Sign In →
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
