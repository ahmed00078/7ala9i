import apiClient from './client';

export const salonsApi = {
  search: (params: { q?: string; city?: string; lat?: number; lng?: number; page?: number; per_page?: number }) =>
    apiClient.get('/salons', { params }),

  getDetail: (id: string) =>
    apiClient.get(`/salons/${id}`),

  getReviews: (id: string, params?: { page?: number; per_page?: number }) =>
    apiClient.get(`/salons/${id}/reviews`, { params }),

  getAvailability: (id: string, params: { date: string; service_id: string }) =>
    apiClient.get(`/salons/${id}/availability`, { params }),
};
