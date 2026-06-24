// QuoteStateDocument — D6 state-shift document chrome.
//
// Justin J1 lock: "Any quote with distributor-entered pricing must visibly
// shift state in UI AND PDF semantics. Avoid subtle transitions."
// Desi doctrine (May 26): this is NOT a pill. The document chrome IS the state.
// Paper color, masthead rule weight, watermark, seal, price-cell + total
// renderers all drive off a single `state` prop. The dual-pill model
// (QuoteStatusPill lifecycle + match-state) is a separate axis, untouched.
//
// Source of truth: designs/handoff/desi-chef-v3/src/screens-quote-states.jsx.
// Ported from prototype `ink`/`serif`/`doc-divider`/`qm-eyebrow` classes to the
// FE's inline-hex + Playfair conventions (no global qm-* classes exist here).
//
// Prop `state` values mirror the design prototype: "preview" | "distributor" |
// "confirmed". Callers holding the BE Quote.state ("distributor_quote") map it
// via stateFromQuoteState() below.
//
// H-3 fix: the document eyebrow for the "confirmed" state uses
// quoteStatusLabel('confirmed', 'header') → "Confirmed Quote" so the
// detail-page document header label aligns with the shared helper used
// by list views (which show "Ready" via the 'pill' context).

import { quoteStatusLabel } from '../../utils/quoteStatusLabel';

export type QuoteDocumentState = 'preview' | 'distributor' | 'confirmed';

// BE Quote.state → document state. BE uses "distributor_quote"; the document
// prop uses "distributor". preview/confirmed pass through; accepted/declined/
// expired render as confirmed chrome (locked document).
export function stateFromQuoteState(quoteState: string | null | undefined): QuoteDocumentState {
  switch (quoteState) {
    case 'preview':
      return 'preview';
    case 'distributor_quote':
    case 'distributor':
      return 'distributor';
    default:
      return 'confirmed'; // confirmed | accepted | declined | expired | null-with-pricing
  }
}

const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Palette (FE canonical; matches existing ChefQuoteReceiptPage hex) ──
const INK = '#2A2A2A'; // foreground / charcoal
const INK_SOFT = '#4F4F4F'; // gray-700
const INK_FAINT = '#9E9E9E'; // faint
const SOFT_LINE = '#E8E8E8'; // border
const WARM_PAPER = '#FBFAF7'; // preview paper (prototype --qm-warm-paper)
const ORANGE = 'var(--primary)'; // golden primary
const SERIF: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };
const TABULAR: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export interface QuoteDocLineItem {
  name: string;
  pack?: string;
  note?: string;
  qty: number;
  unit: number | undefined;
}
export interface QuoteDocGroup {
  cat: string;
  items: QuoteDocLineItem[];
}

export interface QuoteStateDocumentProps {
  state?: QuoteDocumentState;
  restaurant: string;
  forName?: string; // chef full name (omitted on surfaces that don't carry it)
  quoteDate: string;
  rep: string;
  repPhone?: string;
  distributorShort?: string; // omitted when the surface has no distributor name
  catalogUpdated?: string;
  groups: QuoteDocGroup[];
  pricedCount?: number; // for distributor state
  totalCount?: number;
  lastUpdated?: string;
  confirmedAt?: string;
}

interface Chrome {
  bg: string;
  headerRule: string;
  eyebrow: string;
  watermark: string | null;
  topRightSlot: 'working' | 'seal' | null;
  footerLine: string;
}

