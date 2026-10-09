import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import App from './App.jsx';
import { InstallProvider } from './InstallApp.jsx';
import './styles.css';
import './call-styles.css';
import './battery-styles.css';
import './invisible-ink.css';
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <InstallProvider><App /></InstallProvider>
  </React.StrictMode>,
);
if (window.isSecureContext && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { type: 'module', updateViaCache: 'none' }).catch(() => {});
  });
}
