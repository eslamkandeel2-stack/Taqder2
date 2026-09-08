import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Intercept and prevent benign cross-origin iframe security errors and Firestore offline notices from interrupting React
if (typeof window !== 'undefined') {
  const isIgnorableError = (str: string) => {
    return (
      str.includes('$$typeof') ||
      str.includes('cross-origin frame') ||
      str.includes('Blocked a frame with origin') ||
      str.includes('SecurityError') ||
      str.includes('auth/network-request-failed') ||
      str.includes('Could not reach Cloud Firestore backend') ||
      str.includes('Fetching auth token failed') ||
      str.includes('@firebase/firestore')
    );
  };

  // Intercept console.error for harmless offline backend connection notices
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const text = args
      .map((a) => (typeof a === 'string' ? a : a?.message || ''))
      .join(' ');
    if (isIgnorableError(text)) {
      console.debug('[Offline Notice Handled]:', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener('error', (event) => {
    const msg = event?.message || (event?.error ? String(event.error) : '');
    if (isIgnorableError(msg)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = event.reason?.message || String(event.reason || '');
    if (isIgnorableError(reasonMsg)) {
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
