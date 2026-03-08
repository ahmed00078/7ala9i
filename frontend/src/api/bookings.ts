import apiClient from './client';

export const bookingsApi = {
  create: (data: {
    salon_id: string;
    service_id: string;
    booking_date: string;
    start_time: string;
  }) => apiClient.post('/bookings', data),

  getMyBookings: (params?: { status?: string }) =>
    apiClient.get('/bookings', { params }),

  reschedule: (id: string, data: { booking_date: string; start_time: string }) =>
    apiClient.put(`/bookings/${id}/reschedule`, data),

  cancel: (id: string) =>
    apiClient.put(`/bookings/${id}/cancel`),
};
