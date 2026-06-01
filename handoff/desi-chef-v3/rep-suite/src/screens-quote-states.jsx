// src/screens-quote-states.jsx — D6: state-shift visual for Preview → Distributor → Confirmed.
// Justin J1 lock: "Any quote with distributor-entered pricing must visibly shift
// state in UI AND PDF semantics. Avoid subtle transitions."
//
// Doctrine call (Desi, May 26):
//   • This is NOT a pill. Pills are scannable; pills are subtle.
//   • The document chrome IS the state. Paper color, masthead rule weight,
//     watermark, seal, price-cell renderer, total renderer — all drive off
//     a single `state` prop.
//   • The dual-pill model (QuoteStatusPill lifecycle + match-state) stays
//     UNTOUCHED. This is a third orthogonal axis: document-state, expressed
//     through the document itself.
//   • PDF semantics fall out for free — same chrome renders to PDF.
//
// Three states:
//   preview      — chef built, rep hasn't touched, no prices
//   distributor  — rep editing, partial pricing
//   confirmed    — rep finalized, locked
//
// Surfaces that consume this:
//   ChefQuoteReceiptPage (chef view of a sent quote)
//   RepIncomingQuotePage (rep view, when D4 lands)
//   Any PDF export
// ─────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// QuoteStateDocument — the locked treatment.
// Same content, three documents.
// ═════════════════════════════════════════════════════════════════════════════
function QuoteStateDocument({
  state = "preview",            // "preview" | "distributor" | "confirmed"
  rep = DEMO.rep,
  repAt = DEMO.distributorShort,
  pricedCount = 0,              // for distributor state
  totalCount = 18,
  lastUpdated = "May 25, 2026 · 3:42 PM",
  confirmedAt = "May 25, 2026",
  nav = noopNav,
}) {
  // Per-state visual tokens. The chrome IS the state — keep this object
  // as the canonical source for spec doc + Claudio's FE implementation.
  const chrome = {
    preview: {
      bg: "var(--qm-warm-paper)",
      headerRule: "1px solid var(--qm-charcoal)",
      headerRuleWeight: 1,
      eyebrow: "PREVIEW QUOTE · NOT YET PRICED",
      watermark: "PREVIEW",
      topRightSlot: null,
      footerLine: `Sent to ${rep} at ${repAt} · awaiting reply`,
    },
    distributor: {
      bg: "#FFFFFF",
      headerRule: "1.5px solid var(--qm-orange)",
      headerRuleWeight: 1.5,
      eyebrow: `DISTRIBUTOR DRAFT · ${pricedCount} of ${totalCount} priced`,
      watermark: null,
      topRightSlot: "working",
      footerLine: `Last updated ${lastUpdated} by ${rep}`,
    },
    confirmed: {
      bg: "#FFFFFF",
      headerRule: "3px solid var(--qm-charcoal)",
      headerRuleWeight: 3,
      eyebrow: `CONFIRMED QUOTE · LOCKED ${confirmedAt.toUpperCase()}`,
      watermark: null,
      topRightSlot: "seal",
      footerLine: `Confirmed by ${rep} at ${repAt} · ${confirmedAt}`,
    },
  }[state];

  return (
    <div className="relative" style={{ background: chrome.bg }}>
      {/* Diagonal watermark, preview only. Sits behind content at 6% opacity. */}
      {chrome.watermark && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <div
            className="serif"
            style={{
              fontSize: 92,
              fontWeight: 600,
              color: "var(--qm-charcoal)",
              opacity: 0.06,
              letterSpacing: ".08em",
              transform: "rotate(-22deg)",
              whiteSpace: "nowrap",
            }}
          >
            {chrome.watermark}
          </div>
        </div>
      )}

      <div className="relative px-5 pt-5 pb-6" style={{ zIndex: 1 }}>
        {/* Header rule — weight changes per state */}
        <div style={{ borderTop: chrome.headerRule, marginBottom: 14 }} />

        {/* Eyebrow + title */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".14em" }}>
              {chrome.eyebrow}
            </div>
            <h1
              className="serif font-semibold mt-1 ink"
              style={{ fontSize: 26, lineHeight: 1.15 }}
            >
              {DEMO.restaurant}
            </h1>
            <div className="mt-1 ink-soft text-[13px] leading-relaxed">
              For <span className="ink">{DEMO.chefFirst} {DEMO.chefLast}</span>
              <span className="ink-faint"> · {DEMO.quoteDate}</span>
            </div>
          </div>

          {/* Top-right state slot — empty for preview, working line for
              distributor, seal for confirmed. */}
          {chrome.topRightSlot === "working" && (
            <div className="text-right shrink-0" style={{ maxWidth: 130 }}>
              <div className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 7, height: 7,
                    background: "var(--qm-orange)",
                    animation: "qmPulse 1.4s ease-in-out infinite",
                  }}
                />
                <span className="text-[11px] ink-soft italic leading-snug" style={{ fontFamily: "var(--qm-serif)" }}>
                  {rep} is pricing this now
                </span>
              </div>
            </div>
          )}
          {chrome.topRightSlot === "seal" && (
            <div className="shrink-0">
              <ConfirmedSeal date={confirmedAt} />
            </div>
          )}
        </div>

        {/* Rep + distributor block */}
        <div className="mt-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="qm-eyebrow" style={{ fontSize: 9 }}>YOUR REP</div>
            <div className="text-[13px] ink mt-0.5 truncate">{rep}</div>
            <div className="text-[12px] ink-soft num">{DEMO.repPhone}</div>
          </div>
          <div className="flex-1 text-right min-w-0">
            <div className="qm-eyebrow" style={{ fontSize: 9 }}>DISTRIBUTOR</div>
            <div className="text-[13px] ink mt-0.5 truncate">{repAt}</div>
            <div className="text-[12px] ink-soft">{DEMO.catalogUpdated}</div>
          </div>
        </div>

        <div className="doc-divider-thick mt-5" />

        {/* Line items — case unit + unit price only (no qty, no totals).
            Justin May 27 no-qty doctrine: quote = pricing visibility, order
            guide = aggregate math. Totals move to the post-confirm document. */}
        {QUOTE.map((group, gi) => (
          <QuoteStateGroup
            key={gi}
            group={group}
            state={state}
            pricedCount={pricedCount}
            groupIndex={gi}
          />
        ))}

        {/* Quote-level coverage label (doctrine 9.6) — typography only, no chrome */}
        {state !== "preview" && <QuoteCoverageLabel state={state} />}

        {/* Footer operational line */}
        <div className="mt-5 pt-3 text-[11px] ink-faint leading-relaxed" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
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

