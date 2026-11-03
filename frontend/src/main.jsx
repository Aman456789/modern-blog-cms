// frontend/src/main.jsx
//
// React DOM entry point. This file has one job: mount the root component
// tree into #root. All provider hierarchy lives in RootLayout.jsx so
// this file stays trivially small and testable.
//
// Provider stacking order (outer → inner):
//   StrictMode → BrowserRouter → RootLayout (QueryClient, etc.) → App
//
// BrowserRouter must wrap App because App uses <Routes> / <Route> directly.
// RootLayout sits inside BrowserRouter so layout components can use
// useNavigate / useLocation if needed.

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.jsx';

// Global stylesheet — Tailwind directives + CSS custom properties.
// Must be imported here so it applies to every route.
import './assets/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
