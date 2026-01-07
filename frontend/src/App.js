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

  // Fix RTL InputLabel positioning for all labels in the application
  React.useEffect(() => {
    const fixedLabels = new WeakSet();
    let rafId = null;
    let debounceTimer = null;

    const fixLabelPositioning = (forceRefix = false) => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        const labels = document.querySelectorAll('.MuiInputLabel-root.MuiInputLabel-shrink');
        labels.forEach((label) => {
          if (!forceRefix && fixedLabels.has(label)) {
            const currentLeft = label.style.left;
            if (currentLeft && currentLeft.includes('px')) {
              const computedStyle = window.getComputedStyle(label);
              if (parseFloat(computedStyle.paddingRight) > 0 || parseFloat(computedStyle.paddingLeft) > 0) {
                label.style.setProperty('padding-right', '0', 'important');
                label.style.setProperty('padding-left', '0', 'important');
              }
              return;
            }
          }

          const parent = label.closest('.MuiFormControl-root');
          if (!parent) return;

          const isRtl = parent.getAttribute('dir') === 'rtl' ||
            window.getComputedStyle(parent).direction === 'rtl';
          if (!isRtl) return;

          label.style.setProperty('padding-right', '0', 'important');
          label.style.setProperty('padding-left', '0', 'important');
          // Never touch font/transform; only position. This avoids changing perceived font sizing.
          label.style.removeProperty('transform');

          const input = parent.querySelector('.MuiOutlinedInput-root');
          const inputComputed = input ? window.getComputedStyle(input) : null;
          const inputPaddingRight = inputComputed ? parseFloat(inputComputed.paddingRight) || 14 : 14;
          const parentRect = parent.getBoundingClientRect();
          const labelRect = label.getBoundingClientRect();
          const labelWidth = labelRect.width;

          // Calculate spacing: use minimal spacing to eliminate empty space on the right
          // Keep some spacing for long labels to prevent overflow
          const baseSpacing = inputPaddingRight;
          const spacingAdjustment = labelWidth > 200 ? -6 : (labelWidth > 100 ? -10 : -12);
          const spacing = Math.max(0, baseSpacing + spacingAdjustment);
          let newLeft = Math.max(0, parentRect.width - labelWidth - spacing);

          // Ensure label doesn't overflow: constrain to parent bounds
          // Set initial position
          label.style.setProperty('left', `${newLeft}px`, 'important');
          label.style.setProperty('right', 'unset', 'important');

          // Force reflow and re-measure to check for overflow
          void label.offsetHeight;
          const afterRect = label.getBoundingClientRect();
          const actualLabelWidth = afterRect.width;

          // If label overflows, adjust position

          if (afterRect.right > parentRect.right) {
            // Calculate the actual overflow amount
            const overflowAmount = afterRect.right - parentRect.right;
            // Calculate current left relative to parent
            const currentLeftRelative = afterRect.left - parentRect.left;
            // Calculate new left relative to parent to prevent overflow
            const adjustedLeftRelative = currentLeftRelative - overflowAmount - 1; // -1 for safety margin
            const adjustedLeft = Math.max(0, adjustedLeftRelative);

            label.style.setProperty('left', `${adjustedLeft}px`, 'important');

            // Force reflow and re-measure after adjustment
            void label.offsetHeight;
            const finalRect = label.getBoundingClientRect();
            // If still overflowing, clamp using right instead of transform (transform can affect visual sizing)
            if (finalRect.right > parentRect.right) {
              label.style.setProperty('left', 'auto', 'important');
              label.style.setProperty('right', `${spacing}px`, 'important');
            }
          }

          fixedLabels.add(label);
        });
        rafId = null;
      });
    };

    const debouncedFix = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fixLabelPositioning(), 50);
    };

    const handleInputFocus = (e) => {
      const formControl = e.target.closest('.MuiFormControl-root');
      if (formControl) {
        setTimeout(() => {
          const label = formControl.querySelector('.MuiInputLabel-root.MuiInputLabel-shrink');
          if (label) {
            fixedLabels.delete(label);
            fixLabelPositioning(true);
          }
        }, 50);
      }
    };

    const handleResize = () => {
      fixLabelPositioning(true);
    };

    const checkLabels = () => {
      const labels = document.querySelectorAll('.MuiInputLabel-root.MuiInputLabel-shrink');
      let hasUnfixedLabels = false;

      labels.forEach((label) => {
        if (!fixedLabels.has(label)) {
          hasUnfixedLabels = true;
        } else {
          const currentLeft = label.style.left;
          const computedStyle = window.getComputedStyle(label);
          const hasPadding = parseFloat(computedStyle.paddingRight) > 0 ||
            parseFloat(computedStyle.paddingLeft) > 0;

          if (!currentLeft || !currentLeft.includes('px') || hasPadding) {
            fixedLabels.delete(label);
            hasUnfixedLabels = true;
          }
        }
      });

      if (hasUnfixedLabels) {
        fixLabelPositioning(true);
      }
    };

    const handleDialogOpen = () => {
      [100, 300, 600].forEach((delay) => {
        setTimeout(() => fixLabelPositioning(true), delay);
      });
    };

    const observer = new MutationObserver((mutations) => {
      let shouldFix = false;

      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.classList?.contains('MuiInputLabel-root') &&
            target.classList.contains('MuiInputLabel-shrink')) {
            fixedLabels.delete(target);
            shouldFix = true;
          }
        }

        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;

            if (node.classList?.contains('MuiDialog-root') ||
              node.querySelector?.('.MuiDialog-root')) {
              handleDialogOpen();
              shouldFix = true;
            } else if (node.classList?.contains('MuiInputLabel-root') ||
              node.querySelector?.('.MuiInputLabel-root.MuiInputLabel-shrink')) {
              shouldFix = true;
            }
          }
        }

        if (shouldFix) break;
      }

      if (shouldFix) {
        debouncedFix();
      }
    });

    setTimeout(fixLabelPositioning, 200);
    const intervalId = setInterval(checkLabels, 300);

    document.addEventListener('focusin', handleInputFocus);
    window.addEventListener('resize', handleResize);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      clearInterval(intervalId);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleInputFocus);
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