export function QuoteStateDocument({
  state = 'preview',
  restaurant,
  forName,
  quoteDate,
  rep,
  repPhone,
  distributorShort,
  catalogUpdated,
  groups,
  pricedCount = 0,
  totalCount = 0,
  lastUpdated = '',
  confirmedAt = '',
}: QuoteStateDocumentProps) {
  const itemCount = totalCount || groups.reduce((a, g) => a + g.items.length, 0);
  const at = distributorShort ? ` at ${distributorShort}` : '';

  const chrome: Chrome = {
    preview: {
      bg: WARM_PAPER,
      headerRule: `1px solid ${INK}`,
      eyebrow: 'PREVIEW QUOTE · NOT YET PRICED',
      watermark: 'PREVIEW',
      topRightSlot: null,
      footerLine: `Sent to ${rep}${at} · awaiting reply`,
    },
    distributor: {
      bg: '#FFFFFF',
      headerRule: `1.5px solid ${ORANGE}`,
      eyebrow: `DISTRIBUTOR DRAFT · ${pricedCount} of ${itemCount} priced`,
      watermark: null,
      topRightSlot: 'working',
      footerLine: `Last updated ${lastUpdated} by ${rep}`,
    },
    confirmed: {
      bg: '#FFFFFF',
      headerRule: `3px solid ${INK}`,
      // H-3: use quoteStatusLabel('confirmed', 'header') → "Confirmed Quote"
      // so the document eyebrow matches the shared label helper used across surfaces.
      eyebrow: `${quoteStatusLabel('confirmed', 'header').toUpperCase()} · LOCKED ${confirmedAt.toUpperCase()}`,
      watermark: null,
      topRightSlot: 'seal',
      footerLine: `Confirmed by ${rep}${at} · ${confirmedAt}`,
    },
  }[state];

  return (
    <div className="relative" style={{ background: chrome.bg }}>
      {chrome.watermark && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <div
            style={{
              ...SERIF,
              fontSize: 92,
              fontWeight: 600,
              color: INK,
              opacity: 0.06,
              letterSpacing: '.08em',
              transform: 'rotate(-22deg)',
              whiteSpace: 'nowrap',
            }}
          >
            {chrome.watermark}
          </div>
        </div>
      )}

      <div className="relative px-5 pt-5 pb-6" style={{ zIndex: 1 }}>
        <div style={{ borderTop: chrome.headerRule, marginBottom: 14 }} />

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div
              style={{
                fontSize: 10,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: INK_SOFT,
              }}
            >
              {chrome.eyebrow}
            </div>
            <h1
              className="font-semibold mt-1"
              style={{ ...SERIF, fontSize: 26, lineHeight: 1.15, color: INK }}
            >
              {restaurant}
            </h1>
            <div className="mt-1 text-[13px] leading-relaxed" style={{ color: INK_SOFT }}>
              {forName && <>For <span style={{ color: INK }}>{forName}</span></>}
              <span style={{ color: INK_FAINT }}>{forName ? ' · ' : ''}{quoteDate}</span>
            </div>
          </div>

          {chrome.topRightSlot === 'working' && (
            <div className="text-right shrink-0" style={{ maxWidth: 130 }}>
              <div className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    background: ORANGE,
                    animation: 'qmPulse 1.4s ease-in-out infinite',
                  }}
                />
                <span
                  className="text-[11px] italic leading-snug"
                  style={{ ...SERIF, color: INK_SOFT }}
                >
                  {rep} is pricing this now
                </span>
              </div>
            </div>
          )}
          {chrome.topRightSlot === 'seal' && (
            <div className="shrink-0">
              <ConfirmedSeal date={confirmedAt} />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div style={eyebrowSm}>YOUR REP</div>
            <div className="text-[13px] mt-0.5 truncate" style={{ color: INK }}>
              {rep}
            </div>
            {repPhone && (
              <div className="text-[12px]" style={{ ...TABULAR, color: INK_SOFT }}>
                {repPhone}
              </div>
            )}
          </div>
          <div className="flex-1 text-right min-w-0">
            <div style={eyebrowSm}>DISTRIBUTOR</div>
            <div className="text-[13px] mt-0.5 truncate" style={{ color: INK }}>
              {distributorShort || '—'}
            </div>
            {catalogUpdated && (
              <div className="text-[12px]" style={{ color: INK_SOFT }}>
                {catalogUpdated}
              </div>
            )}
          </div>
        </div>

        <div style={dividerThick} />

        {groups.map((group, gi) => (
          <QuoteStateGroup
            key={gi}
            group={group}
            groups={groups}
            state={state}
            pricedCount={pricedCount}
            groupIndex={gi}
          />
        ))}

        <div style={dividerThick} />
        {/* Track 21: no quote-level Total — without quantities the sum has no
            meaning. Document is a price list, not a priced order. A per-unit
            total treatment is pending the Justin/Moose call. */}

        <div className="mt-3 text-[11px] leading-relaxed" style={{ color: INK_FAINT }}>
          {chrome.footerLine}
        </div>
      </div>

      <style>{`
        @keyframes qmPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .35; transform: scale(.85); }
        }
      `}</style>
    </div>
  );
}

