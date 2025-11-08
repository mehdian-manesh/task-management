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

// Theme configuration
export const theme = createTheme(
  {
    direction: 'rtl',
    typography: {
      fontFamily: '"Vazir", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiTextField: {
        defaultProps: {
          dir: 'rtl',
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
    },
    palette: {
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#9c27b0',
      },
      error: {
        main: '#f44336',
      },
      warning: {
        main: '#ff9800',
      },
      info: {
        main: '#2196f3',
      },
      success: {
        main: '#4caf50',
      },
    },
  },
  faIR
);