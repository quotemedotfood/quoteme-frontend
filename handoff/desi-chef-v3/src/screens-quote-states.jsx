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

        {/* Line items — price cells render per state */}
        {QUOTE.map((group, gi) => (
          <QuoteStateGroup
            key={gi}
            group={group}
            state={state}
            pricedCount={pricedCount}
            groupIndex={gi}
          />
        ))}

        {/* Total — three flavors */}
        <div className="doc-divider-thick mt-5" />
        <QuoteStateTotal state={state} pricedCount={pricedCount} totalCount={totalCount} />

        {/* Footer operational line */}
        <div className="mt-3 text-[11px] ink-faint leading-relaxed">
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
// QuoteStateGroup — line items, with state-aware price cells.
// Distributor state: deterministically priced for the first N items where
// N = pricedCount (so it reads as a partial draft).
// ─────────────────────────────────────────────────────────────────────────────
function QuoteStateGroup({ group, state, pricedCount, groupIndex }) {
  // Compute how many items in THIS group are priced for distributor state.
  // Walk QUOTE in order; this group inherits whatever's left of pricedCount.
  let cumBefore = 0;
  for (let i = 0; i < groupIndex; i++) cumBefore += QUOTE[i].items.length;
  const groupPriced = Math.max(0, Math.min(group.items.length, pricedCount - cumBefore));

  const subtotal = group.items.reduce((a, i) => a + i.qty * i.unit, 0);
  const partialSubtotal = group.items
    .slice(0, groupPriced)
    .reduce((a, i) => a + i.qty * i.unit, 0);

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
                <div className="text-[13.5px] ink leading-snug">{it.name}</div>
                <div className="text-[11px] ink-faint mt-0.5 num">
                  {it.pack}{it.note ? ` · ${it.note}` : ""}
                </div>
              </div>
              <div className="text-right num shrink-0">
                {state === "preview" ? (
                  <>
                    <div className="text-[12.5px] ink-faint">{it.qty} × —</div>
                    <div className="text-[13.5px] ink-faint">—</div>
                  </>
                ) : priced ? (
                  <>
                    <div className="text-[12.5px] ink-soft">{it.qty} × {money(it.unit)}</div>
                    <div
                      className={cls("text-[13.5px] num",
                        state === "confirmed" ? "ink font-semibold" : "ink font-medium"
                      )}
                    >
                      {money(it.qty * it.unit)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[12.5px] ink-faint italic">pricing…</div>
                    <div className="text-[13.5px] ink-faint">—</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div className="doc-divider flex items-center justify-between pt-2 pb-1">
          <span className="text-[12px] ink-soft">Subtotal · {group.cat}</span>
          <span className="text-[13px] ink font-medium num">
            {state === "preview"
              ? <span className="ink-faint italic">pending</span>
              : state === "distributor"
                ? (groupPriced === group.items.length
                    ? money(subtotal)
                    : groupPriced === 0
                      ? <span className="ink-faint italic">—</span>
                      : <span><span className="ink-soft">{money(partialSubtotal)}</span><span className="ink-faint"> so far</span></span>
                  )
                : money(subtotal)
            }
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuoteStateTotal — the bottom-of-document total renderer.
// Reads explicitly different in each state per Justin's "avoid subtle"
// requirement: even the price the chef cares most about looks different.
// ─────────────────────────────────────────────────────────────────────────────
function QuoteStateTotal({ state, pricedCount, totalCount }) {
  // Partial total for distributor state — sum the first pricedCount items
  // across all groups in order.
  let partialTotal = 0;
  let remaining = pricedCount;
  for (const g of QUOTE) {
    for (const it of g.items) {
      if (remaining <= 0) break;
      partialTotal += it.qty * it.unit;
      remaining--;
    }
    if (remaining <= 0) break;
  }

  if (state === "preview") {
    return (
      <div className="flex items-baseline justify-between pt-3">
        <span className="serif text-[15px] ink">Quote total</span>
        <span className="serif text-[18px] ink-faint italic">pending rep pricing</span>
      </div>
    );
  }
  if (state === "distributor") {
    return (
      <>
        <div className="flex items-baseline justify-between pt-3">
          <span className="serif text-[15px] ink">Quote total so far</span>
          <span className="serif text-[22px] ink font-medium num">{money(partialTotal)}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-[11px] ink-faint italic">
            {pricedCount} of {totalCount} items priced · still working
          </span>
          <span className="text-[11px] ink-faint num">approx</span>
        </div>
      </>
    );
  }
  return (
    <div className="flex items-baseline justify-between pt-3">
      <span className="serif text-[15px] ink font-medium">Quote total · confirmed</span>
      <span className="serif text-[22px] font-semibold ink num">{money(QUOTE_TOTAL)}</span>
    </div>
  );
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
