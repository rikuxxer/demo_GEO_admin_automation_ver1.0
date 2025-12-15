import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import './index.css';
import './styles/globals.css';
import './utils/fixSampleDataRegistrationTime';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster position="top-right" richColors />
    </ErrorBoundary>
  </React.StrictMode>
);
