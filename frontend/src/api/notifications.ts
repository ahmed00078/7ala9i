import apiClient from './client';

export const notificationsApi = {
  getAll: (params?: { limit?: number; offset?: number }) =>
    apiClient.get('/notifications', { params }),

  getUnreadCount: () =>
    apiClient.get('/notifications/unread-count'),

  markAsRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.patch('/notifications/read-all'),

  registerPushToken: (expo_token: string, platform: string | null) =>
    apiClient.post('/push-tokens', { expo_token, platform }),
};
