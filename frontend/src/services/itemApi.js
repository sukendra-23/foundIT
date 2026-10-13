import api from './api';

// Helper: detect if data is FormData and set appropriate header
const postConfig = (data) =>
  data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};

export const lostItemApi = {
  getAll: (params) => api.get('/lost-items', { params }),
  getById: (id) => api.get(`/lost-items/${id}`),
  create: (data) => api.post('/lost-items', data, postConfig(data)),
  update: (id, data) => api.put(`/lost-items/${id}`, data, postConfig(data)),
  delete: (id) => api.delete(`/lost-items/${id}`),
};

export const foundItemApi = {
  getAll: (params) => api.get('/found-items', { params }),
  getById: (id) => api.get(`/found-items/${id}`),
  create: (data) => api.post('/found-items', data, postConfig(data)),
  update: (id, data) => api.put(`/found-items/${id}`, data, postConfig(data)),
  delete: (id) => api.delete(`/found-items/${id}`),
};

export const matchApi = {
  getMyMatches: () => api.get('/matches'),
  updateStatus: (id, status) => api.patch(`/matches/${id}/status`, { status })
};

export const searchApi = {
  globalSearch: (q) => api.get('/search', { params: { q } })
};
