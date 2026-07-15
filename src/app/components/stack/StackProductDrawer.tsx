// StackProductDrawer — STACK-FE-2
// Cell-scoped, read-only product detail for the Stack views.
//
// Desi ask (May 29, 2026). Ported faithfully from the canonical
// handoff/source/screens-stack-drawer.jsx. Where the .md and .jsx differ,
// the .jsx wins per Desi's standing doctrine.
//
// Scope locks (Justin / Desi, May 29):
//   • CELL-SCOPED. One distributor's offering of one item. Row-scoped and
//     column-scoped detail are backlogged — not in this ticket.
//   • READ-ONLY. No "swap this match" action — that lives in the Rep Flow.
//   • MULTIPLE PACK SIZES are accommodated even though most catalogs won't
//     carry them for a while. The drawer is built ready.
//   • Price shows by default; when a price is absent it renders "$—" (the
//     one place an em-dash is allowed in a price slot, per Justin / Q-Stack-1).
//   • Distributor that doesn't carry the item stays a whole-cell "-" upstream;
//     the drawer is only opened on non-null cell offerings.
//
// Chrome:
//   variant="drawer"  — desktop right-side drawer (slides from right, ESC + backdrop close)
//   variant="sheet"   — mobile bottom-sheet (slides up, grab-handle, same close affordances)
//
// Used by:
//   • V1 ChefMenuStackDesktop  (screens-stack.jsx → StackProductDrawer)
//   • V2 ChefMenuStackV2Desktop (screens-stack-v2.jsx → StackProductDrawer)
//
// createPortal is imported from 'react-dom' (NOT 'react') — wrong import compiles
// but crashes at runtime on first portal mount.
//
// Design tokens: inline hex via C constants (same pattern as ChefAccountDrawer,
// HelpDrawer). No global qm-* classes.
// No gradient colors per QuoteMe hard rule.

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Info, ArrowDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  charcoal:  '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine:  '#E8E8E8',
  gray700:   '#4F4F4F',
  gray500:   '#6B7280',
  gray400:   '#9CA3AF',
  orange:    '#F2993D',
  accent:    '#7FAEC2',  // --accent in the design system
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};
const num: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
};

// ─── Public types ─────────────────────────────────────────────────────────────

/** A single pack-size entry from STACK_PRODUCT_DETAIL. */
export interface StackPackEntry {
  label: string;
  price: number | null;  // null → "$—" (carried-but-unpriced)
  sku:   string | null;
}

/** Enrichment record keyed by offering.name. */
export interface StackProductDetail {
  desc?:    string;
  sku?:     string | null;
  origin?:  string;
  brand?:   string;
  unit?:    string;
  updated?: string;
  packs:    StackPackEntry[];
}

/** The offering object that lives in a Stack cell. */
export interface StackOffering {
  name:  string;
  pack:  string;
  price: number | null;
}

/** A distributor column descriptor. */
export interface StackDistributor {
  short:    string;
  name?:    string;
  status:   'connected' | 'unaffiliated' | string;
  coverage?: string;
  role?:    string;
  /** currency optional/forward-compatible — see QuoteResponse.distributor
   * note in services/api.ts. priceOrDash() defaults to USD when absent. */
  currency?: string;
}

/** Props for StackProductDrawer. Export so callers (STACK-FE-1/3/4) can import. */
export interface StackProductDrawerProps {
  /** Whether the drawer / sheet is open. */
  open: boolean;
  /** Called when the user dismisses (backdrop, X button, ESC). */
  onClose: () => void;
  /** The cell's offering (product name, pack, price). */
  offering: StackOffering | null | undefined;
  /** The left-column chef term, e.g. "Yellow cheddar". */
  chefItem: string;
  /** The distributor column descriptor. */
  distributor: StackDistributor | null | undefined;
  /**
   * Chrome variant:
   *   "drawer" — desktop right-side drawer (default)
   *   "sheet"  — mobile bottom-sheet
   */
  variant?: 'drawer' | 'sheet';
}

// ─── Price formatter ──────────────────────────────────────────────────────────

/**
 * priceOrDash — canonical price slot formatter.
 *
 * Returns `money(p)` when p is a number, or "$-" when p is null/undefined.
 * NOTE: this used to be "$—" (em-dash) per an earlier Justin / Q-Stack-1
 * carve-out documented here; superseded by the no-em-dash sweep (2026-07-15)
 * — flagging for Moose to confirm the carve-out is meant to go too.
 * Exported so V1 + V2 stack views can import the single source of truth.
 */
export function priceOrDash(p: number | null | undefined, currency?: string): string {
  if (p == null) return '$-'; // kept literal (dollar-sign dash placeholder, no amount to localize)
  return formatCurrency(Math.round(p * 100), currency);
}

