import api from './api';

export const messageApi = {
    // Get total unread count for current user
    getUnreadCount: () =>
        api.get('/messages/unread-count'),

    // Get list of conversations for current user (claims + recoveries)
    getConversations: () =>
        api.get('/messages/conversations'),

    // --- Claim Conversations ---
    // Get or initialize a conversation by claim ID
    getByClaimId: (claimId) =>
        api.get(`/messages/conversations/claim/${claimId}`),

    // Get specific claim conversation and message history
    getConversationById: (id) =>
        api.get(`/messages/conversations/${id}`),

    // Send a message within a claim conversation
    sendMessage: (id, messageText) =>
        api.post(`/messages/conversations/${id}`, { messageText }),

    // Mark all unread incoming messages in a claim conversation as read
    markAsRead: (id) =>
        api.post(`/messages/conversations/${id}/read`),

    // Report an abusive or inappropriate claim message (Feature F)
    reportMessage: (messageId, reason, details) =>
        api.post(`/messages/messages/${messageId}/report`, { reason, details }),

    // --- Recovery Conversations ---
    // Get or initialize a conversation by recovery ID
    getByRecoveryId: (recoveryId) =>
        api.get(`/messages/conversations/recovery/${recoveryId}`),

    // Get specific recovery conversation and message history
    getRecoveryConversationById: (id) =>
        api.get(`/messages/recovery-conversations/${id}`),

    // Send a message within a recovery conversation
    sendRecoveryMessage: (id, messageText) =>
        api.post(`/messages/recovery-conversations/${id}`, { messageText }),

    // Mark all unread incoming messages in a recovery conversation as read
    markRecoveryAsRead: (id) =>
        api.post(`/messages/recovery-conversations/${id}/read`),

    // Report an abusive or inappropriate recovery message
    reportRecoveryMessage: (messageId, reason, details) =>
        api.post(`/messages/recovery-messages/${messageId}/report`, { reason, details }),
};
