import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../api/services';
import {jwtDecode} from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    if (token) {
      const loadUser = async () => {
        try {
          const decoded = jwtDecode(token);
          // Try to get user info from API to ensure we have is_staff
          try {
            const response = await authService.getCurrentUser();
            setUser({
              id: response.data.id,
              username: response.data.username,
              isAdmin: response.data.is_staff || false,
            });
          } catch (apiError) {
            // Fallback to token if API call fails
            setUser({
              id: decoded.user_id,
              isAdmin: decoded.is_staff || false,
            });
          }
        } catch (error) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        } finally {
          setLoading(false);
        }
      };
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
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
          isAdmin: userResponse.data.is_staff || false,
        });
      } catch (apiError) {
        // Fallback to token if API call fails
        const decoded = jwtDecode(access);
        setUser({
          id: decoded.user_id,
          username,
          isAdmin: decoded.is_staff || false,
        });
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
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
