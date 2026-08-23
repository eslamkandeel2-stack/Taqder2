import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Intercept and prevent benign cross-origin iframe security errors from interrupting React
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event?.message || (event?.error ? String(event.error) : '');
    if (
      msg.includes('$$typeof') ||
      msg.includes('cross-origin frame') ||
      msg.includes('Blocked a frame with origin') ||
      msg.includes('SecurityError')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = event.reason?.message || String(event.reason || '');
    if (
      reasonMsg.includes('$$typeof') ||
      reasonMsg.includes('cross-origin frame') ||
      reasonMsg.includes('Blocked a frame with origin') ||
      reasonMsg.includes('SecurityError')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
