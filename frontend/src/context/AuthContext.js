import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { authService, sessionService } from '../api/services';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { collectDeviceInfo } from '../utils/deviceInfo';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

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

  try {
    const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    const response = await axios.post(`${API_URL}/api/token/refresh/`, {
      refresh: refreshToken,
    });

    const { access } = response.data;
    localStorage.setItem('access_token', access);
    return access;
  } catch (error) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    throw error;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef(null);

  // Function to set up token refresh interval
  const setupTokenRefresh = () => {
    // Clear existing interval if any
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Check token expiration every 5 minutes
    refreshIntervalRef.current = setInterval(async () => {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken && isTokenExpiredOrExpiringSoon(accessToken)) {
        try {
          await refreshAccessToken();
        } catch (error) {
          // If refresh fails, logout user
          setUser(null);
          clearInterval(refreshIntervalRef.current);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  };

  useEffect(() => {
    // Check if user is already logged in
    const initializeAuth = async () => {
      let accessToken = localStorage.getItem('access_token');
      
      if (accessToken) {
        try {
          // Check if token is expired or expiring soon
          if (isTokenExpiredOrExpiringSoon(accessToken)) {
            // Try to refresh the token
            try {
              accessToken = await refreshAccessToken();
            } catch (refreshError) {
              // If refresh fails, clear tokens and exit
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              setLoading(false);
              return;
            }
          }

          // Decode token to get user info
          const decoded = jwtDecode(accessToken);
          
          // Try to get user info from API to ensure we have is_staff
          try {
            const response = await authService.getCurrentUser();
            setUser({
              id: response.data.id,
              username: response.data.username,
              email: response.data.email,
              first_name: response.data.first_name,
              last_name: response.data.last_name,
              isAdmin: response.data.is_staff || false,
              profile_picture: response.data.profile_picture || null,
            });
          } catch (apiError) {
            // Fallback to token if API call fails
            setUser({
              id: decoded.user_id,
              username: decoded.username || decoded.user_id,
              isAdmin: decoded.is_staff || false,
              profile_picture: null,
            });
          }

          // Set up automatic token refresh
          setupTokenRefresh();
        } catch (error) {
          // If token is invalid, clear it
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      
      setLoading(false);
    };

    initializeAuth();

    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const login = async (username, password) => {
    // Collect device info before login
    const deviceInfo = collectDeviceInfo();
    try {
      const response = await authService.login(username, password);
      const { access, refresh } = response.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      // Get user info from API to ensure we have is_staff
      try {
        const userResponse = await authService.getCurrentUser();
        setUser({
          id: userResponse.data.id,
          username: userResponse.data.username,
          email: userResponse.data.email,
          first_name: userResponse.data.first_name,
          last_name: userResponse.data.last_name,
          isAdmin: userResponse.data.is_staff || false,
          profile_picture: userResponse.data.profile_picture || null,
        });
      } catch (apiError) {
        // Fallback to token if API call fails
        const decoded = jwtDecode(access);
        setUser({
          id: decoded.user_id,
          username,
          isAdmin: decoded.is_staff || false,
          profile_picture: null,
        });
      }

      // Set up automatic token refresh after login
      setupTokenRefresh();
      
      // Update device info for the newly created session
      try {
        const decoded = jwtDecode(access);
        const jti = decoded.jti;
        // Find the session and update device info
        // We'll get all sessions and find the one with matching JTI
        const sessionsResponse = await sessionService.getAll();
        const sessions = sessionsResponse.data.results || sessionsResponse.data;
        const currentSession = Array.isArray(sessions) 
          ? sessions.find(s => s.token_jti === jti)
          : null;
        
        if (currentSession && deviceInfo) {
          await sessionService.updateDeviceInfo(currentSession.id, {
            screen_width: deviceInfo.screen_width,
            screen_height: deviceInfo.screen_height,
          });
        }
      } catch (deviceInfoError) {
        // Non-critical error, just log it
        console.error('Error updating device info:', deviceInfoError);
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'خطا در ورود به سیستم' 
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  const value = {
    user,
    setUser,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
