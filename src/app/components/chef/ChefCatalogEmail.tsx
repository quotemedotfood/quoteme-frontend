// ChefCatalogEmail — the ONE email Daniel (chef) receives when the catalog
// goes live. Fired at ingestion-complete only (status = "live"). Never at
// requested / forwarded / uploading / loading.
//
// SU-FE-5 (Wave 3 · Secure Rep-Catalog Upload).
// Canonical spec: handoff/SECURE_REP_CATALOG_UPLOAD.md
// Source reference: handoff/source/screens-secure-public.jsx
//   ChefCatalogEmail (~line 287), ChefCatalogEmailMobile (~line 361),
//   ChefCatalogEmailDesktop (~line 378)
//
// Translation notes (JSX → TSX):
//   • `qm-btn-orange`, `qm-btn`, `ink`, `ink-soft`, `ink-faint`, `serif`,
//     `num`, `hairline`, `scroller` are prototype-only CSS classes (not
//     present in the real app). Converted to inline styles using local C +
//     sans/serifStyle constants (SU-FE-2 precedent).
//   • `QuoteMeWordmark variant="square"` → quoteme-logo.png img (same asset
//     used by ChefTabDesktopShell — square icon face, not horizontal wordmark).
//   • `PhoneShell` → prototype-only chrome; rendered as a minimal inline
//     mobile-inbox wrapper (matching SU-FE-2 RepCatalogEmailMobile approach).
//   • `Icon` lucide passthrough → direct lucide-react imports.
//   • Sacred Orange = ONE per surface: "Pick up {quoteNo}."

import React from 'react';
import { CheckCircle2, ChevronLeft, Inbox, ArrowRight } from 'lucide-react';
import quotemeLogo from '../../../assets/quoteme-logo.png';

// ─── Demo data (locked — do not mutate during port) ───────────────────────────
// Canonical: handoff/SECURE_REP_CATALOG_UPLOAD.md § Demo data
// and handoff/source/screens-secure-public.jsx — SECURE object from
// screens-secure-catalog.jsx (shared across public screens).
const SECURE = {
  repFull:         "Marcus Rivera",
  repFirst:        "Marcus",
  repEmail:        "marcus@dlisius.co",
  distributor:     "D'Lisius",
  distributorFull: "D'Lisius Distribution Co.",
  chefFirst:       "Daniel",
  chefFull:        "Daniel Reeves",
  restaurant:      "Holloway & Sons",
  restaurantCity:  "Hudson, NY",
  quoteNo:         "Q-1042",
  catalogHeldFrom: "Feb 3, 2026",
  link:            "quoteme.co/c/8FK2-QX9D",
  catalogAdmin:    "Priya Shah",
  sampleFile:      "DLisius_Spring_2026_Master.pdf",
} as const;

