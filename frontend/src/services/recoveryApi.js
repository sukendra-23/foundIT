import api from './api';

const postConfig = (data) =>
    data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};

export const recoveryApi = {
    // Check eligibility to submit a recovery report for a lost item
    checkEligibility: (lostItemId) =>
        api.get(`/recoveries/check-eligibility/${lostItemId}`),

    // Submit a recovery report (FormData with up to 5 images)
    create: (data) =>
        api.post('/recoveries', data, postConfig(data)),

    // Finder: List recovery submissions made by current user
    getMySubmissions: () =>
        api.get('/recoveries/my-submissions'),

    // Owner: List recoveries submitted on lost items reported by current user
    getReceived: () =>
        api.get('/recoveries/received'),

    // View single recovery report detail
    getById: (id) =>
        api.get(`/recoveries/${id}`),

    // Finder: Cancel a submission (only allowed while PENDING)
    cancel: (id, reason) =>
        api.post(`/recoveries/${id}/cancel`, { reason }),
};

export const adminRecoveryApi = {
    // Admin: List all recovery submissions with optional filters (status, search)
    getAll: (params) =>
        api.get('/admin/recoveries', { params }),

    // Admin: Get side-by-side comparison details for recovery review
    getById: (id) =>
        api.get(`/admin/recoveries/${id}`),

    // Admin: Approve or Reject a recovery submission
    decide: (id, decision, decisionReason, adminNotes) =>
        api.post(`/admin/recoveries/${id}/decide`, { decision, decisionReason, adminNotes }),

    // Admin: Revoke a previously approved recovery
    revoke: (id, revocationReason, adminNotes) =>
        api.post(`/admin/recoveries/${id}/revoke`, { revocationReason, adminNotes }),
};
