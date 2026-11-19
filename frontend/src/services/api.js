import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lf_token');
  if (token) {
    config.headers = config.headers || {};
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses globally — only clear token on real session expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const msg = (error.response?.data?.message || '').toLowerCase();
      // Only clear credentials if the token itself is invalid/expired
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('no longer exists')) {
        localStorage.removeItem('lf_token');
        localStorage.removeItem('lf_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
