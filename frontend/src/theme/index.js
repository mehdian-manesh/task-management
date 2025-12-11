import { createTheme } from '@mui/material/styles';
import { faIR } from '@mui/material/locale';
import rtlPlugin from 'stylis-plugin-rtl';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';

// Create rtl cache
export const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

// Glassmorphism styles
export const glassmorphismStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
};

export const glassmorphismStyleDark = {
  background: 'rgba(0, 0, 0, 0.2)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
};

// Create theme function
export const createAppTheme = (mode = 'light') => createTheme(
  {
    direction: 'rtl',
    typography: {
      fontFamily: '"Vazir", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
        lineHeight: 1.2,
      },
      h2: {
        fontWeight: 700,
        fontSize: '2rem',
        lineHeight: 1.3,
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
        lineHeight: 1.4,
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
        lineHeight: 1.4,
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.5,
      },
      h6: {
        fontWeight: 600,
        fontSize: '1.125rem',
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    palette: {
      mode: mode,
      primary: {
        main: '#2563eb',
        light: '#3b82f6',
        dark: '#1e40af',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#7c3aed',
        light: '#8b5cf6',
        dark: '#6d28d9',
        contrastText: '#ffffff',
      },
      error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
      },
      info: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
      },
      success: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669',
      },
      background: {
        default: mode === 'dark' ? '#0f172a' : '#f8fafc',
        paper: mode === 'dark' ? '#1e293b' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#f1f5f9' : '#1e293b',
        secondary: mode === 'dark' ? '#94a3b8' : '#64748b',
      },
    },
    shape: {
      borderRadius: 6, // Reduced from 12 for less curve
    },
    shadows: [
      'none',
      '0px 1px 3px rgba(0, 0, 0, 0.05), 0px 1px 2px rgba(0, 0, 0, 0.1)',
      '0px 4px 6px -1px rgba(0, 0, 0, 0.05), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
      '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
      '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
      '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
      ...Array(19).fill('0px 25px 50px -12px rgba(0, 0, 0, 0.25)'),
    ],
    components: {
      MuiTextField: {
        defaultProps: {
          dir: 'rtl',
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 6,
            },
          },
        },
      },
      MuiFormControl: {
        defaultProps: {
          dir: 'rtl',
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            transformOrigin: 'right',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '10px 24px',
            fontWeight: 500,
          },
          contained: {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            background: mode === 'dark' 
              ? 'rgba(30, 41, 59, 0.6)' 
              : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: mode === 'dark'
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
              : '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: mode === 'dark'
                ? '0 12px 40px 0 rgba(0, 0, 0, 0.6)'
                : '0 12px 40px 0 rgba(31, 38, 135, 0.3)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            background: mode === 'dark'
              ? 'rgba(30, 41, 59, 0.6)'
              : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            backgroundImage: 'none',
          },
          elevation1: {
            boxShadow: mode === 'dark'
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
              : '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            '& .MuiChip-label': {
              fontWeight: 500,
            },
          },
          colorDefault: {
            backgroundColor: mode === 'dark'
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(0, 0, 0, 0.08)',
            color: mode === 'dark'
              ? '#ffffff'
              : '#1e293b',
            '& .MuiChip-label': {
              color: mode === 'dark'
                ? '#ffffff'
                : '#1e293b',
              fontWeight: 600,
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            '& .MuiChip-label': {
              fontWeight: 600,
            },
          },
        },
      },
    },
  },
  faIR
);