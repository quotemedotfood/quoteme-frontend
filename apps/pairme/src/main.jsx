import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import PairMeApp from './routes.jsx';
import './lib/theme.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFEEEA', padding: '24px 12px' }}>
      <BrowserRouter>
        <PairMeApp />
      </BrowserRouter>
    </div>
  </React.StrictMode>
);
