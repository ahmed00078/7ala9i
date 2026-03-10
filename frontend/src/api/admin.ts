import apiClient from './client';

export const adminApi = {
  getStats: () =>
    apiClient.get('/admin/stats'),

  listOwners: (pendingOnly?: boolean) =>
    apiClient.get('/admin/owners', { params: pendingOnly ? { pending_only: true } : {} }),

  approveOwner: (ownerId: string, data: {
    salon_name: string;
    salon_name_ar?: string;
    address?: string;
    city?: string;
    salon_phone?: string;
  }) => apiClient.post(`/admin/owners/${ownerId}/approve`, data),

  rejectOwner: (ownerId: string) =>
    apiClient.delete(`/admin/owners/${ownerId}/reject`),

  createOwner: (data: {
    email: string;
    password: string;
    phone?: string;
    first_name: string;
    last_name: string;
    salon_name: string;
    salon_name_ar?: string;
    address?: string;
    city?: string;
    salon_phone?: string;
  }) => apiClient.post('/admin/owners', data),
};
