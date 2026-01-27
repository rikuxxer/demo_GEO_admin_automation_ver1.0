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

// ブラウザ拡張機能関連のエラーを無視するグローバルエラーハンドラー
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || String(event.reason);
  const errorString = errorMessage.toLowerCase();
  
  // 拡張機能関連のエラーは無視
  if (errorString.includes('message channel closed') || 
      errorString.includes('asynchronous response') ||
      errorString.includes('extension context invalidated') ||
      errorString.includes('listener indicated an asynchronous response') ||
      errorString.includes('message channel closed before a response')) {
    event.preventDefault(); // エラーをコンソールに表示しない
    event.stopPropagation(); // イベントの伝播を停止
    console.debug('🔇 拡張機能関連のエラーを無視しました:', errorMessage);
    return;
  }
  
  // その他のエラーは通常通り処理
});

// グローバルエラーハンドラー（同期的なエラーも捕捉）
window.addEventListener('error', (event) => {
  const errorMessage = event.message || String(event.error);
  const errorString = errorMessage.toLowerCase();
  
  // 拡張機能関連のエラーは無視
  if (errorString.includes('message channel closed') || 
      errorString.includes('asynchronous response') ||
      errorString.includes('extension context invalidated') ||
      errorString.includes('listener indicated an asynchronous response') ||
      errorString.includes('message channel closed before a response')) {
    event.preventDefault(); // エラーをコンソールに表示しない
    event.stopPropagation(); // イベントの伝播を停止
    console.debug('🔇 拡張機能関連のエラーを無視しました:', errorMessage);
    return;
  }
  
  // その他のエラーは通常通り処理
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
