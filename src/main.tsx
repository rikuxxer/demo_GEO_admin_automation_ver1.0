import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import './styles/globals.css';
import './utils/fixSampleDataRegistrationTime';

declare global {
  interface Window {
    process?: {
      env?: Record<string, string | undefined>;
    };
  }
}

// process.env を参照する既存コードのためのフォールバック（本番での ReferenceError を防止）
if (!window.process) {
  window.process = { env: {} };
}
if (!window.process.env) {
  window.process.env = {};
}
window.process.env.NODE_ENV = import.meta.env.MODE;
if (!window.process.env.GOOGLE_MAPS_API_KEY) {
  window.process.env.GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
}

// 拡張機能起因のエラーかどうかを判定（メッセージ文字列で判定）
function isExtensionRelatedError(message: string): boolean {
  const s = message.toLowerCase();
  return (
    s.includes('message channel closed') ||
    s.includes('asynchronous response') ||
    s.includes('extension context invalidated') ||
    s.includes('listener indicated an asynchronous response') ||
    s.includes('message channel closed before a response') ||
    s.includes('a listener indicated an asynchronous response')
  );
}

// ブラウザ拡張機能関連の Promise 拒否を最優先で握りつぶし、他リスナーや React への伝播を防いでフリーズを軽減
window.addEventListener(
  'unhandledrejection',
  (event) => {
    const message = event.reason?.message ?? (typeof event.reason === 'string' ? event.reason : '');
    if (!isExtensionRelatedError(message)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (import.meta.env.DEV) {
      console.debug('[拡張起因] 握りつぶし:', message.slice(0, 80));
    }
  },
  { capture: true }
);

// 同期的に投げられた拡張起因のエラーも握りつぶし（フリーズ・コンソールノイズ軽減）
window.addEventListener(
  'error',
  (event) => {
    const message = event.message || (event.error && (event.error as Error).message) || '';
    if (!isExtensionRelatedError(message)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (import.meta.env.DEV) {
      console.debug('[拡張起因] 握りつぶし:', message.slice(0, 80));
    }
    return true;
  },
  { capture: true }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