// ─── Demo enrichment data ─────────────────────────────────────────────────────
// Keyed by offering.name. Anything not in this map degrades gracefully to the
// cell's own { name, pack, price } (single-pack fallback).
// packs[0] is the "shown in stack" default; packs.length > 1 = multi-pack.
// price: null in a pack entry → "$—" (Radicchio / Riverbend unaffiliated case).

export const STACK_PRODUCT_DETAIL: Record<string, StackProductDetail> = {
  'Hudson Valley Yellow Cheddar, raw milk': {
    desc:    'Bandage-wrapped raw-milk cheddar aged in Hudson Valley cellars. Dense, crumbly paste with a long, brothy finish; holds its edge on a board and melts clean for service.',
    sku:     'DL-CHE-0042',
    origin:  'Ghent, NY',
    brand:   'Hudson Valley Creamery',
    unit:    'per lb',
    updated: 'May 8, 2026',
    packs: [
      { label: '5 lb wheel',             price: 42.50, sku: 'DL-CHE-0042'  },
      { label: 'Half wheel · 2.5 lb',    price: 22.75, sku: 'DL-CHE-0042H' },
      { label: 'Cut to order · per lb',  price:  9.40, sku: 'DL-CHE-0042C' },
    ],
  },
  'Branzino, whole dressed, Mediterranean': {
    desc:    'Whole dressed Mediterranean sea bass, scaled and gutted, head-on. Sweet, delicate white flesh; the house whole-roast fish. Landed and shipped on ice, 2 to 3 day turns.',
    sku:     'DL-SEA-0112',
    origin:  'Aegean (Greece / Türkiye)',
    brand:   "D'Lisius Catch",
    unit:    'per lb',
    updated: 'May 8, 2026',
    packs: [
      { label: '1 to 1.5 lb avg, each',      price: 14.25, sku: 'DL-SEA-0112'  },
      { label: 'Case · 20 lb (≈14 to 16 fish)', price: 13.10, sku: 'DL-SEA-0112C' },
    ],
  },
  'Berkshire pork shoulder, skin-on': {
    desc:    'Skin-on bone-in Berkshire (Kurobuta) shoulder. Heavy marbling, deep color; built for long braises, porchetta, and house charcuterie.',
    sku:     'DL-MEA-0211',
    origin:  'Beeler\'s, IA',
    brand:   'Berkshire Heritage',
    unit:    'per lb',
    updated: 'May 8, 2026',
    packs: [{ label: '8 to 10 lb avg, each', price: 78.50, sku: 'DL-MEA-0211' }],
  },
  'Prosciutto di Parma, 18-mo, sliced': {
    desc:    'DOP Prosciutto di Parma, aged 18 months, machine-sliced and interleaved. Silky, nutty, faintly sweet. Ready for the plate or the panino station.',
    sku:     'DL-CHA-0307',
    origin:  'Parma, Italy (DOP)',
    brand:   'Consorzio Del Prosciutto',
    unit:    'per lb',
    updated: 'May 8, 2026',
    packs: [
      { label: '1 lb, sliced',            price: 28.95, sku: 'DL-CHA-0307'  },
      { label: 'Whole boneless leg · ~15 lb', price: 19.80, sku: 'DL-CHA-0307W' },
    ],
  },
  'Tellicherry peppercorns, single-origin': {
    desc:    'Single-origin Tellicherry black peppercorns, late-harvest and extra-bold grade. Bright, citrus-forward heat; mill-side staple.',
    sku:     'DL-SPI-0501',
    origin:  'Malabar Coast, India',
    brand:   '-',
    unit:    'per lb',
    updated: 'May 8, 2026',
    packs: [{ label: '1 lb', price: 18.40, sku: 'DL-SPI-0501' }],
  },
  'Meyer lemons, California': {
    desc:    'Thin-skinned Meyer lemons: lower acid, floral, faintly sweet. Good for curds, vinaigrettes, and preserved-lemon batches.',
    sku:     'DL-PRO-0620',
    origin:  'Central Valley, CA',
    brand:   '-',
    unit:    'per case',
    updated: 'May 8, 2026',
    packs: [
      { label: '35 lb case',      price: 58.50, sku: 'DL-PRO-0620'  },
      { label: 'Half case · 18 lb', price: 31.00, sku: 'DL-PRO-0620H' },
    ],
  },
  'Late Treviso, local Hudson Valley grow': {
    desc:    'Late-season Treviso radicchio from a Hudson Valley grower: tight, tapered heads, deep burgundy. Bitter edge mellows on the grill.',
    sku:     null,
    origin:  'Hudson Valley, NY',
    brand:   'Local Grower Co-Op',
    unit:    'per case',
    updated: 'Apr 30, 2026',
    // Unaffiliated distributor — catalog carries the item but no price loaded yet.
    packs: [{ label: '12 ct case', price: null, sku: null }],
  },
};