// ─── Design constants ─────────────────────────────────────────────────────────
const C = {
  charcoal:   '#2B2B2B',
  orange:     '#F2993D',   // app canonical orange = var(--primary)
  warmPaper:  '#FBFAF7',
  cream:      '#F7F5F0',
  softLine:   '#E8E8E8',
  gray700:    '#4F4F4F',
  gray500:    '#6B7280',
  accentMid:  '#7FAEC2',   // var(--accent) from theme.css
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const serifStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ChefCatalogEmailProps {
  desktop?: boolean;
}

// ─── ChefCatalogEmail ─────────────────────────────────────────────────────────
// Core email body, shared by mobile + desktop wrappers. Ported verbatim from
// handoff/source/screens-secure-public.jsx `ChefCatalogEmail`.
// All layout, copy, and token values match the canonical source; CSS class names
// translated to inline styles (see translation notes above).

export function ChefCatalogEmail({ desktop = false }: ChefCatalogEmailProps) {
  const pad = desktop ? 40 : 26;

  return (
    <div
      style={{
        ...sans,
        background: '#fff',
        maxWidth: desktop ? 600 : 390,
        margin: '0 auto',
      }}
    >
      {/* ── Email header: sender + subject ── */}
      <div
        style={{
          padding: `${desktop ? 24 : 18}px ${pad}px`,
          borderBottom: `1px solid ${C.softLine}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* QuoteMe avatar circle — uses square icon face */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              width:  desktop ? 40 : 34,
              height: desktop ? 40 : 34,
              borderRadius: 999,
              background: C.cream,
              border: `1px solid ${C.softLine}`,
              overflow: 'hidden',
            }}
          >
            <img
              src={quotemeLogo}
              alt="QuoteMe"
              style={{ width: desktop ? 22 : 19, height: desktop ? 22 : 19, objectFit: 'contain' }}
            />
          </span>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: desktop ? 14 : 13, fontWeight: 600, color: C.charcoal }}>
              QuoteMe
            </div>
            <div style={{ fontSize: desktop ? 12 : 11, color: C.gray500 }}>
              hello@quoteme.co · to {SECURE.chefFull.toLowerCase().replace(' ', '.')}@…
            </div>
          </div>

          <div
            style={{
              fontSize: desktop ? 11.5 : 10.5,
              color: C.gray500,
              fontVariantNumeric: 'tabular-nums',
              marginLeft: 'auto',
            }}
          >
            now
          </div>
        </div>

        {/* Subject line */}
        <div
          style={{
            ...serifStyle,
            fontSize: desktop ? 19 : 16,
            fontWeight: 600,
            color: C.charcoal,
            marginTop: desktop ? 14 : 11,
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
          }}
        >
          {SECURE.repFirst} sent over {SECURE.distributor}'s latest catalog
        </div>
      </div>

      {/* ── Email body ── */}
      <div
        style={{
          padding: `${desktop ? 30 : 22}px ${pad}px ${desktop ? 34 : 26}px`,
        }}
      >
        {/* Salutation */}
        <p
          style={{
            ...serifStyle,
            fontSize: desktop ? 15.5 : 14.5,
            lineHeight: 1.6,
            color: C.charcoal,
            margin: 0,
          }}
        >
          {SECURE.chefFirst} —
        </p>

        {/* Body copy */}
        <p
          style={{
            ...sans,
            fontSize: desktop ? 14.5 : 13.5,
            lineHeight: 1.7,
            color: C.charcoal,
            marginTop: desktop ? 14 : 12,
            maxWidth: 480,
          }}
        >
          {SECURE.repFirst} had {SECURE.distributorFull}'s current price list loaded for you. It's in
          and ready — your quotes price against it now, including the{' '}
          <span style={{ fontWeight: 600, color: C.charcoal }}>{SECURE.quoteNo}</span>{' '}
          you had going.
        </p>

        {/* Quiet catalog metadata slip — document feel */}
        <div
          style={{
            marginTop: desktop ? 20 : 16,
            padding: desktop ? '14px 16px' : '12px 14px',
            background: C.warmPaper,
            border: `1px solid ${C.softLine}`,
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2
              size={desktop ? 16 : 15}
              color={C.accentMid}
              style={{ flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  ...sans,
                  fontSize: desktop ? 13.5 : 12.5,
                  fontWeight: 500,
                  color: C.charcoal,
                  lineHeight: 1.3,
                }}
              >
                {SECURE.distributorFull} · catalog live
              </div>
              <div
                style={{
                  ...sans,
                  fontSize: desktop ? 11.5 : 11,
                  color: C.gray500,
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.3,
                }}
              >
                Updated today, from {SECURE.repFirst}'s team
              </div>
            </div>
          </div>
        </div>

        {/* Sacred Orange CTA — ONE per surface: "Pick up {quoteNo}" */}
        <a
          href="#"
          style={{
            ...sans,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginTop: desktop ? 22 : 18,
            padding: desktop ? '13px 20px' : '12px 18px',
            fontSize: desktop ? 14.5 : 13.5,
            fontWeight: 600,
            color: '#fff',
            background: C.orange,
            borderRadius: 8,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          Pick up {SECURE.quoteNo}
          <ArrowRight size={15} color="#fff" />
        </a>

        {/* Closing note */}
        <p
          style={{
            ...serifStyle,
            fontStyle: 'italic',
            fontSize: desktop ? 13 : 12.5,
            color: C.gray500,
            lineHeight: 1.6,
            marginTop: desktop ? 22 : 18,
          }}
        >
          That's the only note you'll get about this — no need to watch for updates.
        </p>

        {/* Sign-off */}
        <p
          style={{
            ...sans,
            fontSize: desktop ? 12.5 : 11.5,
            color: C.gray700,
            lineHeight: 1.5,
            marginTop: desktop ? 16 : 13,
          }}
        >
          — QuoteMe
        </p>
      </div>

      {/* ── Email footer ── */}
      <div
        style={{
          padding: `${desktop ? 16 : 13}px ${pad}px`,
          borderTop: `1px solid ${C.softLine}`,
          background: C.cream,
        }}
      >
        <div
          style={{
            ...sans,
            fontSize: desktop ? 11 : 10,
            color: C.gray500,
            lineHeight: 1.5,
          }}
        >
          You're getting this because {SECURE.restaurant} asked {SECURE.repFirst} for an updated catalog.
        </div>
      </div>
    </div>
  );
}

// ─── ChefCatalogEmailMobile ───────────────────────────────────────────────────
// Mobile wrapper — renders a minimal inbox chrome (back-arrow + Inbox label)
// above the email body, matching the prototype's PhoneShell/inbox chrome intent.
// PhoneShell is prototype-only; the chrome is reproduced inline (same approach
// as SU-FE-2's RepCatalogEmailMobile).

export function ChefCatalogEmailMobile() {
  return (
    <div
      style={{
        ...sans,
        maxWidth: 390,
        margin: '0 auto',
        border: `1px solid ${C.softLine}`,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      }}
    >
      {/* Inbox chrome bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          background: C.cream,
          borderBottom: `1px solid ${C.softLine}`,
        }}
      >
        <ChevronLeft size={15} color={C.gray500} />
        <Inbox size={14} color={C.gray500} />
        <span style={{ ...sans, fontSize: 12, color: C.gray500 }}>Inbox</span>
        <span style={{ ...sans, fontSize: 11, color: C.gray700, marginLeft: 'auto' }}>Mail</span>
      </div>

      {/* Email body — scroll container */}
      <div style={{ overflowY: 'auto', background: '#fff' }}>
        <ChefCatalogEmail />
      </div>
    </div>
  );
}

// ─── ChefCatalogEmailDesktop ──────────────────────────────────────────────────
// Desktop wrapper — warm paper background + card frame with shadow, matching
// the prototype's gallery desktop wrapper intent.

export function ChefCatalogEmailDesktop() {
  return (
    <div
      style={{
        background: '#F2F0EA',
        padding: 40,
        minHeight: 560,
      }}
    >
      <div
        style={{
          maxWidth: 600,
          margin: '0 auto',
          border: `1px solid ${C.softLine}`,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
        }}
      >
        <ChefCatalogEmail desktop />
      </div>
    </div>
  );
}
