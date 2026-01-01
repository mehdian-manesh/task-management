const React = require('react');

module.exports = {
  BrowserRouter: ({ children }) => React.createElement('div', null, children),
  Routes: ({ children }) => React.createElement('div', null, children),
  Route: ({ element }) => element || null,
  Navigate: ({ to }) => React.createElement('div', { 'data-testid': 'navigate' }, `navigate:${to}`),
  useNavigate: () => () => {},
};

