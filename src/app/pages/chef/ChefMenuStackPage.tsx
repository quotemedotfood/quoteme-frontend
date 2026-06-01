// ChefMenuStackPage — /chef/menus/:menuId/stack
//
// STACK-FE-1: Stack roster + compare-spread table.
// STACK-FE-4: Empty stack state — rendered when no distributors are pinned.
//
// Design source: handoff/source/screens-stack.jsx (V1, CANONICAL per Desi doctrine).
// If this file and the .jsx ever disagree, the .jsx wins.
//
// Data: The BE stack API (GET /api/v1/chef/stack) returns pins (distributor list).
// A per-menu product compare-spread endpoint does not exist yet — the .jsx
// uses demo data explicitly. This file follows the same doctrine: demo rows
// seed the table; a real endpoint wires in transparently once shipped.
//
// Imports from StackProductDrawer (STACK-FE-2, already on main):
//   • StackProductDrawer (component)
//   • StackProductDrawerProps, StackOffering, StackDistributor, StackPackEntry,
//     StackProductDetail — types
//   • priceOrDash(p)          — canonical "$—" / "$x.xx" formatter (DO NOT duplicate)
//   • lowestPriceIndex(offerings) — cheaper-here arrow index (DO NOT duplicate)
//
// Hard rules (QuoteMe doctrine):
//   • NO gradient colors
//   • Title Case labels
//   • Prices in every non-null cell via priceOrDash; "$—" for carried-but-unpriced
//   • Per-distributor "X/Y matched" coverage in column headers
//   • Cheaper-here arrow (↓) via lowestPriceIndex — operational, never qualitative
//   • SHOW_PRICES gate (global admin flag) preserved per Justin lock May 27
//
// STACK-FE-4: empty state branch (below) renders when DEMO_DISTRIBUTORS is
//   empty — i.e., chef has not pinned any distributors to this menu's stack yet.
//   Populated path is untouched.
//
// Route: /chef/menus/:menuId/stack   (registered inside ChefShellLayout)

import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowDown } from 'lucide-react';
import {
  StackProductDrawer,
  priceOrDash,
  lowestPriceIndex,
  type StackOffering,
  type StackDistributor,
} from '../../components/stack/StackProductDrawer';

// ─── Design tokens ────────────────────────────────────────────────────────────
// Inline palette matches StackProductDrawer + ChefMenuDetailPage patterns.

const C = {
  charcoal:  '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine:  '#E8E8E8',
  orange:    '#F2993D',
  gray700:   '#4F4F4F',
  gray500:   '#6B7280',
  gray400:   '#9CA3AF',
  accent:    '#7FAEC2',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const num: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
};

// ─── SHOW_PRICES gate ─────────────────────────────────────────────────────────
// Justin lock May 27: QM admin can flip this globally once distributor critical
// mass is reached. Layout space preserved — cells keep vertical rhythm when off.
// STACK-FE-1 ships with prices ON per Desi V1 spec.
const SHOW_PRICES = true;

// ─── Demo data ────────────────────────────────────────────────────────────────
// Canonical per handoff/source/screens-stack.jsx (Desi, May 21).
// Distributors: D'Lisius (full), Foothill Dairy, Northwind Seafood, Riverbend (unaffiliated).
// Stays until the BE adds a per-menu product compare-spread endpoint.

const DEMO_DISTRIBUTORS: StackDistributor[] = [
  { short: "D'Lisius",          name: "D'Lisius Distribution Co.",  status: 'connected',    coverage: 'Full catalog',            role: 'Main rep · dry goods + meat' },
  { short: 'Foothill Dairy',    name: 'Foothill Dairy Collective',   status: 'connected',    coverage: 'Dairy · selected produce', role: 'My dairy' },
  { short: 'Northwind Seafood', name: 'Northwind Seafood Co.',      status: 'connected',    coverage: 'Seafood',                  role: 'My seafood' },
  { short: 'Riverbend Produce', name: 'Riverbend Farm Produce',      status: 'unaffiliated', coverage: 'Produce',                  role: 'My produce' },
];

interface StackRow {
  cat: string;
  chefItem: string;
  qty: number;
  note?: string;
  offerings: Array<StackOffering | null>;
}

