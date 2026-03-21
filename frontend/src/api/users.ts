import apiClient from './client';

export const usersApi = {
  getProfile: () =>
    apiClient.get('/users/me'),

  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    language_pref?: string;
  }) => apiClient.put('/users/me', data),

  changePassword: (old_password: string, new_password: string) =>
    apiClient.put('/users/me/password', { old_password, new_password }),

  deleteAccount: (password: string) =>
    apiClient.delete('/users/me', { data: { password } }),
};
