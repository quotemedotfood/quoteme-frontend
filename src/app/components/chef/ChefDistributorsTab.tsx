// ChefDistributorsTab — mobile Distributors tab (populated + empty states).
//
// Ported verbatim from source/screens-tabs.jsx (Desi V2 handoff, 2026-05-19).
// V3 spec refs: Part 5, Part 6.7, Part 7.
// Intended route: /dashboard/distributors (wire-up pending A3 promotion).
//
// Translation notes (JSX → TSX):
//   • PhoneShell / MobileTopBar — prototype-only chrome; not mounted here.
//     RootLayout already renders ChefTopbar for chef-role users.
//   • CSS vars (--qm-*) and prototype CSS classes (qm-pill, qm-eyebrow, etc.)
//     → inline styles using FE color constants, matching ChefDashboardPage pattern.
//   • Icon (lucide-in-browser) → lucide-react imports.
//   • cls() helper → inline conditional strings.
//   • UseDistributorForQuoteModal: TODO — B3 deliverable (see below).

import React, { useState } from 'react';
import { UseDistributorForQuoteModal } from './UseDistributorForQuoteModal';
import { MapPin, ArrowRight, Upload } from 'lucide-react';
import { CatalogStatusBadge } from './CatalogStatusBadge';
import { ChefTabBar } from './ChefTabBar';
import {
  DEMO,
  YOUR_DISTRIBUTORS,
  AREA_DISTRIBUTORS,
  type AreaDistributor,
} from './distributorsDemoData';

// ─── Color constants (matches ChefDashboardPage.tsx convention) ───────────────
const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
  hoverBlue: '#7FAEC2',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  warning: '#D97706',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── Eyebrow label style (maps to .qm-eyebrow in prototype) ──────────────────
const eyebrow: React.CSSProperties = {
  ...sans,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: C.gray500,
};

// ─── Section divider (maps to .doc-divider-thick in prototype) ───────────────
const dividerThick: React.CSSProperties = {
  borderTop: `2px solid ${C.charcoal}`,
  marginTop: 4,
};

// ─── Row divider (maps to .doc-divider in prototype) ─────────────────────────
const divider: React.CSSProperties = {
  borderBottom: `1px solid ${C.softLine}`,
};

export interface ChefDistributorsTabProps {
  /** "with-data" (default) shows populated state; "empty" shows zero-state */
  state?: 'with-data' | 'empty';
  /** Navigation callback — receives prototype target string e.g. "entry", "catalog-upload" */
  nav?: (target: string) => void;
}

