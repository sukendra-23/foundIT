import api from './api';

export const profileApi = {
  /** GET /api/users/profile — full user object including avatar_url, verification status */
  getProfile: () =>
    api.get('/users/profile'),

  /** PUT /api/users/profile — update name and/or avatar_url */
  updateProfile: (data) =>
    api.put('/users/profile', data),

  /** POST /api/users/avatar — upload avatar from device/gallery */
  uploadAvatar: (formData) =>
    api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** DELETE /api/users/avatar — remove custom avatar */
  deleteAvatar: () =>
    api.delete('/users/avatar'),

  /** POST /api/users/send-email-otp — sends OTP for email verification */
  sendEmailOtp: () =>
    api.post('/users/send-email-otp'),

  /** POST /api/users/verify-email-otp — verifies OTP and activates email */
  verifyEmailOtp: (otp) =>
    api.post('/users/verify-email-otp', { otp }),

  /** POST /api/users/change-password */
  changePassword: (data) =>
    api.post('/users/change-password', data),

  /** GET /api/users/analytics — get reports & claims analysis and graphs */
  getAnalytics: () =>
    api.get('/users/analytics'),

  /** GET /api/users/my-data — download user data summary */
  downloadMyData: () =>
    api.get('/users/my-data'),
};
