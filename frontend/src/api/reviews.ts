import apiClient from './client';

export const reviewsApi = {
  create: (data: { booking_id: string; rating: number; comment?: string }) =>
    apiClient.post('/reviews', data),
};
