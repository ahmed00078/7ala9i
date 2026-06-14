import apiClient from './client';

export const ownerApi = {
  getDashboard: () =>
    apiClient.get('/owner/dashboard'),

  getAppointments: (params?: { date?: string; week?: boolean; month?: boolean }) =>
    apiClient.get('/owner/appointments', { params }),

  getSalon: () =>
    apiClient.get('/owner/salon'),

  updateSalon: (data: {
    name?: string;
    name_ar?: string;
    description?: string;
    description_ar?: string;
    address?: string;
    city?: string;
    phone?: string;
    lat?: number;
    lng?: number;
  }) => apiClient.patch('/owner/salon', data),

  createCategory: (data: { name: string; name_ar?: string; sort_order?: number }) =>
    apiClient.post('/owner/categories', data),

  updateCategory: (id: string, data: { name?: string; name_ar?: string; sort_order?: number }) =>
    apiClient.put(`/owner/categories/${id}`, data),

  deleteCategory: (id: string) =>
    apiClient.delete(`/owner/categories/${id}`),

  createService: (data: {
    category_id: string;
    name: string;
    name_ar?: string;
    price: number;
    duration: number;
    is_active?: boolean;
  }) => apiClient.post('/owner/services', data),

  updateService: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/owner/services/${id}`, data),

  deleteService: (id: string) =>
    apiClient.delete(`/owner/services/${id}`),

  updateBookingStatus: (
    id: string,
    newStatus: 'completed' | 'no_show' | 'cancelled',
    paymentMethod?: 'cash' | 'mobile' | null,
  ) =>
    apiClient.patch(`/owner/appointments/${id}/status`, {
      status: newStatus,
      ...(paymentMethod !== undefined ? { payment_method: paymentMethod } : {}),
    }),

  getEarnings: (params: {
    period: 'today' | 'week' | 'month' | 'custom';
    from?: string;
    to?: string;
  }) => apiClient.get('/owner/earnings', { params }),

  createBooking: (data: {
    phone: string;
    first_name: string;
    last_name?: string;
    service_id: string;
    booking_date: string;
    start_time: string;
  }) => apiClient.post('/owner/bookings', data),

  getWorkingHours: () =>
    apiClient.get('/owner/working-hours'),

  // ── Closures (Eid, sick days, lunch breaks) ───────────────────────────
  listClosures: (params?: { from?: string; to?: string }) =>
    apiClient.get('/owner/closures', { params }),

  createClosure: (data: { start_at: string; end_at: string; reason?: string | null }) =>
    apiClient.post('/owner/closures', data),

  updateClosure: (
    id: string,
    data: { start_at?: string; end_at?: string; reason?: string | null },
  ) => apiClient.patch(`/owner/closures/${id}`, data),

  deleteClosure: (id: string) => apiClient.delete(`/owner/closures/${id}`),

  // ── Reviews + owner replies ───────────────────────────────────────────
  listReviews: () => apiClient.get('/owner/reviews'),

  replyToReview: (id: string, text: string) =>
    apiClient.post(`/owner/reviews/${id}/reply`, { text }),

  updateReviewReply: (id: string, text: string) =>
    apiClient.patch(`/owner/reviews/${id}/reply`, { text }),

  deleteReviewReply: (id: string) =>
    apiClient.delete(`/owner/reviews/${id}/reply`),

  updateWorkingHours: (data: {
    hours: Array<{
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_closed: boolean;
    }>;
  }) => apiClient.put('/owner/working-hours', data),

  // Photo management
  uploadPhoto: (formData: FormData) => {
    return apiClient.post('/owner/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deletePhoto: (photoId: string) => {
    return apiClient.delete(`/owner/photos/${photoId}`);
  },
};
