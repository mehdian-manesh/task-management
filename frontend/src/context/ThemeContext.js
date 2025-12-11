import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    // Load from localStorage or default to 'system'
    const saved = localStorage.getItem('themeMode');
    return saved || 'system';
  });

  const [actualMode, setActualMode] = useState(() => {
    const saved = localStorage.getItem('themeMode');
    if (saved === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return saved || 'light';
  });

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('themeMode', themeMode);

    // Determine actual mode
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setActualMode(mediaQuery.matches ? 'dark' : 'light');

      // Listen for system theme changes
      const handleChange = (e) => {
        setActualMode(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setActualMode(themeMode);
    }
  }, [themeMode]);

  const value = {
    themeMode,
    actualMode,
    setThemeMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

