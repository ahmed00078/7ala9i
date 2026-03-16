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
    language?: string;
  }) => apiClient.post('/auth/register', data),

  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refresh_token: refreshToken }),

  verifyOtp: (phone: string, code: string) =>
    apiClient.post('/auth/verify-otp', { phone, code }),

  resendOtp: (phone: string, language: string) =>
    apiClient.post('/auth/resend-otp', { phone, language }),
};
