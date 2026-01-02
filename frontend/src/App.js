import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useThemeMode } from './context/ThemeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { CacheProvider } from '@emotion/react';
import { createAppTheme, cacheRtl } from './theme';
import { toPersianNumbers } from './utils/numberUtils';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>در حال بارگذاری...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function ThemedAppContent() {
  const { actualMode } = useThemeMode();
  const theme = createAppTheme(actualMode);

  // Update body class for background
  React.useEffect(() => {
    if (actualMode === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [actualMode]);

  // Convert all numbers in the DOM to Persian numerals (fallback for any missed numbers)
  React.useEffect(() => {
    // Use WeakSet to track processed text nodes (text nodes don't have dataset property)
    const processedNodes = new WeakSet();

    const convertTextNodes = (root) => {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // Skip script and style tags
            const parent = node.parentElement;
            if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
              return NodeFilter.FILTER_REJECT;
            }
            // Skip if already processed
            if (processedNodes.has(node)) {
              return NodeFilter.FILTER_REJECT;
            }
            // Only process if contains digits
            if (node.textContent && /\d/.test(node.textContent)) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          }
        }
      );

      let textNode;
      while ((textNode = walker.nextNode())) {
        const text = textNode.textContent;
        if (text && /\d/.test(text)) {
          const persianText = toPersianNumbers(text);
          if (text !== persianText) {
            textNode.textContent = persianText;
            processedNodes.add(textNode);
          }
        }
      }
    };

    // Initial conversion
    const timeoutId = setTimeout(() => {
      convertTextNodes(document.body);
    }, 100);

    // Use MutationObserver for dynamic content
    const observer = new MutationObserver(() => {
      convertTextNodes(document.body);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        autoHideDuration={4000}
      >
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </SnackbarProvider>
    </MuiThemeProvider>
  );
}

function AppContent() {
  return <ThemedAppContent />;
}

function App() {
  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}

export default App;
