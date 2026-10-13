import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import { authApi } from '../services/authApi';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.login(form.email, form.password);
      const { token, user } = res.data;
      login(token, user);
      toast('Welcome back, ' + user.name.split(' ')[0] + '! 👋', 'success');
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.needsVerification) {
        toast('Please verify your OTP first.', 'warning');
        navigate('/verify-otp', { state: { userId: data.userId, email: data.email } });
        return;
      }
      setErrors({ general: data?.message || 'Login failed. Please try again.' });
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
      title="Welcome back"
      subtitle="Sign in to your Lost & Found account."
      switchText="Don't have an account?"
      switchLinkText="Create one free →"
      switchLinkTo="/register"
    >
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
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

        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          required
          autoComplete="email"
          leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            required
            autoComplete="current-password"
          />
          <div style={{ textAlign: 'right', marginTop: 6 }}>
            <Link
              to="/forgot-password"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" fullWidth loading={loading} size="lg">
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Login;
