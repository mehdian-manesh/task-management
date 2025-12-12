import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to check if token is expired or will expire soon
const isTokenExpiredOrExpiringSoon = (token) => {
  if (!token) return true;
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    const expirationTime = decoded.exp;
    // Consider token expired if it expires in less than 5 minutes (300 seconds)
    return expirationTime - currentTime < 300;
  } catch (error) {
    return true;
  }
};

// Helper function to refresh access token
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(`${API_URL}/api/token/refresh/`, {
    refresh: refreshToken,
  });

  const { access } = response.data;
  localStorage.setItem('access_token', access);
  return access;
};

// Add token to requests and refresh if needed
axiosInstance.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('access_token');
    
    // Check if token exists and is expired or expiring soon
    if (token && isTokenExpiredOrExpiringSoon(token)) {
      try {
        // Try to refresh the token before making the request
        token = await refreshAccessToken();
      } catch (refreshError) {
        // If refresh fails, the request will proceed without token
        // The response interceptor will handle the 401
        console.error('Token refresh failed:', refreshError);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If request data is FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_URL}/api/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
