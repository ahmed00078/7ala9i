import apiClient from './client';

export const usersApi = {
  getProfile: () =>
    apiClient.get('/users/me'),

  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    language_pref?: string;
  }) => apiClient.put('/users/me', data),
};
