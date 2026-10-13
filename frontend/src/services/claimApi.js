import api from './api';

const postConfig = (data) =>
    data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};

export const claimApi = {
    // Check eligibility
    checkEligibility: (foundItemId) =>
        api.get(`/claims/check-eligibility/${foundItemId}`),

    // Submit claim (supports FormData for optional evidence photos/documents)
    create: (data) =>
        api.post('/claims', data, postConfig(data)),

    // Claimant: List claims submitted by current user
    getMyClaims: () =>
        api.get('/claims/my'),

    // Finder: List claims received on items reported as found by current user
    getReceivedClaims: () =>
        api.get('/claims/received'),

    // View single claim detail (authorized for claimant, finder, or admin)
    getById: (id) =>
        api.get(`/claims/${id}`),

    // Claimant: Withdraw claim (while in PENDING or FINDER_REVIEW)
    withdraw: (id, reason) =>
        api.post(`/claims/${id}/withdraw`, { reason }),

    // Finder: Submit structured response & notes
    submitFinderResponse: (id, response, notes) =>
        api.post(`/claims/${id}/finder-response`, { response, notes }),

    // Claimant: Provide requested clarification if finder marked NEEDS_INFO
    provideAdditionalInfo: (id, additionalInfo) =>
        api.post(`/claims/${id}/additional-info`, { additionalInfo }),
};

export const adminClaimApi = {
    // Admin: List all claims with filters (status, search)
    getAll: (params) =>
        api.get('/admin/claims', { params }),

    // Admin: Get complete claim details with internal audit trail
    getById: (id) =>
        api.get(`/admin/claims/${id}`),

    // Admin: Approve or Reject claim
    decide: (id, decision, decisionReason, adminNotes) =>
        api.post(`/admin/claims/${id}/decide`, { decision, decisionReason, adminNotes }),

    // Admin: Get all message moderation reports (Feature F)
    getMessageReports: () =>
        api.get('/admin/claims/reports'),

    // Admin: Review/action message report (Feature F)
    reviewMessageReport: (id, status, adminNotes) =>
        api.post(`/admin/claims/reports/${id}/review`, { status, adminNotes }),
};
