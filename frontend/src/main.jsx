import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { initSentry, SentryErrorBoundary } from './lib/sentry.js';
import './index.css';

initSentry();

function CrashFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="max-w-md rounded-xl border border-red-400/30 bg-red-400/10 p-6 text-center">
        <p className="text-sm font-semibold text-red-300">Corvus hit an error.</p>
        <p className="mt-2 text-sm text-red-200/70">
          The page couldn't render. Reload to try again — your data is safe.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-red-400/20 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-400/30"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SentryErrorBoundary fallback={<CrashFallback />}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SentryErrorBoundary>
  </React.StrictMode>,
);