// ─── StackProductImage ────────────────────────────────────────────────────────
// Striped placeholder — no hand-drawn imagery. No gradient (QuoteMe hard rule):
// stripes are achieved via repeating-linear-gradient which is structural, not
// a color gradient. Background colors are rgba semi-transparent over white.

function StackProductImage({ height = 150 }: { height?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        borderRadius: 6,
        border: `1px solid ${C.softLine}`,
        // Diagonal stripe pattern — functional structure, not decorative gradient.
        background: 'repeating-linear-gradient(45deg, rgba(60,50,40,.05) 0 10px, rgba(60,50,40,.02) 10px 20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          ...mono,
          fontSize: 10.5,
          letterSpacing: '0.08em',
          color: 'rgba(60,50,40,.42)',
          textTransform: 'uppercase',
        }}
      >
        product shot
      </span>
    </div>
  );
}

// ─── DetailFact ───────────────────────────────────────────────────────────────

function DetailFact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: C.gray500,
        }}
      >
        {label}
      </div>
      <div style={{ color: C.charcoal, fontSize: 12.5, marginTop: 2, lineHeight: 1.35 }}>
        {value}
      </div>
    </div>
  );
}

// ─── StackProductBody ─────────────────────────────────────────────────────────
// Shared body rendered inside both chrome variants.

function StackProductBody({
  offering,
  chefItem,
  distributor,
}: {
  offering:    StackOffering;
  chefItem:    string;
  distributor: StackDistributor | null | undefined;
}) {
  const detail = STACK_PRODUCT_DETAIL[offering.name] ?? {};
  const packs: StackPackEntry[] =
    detail.packs && detail.packs.length > 0
      ? detail.packs
      : [{ label: offering.pack, price: offering.price, sku: detail.sku ?? null }];

  const multi = packs.length > 1;

  return (
    <div>
      {/* Identity eyebrow */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: C.gray500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        {distributor ? distributor.short : 'Distributor'}
        {distributor?.status === 'unaffiliated' && (
          <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: C.gray400 }}>
            · no rep yet
          </span>
        )}
      </div>

      {/* Product name */}
      <h2
        style={{
          ...serif,
          fontSize: 22,
          fontWeight: 600,
          color: C.charcoal,
          lineHeight: 1.18,
          marginTop: 6,
        }}
      >
        {offering.name}
      </h2>

      {/* Chef-item cross-reference */}
      <div style={{ fontSize: 12.5, color: C.gray500, marginTop: 4, lineHeight: 1.35 }}>
        Your line:{' '}
        <span style={{ color: C.charcoal }}>{chefItem}</span>
      </div>

      {/* Product image placeholder */}
      <div style={{ marginTop: 16 }}>
        <StackProductImage />
      </div>

      {/* Description */}
      {detail.desc && (
        <p
          style={{
            ...serif,
            fontSize: 13.5,
            color: C.charcoal,
            lineHeight: 1.6,
            marginTop: 16,
          }}
        >
          {detail.desc}
        </p>
      )}

      {/* Facts grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 16,
          rowGap: 12,
          marginTop: 16,
        }}
      >
        <DetailFact label="SKU"     value={detail.sku || (packs[0]?.sku) || '-'} />
        <DetailFact label="Origin"  value={detail.origin} />
        <DetailFact label="Brand"   value={detail.brand} />
        <DetailFact label="Sold By" value={detail.unit} />
      </div>

      {/* Pack sizes + prices */}
      <div style={{ marginTop: 20 }}>
        {/* Pack section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: C.gray500,
          }}
        >
          <span>{multi ? 'Pack Sizes' : 'Pack'}</span>
          {multi && (
            <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: C.gray400 }}>
              {packs.length} options
            </span>
          )}
        </div>

        {/* Thick top divider */}
        <div
          style={{ borderTop: `2px solid ${C.charcoal}`, marginTop: 6 }}
        />

        {/* Pack rows */}
        {packs.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 0',
              borderBottom: `1px solid ${C.softLine}`,
            }}
          >
            <div style={{ minWidth: 0 }}>
              {/* Pack label */}
              <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.35 }}>
                {p.label}
              </div>
              {/* SKU + "shown in stack" badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                {p.sku && (
                  <span style={{ ...mono, ...num, fontSize: 10.5, color: C.gray400, lineHeight: 1.35 }}>
                    {p.sku}
                  </span>
                )}
                {i === 0 && multi && (
                  <span
                    style={{
                      background: C.warmPaper,
                      color: C.gray700,
                      border: `1px solid ${C.softLine}`,
                      borderRadius: 4,
                      fontSize: 9,
                      padding: '1px 6px',
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                    }}
                  >
                    Shown In Stack
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div
              style={{
                ...num,
                flexShrink: 0,
                fontSize: 15,
                fontWeight: 500,
                color: C.charcoal,
              }}
            >
              {priceOrDash(p.price, distributor?.currency)}
            </div>
          </div>
        ))}
      </div>

      {/* Provenance footnote — distributor name only, never catalog name (Desi spec). */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          marginTop: 20,
          fontSize: 11.5,
          color: C.gray400,
          lineHeight: 1.5,
        }}
      >
        <Info size={13} color={C.accent} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          From {distributor ? distributor.short : 'this distributor'}'s catalog
          {detail.updated ? `, updated ${detail.updated}` : ''}.
          {packs.some((p) => p.price == null) && ' Prices we don\'t have yet show as $-.'}
        </div>
      </div>
    </div>
  );
}