// Exact offering data from handoff/source/screens-stack.jsx.
// price: null = carried-but-unpriced → renders "$—" via priceOrDash.
const DEMO_ROWS: StackRow[] = [
  // Cheese & Dairy
  { cat: 'Cheese & Dairy', chefItem: 'Yellow Cheddar', qty: 2, offerings: [
    { name: 'Hudson Valley Yellow Cheddar, raw milk',  pack: '5 lb wheel',   price: 42.50 },
    { name: 'Cabot Clothbound Cheddar, aged 12mo',     pack: '4 lb wheel',   price: 39.80 },
    null, null,
  ]},
  { cat: 'Cheese & Dairy', chefItem: 'Cultured Butter', qty: 6, offerings: [
    { name: 'Vermont Creamery cultured salted',         pack: '1 lb roll',    price:  9.75 },
    { name: 'Ploughgate cultured butter, Vermont',      pack: '8 oz block',   price:  9.20 },
    null, null,
  ]},
  { cat: 'Cheese & Dairy', chefItem: 'Parmesan', qty: 4, offerings: [
    { name: 'Parmigiano-Reggiano DOP, 24-mo',           pack: '1 lb wedge',   price: 24.00 },
    null, null, null,
  ]},
  { cat: 'Cheese & Dairy', chefItem: 'Mozzarella', qty: 8, offerings: [
    { name: 'Fior di latte, hand-pulled, fresh',        pack: '8 oz ball',    price:  7.40 },
    { name: 'Maplebrook fresh mozzarella, Vermont',     pack: '8 oz ball',    price:  7.60 },
    null, null,
  ]},
  // Meat & Charcuterie
  { cat: 'Meat & Charcuterie', chefItem: 'Pork Shoulder', qty: 1, offerings: [
    { name: 'Berkshire pork shoulder, skin-on',         pack: '8–10 lb avg',  price: 78.50 },
    null, null, null,
  ]},
  { cat: 'Meat & Charcuterie', chefItem: 'Beef Cheeks', qty: 1, offerings: [
    { name: 'Snake River Farms wagyu cheeks, USDA',     pack: '5 lb pack',    price: 138.00 },
    null, null, null,
  ]},
  { cat: 'Meat & Charcuterie', chefItem: 'Prosciutto', qty: 3, offerings: [
    { name: 'Prosciutto di Parma, 18-mo, sliced',       pack: '1 lb',         price: 28.95 },
    null, null, null,
  ]},
  // Seafood
  { cat: 'Seafood', chefItem: 'Branzino', qty: 12, offerings: [
    { name: 'Branzino, whole dressed, Mediterranean',   pack: '1–1.5 lb avg', price: 14.25 },
    null,
    { name: 'Branzino, whole, Croatian farmed',         pack: '1.2 lb avg',   price: 13.40 },
    null,
  ]},
  { cat: 'Seafood', chefItem: 'Diver Scallops', qty: 4, offerings: [
    { name: 'Maine diver scallops, U-10 dry',           pack: '1 lb',         price: 32.80 },
    null,
    { name: 'Georges Bank dry-pack scallops, U-12',     pack: '1 lb',         price: 31.50 },
    null,
  ]},
  // Pantry & Spice
  { cat: 'Pantry & Spice', chefItem: 'Black Pepper', qty: 1, offerings: [
    { name: 'Tellicherry peppercorns, single-origin',   pack: '1 lb',         price: 18.40 },
    null, null, null,
  ]},
  { cat: 'Pantry & Spice', chefItem: 'Sea Salt', qty: 2, offerings: [
    { name: 'Maldon sea salt flake, English',           pack: '1.5 lb tub',   price: 16.20 },
    null, null, null,
  ]},
  { cat: 'Pantry & Spice', chefItem: 'Castelvetrano Olives', qty: 1, offerings: [
    { name: 'Castelvetrano olives, pitted, Sicily',     pack: '2.5 kg jar',   price: 34.75 },
    null, null, null,
  ]},
  { cat: 'Pantry & Spice', chefItem: '00 Flour', qty: 1, offerings: [
    { name: 'Caputo Tipo 00 pizzeria flour',            pack: '55 lb bag',    price: 44.20 },
    null, null, null,
  ]},
  { cat: 'Pantry & Spice', chefItem: 'San Marzano Tomato', qty: 1, offerings: [
    { name: 'Bianco DiNapoli organic, DOP-style',        pack: '#10 can, 6 ct', price: 41.60 },
    null, null, null,
  ]},
  // Produce
  { cat: 'Produce', chefItem: 'Radicchio', qty: 1, offerings: [
    { name: 'Treviso radicchio, Italian seed',           pack: '12 ct case',   price: 32.00 },
    null, null,
    { name: 'Late Treviso, local Hudson Valley grow',    pack: '12 ct case',   price: null },  // $— (carried, unpriced)
  ]},
  { cat: 'Produce', chefItem: 'Meyer Lemons', qty: 1, offerings: [
    { name: 'Meyer lemons, California',                  pack: '35 lb case',   price: 58.50 },
    { name: 'Meyer lemons, organic, CA',                 pack: '30 lb case',   price: 56.00 },
    null,
    { name: 'Meyer lemons, local greenhouse',            pack: '30 lb case',   price: 52.00 },
  ]},
  { cat: 'Produce', chefItem: 'Heirloom Carrots', qty: 1, offerings: [
    { name: 'Rainbow carrots, mixed heirloom',           pack: '25 lb case',   price: 46.00 },
    null, null,
    { name: 'Heirloom carrots, Roxbury Farm CSA',        pack: '25 lb case',   price: 44.80 },
  ]},
  { cat: 'Produce', chefItem: 'Chicory', qty: 1, offerings: [
    { name: 'Castelfranco chicory, speckled',            pack: '10 ct case',   price: 38.40 },
    null, null,
    { name: 'Castelfranco, Hawthorne Valley Farm',       pack: '10 ct case',   price: 36.10 },
  ]},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncName(name: string, max = 36): string {
  if (!name) return '';
  return name.length <= max ? name : name.slice(0, max - 1).trimEnd() + '…';
}

interface ColStat extends StackDistributor {
  matched: number;
  of: number;
}

function computeColumnStats(distributors: StackDistributor[], rows: StackRow[]): ColStat[] {
  return distributors.map((d, di) => {
    let matched = 0;
    for (const r of rows) {
      if (r.offerings[di] != null) matched++;
    }
    return { ...d, matched, of: rows.length };
  });
}

function groupRows(rows: StackRow[]): Array<{ cat: string; items: StackRow[] }> {
  const out: Array<{ cat: string; items: StackRow[] }> = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.cat === r.cat) last.items.push(r);
    else out.push({ cat: r.cat, items: [r] });
  }
  return out;
}