// ─────────────────────────────────────────────────────────────────────────────
// QuoteStateGroup — line items.
// Per Justin May 27 no-qty doctrine: case size + unit price only.
// No qty column, no per-line totals, no per-category subtotals.
// Adds per-line coverage dot (doctrine 9.6) in non-preview states.
// ─────────────────────────────────────────────────────────────────────────────
function QuoteStateGroup({ group, state, pricedCount, groupIndex }) {
  // Compute how many items in THIS group are priced for distributor state.
  // Walk QUOTE in order; this group inherits whatever's left of pricedCount.
  let cumBefore = 0;
  for (let i = 0; i < groupIndex; i++) cumBefore += QUOTE[i].items.length;
  const groupPriced = Math.max(0, Math.min(group.items.length, pricedCount - cumBefore));

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <h3
          className="serif font-medium ink"
          style={{ fontSize: 15, letterSpacing: ".08em", textTransform: "uppercase" }}
        >
          {group.cat}
        </h3>
        <span className="text-[11px] ink-faint num">
          {group.items.length} items
        </span>
      </div>
      <div className="mt-1">
        {group.items.map((it, ii) => {
          const priced = state === "confirmed" || (state === "distributor" && ii < groupPriced);
          return (
            <div key={ii} className="doc-divider flex items-start gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  {state !== "preview" && (
                    <CoverageDot strength={ii === 0 ? "partial" : "strong"} />
                  )}
                  <span className="text-[13.5px] ink leading-snug">{it.name}</span>
                </div>
                <div className="text-[11px] ink-faint mt-0.5 num">
                  {it.pack}{it.note ? ` · ${it.note}` : ""}
                </div>
              </div>
              <div className="text-right num shrink-0" style={{ minWidth: 90 }}>
                {state === "preview" ? (
                  <div className="text-[13.5px] ink-faint">—</div>
                ) : priced ? (
                  <>
                    <div className={cls("text-[14px] num",
                      state === "confirmed" ? "ink font-semibold" : "ink font-medium"
                    )}>
                      {money(it.unit)}
                    </div>
                    <div className="text-[10.5px] ink-faint leading-snug">
                      per {casePerLine(it)}
                    </div>
                  </>
                ) : (
                  <div className="text-[12.5px] ink-faint italic">pricing…</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// CoverageDot — per-line matcher coverage (doctrine 9.6). Strong / Partial / Thin.
// No pill, no label — small peripheral dot. Title attribute carries the label.
function CoverageDot({ strength = "strong" }) {
  const colors = {
    strong:  "var(--qm-success, #2F8F4F)",
    partial: "var(--qm-amber, #C99A3F)",
    thin:    "var(--qm-gray-500)",
  };
  const labels = { strong: "Strong match", partial: "Partial match", thin: "Thin match" };
  return (
    <span
      title={labels[strength]}
      aria-label={labels[strength]}
      style={{
        width: 6, height: 6, borderRadius: "50%",
        background: colors[strength], display: "inline-block", flexShrink: 0,
      }}
    />
  );
}

// QuoteCoverageLabel — quote-level coverage signal. Typography weight + color only.
// Sits below the line items, above the footer. State-aware copy.
function QuoteCoverageLabel({ state }) {
  return (
    <div className="mt-5 pt-3" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
      <span
        className="serif"
        style={{
          fontSize: 11,
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: "var(--qm-charcoal)",
          fontWeight: 600,
        }}
      >
        Strong coverage
      </span>
      <span className="ink-faint text-[11px] ml-2" style={{ fontFamily: "var(--qm-sans)" }}>
        · {state === "confirmed" ? "every line carried" : "matcher aligned every line to a catalog SKU"}
      </span>
    </div>
  );
}

// Helper: pull the case-unit out of the pack string for the "per X" sublabel.
// pack looks like "4/1 gal" or "6/#10 can" or "1 lb wedge".
function casePerLine(it) {
  if (!it.pack) return "case";
  const parts = String(it.pack).split("/");
  return parts.length > 1 ? parts[1].trim() : it.pack;
}


// ─────────────────────────────────────────────────────────────────────────────
// ConfirmedSeal — small circular charcoal stamp, top-right of confirmed
// document. Gives the document its weight. Renders identically in PDF.
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmedSeal({ date = "May 25, 2026" }) {
  const dateShort = date.replace(/, \d{4}$/, "").toUpperCase();
  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: 88, height: 88,
        borderRadius: "50%",
        border: "1.5px solid var(--qm-charcoal)",
        background: "transparent",
        transform: "rotate(-8deg)",
      }}
    >
      <div className="absolute inset-1 rounded-full" style={{ border: "0.75px solid var(--qm-charcoal)" }} />
      <div className="text-center px-1 leading-tight">
        <div
          className="serif font-semibold ink"
          style={{ fontSize: 13, letterSpacing: ".12em" }}
        >
          CONFIRMED
        </div>
        <div className="text-[9px] ink-soft num mt-0.5">{dateShort}</div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Frame wrappers — three demo screens for the gallery + spec reference.
// Each mounts QuoteStateDocument inside the existing PhoneShell so the
// state-shift is visible in the chef-flow context, not isolated.
// ═════════════════════════════════════════════════════════════════════════════
function ChefQuoteStatePreview({ nav = noopNav }) {
  return (
    <PhoneShell>
      <MobileTopBar restaurant={DEMO.restaurant} />
      <div className="scroller">
        <QuoteStateDocument state="preview" />
      </div>
    </PhoneShell>
  );
}

function ChefQuoteStateDistributor({ nav = noopNav }) {
  return (
    <PhoneShell>
      <MobileTopBar restaurant={DEMO.restaurant} />
      <div className="scroller">
        <QuoteStateDocument state="distributor" pricedCount={11} totalCount={18} />
      </div>
    </PhoneShell>
  );
}

function ChefQuoteStateConfirmed({ nav = noopNav }) {
  return (
    <PhoneShell>
      <MobileTopBar restaurant={DEMO.restaurant} />
      <div className="scroller">
        <QuoteStateDocument state="confirmed" />
      </div>
    </PhoneShell>
  );
}

Object.assign(window, {
  QuoteStateDocument, ConfirmedSeal,
  ChefQuoteStatePreview, ChefQuoteStateDistributor, ChefQuoteStateConfirmed,
});
