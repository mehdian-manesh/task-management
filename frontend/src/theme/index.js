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

// Enhanced Liquid Glass styles
export const glassmorphismStyle = {
  background: 'rgba(255, 255, 255, 0.15)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
  },
};

export const glassmorphismStyleDark = {
  background: 'rgba(15, 23, 42, 0.4)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
  },
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
        default: mode === 'dark' 
          ? 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f172a 100%)' 
          : 'linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 50%, #f8fafc 100%)',
        paper: mode === 'dark' 
          ? 'rgba(15, 23, 42, 0.4)' 
          : 'rgba(255, 255, 255, 0.15)',
      },
      text: {
        primary: mode === 'dark' ? '#f1f5f9' : '#1e293b',
        secondary: mode === 'dark' ? '#94a3b8' : '#64748b',
      },
    },
    shape: {
      borderRadius: 6, // Maximum border radius for cards and boxes
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
              background: mode === 'dark'
                ? 'rgba(15, 23, 42, 0.3)'
                : 'rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '& fieldset': {
                borderColor: mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              },
              '&:hover fieldset': {
                borderColor: mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(255, 255, 255, 0.4)',
              },
              '&.Mui-focused': {
                background: mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.4)'
                  : 'rgba(255, 255, 255, 0.15)',
                '& fieldset': {
                  borderColor: mode === 'dark'
                    ? 'rgba(99, 102, 241, 0.5)'
                    : 'rgba(37, 99, 235, 0.5)',
                  borderWidth: '2px',
                  boxShadow: mode === 'dark'
                    ? '0 0 0 3px rgba(99, 102, 241, 0.1)'
                    : '0 0 0 3px rgba(37, 99, 235, 0.1)',
                },
              },
            },
          },
        },
      },
      MuiFormControl: {
        defaultProps: {
          dir: 'rtl',
        },
        styleOverrides: {
          root: {
            '& .MuiInputLabel-root': {
              marginBottom: '2px',
            },
            '& .MuiInputBase-root': {
              marginTop: '0 !important',
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            transformOrigin: 'right',
            display: 'flex',
            flexDirection: 'row-reverse',
            justifyContent: 'flex-end',
            marginBottom: '2px',
            paddingRight: '12px',
            '& .MuiInputLabel-asterisk': {
              order: 1,
              marginRight: '4px',
              marginLeft: 0,
            },
            '&.MuiInputLabel-shrink': {
              transformOrigin: 'right',
              paddingRight: '0 !important',
              paddingLeft: '0 !important',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '10px 24px',
            fontWeight: 500,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
          contained: {
            background: mode === 'dark'
              ? 'rgba(37, 99, 235, 0.3)'
              : '#2563eb',
            color: '#ffffff',
            border: mode === 'dark'
              ? '1px solid rgba(37, 99, 235, 0.3)'
              : '1px solid rgba(37, 99, 235, 0.5)',
            boxShadow: mode === 'dark'
              ? '0 4px 16px 0 rgba(37, 99, 235, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 2px 8px 0 rgba(37, 99, 235, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            '&:hover': {
              background: mode === 'dark'
                ? 'rgba(37, 99, 235, 0.4)'
                : '#1d4ed8',
              boxShadow: mode === 'dark'
                ? '0 8px 24px 0 rgba(37, 99, 235, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                : '0 4px 12px 0 rgba(37, 99, 235, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              transform: 'translateY(-2px)',
            },
            '&:disabled': {
              background: mode === 'dark'
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.12)',
              color: mode === 'dark'
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(0, 0, 0, 0.26)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            background: mode === 'dark' 
              ? 'rgba(15, 23, 42, 0.4)' 
              : 'rgba(255, 255, 255, 0.15)',
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.2)'
              : '1px solid rgba(0, 0, 0, 0.12)',
            boxShadow: mode === 'dark'
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: mode === 'dark'
                ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
            },
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: mode === 'dark'
                ? '0 16px 48px 0 rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                : '0 4px 12px 0 rgba(31, 38, 135, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
              border: mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.2)'
                : '1px solid rgba(255, 255, 255, 0.4)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            background: mode === 'dark'
              ? 'rgba(15, 23, 42, 0.4)'
              : 'rgba(255, 255, 255, 0.15)',
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.15)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            backgroundImage: 'none',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: mode === 'dark'
                ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
            },
          },
          elevation1: {
            boxShadow: mode === 'dark'
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 2px 8px 0 rgba(31, 38, 135, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            '& .MuiChip-label': {
              fontWeight: 500,
            },
          },
          colorDefault: {
            background: mode === 'dark'
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(255, 255, 255, 0.2)',
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.15)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            color: mode === 'dark'
              ? '#ffffff'
              : '#1e293b',
            boxShadow: mode === 'dark'
              ? '0 2px 8px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 2px 8px 0 rgba(31, 38, 135, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
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
            background: mode === 'dark'
              ? '#0f172a'
              : '#ffffff',
            backgroundImage: 'none !important',
            '--Paper-overlay': 'none !important',
            '&::before': {
              display: 'none',
            },
            '&::after': {
              display: 'none',
            },
            '& .MuiChip-label': {
              fontWeight: 600,
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            background: mode === 'dark'
              ? 'rgba(15, 23, 42, 1)'
              : 'rgba(255, 255, 255, 1)',
            backgroundImage: 'none',
            '--Paper-overlay': 'none',
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark'
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(255, 255, 255, 0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark'
                ? 'rgba(255, 255, 255, 0.25)'
                : 'rgba(255, 255, 255, 0.4)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark'
                ? 'rgba(99, 102, 241, 0.5)'
                : 'rgba(37, 99, 235, 0.5)',
            },
          },
          outlined: {
            background: mode === 'dark'
              ? 'rgba(15, 23, 42, 1)'
              : 'rgba(255, 255, 255, 1)',
            '&:hover': {
              background: mode === 'dark'
                ? 'rgba(15, 23, 42, 1)'
                : 'rgba(255, 255, 255, 1)',
            },
            '&.Mui-focused': {
              background: mode === 'dark'
                ? 'rgba(15, 23, 42, 1)'
                : 'rgba(255, 255, 255, 1)',
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            background: mode === 'dark'
              ? 'rgba(15, 23, 42, 1)'
              : 'rgba(255, 255, 255, 1)',
            backgroundImage: 'none',
            '--Paper-overlay': 'none',
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.15)'
              : '1px solid rgba(0, 0, 0, 0.12)',
            boxShadow: mode === 'dark'
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.6)'
              : '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            '&::before': {
              display: 'none',
            },
            '&::after': {
              display: 'none',
            },
          },
          list: {
            background: mode === 'dark'
              ? 'rgba(15, 23, 42, 1)'
              : 'rgba(255, 255, 255, 1)',
            padding: '4px 0',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            background: mode === 'dark'
              ? 'rgba(15, 23, 42, 1)'
              : 'rgba(255, 255, 255, 1)',
            '&:hover': {
              background: mode === 'dark'
                ? 'rgba(30, 41, 59, 1)'
                : 'rgba(241, 245, 249, 1)',
            },
            '&.Mui-selected': {
              background: mode === 'dark'
                ? 'rgba(37, 99, 235, 0.2)'
                : 'rgba(37, 99, 235, 0.1)',
              '&:hover': {
                background: mode === 'dark'
                  ? 'rgba(37, 99, 235, 0.3)'
                  : 'rgba(37, 99, 235, 0.15)',
              },
            },
          },
        },
      },
      MuiPopper: {
        styleOverrides: {
          root: {
            '& .MuiPaper-root': {
              background: mode === 'dark'
                ? 'rgba(15, 23, 42, 1) !important'
                : 'rgba(255, 255, 255, 1) !important',
              backgroundImage: 'none !important',
              '--Paper-overlay': 'none !important',
            },
          },
        },
      },
    },
  },
  faIR
);