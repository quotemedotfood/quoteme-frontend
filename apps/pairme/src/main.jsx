import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import PairMeApp from './routes.jsx';
import './lib/theme.css';

/**
 * Mocked endpoints only (see mocks/handlers.js): the real backend is not
 * deployed for GET /v1/demo, GET /v1/rules/bundle, POST /v1/pairings, or the
 * demo POST /v1/session/profile pair. Everything else (GET /v1/venues, the
 * rest of onboarding) bypasses to the real network unchanged.
 */
function renderApp() {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFEEEA', padding: '24px 12px' }}>
        <BrowserRouter>
          <PairMeApp />
        </BrowserRouter>
      </div>
    </React.StrictMode>
  );
}

import('./mocks/browser.js')
  .then(({ startMockWorker }) => startMockWorker())
  .catch(() => {})
  .then(renderApp);
