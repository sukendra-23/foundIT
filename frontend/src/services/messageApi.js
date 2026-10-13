import api from './api';

export const messageApi = {
    // Get total unread count for current user
    getUnreadCount: () =>
        api.get('/messages/unread-count'),

    // Get list of conversations for current user
    getConversations: () =>
        api.get('/messages/conversations'),

    // Get or initialize a conversation by claim ID
    getByClaimId: (claimId) =>
        api.get(`/messages/conversations/claim/${claimId}`),

    // Get specific conversation and message history
    getConversationById: (id) =>
        api.get(`/messages/conversations/${id}`),

    // Send a message within a conversation
    sendMessage: (id, messageText) =>
        api.post(`/messages/conversations/${id}`, { messageText }),

    // Mark all unread incoming messages in a conversation as read
    markAsRead: (id) =>
        api.post(`/messages/conversations/${id}/read`),

    // Report an abusive or inappropriate message (Feature F)
    reportMessage: (messageId, reason, details) =>
        api.post(`/messages/messages/${messageId}/report`, { reason, details }),
};
