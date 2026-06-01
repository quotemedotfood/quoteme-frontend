// ChefDistributorsTabDesktop — desktop Distributors tab.
//
// Ported from source/screens-tabs.jsx (Desi V2 handoff, 2026-05-19).
// V3 spec refs: Part 5, Part 6.7, Part 7.
// Intended route: /dashboard/distributors (desktop breakpoint; wire-up pending A3 promotion).
//
// TODO (W2-5): This component is currently dead code — not rendered anywhere.
// The mobile ChefDistributorsTab (ChefDistributorsTab.tsx) is the active variant,
// wired in ChefDashboardPage. Wire this desktop variant when desktop breakpoint
// switching is added. Mirror the same live-data approach from ChefDistributorsTab
// (getChefDistributors() + useEffect + navigate to /chef/distributor/:id on row click).
//
// Translation notes (JSX → TSX):
//   • ChefTabDesktopShell wraps this component (NewspaperSidebar stub inside).
//   • Icon (lucide) → lucide-react imports.
//   • CSS vars (--qm-*) → FE color constants.
//   • UseDistributorForQuoteModal: TODO — B3 deliverable (see below).

import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';
import { CatalogStatusBadge } from './CatalogStatusBadge';
import { PinToStackButton } from './PinToStackButton';
import {
  DEMO,
  YOUR_DISTRIBUTORS,
  AREA_DISTRIBUTORS,
  type AreaDistributor,
} from './distributorsDemoData';
import { getChefStack, type ChefStackResponse } from '../../services/api';

// ─── Color constants ──────────────────────────────────────────────────────────
const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
  hoverBlue: '#7FAEC2',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const eyebrow: React.CSSProperties = {
  ...sans,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#6B7280',
};

const dividerThick: React.CSSProperties = {
  borderTop: `2px solid ${C.charcoal}`,
  marginTop: 8,
};

export interface ChefDistributorsTabDesktopProps {
  state?: 'with-data' | 'empty';
  nav?: (target: string) => void;
  initialMode?: 'open' | 'collapsed' | 'hidden';
}

