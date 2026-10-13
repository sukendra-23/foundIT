import api from './api';

export const authApi = {
  register: (data) =>
    api.post('/auth/register', data),

  verifyOtp: (userId, otp) =>
    api.post('/auth/verify-otp', { userId, otp }),

  resendOtp: (userId) =>
    api.post('/auth/resend-otp', { userId }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  logout: () =>
    api.post('/auth/logout'),

  getMe: () =>
    api.get('/auth/me'),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),

  verifyResetOtp: (email, otp) =>
    api.post('/auth/verify-reset-otp', { email, otp }),

  resetPassword: (resetToken, newPassword, confirmPassword) =>
    api.post('/auth/reset-password', { resetToken, newPassword, confirmPassword }),
};

export const dashboardApi = {
  getStats: () =>
    api.get('/dashboard/stats'),
  getRecent: () =>
    api.get('/dashboard/recent'),
};

export const publicApi = {
  getStats: () =>
    api.get('/stats'),
};
