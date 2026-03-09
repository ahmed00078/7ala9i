import apiClient from './client';

export const ownerApi = {
  getDashboard: () =>
    apiClient.get('/owner/dashboard'),

  getAppointments: (params?: { date?: string; week?: boolean }) =>
    apiClient.get('/owner/appointments', { params }),

  getSalon: () =>
    apiClient.get('/owner/salon'),

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

  updateBookingStatus: (id: string, newStatus: 'completed' | 'no_show' | 'cancelled') =>
    apiClient.patch(`/owner/appointments/${id}/status`, { status: newStatus }),

  getWorkingHours: () =>
    apiClient.get('/owner/working-hours'),

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
