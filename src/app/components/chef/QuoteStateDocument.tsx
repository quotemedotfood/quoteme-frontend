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
import { formatCurrency } from '../../utils/formatCurrency';

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

const money = (n: number, currency?: string) => formatCurrency(Math.round(n * 100), currency);

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
  /** Raw BE quote.state — used to derive the correct seal label for the
   * 'confirmed' document state, which covers both 'confirmed' (rep-priced,
   * chef not yet accepted) and 'accepted' (chef accepted). */
  quoteState?: string | null;
  /** H-3: whether the chef has accepted this quote. Derived by the caller from
   * BOTH axes — J1 state (`state === 'accepted'`, chef-initiated quotes) AND
   * rep workflow status (`status === 'won'`, rep-built quotes whose J1 `state`
   * stays nil). When true, the locked-document chrome reads ACCEPTED instead of
   * the default CONFIRMED. Without this, won/rep-built quotes (state nil) showed
   * "CONFIRMED" on both the header eyebrow and the seal. */
  accepted?: boolean;
  restaurant: string;
  forName?: string; // chef full name (omitted on surfaces that don't carry it)
  quoteDate: string;
  rep: string;
  repPhone?: string;
  distributorShort?: string; // omitted when the surface has no distributor name
  /** CANADA-CURRENCY: ISO code (e.g. "USD"/"CAD") threaded from the caller's
   * quote.distributor.currency. Optional/forward-compatible — defaults to
   * USD via formatCurrency() when the caller has none in scope. */
  currency?: string;
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
  /** Title-case date appended after the eyebrow label (rendered outside the
   * uppercased span so it stays title case). Only set when the eyebrow mixes
   * a label + a date token. */
  eyebrowDate?: string;
  watermark: string | null;
  topRightSlot: 'working' | 'seal' | null;
  footerLine: string;
}

export function QuoteStateDocument({
  state = 'preview',
  quoteState,
  accepted,
  restaurant,
  forName,
  quoteDate,
  rep,
  repPhone,
  distributorShort,
  currency,
  catalogUpdated,
  groups,
  pricedCount = 0,
  totalCount = 0,
  lastUpdated = '',
  confirmedAt = '',
}: QuoteStateDocumentProps) {
  const itemCount = totalCount || groups.reduce((a, g) => a + g.items.length, 0);
  const at = distributorShort ? ` at ${distributorShort}` : '';
  // H-3: accepted when the caller says so (status==='won' OR state==='accepted'),
  // falling back to the raw J1 state for callers that only pass quoteState.
  const isAccepted = accepted || quoteState === 'accepted';

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
      // H-3: an accepted quote reads "ACCEPTED", otherwise "CONFIRMED QUOTE".
      // Both use the shared label helper so copy stays consistent across surfaces.
      // B-154: label stays uppercased (CSS textTransform); date is split into
      // eyebrowDate so it renders in title case, matching the body date format.
      eyebrow: `${(isAccepted ? quoteStatusLabel('accepted', 'header') : quoteStatusLabel('confirmed', 'header')).toUpperCase()} · LOCKED`,
      eyebrowDate: confirmedAt ? ` ${confirmedAt.replace(/, \d{4}$/, '')}` : '',
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
                fontWeight: 600,
                color: INK_SOFT,
              }}
            >
              {/* B-154: label in uppercase; date (eyebrowDate) rendered outside
                  the uppercased span so it stays title case — "Jun 24" not "JUN 24". */}
              <span style={{ textTransform: 'uppercase' }}>{chrome.eyebrow}</span>
              {chrome.eyebrowDate && (
                <span style={{ textTransform: 'none' }}>{chrome.eyebrowDate}</span>
              )}
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
              <ConfirmedSeal
                date={confirmedAt}
                label={
                  isAccepted
                    ? quoteStatusLabel('accepted', 'pill').toUpperCase()
                    : 'CONFIRMED'
                }
              />
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
              {distributorShort || '-'}
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
            currency={currency}
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
  currency,
}: {
  group: QuoteDocGroup;
  groups: QuoteDocGroup[];
  state: QuoteDocumentState;
  pricedCount: number;
  groupIndex: number;
  currency?: string;
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
                  <div className="text-[13.5px]" style={{ color: INK_FAINT }}>-</div>
                ) : priced ? (
                  <div
                    className={`text-[13.5px] ${state === 'confirmed' ? 'font-semibold' : 'font-medium'}`}
                    style={{ color: INK }}
                  >
                    {it.unit != null ? money(it.unit, currency) : <span style={{ color: INK_FAINT }}>-</span>}
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

export function ConfirmedSeal({ date = '', label = 'CONFIRMED' }: { date?: string; label?: string }) {
  // B-154: strip year only; do NOT uppercase — body date uses title case ("Jun 24"),
  // and the badge date must match it.
  const dateShort = date.replace(/, \d{4}$/, '');
  // H-3 fix: label is passed in by the call site, derived from the actual
  // quote.state. Default is "CONFIRMED" (safe fallback for the doc-confirmed
  // state when no quoteState prop is provided). "ACCEPTED" is only set when
  // quoteState === 'accepted'. Do NOT default to 'accepted' pill label here.
  const sealLabel = label.toUpperCase();
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
          {sealLabel}
        </div>
        <div className="text-[9px] mt-0.5" style={{ ...TABULAR, color: INK_SOFT }}>
          {dateShort}
        </div>
      </div>
    </div>
  );
}
