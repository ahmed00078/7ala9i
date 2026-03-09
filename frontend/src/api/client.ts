import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

// For physical device: replace with your PC's local IP (e.g. 192.168.1.X)
// Run `ipconfig` on Windows to find it (look for IPv4 Address)
const DEV_HOST = 'YOUR_PC_IP';

function getApiUrl(): string {
  // Try to get API URL from app.json (Expo constants)
  const appExtra = Constants.expoConfig?.extra as any;
  const productionUrl = appExtra?.apiUrl;

  if (!__DEV__) {
    // Production build: use URL from app.json or fallback
    return productionUrl || 'https://7ala9i-production.up.railway.app/api/v1';
  }

  // Development: prioritize local backend by IP, then emulator/simulator defaults
  if (DEV_HOST !== 'YOUR_PC_IP') {
    return `http://${DEV_HOST}:8000/api/v1`;
  }
  
  // Emulator/simulator defaults
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'   // Android emulator → host machine
    : 'http://localhost:8000/api/v1';   // iOS simulator
}

const API_URL = getApiUrl();

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await storage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) {
        await storage.clearTokens();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        await storage.setAccessToken(data.access_token);
        await storage.setRefreshToken(data.refresh_token);

        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch {
        await storage.clearTokens();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
