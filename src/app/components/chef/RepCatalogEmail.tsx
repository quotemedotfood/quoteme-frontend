// RepCatalogEmail — the email Marcus (rep) receives when chef asks for the
// distributor's latest catalog. Forward + copy-link only. No read/edit, no
// rep app screen (SU-FE-4 is killed — the rep's entire role is this email).
//
// SU-FE-2 (Wave 3 · Secure Rep-Catalog Upload).
// Canonical spec: handoff/SECURE_REP_CATALOG_UPLOAD.md
// Source reference: handoff/source/screens-secure-catalog.jsx
//   RepCatalogEmail (~line 340), RepCatalogEmailMobile (~line 396),
//   RepCatalogEmailDesktop (~line 412)
//
// Translation notes (JSX → TSX):
//   • `qm-btn-orange`, `qm-btn-outline`, `qm-btn`, `qm-eyebrow`, `ink`,
//     `ink-soft`, `ink-faint`, `serif`, `num`, `hairline`, `scroller` are
//     prototype-only CSS classes (not present in the real app). Converted to
//     inline styles using local C + sans/serif constants (SU-FE-1 precedent).
//   • `QuoteMeWordmark variant="square"` → quoteme-logo.png img (same asset
//     used by ChefTabDesktopShell — square icon face, not horizontal wordmark).
//   • `PhoneShell` → prototype-only chrome; rendered as a minimal inline
//     mobile-inbox wrapper (matching ChefDistributorsTab approach).
//   • Prototype gallery caption ("Replaces the old rep app-screen…") preserved
//     verbatim in RepCatalogEmailDesktop, greyed-out, below the card.
//   • Sacred Orange = ONE per surface: "Forward to your catalog team."

import React, { useState } from 'react';
import { Forward, Link2, Copy, Check, ChevronLeft, Inbox } from 'lucide-react';
import quotemeLogo from '../../../assets/quoteme-logo.png';

// ─── Demo data (locked — do not mutate during port) ───────────────────────────
// Canonical: handoff/SECURE_REP_CATALOG_UPLOAD.md § Demo data
// and handoff/source/screens-secure-catalog.jsx § SECURE object.
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
  orange:     '#F2993D',
  warmPaper:  '#FBFAF7',
  cream:      '#F7F5F0',
  softLine:   '#E8E8E8',
  gray700:    '#4F4F4F',
  gray500:    '#6B7280',
  accentMid:  '#7FAEC2',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const serifStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RepCatalogEmailProps {
  desktop?: boolean;
}

// ─── RepCatalogEmail ──────────────────────────────────────────────────────────
// Core email body, shared by mobile + desktop wrappers. Ported verbatim from
// handoff/source/screens-secure-catalog.jsx `RepCatalogEmail`.
// All layout, copy, and token values match the canonical source; CSS class names
// translated to inline styles (see translation notes above).

export function RepCatalogEmail({ desktop = false }: RepCatalogEmailProps) {
  const [copied, setCopied] = useState(false);
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
              hello@quoteme.co · to {SECURE.repEmail}
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
          {SECURE.chefFull} asked for your latest {SECURE.distributor} catalog
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
          {SECURE.repFirst} —
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
          {SECURE.chefFull} over at {SECURE.restaurant} is pricing a menu and needs your current{' '}
          {SECURE.distributorFull} price list. Don't dig it up yourself — pass this to whoever
          keeps your catalog up to date. They drop the file, and {SECURE.chefFirst} is quoting
          against it within the hour.
        </p>

        {/* Forward-link block */}
        <div style={{ marginTop: desktop ? 20 : 16 }}>
          {/* Eyebrow label */}
          <div
            style={{
              ...sans,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: C.gray700,
            }}
          >
            FORWARD THIS LINK
          </div>

          {/* Link + Copy button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
              background: C.warmPaper,
              border: `1px solid ${C.softLine}`,
              borderRadius: 8,
              padding: desktop ? '10px 10px 10px 14px' : '9px 9px 9px 12px',
            }}
          >
            <Link2 size={14} color={C.gray500} style={{ flexShrink: 0 }} />
            <span
              style={{
                ...sans,
                fontSize: desktop ? 13.5 : 12.5,
                color: C.charcoal,
                fontVariantNumeric: 'tabular-nums',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {SECURE.link}
            </span>
            {/* Copy button — toggles to "Copied" (no auto-reset; matches prototype) */}
            <button
              type="button"
              onClick={() => setCopied(true)}
              style={{
                ...sans,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 11px',
                fontSize: 12,
                fontWeight: 500,
                color: copied ? C.accentMid : C.charcoal,
                background: '#fff',
                border: `1px solid ${C.softLine}`,
                borderRadius: 6,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'color 0.15s',
              }}
            >
              {copied ? (
                <Check size={13} color={C.accentMid} />
              ) : (
                <Copy size={13} color={C.charcoal} />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Sub-copy */}
          <p
            style={{
              ...sans,
              fontSize: desktop ? 12.5 : 11.5,
              color: C.gray500,
              lineHeight: 1.5,
              marginTop: 10,
              maxWidth: 480,
            }}
          >
            Forward this email, or copy the link to text it over. It works no matter who opens
            it — no QuoteMe account needed.
          </p>
        </div>

        {/* Sacred Orange CTA — ONE per surface */}
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
          <Forward size={15} color="#fff" />
          Forward to your catalog team
        </a>

        {/* Token footnote */}
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
          The link is good for 7 days. {SECURE.chefFirst} sees these prices only — they're
          never shared with other distributors.
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
        <div style={{ ...sans, fontSize: desktop ? 11 : 10, color: C.gray500, lineHeight: 1.5 }}>
          You're getting this because {SECURE.chefFull} at {SECURE.restaurant} asked for an
          updated catalog from {SECURE.distributor}.
        </div>
      </div>
    </div>
  );
}

// ─── RepCatalogEmailMobile ────────────────────────────────────────────────────
// Mobile wrapper — renders a minimal inbox chrome (back-arrow + Inbox label)
// above the email body, matching the prototype's PhoneShell/inbox chrome intent.
// PhoneShell is prototype-only; the chrome is reproduced inline (same approach
// as ChefDistributorsTab, which notes "PhoneShell — prototype-only chrome; not
// mounted here").

export function RepCatalogEmailMobile() {
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
        <RepCatalogEmail />
      </div>
    </div>
  );
}

// ─── RepCatalogEmailDesktop ───────────────────────────────────────────────────
// Desktop wrapper — warm paper background + card frame with shadow, matching
// the prototype's gallery desktop wrapper intent.

export function RepCatalogEmailDesktop() {
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
        <RepCatalogEmail desktop />
      </div>
      {/* Gallery caption — prototype annotation preserved verbatim */}
      <div
        style={{
          ...sans,
          textAlign: 'center',
          marginTop: 12,
          fontSize: 11,
          color: 'rgba(60,50,40,.45)',
        }}
      >
        Replaces the old rep app-screen · the chef minted the link, Marcus just forwards this
      </div>
    </div>
  );
}
