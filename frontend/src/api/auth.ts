import apiClient from './client';

export const authApi = {
  login: (identifier: string, password: string) =>
    apiClient.post('/auth/login', { identifier, password }),

  register: (data: {
    phone: string;
    email?: string;
    password: string;
    first_name: string;
    last_name: string;
    role: 'client' | 'owner';
  }) => apiClient.post('/auth/register', data),

  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
};