export function ChefDistributorsTabDesktop({
  state = 'with-data',
  nav = () => {},
  initialMode: _initialMode = 'open',
}: ChefDistributorsTabDesktopProps) {
  const empty = state === 'empty';

  // Stack data for pin affordance. null = loading; undefined = no stack yet.
  const [stackData, setStackData] = useState<ChefStackResponse | null | undefined>(null);

  const loadStack = useCallback(() => {
    getChefStack().then((res) => {
      setStackData(res.data ?? undefined);
    });
  }, []);

  useEffect(() => {
    loadStack();
  }, [loadStack]);

  // Opus c11 lock (May 18) Q4: same modal pattern as mobile.
  const [modalDist, setModalDist] = useState<AreaDistributor | null>(null);

  return (
    <>
      {/* Page header */}
      <div>
        <h1 style={{ ...serif, fontSize: 32, fontWeight: 600, color: C.charcoal, lineHeight: 1.15 }}>
          Distributors
        </h1>
        <p style={{ ...sans, fontSize: 14, color: C.gray500, marginTop: 4, maxWidth: 560 }}>
          Who you've quoted with, and who else is servicing {DEMO.restaurantCity}.
        </p>
      </div>

      {/* ── SECTION 1 · YOUR DISTRIBUTORS ──────────────────────────────────── */}
      <div style={{ marginTop: 32 }}>
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
          <div style={{ ...sans, padding: '24px 0', fontSize: 13, color: C.gray700, lineHeight: 1.6, maxWidth: 560 }}>
            None yet. Distributors show up here once you've gotten a quote from one. Ask your rep
            to send one through, or upload a price list to get going.
          </div>
        ) : (
          <table className="w-full" style={{ fontVariantNumeric: 'tabular-nums', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.softLine}` }}>
                <th style={{ ...eyebrow, textAlign: 'left', paddingBottom: 8, paddingTop: 8, width: '28%' }}>
                  Distributor
                </th>
                <th style={{ ...eyebrow, textAlign: 'left', paddingBottom: 8, paddingTop: 8, width: '30%' }}>
                  Rep
                </th>
                <th style={{ ...eyebrow, textAlign: 'left', paddingBottom: 8, paddingTop: 8, width: '17%' }}>
                  Last quote
                </th>
                <th style={{ ...eyebrow, textAlign: 'left', paddingBottom: 8, paddingTop: 8, width: '17%' }}>
                  Status
                </th>
                <th style={{ ...eyebrow, textAlign: 'left', paddingBottom: 8, paddingTop: 8, width: '8%' }}>
                  Stack
                </th>
              </tr>
            </thead>
            <tbody>
              {YOUR_DISTRIBUTORS.map((d, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: `1px solid ${C.softLine}`, verticalAlign: 'top' }}
                  className="hover:bg-gray-50"
                >
                  <td style={{ padding: '14px 12px 14px 0' }}>
                    <div style={{ ...serif, fontSize: 15, fontWeight: 500, color: C.charcoal, lineHeight: 1.3 }}>
                      {d.short}
                    </div>
                    <div style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.3 }}>
                      {d.name}
                    </div>
                  </td>
                  <td style={{ padding: '14px 12px 14px 0' }}>
                    <div style={{ ...sans, fontSize: 13, color: C.charcoal, lineHeight: 1.3 }}>
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
                  </td>
                  <td style={{ padding: '14px 12px 14px 0' }}>
                    <div style={{ ...sans, fontSize: 13, color: C.charcoal, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
                      {d.lastQuote}
                    </div>
                    <div style={{ ...sans, fontSize: 11.5, color: C.gray500, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
                      {d.quoteCount} total
                    </div>
                  </td>
                  <td style={{ padding: '14px 12px 14px 0' }}>
                    <CatalogStatusBadge status={d.status} />
                  </td>
                  {/* Pin-to-stack affordance.
                      TODO (W2-5 live-data): replace d.short with real d.id when
                      this component switches to getChefDistributors() live data. */}
                  <td style={{ padding: '14px 0', verticalAlign: 'middle' }}>
                    <PinToStackButton
                      distributorId={d.short}
                      distributorName={d.short}
                      stackData={stackData}
                      onStackChange={loadStack}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── SECTION 2 · AVAILABLE IN YOUR AREA ──────────────────────────────── */}
      {/* Order shown by recency of catalog update, not by ranking — V3 Part 7 lock */}
      <div style={{ marginTop: 40 }}>
        <div className="flex items-baseline justify-between" style={eyebrow}>
          <span>AVAILABLE IN HUDSON, NY</span>
          <span style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400, color: C.gray500 }}>
            {AREA_DISTRIBUTORS.length}
          </span>
        </div>
        <div style={{ ...sans, fontSize: 12, color: C.gray500, lineHeight: 1.4, maxWidth: 560, marginTop: 4 }}>
          Servicing your area with a verified catalog.{' '}
          Order shown by recency of catalog update, not by ranking.
        </div>
        <div style={dividerThick} />

        <table className="w-full" style={{ fontVariantNumeric: 'tabular-nums', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.softLine}` }}>
              <th style={{ ...eyebrow, textAlign: 'left', paddingBottom: 8, paddingTop: 8, width: '28%' }}>
                Distributor
              </th>
              <th style={{ ...eyebrow, textAlign: 'left', paddingBottom: 8, paddingTop: 8, width: '22%' }}>
                Area
              </th>
              <th style={{ ...eyebrow, textAlign: 'left', paddingBottom: 8, paddingTop: 8, width: '12%' }}>
                Items
              </th>
              <th style={{ ...eyebrow, textAlign: 'left', paddingBottom: 8, paddingTop: 8, width: '12%' }}>
                Updated
              </th>
              <th style={{ ...eyebrow, textAlign: 'left', paddingBottom: 8, paddingTop: 8, width: '18%' }}>
              </th>
              <th style={{ ...eyebrow, textAlign: 'left', paddingBottom: 8, paddingTop: 8, width: '8%' }}>
                Stack
              </th>
            </tr>
          </thead>
          <tbody>
            {AREA_DISTRIBUTORS.map((d, i) => (
              <tr
                key={i}
                style={{ borderBottom: `1px solid ${C.softLine}`, verticalAlign: 'top' }}
                className="hover:bg-gray-50"
              >
                <td style={{ padding: '12px 12px 12px 0' }}>
                  <div style={{ ...sans, fontSize: 14, color: C.charcoal, lineHeight: 1.3 }}>
                    {d.short}
                  </div>
                  <div style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.3 }}>
                    {d.name}
                  </div>
                  {!d.affiliated && (
                    <span style={{ display: 'inline-flex', marginTop: 4 }}>
                      <CatalogStatusBadge status="unaffiliated" withText />
                    </span>
                  )}
                </td>
                <td style={{ ...sans, padding: '12px 12px 12px 0', fontSize: 12.5, color: C.gray700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
                  {d.scope}
                </td>
                <td style={{ ...sans, padding: '12px 12px 12px 0', fontSize: 12.5, color: C.charcoal, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
                  {d.items}
                </td>
                <td style={{ ...sans, padding: '12px 12px 12px 0', fontSize: 12.5, color: C.gray700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
                  {d.updated}
                </td>
                <td style={{ padding: '12px 12px 12px 0' }}>
                  <button
                    type="button"
                    onClick={() => setModalDist(d)}
                    style={{
                      ...sans,
                      fontSize: 12,
                      color: C.gray700,
                      textDecoration: 'underline',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Use for a quote
                  </button>
                </td>
                {/* Pin-to-stack affordance.
                    TODO (W2-5 live-data): replace d.short with real d.id when
                    this component switches to getChefDistributors() live data. */}
                <td style={{ padding: '12px 0', verticalAlign: 'middle' }}>
                  <PinToStackButton
                    distributorId={d.short}
                    distributorName={d.short}
                    stackData={stackData}
                    onStackChange={loadStack}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Operational footnote */}
      <div
        className="flex items-start gap-3"
        style={{
          marginTop: 32,
          paddingTop: 20,
          borderTop: `1px solid ${C.softLine}`,
          maxWidth: 560,
          fontSize: 12,
          color: C.gray700,
        }}
      >
        <MapPin size={14} color={C.hoverBlue} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={sans}>
          Area set by your restaurant address. Update it in Settings to change what shows here.
        </div>
      </div>

      {/* Paid multi-distributor send — Opus c11 lock (May 18) Q1.
          In-context action, never a tab. */}
      <div
        style={{
          marginTop: 28,
          padding: '20px 24px',
          borderRadius: 12,
          background: C.warmPaper,
          border: `1px solid ${C.softLine}`,
          maxWidth: 640,
        }}
      >
        <div style={{ ...sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.gray500 }}>
          WITH PAID
        </div>
        <div style={{ ...serif, fontSize: 17, fontWeight: 500, color: C.charcoal, marginTop: 4, lineHeight: 1.3 }}>
          Send this menu to another distributor.
        </div>
        <p style={{ ...sans, fontSize: 12.5, color: C.gray700, marginTop: 6, lineHeight: 1.6 }}>
          Request a quote from any distributor servicing {DEMO.restaurantCity}. Each response stays a
          separate quote thread, attached to its own distributor.
        </p>
        <button
          type="button"
          onClick={() => nav('tab-settings')}
          className="flex items-center gap-1"
          style={{
            ...sans,
            marginTop: 12,
            fontSize: 12,
            color: C.gray700,
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          See paid · $50/mo <ArrowRight size={12} style={{ marginLeft: 2 }} />
        </button>
      </div>

      {modalDist && (
        <UseDistributorForQuoteModal
          distributor={modalDist}
          onClose={() => setModalDist(null)}
          onContinue={() => { setModalDist(null); nav('entry'); }}
          variant="desktop"
        />
      )}
    </>
  );
}