export function ChefDistributorsTab({
  state = 'with-data',
  nav = () => {},
}: ChefDistributorsTabProps) {
  const empty = state === 'empty';

  // Opus c11 lock (May 18) Q4: confirmation modal before routing a chef to /chef/entry
  // with a Section-2 distributor pre-selected.
  const [modalDist, setModalDist] = useState<AreaDistributor | null>(null);

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100%', background: '#fff', color: C.charcoal, ...sans }}
    >
      {/* Scrollable body */}
      <div className="flex-1 overflow-auto px-5 pt-5 pb-6">

        {/* Header */}
        <div>
          <div style={{ ...serif, fontSize: 24, fontWeight: 600, lineHeight: 1.15, color: C.charcoal }}>
            Distributors
          </div>
          <p style={{ ...sans, fontSize: 12.5, color: C.gray500, marginTop: 4 }}>
            Who you've quoted with, and who else is servicing {DEMO.restaurantCity}.
          </p>
        </div>

        {/* ── SECTION 1 · YOUR DISTRIBUTORS ─────────────────────────────────── */}
        <div style={{ marginTop: 24 }}>
          <div className="flex items-baseline justify-between" style={eyebrow}>
            <span>YOUR DISTRIBUTORS</span>
            {!empty && (
              <span style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400, color: C.gray500 }}>
                {YOUR_DISTRIBUTORS.length}
              </span>
            )}
          </div>
          <div style={dividerThick} />

          {empty ? (
            <div style={{ paddingTop: 20, paddingBottom: 20 }}>
              <div style={{ ...sans, fontSize: 13, color: C.charcoal, lineHeight: 1.4 }}>
                None yet.
              </div>
              <div style={{ ...sans, fontSize: 12, color: C.gray500, marginTop: 4, lineHeight: 1.4 }}>
                Distributors show up here once you've gotten a quote from one. Ask your rep
                to send one through, or upload a price list to get going.
              </div>
              <button
                type="button"
                onClick={() => nav('catalog-upload')}
                className="flex items-center gap-2"
                style={{
                  ...sans,
                  marginTop: 12,
                  padding: '8px 14px',
                  fontSize: 12.5,
                  background: 'transparent',
                  border: `1.5px solid ${C.charcoal}`,
                  borderRadius: 6,
                  color: C.charcoal,
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} />
                Upload a price list
              </button>
            </div>
          ) : (
            YOUR_DISTRIBUTORS.map((d, i) => (
              <div key={i} style={{ ...divider, padding: '14px 0' }}>
                {/* Title row: distributor + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div style={{ ...serif, fontSize: 15, fontWeight: 500, color: C.charcoal, lineHeight: 1.3 }}>
                      {d.short}
                    </div>
                    <div style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.3 }}>
                      {d.name}
                    </div>
                  </div>
                  <CatalogStatusBadge status={d.status} />
                </div>

                {/* Rep + last quote */}
                <div
                  className="grid gap-x-3"
                  style={{ marginTop: 10, gridTemplateColumns: '1fr auto', rowGap: 2 }}
                >
                  <div className="min-w-0">
                    <div style={{ ...eyebrow, fontSize: 9 }}>REP</div>
                    <div style={{ ...sans, fontSize: 12.5, color: C.charcoal, marginTop: 2, lineHeight: 1.3 }}>
                      {d.rep}
                    </div>
                    <div style={{ ...sans, fontSize: 11.5, color: C.gray500, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
                      {d.repPhone}
                    </div>
                    {d.repEmail && (
                      <a
                        href={`mailto:${d.repEmail}`}
                        style={{ ...sans, fontSize: 11.5, color: C.gray700, textDecoration: 'underline', lineHeight: 1.3 }}
                      >
                        {d.repEmail}
                      </a>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...eyebrow, fontSize: 9 }}>LAST QUOTE</div>
                    <div style={{ ...sans, fontSize: 12.5, color: C.charcoal, marginTop: 2, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
                      {d.lastQuote}
                    </div>
                    <div style={{ ...sans, fontSize: 11, color: C.gray500, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
                      {d.quoteCount} total
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── SECTION 2 · AVAILABLE IN YOUR AREA ────────────────────────────── */}
        {/* Order shown by recency of catalog update, not by ranking — V3 Part 7 lock */}
        <div style={{ marginTop: 28 }}>
          <div className="flex items-baseline justify-between" style={eyebrow}>
            <span>AVAILABLE IN HUDSON, NY</span>
            <span style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400, color: C.gray500 }}>
              {AREA_DISTRIBUTORS.length}
            </span>
          </div>
          <div style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.4, maxWidth: 320, marginTop: 4 }}>
            Servicing your area with a verified catalog.{' '}
            Order shown by recency of catalog update, not by ranking.
          </div>
          <div style={dividerThick} />

          {AREA_DISTRIBUTORS.map((d, i) => (
            <div key={i} style={{ ...divider, padding: '12px 0' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div style={{ ...sans, fontSize: 13.5, color: C.charcoal, lineHeight: 1.3 }}>
                    {d.short}
                  </div>
                  <div style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.3 }}>
                    {d.name}
                  </div>
                  <div style={{ ...sans, fontSize: 11, color: C.gray500, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3, marginTop: 2 }}>
                    {d.scope} · {d.items} items · updated {d.updated}
                  </div>
                </div>
                {!d.affiliated && <CatalogStatusBadge status="unaffiliated" />}
              </div>
              <div className="flex items-center gap-3" style={{ marginTop: 6, fontSize: 11.5 }}>
                <button
                  type="button"
                  onClick={() => setModalDist(d)}
                  style={{ ...sans, fontSize: 11.5, color: C.gray700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Use for a quote
                </button>
                {!d.affiliated && (
                  <span style={{ ...sans, fontSize: 11.5, color: C.gray500, flex: 1, lineHeight: 1.3 }}>
                    · No rep yet on QuoteMe.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Operational footnote */}
        <div
          className="flex items-start gap-3"
          style={{ marginTop: 28, borderTop: `1px solid ${C.softLine}`, paddingTop: 12, fontSize: 11.5, color: C.gray700 }}
        >
          <MapPin size={14} color={C.hoverBlue} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={sans}>
            Area set by your restaurant address. Update it in Settings to change what shows here.
          </div>
        </div>

        {/* Paid-tier multi-distributor send — Opus c11 lock (May 18) Q1.
            Surfaces what was previously a Discovery tab as an in-context action, never as a
            separate destination. Reads as an additive capability, not a paywall. */}
        <div
          style={{
            marginTop: 20,
            padding: '14px',
            borderRadius: 8,
            background: C.warmPaper,
            border: `1px solid ${C.softLine}`,
          }}
        >
          <div style={{ ...eyebrow, fontSize: 10 }}>WITH PAID</div>
          <div style={{ ...serif, fontSize: 14, fontWeight: 500, color: C.charcoal, marginTop: 4, lineHeight: 1.3 }}>
            Send this menu to another distributor.
          </div>
          <p style={{ ...sans, fontSize: 11.5, color: C.gray700, marginTop: 4, lineHeight: 1.6 }}>
            Request a quote from any distributor servicing {DEMO.restaurantCity}. Each response
            stays a separate quote thread, attached to its own distributor.
          </p>
          <button
            type="button"
            onClick={() => nav('tab-settings')}
            className="flex items-center gap-1"
            style={{ ...sans, marginTop: 10, fontSize: 11.5, color: C.gray700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            See paid · $50/mo <ArrowRight size={12} style={{ marginLeft: 2 }} />
          </button>
        </div>
      </div>

      {/* Mobile tab bar */}
      <ChefTabBar active="distributors" nav={nav} />

      {modalDist && (
        <UseDistributorForQuoteModal
          distributor={modalDist}
          onClose={() => setModalDist(null)}
          onContinue={() => { setModalDist(null); nav('entry'); }}
          variant="mobile"
        />
      )}
    </div>
  );
}
