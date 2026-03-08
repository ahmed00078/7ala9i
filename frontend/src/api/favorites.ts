import apiClient from './client';

export const favoritesApi = {
  getAll: () =>
    apiClient.get('/favorites'),

  add: (salonId: string) =>
    apiClient.post('/favorites', { salon_id: salonId }),

  remove: (salonId: string) =>
    apiClient.delete(`/favorites/${salonId}`),
};