// ─── StackProductDrawer ───────────────────────────────────────────────────────
// The public-facing component. Renders via createPortal so it floats above all
// page content regardless of stacking context.
//
// variant="drawer" — desktop right-side panel (480px wide, full height)
// variant="sheet"  — mobile bottom-sheet (full width, 88% max height, grab-handle)

export function StackProductDrawer({
  open,
  onClose,
  offering,
  chefItem,
  distributor,
  variant = 'drawer',
}: StackProductDrawerProps) {
  // ESC key closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !offering) return null;

  const isSheet = variant === 'sheet';

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={offering.name}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        justifyContent: isSheet ? 'center' : 'flex-end',
        alignItems: isSheet ? 'flex-end' : 'stretch',
      }}
    >
      {/* Backdrop */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(43,43,43,.32)',
          border: 'none',
          cursor: 'default',
        }}
      />

      {/* Drawer / Sheet panel */}
      <div
        style={{
          position: 'relative',
          width: isSheet ? '100%' : 'min(480px, 92vw)',
          maxHeight: isSheet ? '88%' : '100%',
          height: isSheet ? 'auto' : '100%',
          background: '#ffffff',
          borderLeft: isSheet ? 'none' : `1px solid ${C.softLine}`,
          borderTopLeftRadius: isSheet ? 18 : 0,
          borderTopRightRadius: isSheet ? 18 : 0,
          boxShadow: isSheet
            ? '0 -16px 40px rgba(43,43,43,.16)'
            : '-20px 0 40px rgba(43,43,43,.10)',
          display: 'flex',
          flexDirection: 'column',
          animation: isSheet
            ? 'qmSheetUp .24s cubic-bezier(.2,.7,.2,1)'
            : 'qmProdDrawerIn .22s cubic-bezier(.2,.7,.2,1)',
        }}
      >
        {/* Mobile grab-handle */}
        {isSheet && (
          <div style={{ paddingTop: 8, display: 'flex', justifyContent: 'center' }}>
            <span
              style={{
                width: 38,
                height: 4,
                borderRadius: 999,
                background: C.softLine,
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Close button row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: isSheet ? '4px 16px 0' : '14px 16px 0',
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} color={C.charcoal} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isSheet ? '4px 22px 28px' : '0 28px 28px',
          }}
        >
          <StackProductBody
            offering={offering}
            chefItem={chefItem}
            distributor={distributor}
          />
        </div>

        {/* Animation keyframes */}
        <style>{`
          @keyframes qmProdDrawerIn {
            from { transform: translateX(24px); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          @keyframes qmSheetUp {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

// ─── LowestPriceIndex helper ──────────────────────────────────────────────────
// Exported for V1/V2 stack views that show the "↓ cheaper here" marker.
// Returns the index of the distributor with the lowest non-null price in a row,
// or -1 if fewer than two distributors have a price (no meaningful comparison).
// Skips null prices so "$—" cells never get the cheaper-here arrow (Q-Stack-1).

export function lowestPriceIndex(offerings: Array<StackOffering | null>): number {
  const valid = offerings
    .map((o, i) => (o == null || o.price == null ? null : { p: o.price, i }))
    .filter((x): x is { p: number; i: number } => x !== null);
  if (valid.length < 2) return -1;
  return valid.reduce((lo, x) => (x.p < lo.p ? x : lo), valid[0]).i;
}

// Re-export ArrowDown for use by V1/V2 cells showing the lower-price marker.
export { ArrowDown };
