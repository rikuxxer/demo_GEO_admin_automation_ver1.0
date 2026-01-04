import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import './styles/globals.css';
import './utils/fixSampleDataRegistrationTime';

// ブラウザ拡張機能関連のエラーを無視するグローバルエラーハンドラー
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || String(event.reason);
  
  // 拡張機能関連のエラーは無視
  if (errorMessage.includes('message channel closed') || 
      errorMessage.includes('asynchronous response') ||
      errorMessage.includes('Extension context invalidated')) {
    event.preventDefault(); // エラーをコンソールに表示しない
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
