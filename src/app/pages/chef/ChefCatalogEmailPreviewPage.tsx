// ChefCatalogEmailPreviewPage — visual sign-off surface for SU-FE-5.
// Route: /chef/_preview/chef-catalog-email
//
// Renders ChefCatalogEmailMobile and ChefCatalogEmailDesktop side-by-side so
// Moose / Desi can verify the email chrome in a browser.
//
// Follows the exact pattern of RepCatalogEmailPreviewPage (SU-FE-2):
//   • Bare page, no auth guard
//   • Placed outside RootLayout in routes.tsx (sibling to other _preview routes)

import React from 'react';
import { ChefCatalogEmailMobile, ChefCatalogEmailDesktop } from '../../components/chef/ChefCatalogEmail';

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.09em',
          textTransform: 'uppercase' as const,
          color: '#9E9E9E',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export function ChefCatalogEmailPreviewPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '40px 24px',
        background: '#F3F4F6',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 600,
            color: '#2A2A2A',
            marginBottom: 4,
          }}
        >
          ChefCatalogEmail: SU-FE-5 preview
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 32 }}>
          Chef catalog-live notification email · mobile + desktop frames · route: /chef/_preview/chef-catalog-email
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 40,
            alignItems: 'start',
          }}
        >
          <Frame label="Mobile">
            <ChefCatalogEmailMobile />
          </Frame>
          <Frame label="Desktop">
            <ChefCatalogEmailDesktop />
          </Frame>
        </div>
      </div>
    </div>
  );
}
