import api from './api';

export const handoverApi = {
  // Finder initiates handover for an approved recovery
  initiate: (recoveryId, data = {}) => 
    api.post(`/recoveries/${recoveryId}/handover`, data),

  // Get handover by recovery ID
  getByRecoveryId: (recoveryId) => 
    api.get(`/recoveries/${recoveryId}/handover`),

  // Get full handover details by handover ID
  getById: (id) => 
    api.get(`/handovers/${id}`),

  // Finder updates location details (address or coords)
  updateLocation: (id, data) => 
    api.patch(`/handovers/${id}/location`, data),

  // Finder publishes location to owner
  publish: (id) => 
    api.post(`/handovers/${id}/publish`),

  // Finder one-click consolidated publish (saves location, schedule, consent, sends 1 notification + 1 email)
  publishAll: (id, data) => 
    api.post(`/handovers/${id}/publish-all`, data),

  // Owner verifies handover arrangements (acknowledges details prior to meeting)
  verifyArrangements: (id, data = {}) => 
    api.post(`/handovers/${id}/verify-arrangements`, data),

  // Finder starts live GPS session
  startLocationSession: (id, data) => 
    api.post(`/handovers/${id}/location/start`, data),

  // Finder updates live GPS coordinates
  updateLocationSession: (id, data) => 
    api.post(`/handovers/${id}/location/update`, data),

  // Finder stops live GPS session
  stopLocationSession: (id) => 
    api.post(`/handovers/${id}/location/stop`),

  // Polling endpoint for live location (Owner & Finder)
  getCurrentLocation: (id) => 
    api.get(`/handovers/${id}/location/current`),

  // Finder schedules date/time
  schedule: (id, data) => 
    api.post(`/handovers/${id}/schedule`, data),

  // Finder toggles phone number sharing
  updateContactConsent: (id, consent) => 
    api.patch(`/handovers/${id}/contact-consent`, { consent }),

  // Owner confirms receipt of item (CRITICAL: Completes handover)
  confirmReceipt: (id, data = {}) => 
    api.post(`/handovers/${id}/confirm-received`, data),

  // Owner uploads proof/evidence photo for receipt
  uploadEvidence: (id, formData) => 
    api.post(`/handovers/${id}/upload-evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Rate and review (1-5 stars)
  submitFeedback: (id, data) => 
    api.post(`/handovers/${id}/feedback`, data),

  // Get feedback records
  getFeedback: (id) => 
    api.get(`/handovers/${id}/feedback`),

  // Report issue/dispute
  reportIssue: (id, data) => 
    api.post(`/handovers/${id}/report-issue`, data),
};

export const adminHandoverApi = {
  // Get all handovers with filters & statistics
  getAll: (params = {}) => 
    api.get('/admin/handovers', { params }),

  // Get complete single handover inspection details
  getById: (id) => 
    api.get(`/admin/handovers/${id}`),

  // Resolve issue
  resolveIssue: (issueId, data = {}) => 
    api.post(`/admin/handovers/issues/${issueId}/resolve`, data),
};

export default handoverApi;