// ─── DetailCell type ──────────────────────────────────────────────────────────

interface DetailCell {
  offering: StackOffering;
  chefItem: string;
  distributor: StackDistributor;
}

// ─── StackEmptyState ──────────────────────────────────────────────────────────
// STACK-FE-4: rendered when no distributors are pinned to this menu's stack.
// Guidance: prompt the chef to pin distributors so the compare-spread can build.
// Matches page chrome (back nav + serif headline) so it reads as part of the
// same screen, not a broken or loading state.

interface StackEmptyStateProps {
  menuId: string;
  onNavigateBack: () => void;
}

function StackEmptyState({ menuId, onNavigateBack }: StackEmptyStateProps) {
  return (
    <div style={{ ...sans, color: C.charcoal, maxWidth: 1200, margin: '0 auto', padding: '24px 32px 48px' }}>

      {/* Back nav */}
      <div>
        <button
          onClick={onNavigateBack}
          style={{
            ...sans,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            color: C.gray500,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← Back To Menu
        </button>

        <h1 style={{ ...serif, fontSize: 32, fontWeight: 600, color: C.charcoal, marginTop: 8, lineHeight: 1.1 }}>
          Your Stack
        </h1>
        <p style={{ marginTop: 8, fontSize: 13.5, color: C.gray500, lineHeight: 1.6, maxWidth: 520 }}>
          Pin the distributors you source from to see this menu priced side-by-side
          across your whole stack.
        </p>
      </div>

      {/* Empty state card */}
      <div
        style={{
          marginTop: 32,
          borderTop: `2px solid ${C.charcoal}`,
          paddingTop: 32,
          maxWidth: 560,
        }}
      >
        {/* Step list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            {
              n: '1',
              head: 'Find Your Distributors',
              body: 'Go to Distributors and find the reps you already work with — or browse who services your area.',
            },
            {
              n: '2',
              head: 'Pin Them To Your Stack',
              body: 'Tap the pin on any distributor to add them. Each one becomes a column in your compare-spread.',
            },
            {
              n: '3',
              head: 'Come Back Here',
              body: 'This menu prices against every distributor in your stack. Pick one to build an order guide, or compare across several.',
            },
          ].map(step => (
            <div key={step.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: `1.5px solid ${C.charcoal}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...serif,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.charcoal,
                  marginTop: 2,
                }}
              >
                {step.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...serif, fontSize: 16, fontWeight: 500, color: C.charcoal, lineHeight: 1.25 }}>
                  {step.head}
                </div>
                <div style={{ fontSize: 13, color: C.gray500, marginTop: 4, lineHeight: 1.6 }}>
                  {step.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={onNavigateBack}
            style={{
              ...sans,
              padding: '10px 14px',
              fontSize: 13,
              background: 'none',
              border: 'none',
              color: C.gray500,
              cursor: 'pointer',
              borderRadius: 6,
            }}
          >
            Back To Menu
          </button>
          <button
            onClick={() => {
              // STACK-FE-4 note: routes to the chef distributors browse surface.
              // Route is /chef/distributors per ChefShellLayout registration.
              // Update this href if the distributors route changes.
              window.location.href = '/chef/distributors';
            }}
            style={{
              ...sans,
              padding: '11px 20px',
              fontSize: 14,
              fontWeight: 500,
              background: C.orange,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Browse Distributors →
          </button>
        </div>
      </div>

      {/* Footnote */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          fontSize: 12,
          color: C.gray500,
          lineHeight: 1.6,
          maxWidth: 520,
        }}
      >
        <span style={{ color: C.accent, flexShrink: 0, marginTop: 1 }}>ⓘ</span>
        <div>
          You can have multiple distributors in your stack — some chefs split their menu
          across a broadliner, a dairy house, and a local produce rep. Stack is your
          operational view, not a marketplace ranking.
        </div>
      </div>
    </div>
  );
}

// ─── ChefMenuStackPage ────────────────────────────────────────────────────────

export function ChefMenuStackPage() {
  const { menuId } = useParams<{ menuId: string }>();
  const navigate = useNavigate();

  // STACK-FE-4: the populated path uses DEMO_DISTRIBUTORS (4 hardcoded entries).
  // When that list is empty — i.e., no pins yet — the empty state renders instead.
  // A real API integration will replace DEMO_DISTRIBUTORS with fetched pin data;
  // this branch handles the zero-pin case transparently once that wires in.
  const hasPins = DEMO_DISTRIBUTORS.length > 0;

  const cols = useMemo(() => computeColumnStats(DEMO_DISTRIBUTORS, DEMO_ROWS), []);
  const groups = useMemo(() => groupRows(DEMO_ROWS), []);

  // Column selection: a Set of column indices. Default — first distributor (chef's main rep).
  const [picks, setPicks] = useState<Set<number>>(() => new Set([0]));

  // Drawer state: which distributor's add-to-stack drawer is open.
  const [detailCell, setDetailCell] = useState<DetailCell | null>(null);

  const togglePick = (ci: number) => {
    setPicks(cur => {
      const next = new Set(cur);
      if (next.has(ci)) next.delete(ci);
      else next.add(ci);
      return next;
    });
  };

  const pickedIdx = Array.from(picks);
  const n = pickedIdx.length;
  const pickedCols = pickedIdx.map(i => cols[i]);

  // Per-section matched-count per distributor.
  const sectionSubtotals = groups.map(g =>
    cols.map((_, ci) => g.items.reduce((s, it) => (it.offerings[ci] != null ? s + 1 : s), 0))
  );

  // STACK-FE-4: empty state — no distributors pinned yet.
  if (!hasPins) {
    return (
      <StackEmptyState
        menuId={menuId ?? ''}
        onNavigateBack={() => navigate(`/chef/menus/${menuId ?? ''}`)}
      />
    );
  }

  return (
    <div style={{ ...sans, color: C.charcoal, maxWidth: 1200, margin: '0 auto', padding: '24px 32px 48px' }}>

      {/* Back nav + page header */}
      <div>
        <button
          onClick={() => navigate(`/chef/menus/${menuId ?? ''}`)}
          style={{
            ...sans,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            color: C.gray500,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← Spring Tasting · Prix Fixe
        </button>

        <h1 style={{ ...serif, fontSize: 32, fontWeight: 600, color: C.charcoal, marginTop: 8, lineHeight: 1.1 }}>
          Your Stack · {DEMO_ROWS.length} Items Across {cols.length} Distributors
        </h1>
        <p style={{ marginTop: 8, fontSize: 13.5, color: C.gray500, lineHeight: 1.6, maxWidth: 580 }}>
          This menu priced against the distributors you source from. Pick one to build a
          single order guide, or several to split the menu across your stack. Items not on
          a catalog show as "—" so coverage gaps stay visible.
        </p>
      </div>

      {/* Compare-spread table */}
      <div style={{ marginTop: 24, borderTop: `2px solid ${C.charcoal}`, overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 880, width: '100%', ...sans }}>

          {/* Column headers */}
          <thead>
            <tr>
              {/* Your Item column */}
              <th
                style={{
                  width: 200,
                  padding: '16px 12px 14px 0',
                  textAlign: 'left',
                  verticalAlign: 'bottom',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.gray500 }}>
                  Your Item
                </div>
                <div style={{ ...num, fontSize: 12, color: C.gray400, marginTop: 4 }}>
                  {DEMO_ROWS.length} lines
                </div>
              </th>

              {/* Distributor columns */}
              {cols.map((c, ci) => {
                const on = picks.has(ci);
                return (
                  <th
                    key={ci}
                    style={{
                      padding: '16px 12px 14px 12px',
                      textAlign: 'left',
                      verticalAlign: 'bottom',
                      background: on ? 'rgba(165,207,221,.10)' : 'transparent',
                      borderLeft: `1px solid ${C.softLine}`,
                      minWidth: 170,
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => togglePick(ci)}
                        style={{ accentColor: C.orange, marginTop: 4, width: 14, height: 14 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ ...serif, fontSize: 15, fontWeight: 500, color: C.charcoal, lineHeight: 1.2 }}>
                            {c.short}
                          </span>
                          {c.status === 'unaffiliated' && (
                            <span style={{
                              fontSize: 9,
                              padding: '1px 6px',
                              border: `1px solid ${C.softLine}`,
                              borderRadius: 4,
                              background: '#FFF9F3',
                              color: C.gray700,
                            }}>
                              Unaffiliated
                            </span>
                          )}
                        </div>
                        {c.role && (
                          <div style={{ ...serif, fontSize: 10.5, color: C.gray500, fontStyle: 'italic', marginTop: 2, lineHeight: 1.4 }}>
                            {c.role}
                          </div>
                        )}
                        <div style={{ fontSize: 10.5, color: C.gray400, marginTop: 2 }}>
                          {c.coverage}
                        </div>
                        {/* Per-distributor coverage — locked per Q-Stack-2 doctrine:
                            "X/Y matched" in Stack table column headers is the one
                            approved surface for match counts. DO NOT add elsewhere. */}
                        <div style={{ ...num, fontSize: 11, color: C.gray500, marginTop: 4 }}>
                          {c.matched}/{c.of} matched
                        </div>
                        {/* Height reserved so header row keeps vertical rhythm
                            when no subtotal is present (no-qty doctrine). */}
                        <div style={{ height: 22 }} aria-hidden="true" />
                      </div>
                    </label>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Section bodies */}
          {groups.map((g, gi) => {
            const subs = sectionSubtotals[gi];
            return (
              <tbody key={gi}>
                {/* Category eyebrow row */}
                <tr>
                  <td colSpan={cols.length + 1} style={{ paddingTop: 18 }}>
                    <div style={{ borderTop: `2px solid ${C.charcoal}` }} />
                    <div style={{
                      ...serif,
                      fontSize: 12.5,
                      fontWeight: 500,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: C.charcoal,
                      marginTop: 8,
                    }}>
                      {g.cat}
                    </div>
                  </td>
                </tr>

                {/* Item rows */}
                {g.items.map((it, ii) => {
                  const lo = lowestPriceIndex(it.offerings);
                  return (
                    <tr
                      key={ii}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Chef item name */}
                      <td style={{
                        padding: '10px 12px 10px 0',
                        borderBottom: `1px solid ${C.softLine}`,
                        verticalAlign: 'top',
                      }}>
                        <div style={{ ...serif, fontSize: 14, fontWeight: 500, color: C.charcoal, lineHeight: 1.35 }}>
                          {it.chefItem}
                        </div>
                        {it.note && (
                          <div style={{ fontSize: 11, color: C.gray400, marginTop: 2, lineHeight: 1.35 }}>
                            {it.note}
                          </div>
                        )}
                      </td>

                      {/* Distributor cells */}
                      {it.offerings.map((o, ci) => {
                        const isLow = ci === lo;
                        const on = picks.has(ci);
                        return (
                          <td
                            key={ci}
                            style={{
                              padding: '10px 12px',
                              borderBottom: `1px solid ${C.softLine}`,
                              borderLeft: `1px solid ${C.softLine}`,
                              background: on ? 'rgba(165,207,221,.06)' : 'transparent',
                              verticalAlign: 'top',
                            }}
                          >
                            {o != null ? (
                              // Clickable cell — opens StackProductDrawer
                              <button
                                onClick={() => setDetailCell({ offering: o, chefItem: it.chefItem, distributor: cols[ci] })}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  textAlign: 'left',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                                title={`${o.name} · ${o.pack} — open details`}
                              >
                                <div style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.4, minHeight: 30 }}>
                                  {truncName(o.name, 36)}
                                </div>
                                <div style={{ fontSize: 10.5, color: C.gray400, marginTop: 2, lineHeight: 1.35 }}>
                                  {o.pack}
                                </div>
                                {SHOW_PRICES ? (
                                  // Price slot: priceOrDash for every non-null cell.
                                  // "$—" when price is null (carried-but-unpriced, Q-Stack-1).
                                  // No line totals — no-qty doctrine (Justin May 27).
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    justifyContent: 'flex-end',
                                    gap: 4,
                                    marginTop: 4,
                                  }}>
                                    {isLow && (
                                      <ArrowDown size={10} color={C.charcoal} />
                                    )}
                                    <span style={{ ...num, fontSize: 13, fontWeight: 500, color: C.charcoal }}>
                                      {priceOrDash(o.price)}
                                    </span>
                                  </div>
                                ) : (
                                  // SHOW_PRICES=false: show a check instead, preserve vertical rhythm
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, minHeight: 18 }}>
                                    <span style={{ fontSize: 11, color: C.gray500 }}>✓</span>
                                  </div>
                                )}
                              </button>
                            ) : (
                              // Not on catalog — bare em-dash, no border (Desi spec para 3)
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: 14, color: C.gray400 }}>—</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Section coverage row — matched count per distributor.
                    No dollar subtotals per Justin no-qty doctrine (May 27). */}
                <tr>
                  <td style={{ padding: '8px 12px 8px 0', verticalAlign: 'top' }}>
                    <span style={{ fontSize: 11.5, color: C.gray500 }}>
                      {g.cat} Coverage
                    </span>
                  </td>
                  {cols.map((_, ci) => {
                    const v = subs[ci];
                    const total = g.items.length;
                    const on = picks.has(ci);
                    return (
                      <td
                        key={ci}
                        style={{
                          ...num,
                          padding: '8px 12px',
                          textAlign: 'right',
                          borderLeft: `1px solid ${C.softLine}`,
                          background: on ? 'rgba(165,207,221,.06)' : 'transparent',
                        }}
                      >
                        <span style={{ fontSize: 12, color: v > 0 ? C.gray500 : C.gray400 }}>
                          {v}/{total}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            );
          })}

          {/* Grand coverage footer — NOT dollar totals (no-qty doctrine) */}
          <tfoot>
            <tr>
              <td colSpan={cols.length + 1} style={{ paddingTop: 14 }}>
                <div style={{ borderTop: `2px solid ${C.charcoal}` }} />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px 12px 14px 0' }}>
                <span style={{ ...serif, fontSize: 14, color: C.charcoal }}>
                  Coverage · {DEMO_ROWS.length} Items
                </span>
              </td>
              {cols.map((c, ci) => {
                const on = picks.has(ci);
                return (
                  <td
                    key={ci}
                    style={{
                      ...num,
                      padding: '10px 12px 14px',
                      textAlign: 'right',
                      borderLeft: `1px solid ${C.softLine}`,
                      background: on ? 'rgba(165,207,221,.10)' : 'transparent',
                    }}
                  >
                    <div style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal }}>
                      {c.matched}
                      <span style={{ fontSize: 14, color: C.gray400 }}>/{c.of}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: C.gray400, marginTop: 2 }}>
                      matched · {c.of - c.matched} gap
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Decision rail — multi-aware */}
      <div style={{
        marginTop: 24,
        padding: '16px 20px',
        borderRadius: 8,
        border: `1px solid ${C.softLine}`,
        background: C.warmPaper,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.gray500 }}>
            Sourcing Decision
          </div>
          {n === 0 && (
            <>
              <div style={{ ...serif, fontSize: 16, fontWeight: 500, color: C.charcoal, marginTop: 4, lineHeight: 1.25 }}>
                Select one or more distributors above.
              </div>
              <div style={{ fontSize: 12, color: C.gray500, marginTop: 4, lineHeight: 1.5 }}>
                Pick a single distributor to build one order guide, or two or more to compare or export side-by-side.
              </div>
            </>
          )}
          {n === 1 && (
            <>
              <div style={{ ...serif, fontSize: 16, fontWeight: 500, color: C.charcoal, marginTop: 4, lineHeight: 1.25 }}>
                Build the Order Guide From {pickedCols[0].short}.
              </div>
              <div style={{ fontSize: 12, color: C.gray500, marginTop: 4, lineHeight: 1.5 }}>
                {pickedCols[0].matched}/{pickedCols[0].of} items matched.{' '}
                {pickedCols[0].of - pickedCols[0].matched > 0
                  ? `The remaining ${pickedCols[0].of - pickedCols[0].matched} stay open for your rep to source elsewhere.`
                  : 'Full coverage.'}
                {pickedCols[0].status === 'unaffiliated' && (
                  <> {pickedCols[0].short} doesn't have a rep on QuoteMe yet — prices won't reflect rep-negotiated rates until they connect.</>
                )}
              </div>
            </>
          )}
          {n >= 2 && (
            <>
              <div style={{ ...serif, fontSize: 16, fontWeight: 500, color: C.charcoal, marginTop: 4, lineHeight: 1.25 }}>
                {n} Distributors Selected · {pickedCols.map(c => c.short).join(' · ')}
              </div>
              <div style={{ fontSize: 12, color: C.gray500, marginTop: 4, lineHeight: 1.5 }}>
                Build {n} order guides side-by-side, or export {n} quotes to share with your team.
              </div>
            </>
          )}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(`/chef/menus/${menuId ?? ''}`)}
            style={{
              ...sans,
              padding: '10px 14px',
              fontSize: 13,
              background: 'none',
              border: 'none',
              color: C.gray500,
              cursor: 'pointer',
              borderRadius: 6,
            }}
          >
            Back To Menu
          </button>
          <button
            disabled={n === 0}
            style={{
              ...sans,
              padding: '11px 18px',
              fontSize: 14,
              fontWeight: 500,
              background: n === 0 ? C.gray400 : C.orange,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: n === 0 ? 'not-allowed' : 'pointer',
              opacity: n === 0 ? 0.55 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {n <= 1 ? 'Build Order Guide' : `Build ${n} Order Guides`} →
          </button>
        </div>
      </div>

      {/* Operational footnote */}
      <div style={{
        marginTop: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        fontSize: 12,
        color: C.gray500,
        lineHeight: 1.6,
        maxWidth: 620,
      }}>
        <span style={{ color: C.accent, flexShrink: 0, marginTop: 1 }}>ⓘ</span>
        <div>
          Prices come from each distributor's current catalog. Coverage gaps reflect what
          they carry, not what's available in the region. Quoting against one distributor
          doesn't lock you in — you can re-price your stack any time the menu changes.
        </div>
      </div>

      {/* StackProductDrawer — imported from STACK-FE-2, NOT re-implemented.
          Renders via createPortal at document.body. */}
      <StackProductDrawer
        open={!!detailCell}
        onClose={() => setDetailCell(null)}
        offering={detailCell?.offering ?? null}
        chefItem={detailCell?.chefItem ?? ''}
        distributor={detailCell?.distributor ?? null}
        variant="drawer"
      />
    </div>
  );
}
