import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { authApi } from '../services/authApi';

const Register = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim())              e.name    = 'Full name is required.';
    if (!form.email)                     e.email   = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email.';
    if (!form.phone)                     e.phone   = 'Phone number is required.';
    else if (!/^[+]?[\d\s\-()]{8,15}$/.test(form.phone))     e.phone = 'Please enter a valid phone number.';
    if (!form.password)                  e.password = 'Password is required.';
    else if (form.password.length < 8)   e.password = 'Password must be at least 8 characters.';
    if (!form.confirmPassword)           e.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.register(form);
      const { userId, email } = res.data;
      toast('Account created! Please verify your OTP.', 'success');
      navigate('/verify-otp', { state: { userId, email } });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: '', general: '' }));
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Join the Lost & Found community today."
      switchText="Already have an account?"
      switchLinkText="Sign in →"
      switchLinkTo="/login"
    >
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {errors.general && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--color-error-light)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-error)',
            fontSize: 'var(--font-size-sm)',
          }}>
            {errors.general}
          </div>
        )}

        <Input label="Full Name" type="text" placeholder="Rahul Sharma" value={form.name}
          onChange={set('name')} error={errors.name} required autoComplete="name"
          leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
        />

        <Input label="Email address" type="email" placeholder="you@example.com" value={form.email}
          onChange={set('email')} error={errors.email} required autoComplete="email"
          leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
        />

        <Input label="Phone Number" type="tel" placeholder="+91 98765 43210" value={form.phone}
          onChange={set('phone')} error={errors.phone} required autoComplete="tel"
          leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
        />

        <Input label="Password" type="password" placeholder="Minimum 8 characters" value={form.password}
          onChange={set('password')} error={errors.password} required autoComplete="new-password"
          hint="Use letters, numbers, and symbols for a strong password."
        />

        <Input label="Confirm Password" type="password" placeholder="Re-enter your password" value={form.confirmPassword}
          onChange={set('confirmPassword')} error={errors.confirmPassword} required autoComplete="new-password"
        />

        <Button type="submit" fullWidth loading={loading} size="lg" style={{ marginTop: 'var(--space-2)' }}>
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>

        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', textAlign: 'center', lineHeight: 1.6 }}>
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
    </AuthLayout>
  );
};

export default Register;
