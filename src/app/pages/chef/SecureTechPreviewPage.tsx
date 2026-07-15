// SecureTechPreviewPage — design sign-off surface for SU-FE-3 (TechLandingPage).
// Route: /chef/_preview/secure-tech
// Mirrors the pattern of RepCatalogEmailPreviewPage (SU-FE-2) and
// QuoteStateDocumentPreviewPage: three state panels rendered side-by-side
// so Moose can verify idle / sent / expired without uploading a file.
//
// TEMPORARY — remove or fold into a real route once Moose signs off on all
// three states and the BE-4 endpoint is wired.

import React from 'react';
import { TechLandingDesktop, SECURE } from '../../components/chef/TechLandingPage';

const NOOP_SEND = () => {};

export function SecureTechPreviewPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F2F0EA', minHeight: '100vh', padding: '32px 20px' }}>
      {/* Page header */}
      <div style={{ maxWidth: 1200, margin: '0 auto 32px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6B7280' }}>
          SU-FE-3 · Design sign-off
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#2B2B2B', marginTop: 6 }}>
          TechLandingPage: three states
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>
          Token-gated public catalog upload landing (/c/:token).
          Rep forwarded link → catalog person uploads → sent.
          Demo: {SECURE.distributor}, {SECURE.repFull}, {SECURE.restaurant}.
        </p>
      </div>

      {/* Three columns */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* ── idle ── */}
        <section>
          <div style={{ marginBottom: 12, padding: '6px 10px', background: '#E8E8E8', borderRadius: 4, display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#4F4F4F', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            idle: drop zone
          </div>
          <div style={{ border: '1px solid #E8E8E8', borderRadius: 10, overflow: 'hidden' }}>
            <TechLandingDesktop state="idle" onSend={NOOP_SEND} />
          </div>
        </section>

        {/* ── sent ── */}
        <section>
          <div style={{ marginBottom: 12, padding: '6px 10px', background: '#E8E8E8', borderRadius: 4, display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#4F4F4F', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            sent: confirmation
          </div>
          <div style={{ border: '1px solid #E8E8E8', borderRadius: 10, overflow: 'hidden' }}>
            <TechLandingDesktop
              state="sent"
              onSend={NOOP_SEND}
              sentFileName={SECURE.sampleFile}
              sentFileSize="1.4 MB"
            />
          </div>
        </section>

        {/* ── expired ── */}
        <section>
          <div style={{ marginBottom: 12, padding: '6px 10px', background: '#E8E8E8', borderRadius: 4, display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#4F4F4F', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            expired: recovery
          </div>
          <div style={{ border: '1px solid #E8E8E8', borderRadius: 10, overflow: 'hidden' }}>
            <TechLandingDesktop state="expired" onSend={NOOP_SEND} />
          </div>
        </section>
      </div>
    </div>
  );
}