const eyebrowSm: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: INK_SOFT,
};
const dividerThick: React.CSSProperties = { borderTop: `1px solid ${INK}`, marginTop: 20 };
const dividerThin: React.CSSProperties = { borderTop: `1px solid ${SOFT_LINE}` };

function QuoteStateGroup({
  group,
  groups,
  state,
  pricedCount,
  groupIndex,
}: {
  group: QuoteDocGroup;
  groups: QuoteDocGroup[];
  state: QuoteDocumentState;
  pricedCount: number;
  groupIndex: number;
}) {
  let cumBefore = 0;
  for (let i = 0; i < groupIndex; i++) cumBefore += groups[i].items.length;
  const groupPriced = Math.max(0, Math.min(group.items.length, pricedCount - cumBefore));

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <h3
          className="font-medium"
          style={{ ...SERIF, fontSize: 15, letterSpacing: '.08em', textTransform: 'uppercase', color: INK }}
        >
          {group.cat}
        </h3>
        <span className="text-[11px]" style={{ ...TABULAR, color: INK_FAINT }}>
          {group.items.length} items
        </span>
      </div>
      <div className="mt-1">
        {group.items.map((it, ii) => {
          const priced = state === 'confirmed' || (state === 'distributor' && ii < groupPriced);
          return (
            <div key={ii} className="flex items-start gap-3 py-2.5" style={dividerThin}>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] leading-snug" style={{ color: INK }}>
                  {it.name}
                </div>
                <div className="text-[11px] mt-0.5" style={{ ...TABULAR, color: INK_FAINT }}>
                  {it.pack}
                  {it.note ? ` · ${it.note}` : ''}
                </div>
              </div>
              {/* Track 21: quantities are ORDER data, not quote data. Unit price
                  only — no qty multiplier, no per-line total. */}
              <div className="text-right shrink-0" style={TABULAR}>
                {state === 'preview' ? (
                  <div className="text-[13.5px]" style={{ color: INK_FAINT }}>—</div>
                ) : priced ? (
                  <div
                    className={`text-[13.5px] ${state === 'confirmed' ? 'font-semibold' : 'font-medium'}`}
                    style={{ color: INK }}
                  >
                    {it.unit != null ? money(it.unit) : <span style={{ color: INK_FAINT }}>—</span>}
                  </div>
                ) : (
                  <div className="text-[12.5px] italic" style={{ color: INK_FAINT }}>
                    pricing…
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConfirmedSeal({ date = '' }: { date?: string }) {
  const dateShort = date.replace(/, \d{4}$/, '').toUpperCase();
  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        border: `1.5px solid ${INK}`,
        background: 'transparent',
        transform: 'rotate(-8deg)',
      }}
    >
      <div className="absolute inset-1 rounded-full" style={{ border: `0.75px solid ${INK}` }} />
      <div className="text-center px-1 leading-tight">
        <div className="font-semibold" style={{ ...SERIF, fontSize: 13, letterSpacing: '.12em', color: INK }}>
          CONFIRMED
        </div>
        <div className="text-[9px] mt-0.5" style={{ ...TABULAR, color: INK_SOFT }}>
          {dateShort}
        </div>
      </div>
    </div>
  );
}
