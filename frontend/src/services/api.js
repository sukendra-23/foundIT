import axios from 'axios';

// Centralized API configuration
// Resolves the backend API base URL from the environment (defaulting to local backend if unset)
const resolveBaseUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim();
  // Strip enclosing quotes if passed in deployment settings
  url = url.replace(/^["']|["']$/g, '');

  // Guard: if protocol is missing (e.g. naked domain 'foundit-backend-production-f8a31442.up.railway.app/api'),
  // prepend https:// so browser does not treat it as a relative path and prepend window.location.origin
  if (url && !/^https?:\/\//i.test(url)) {
    if (url.startsWith('//')) {
      url = `https:${url}`;
    } else if (!url.startsWith('/')) {
      url = `https://${url}`;
    }
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // Ensure /api suffix is present
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }

  return url;
};

const API_BASE_URL = resolveBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
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

  // When sending FormData, remove Content-Type so Axios/browser automatically
  // generates multipart/form-data with the correct boundary parameter
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
      config.headers.delete('content-type');
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

export { API_BASE_URL };
export default api;
