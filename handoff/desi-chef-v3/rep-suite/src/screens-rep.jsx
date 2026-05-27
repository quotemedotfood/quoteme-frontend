// src/screens-rep.jsx — Rep suite (Chef v3 Phase 1B).
//
// Moose lock, May 26:
//   • Same Newspaper sidebar pattern as chef-side, rep destinations:
//       Triage · Catalog · Quotes · Settings
//   • Match-state vocabulary flip on rep side:
//       Ready to price / Needs my review / Coverage gaps
//   • D5 in-line icons: ALWAYS visible per row, mobile-first, two only —
//       blue (--accent #7FAEC2) review/edit · orange (--qm-orange) price.
//       The icons reflect the email language: "Review the quote" /
//       "Go straight to pricing." Row-level mirror of the page-level CTAs.
//   • CTAs always both visible. Partial-coverage deemphasizes "Go straight
//       to pricing" with microcopy: "Coverage gaps — review recommended."
//   • Catalog confirmation banner lives on dashboard + first quote receipt
//       ONLY (banner everywhere reads as nag, per the doctrine).
//
// Doctrine watch-outs:
//   • Rep is operational, not promotional. Reps are pricing on the line; the
//     surface is a dispatch document, not analytics.
//   • The triage queue is "what quote am I building next?" (doctrine 9.2).
//     Order by urgency / waiting time, NOT by chef hierarchy or rep KPIs.
//   • No marketing copy. No "Welcome back!" Onboarding-style framing is the
//     thing this product is explicitly NOT.
//
// File layout in here:
//   1.  REP_DEMO data + RepMatchStateBadge (vocab flip)
//   2.  RepNewspaperSidebar + RepDesktopShell (mirrors chef chrome)
//   3.  CatalogConfirmBanner (dismissable, dashboard + first quote only)
//   4.  RepWelcomePage (magic-link landing, mirrors envelope pattern)
//   5.  D5 icon primitives (BlueReviewIcon, OrangePriceIcon, IncomingRowIcons)
//   6.  RepIncomingQuotePage (document + match-state + dual CTAs + inline icons)
//   7.  RepPricingOnlyView (?mode=pricing — pricing-collapsed view)
//   8.  RepTriageQueue (the dispatch list — doctrine 9.2)
//   9.  Frame wrappers for the gallery
// ─────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// 1. Rep-side demo data + match-state vocab.
// ═════════════════════════════════════════════════════════════════════════════
const REP_DEMO = {
  rep:          "Marcus Rivera",
  repFirst:     "Marcus",
  repPhone:     "(518) 555-0143",
  repEmail:     "marcus@dlisius.co",
  distributor:  "D'Lisius Distribution Co.",
  distShort:    "D'Lisius",
  // Rep's triage demo — 6 quotes at varying states. Order is canonical
  // (newest at top in raw data — the queue itself re-orders by urgency).
  queue: [
    {
      id: "Q-1067",
      chefFirst: "Daniel", chefLast: "Reeves",
      restaurant: "Holloway & Sons", city: "Hudson, NY",
      itemCount: 18, total: null,
      waitingHours: 2, sentAt: "2026-05-27 · 8:14 AM",
      matchState: "ready",            // ready | review | coverage
      preview: true,
    },
    {
      id: "Q-1065",
      chefFirst: "Lena", chefLast: "Okafor",
      restaurant: "Smallfield Diner", city: "Catskill, NY",
      itemCount: 11, total: null,
      waitingHours: 5, sentAt: "2026-05-27 · 5:42 AM",
      matchState: "review",
      missingCount: 3,
      preview: true,
    },
    {
      id: "Q-1062",
      chefFirst: "Andre", chefLast: "Knox",
      restaurant: "The Forge", city: "Kingston, NY",
      itemCount: 24, total: null,
      waitingHours: 19, sentAt: "2026-05-26 · 1:08 PM",
      matchState: "coverage",
      missingCount: 7,
      preview: true,
    },
    {
      id: "Q-1058",
      chefFirst: "Priya", chefLast: "Sharma",
      restaurant: "Wildhare", city: "Rhinebeck, NY",
      itemCount: 9, total: 412.18,
      waitingHours: 0, sentAt: "2026-05-26 · 11:30 AM",
      matchState: "ready",
      pricedCount: 6, totalCount: 9,
      preview: false,           // distributor draft — partial
    },
    {
      id: "Q-1052",
      chefFirst: "Tom", chefLast: "Vance",
      restaurant: "Beacon Hill Tavern", city: "Beacon, NY",
      itemCount: 14, total: 928.40,
      waitingHours: 0, sentAt: "2026-05-25 · 4:12 PM",
      matchState: "ready",
      confirmed: true, confirmedAt: "May 25, 2026",
      preview: false,
    },
    {
      id: "Q-1049",
      chefFirst: "Sasha", chefLast: "Moller",
      restaurant: "North Light", city: "Hudson, NY",
      itemCount: 7, total: 246.55,
      waitingHours: 0, sentAt: "2026-05-24 · 9:05 AM",
      matchState: "ready",
      confirmed: true, confirmedAt: "May 24, 2026",
      preview: false,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Match-state vocabulary flip (Moose lock, May 26 Q2).
// Chef side: "Ready for Review / Needs Rep Review / Partial Catalog Coverage".
// Rep side:  "Ready to price / Needs my review / Coverage gaps".
// ─────────────────────────────────────────────────────────────────────────────
function RepMatchStateBadge({ state = "ready", missingCount }) {
  const spec = {
    ready:    { label: "Ready to price",  dotColor: "var(--accent, #7FAEC2)", ring: "var(--qm-soft-line)" },
    review:   { label: "Needs my review", dotColor: "var(--qm-charcoal)",     ring: "var(--qm-soft-line)" },
    coverage: { label: "Coverage gaps",   dotColor: "var(--qm-orange)",       ring: "rgba(217,119,87,.35)" },
  }[state] || { label: state, dotColor: "var(--qm-gray-500)", ring: "var(--qm-soft-line)" };

  const suffix = state === "coverage" && missingCount
    ? ` · ${missingCount} missing`
    : state === "review" && missingCount
      ? ` · ${missingCount} flagged`
      : "";

  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        padding: "2px 9px 2px 8px",
        borderRadius: 999,
        border: `1px solid ${spec.ring}`,
        background: "transparent",
        fontSize: 11,
        color: "var(--qm-charcoal)",
        fontFamily: "var(--qm-sans)",
        lineHeight: 1.4,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: spec.dotColor, display: "inline-block" }} />
      {spec.label}{suffix}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. RepNewspaperSidebar + RepDesktopShell — chef-chrome mirror.
// Destinations: Triage · Catalog · Quotes · Settings.
// ═════════════════════════════════════════════════════════════════════════════
function RepNewspaperSidebar({ mode = "open", onModeChange = () => {}, active = "triage", onNav = noopNav }) {
  const collapsed = mode === "compact";
  const width = collapsed ? 64 : 280;
  const isCurrent = (id) => id === active;
  const incomingCount = REP_DEMO.queue.filter(q => q.preview).length;

  return (
    <aside
      className="border-r hairline flex-shrink-0 overflow-auto flex flex-col"
      style={{ width, background: "#fff", transition: "width .2s ease" }}
    >
      <div className={collapsed ? "px-2 pt-5 pb-4" : "px-6 pt-7 pb-5"}>
        <div className="flex items-center justify-between gap-2">
          {!collapsed
            ? <QuoteMeWordmark variant="horizontal" height={34} />
            : <QuoteMeWordmark variant="square" height={34} />}
          {!collapsed && (
            <button onClick={() => onModeChange("compact")} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-50 flex-shrink-0" aria-label="Collapse">
              <Icon name="panel-left-close" size={16} color="var(--qm-charcoal)" />
            </button>
          )}
        </div>
        {collapsed && (
          <button onClick={() => onModeChange("open")} className="mt-3 w-full h-8 rounded-md flex items-center justify-center hover:bg-gray-50" aria-label="Expand">
            <Icon name="panel-left-open" size={16} color="var(--qm-charcoal)" />
          </button>
        )}
      </div>

      {/* Currently working — rep + distributor */}
      {!collapsed ? (
        <div className="px-6 pb-5" style={{ borderTop: "2px solid var(--qm-charcoal)", paddingTop: 16 }}>
          <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".18em" }}>WORKING AS</div>
          <div className="serif font-medium ink mt-1.5" style={{ fontSize: 16, lineHeight: 1.2 }}>
            {REP_DEMO.rep}
          </div>
          <div className="text-[12px] ink-faint mt-0.5">{REP_DEMO.distributor}</div>
        </div>
      ) : (
        <div className="mx-2 mb-2 py-2 flex items-center justify-center" style={{ borderTop: "2px solid var(--qm-charcoal)" }} title={`${REP_DEMO.rep} · ${REP_DEMO.distShort}`}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center border hairline" style={{ background: "var(--qm-warm-paper)" }}>
            <span className="serif text-[12px] font-semibold ink">
              {REP_DEMO.rep.split(" ").map(s => s[0]).join("")}
            </span>
          </div>
        </div>
      )}

      <div className={collapsed ? "py-1" : "pt-1 pb-2"} style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
        <NavGroupLabel label="THE DAILY WORK" mode={mode} />
        <NavDestination
          icon="inbox"
          label="Triage"
          count={incomingCount}
          current={isCurrent("triage")}
          mode={mode}
          onClick={() => onNav("rep-triage")}
          sub={[
            { label: "Incoming",       meta: String(incomingCount),                 onClick: () => onNav("rep-triage") },
            { label: "In progress",    meta: "1",                                    onClick: () => onNav("rep-triage") },
            { label: "Confirmed",      meta: "2",                                    onClick: () => onNav("rep-triage") },
          ]}
        />
        <NavDestination
          icon="file-text"
          label="Quotes"
          count={REP_DEMO.queue.length}
          current={isCurrent("quotes")}
          mode={mode}
          onClick={() => onNav("rep-triage")}
        />

        <NavGroupLabel label="YOUR DESK" mode={mode} />
        <NavDestination
          icon="clipboard-list"
          label="Catalog"
          current={isCurrent("catalog")}
          mode={mode}
          onClick={() => onNav("rep-catalog")}
          sub={[
            { label: "Current",          meta: "Spring 2026", onClick: () => onNav("rep-catalog") },
            { label: "Confirm pricing",  meta: "·",            onClick: () => onNav("rep-catalog") },
          ]}
        />
      </div>

      <div className="flex-1" />

      <div className="py-2" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
        <NavDestination
          icon="settings"
          label="Settings"
          current={isCurrent("settings")}
          mode={mode}
          onClick={() => onNav("rep-settings")}
        />
        <div className={collapsed ? "mt-1 px-2" : "mt-1 px-6"}>
          <button
            onClick={() => onModeChange("hidden")}
            className="w-full flex items-center gap-2 py-2 text-[11.5px] ink-faint hover:ink-soft"
            style={{ justifyContent: collapsed ? "center" : "flex-start" }}
            aria-label="Hide sidebar"
          >
            <Icon name="x" size={14} color="var(--qm-gray-500)" />
            {!collapsed && <span>Hide sidebar</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

function RepDesktopShell({ active = "triage", nav = noopNav, children, initialMode = "open" }) {
  const [mode, setMode] = useState(initialMode);
  const hidden = mode === "hidden";
  return (
    <div className="flex relative" style={{ minHeight: 760, background: "#fff" }}>
      {hidden ? <SidebarRestoreButton onShow={() => setMode("open")} /> : (
        <RepNewspaperSidebar mode={mode} onModeChange={setMode} active={active} onNav={nav} />
      )}
      <main className="flex-1 min-w-0 overflow-auto" style={{ background: "#fff" }}>
        <div className="px-10 py-9" style={{ maxWidth: 1180 }}>
          {children}
        </div>
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. CatalogConfirmBanner — dashboard + first quote receipt only.
// Dismissable; returns until catalog_state = :verified per CS5.
// ═════════════════════════════════════════════════════════════════════════════
function CatalogConfirmBanner({ onReview = () => {}, onDismiss = () => {}, variant = "ambient" }) {
  return (
    <div
      className="rounded-md flex items-start gap-3 px-4 py-3"
      style={{
        background: "var(--qm-warm-paper)",
        border: "1px solid var(--qm-soft-line)",
        borderLeft: "3px solid var(--qm-charcoal)",
      }}
    >
      <div
        className="shrink-0 mt-0.5 inline-flex items-center justify-center rounded-full"
        style={{ width: 24, height: 24, background: "#fff", border: "1px solid var(--qm-soft-line)" }}
      >
        <Icon name="clipboard-list" size={12} color="var(--qm-charcoal)" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="serif font-medium ink leading-snug" style={{ fontSize: 14 }}>
          Confirm your catalog
        </div>
        <div className="text-[12.5px] ink-soft leading-relaxed mt-0.5">
          Your distributor record's set up. Take a look at the catalog when you have a moment.
          Pricing flows freely once it's confirmed.
        </div>
        <button
          onClick={onReview}
          className="mt-1.5 text-[12px] ink underline-offset-2 hover:underline inline-flex items-center gap-1"
        >
          Review catalog <Icon name="arrow-right" size={11} color="var(--qm-charcoal)" />
        </button>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center hover:bg-white"
        aria-label="Dismiss"
        title="Dismiss"
      >
        <Icon name="x" size={13} color="var(--qm-gray-500)" />
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. RepWelcomePage — magic-link landing.
//    Mirrors chef "envelope" pattern (screens-new.jsx ChefWelcomePage). Lands
//    ON the quote, not on a welcome screen. First-time reps see this once;
//    returning reps bypass to /rep/triage.
// ═════════════════════════════════════════════════════════════════════════════
function RepWelcomePage({ nav = noopNav, variant = "envelope" }) {
  const q = REP_DEMO.queue[0];
  return (
    <PhoneShell>
      <div className="flex items-center justify-between px-5 py-3 border-b hairline bg-white">
        <span className="serif text-[18px] font-semibold leading-none ink">QuoteMe</span>
        <span className="text-[11px] ink-faint">{REP_DEMO.distShort}</span>
      </div>
      <div className="scroller px-6 pt-10 pb-6 flex flex-col">
        <div
          className="bg-white rounded-lg p-6"
          style={{
            border: "1px solid var(--qm-soft-line)",
            boxShadow: "0 1px 0 rgba(0,0,0,.02), 0 12px 30px rgba(43,43,43,.05)",
          }}
        >
          <div className="qm-eyebrow" style={{ fontSize: 9.5 }}>INCOMING QUOTE</div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--qm-light-blue, #E5EEF2)" }}>
              <span className="serif text-[13px] font-semibold ink">
                {q.chefFirst[0]}{q.chefLast[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="serif text-[15px] font-medium ink leading-snug">
                {q.chefFirst} {q.chefLast}
              </div>
              <div className="text-[12px] ink-soft leading-snug">{q.restaurant} · {q.city}</div>
            </div>
          </div>

          <div className="doc-divider-thick mt-5" />

          <div className="qm-eyebrow mt-4" style={{ fontSize: 9.5 }}>QUOTE</div>
          <div className="mt-1 flex items-baseline justify-between">
            <div>
              <div className="serif text-[18px] font-medium ink">{q.id}</div>
              <div className="text-[11.5px] ink-faint num">{q.itemCount} items · waiting {q.waitingHours}h</div>
            </div>
            <RepMatchStateBadge state={q.matchState} missingCount={q.missingCount} />
          </div>

          <div className="mt-4 text-[12px] ink-soft leading-relaxed" style={{ borderTop: "1px solid var(--qm-soft-line)", paddingTop: 12 }}>
            Two ways to move on this:
            <ul className="mt-1.5 space-y-1.5" style={{ listStyle: "none" }}>
              <li className="flex items-baseline gap-2">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent, #7FAEC2)", display: "inline-block" }} />
                <span><span className="ink">Review the quote</span> — see what {q.chefFirst.toLowerCase() === q.chefFirst ? q.chefFirst : q.chefFirst} matched, swap items where needed.</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--qm-orange)", display: "inline-block" }} />
                <span><span className="ink">Go straight to pricing</span> — price what's there and send it back.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-auto pt-6">
          <button onClick={() => nav("rep-incoming")} className="qm-btn qm-btn-orange qm-btn-full">
            Open the quote <Icon name="arrow-right" size={16} color="white" />
          </button>
          <button onClick={() => nav("rep-triage")} className="qm-btn qm-btn-text qm-btn-full mt-1">
            See all incoming quotes
          </button>
          <div className="mt-3 text-[10.5px] ink-faint text-center leading-snug">
            You'll always come back to this from your triage queue.
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. D5 in-line icon system.
//    Two icons only — blue (--accent) review, orange (--qm-orange) price.
//    Always visible per row, mobile-first. The verbs mirror the page-level
//    CTAs: "Review the quote" and "Go straight to pricing."
//
//    Single canonical component: <IncomingRowIcons row={...} ... />. Lifts
//    layout responsibilities out of the row renderer so any table can use
//    them identically.
// ═════════════════════════════════════════════════════════════════════════════
function BlueReviewIconButton({ onClick = () => {}, size = 28, title = "Review this line" }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center rounded-full transition-colors"
      style={{
        width: size, height: size,
        background: "rgba(127,174,194,.10)",            // --accent at low alpha
        border: "1px solid rgba(127,174,194,.55)",
        color: "var(--accent, #7FAEC2)",
      }}
    >
      <Icon name="square-pen" size={size === 32 ? 15 : 13} color="var(--accent, #7FAEC2)" />
    </button>
  );
}

function OrangePriceIconButton({ onClick = () => {}, size = 28, title = "Price this line" }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center rounded-full transition-colors"
      style={{
        width: size, height: size,
        background: "var(--qm-orange)",
        border: "1px solid var(--qm-orange)",
        color: "#fff",
      }}
    >
      <Icon name="dollar-sign" size={size === 32 ? 15 : 13} color="#fff" />
    </button>
  );
}

// The row-anchored pair. Always renders both, always-visible. No hover state
// per Moose Q5 (touch-first).
// `context` controls the orange icon's tooltip text:
//   "line"   — default. Acts on a single line item within a quote.
//   "quote"  — acts on the whole quote (e.g. on the triage queue, one row =
//             one quote, so "Price this whole quote" + auto-match against
//             the rep's catalog). Justin lock May 27.
function IncomingRowIcons({ onReview = () => {}, onPrice = () => {}, size = 28, context = "line" }) {
  const priceTitle = context === "quote" ? "Price this whole quote"
                   : context === "line"  ? "Price this line"
                   : "Price";
  const reviewTitle = context === "quote" ? "Review this quote" : "Review this line";
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      <BlueReviewIconButton onClick={onReview} size={size} title={reviewTitle} />
      <OrangePriceIconButton onClick={onPrice} size={size} title={priceTitle} />
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. RepIncomingQuotePage — document view of the chef's submitted quote.
//    Items grouped by category, chef's match work pre-populated, D5 icons
//    per row. Top-level dual CTAs (always both, deemphasized variant when
//    coverage is partial).
// ═════════════════════════════════════════════════════════════════════════════
function RepIncomingQuotePage({ nav = noopNav, coverage = "ready", quoteId = "Q-1067", flowState = "first-arrival", emptyMenu = false, chefRequestMessage = "" }) {
  const q = REP_DEMO.queue.find(x => x.id === quoteId) || REP_DEMO.queue[0];
  // Override match-state when prop set (used in gallery to render the
  // coverage-gap variant of this same page).
  const matchState = coverage || q.matchState;
  const partial = matchState === "coverage" || matchState === "review";
  const unsureMiss = matchState === "review";
  const trueMiss   = matchState === "coverage";
  const missTarget = q.missingCount || (partial ? 3 : 0);

  // Path 1 — "Use my catalog prices" auto-populates from the rep's catalog.
  // After auto-fire, the CTA strip reshapes: "Send to chef" becomes the primary,
  // "Review before sending" replaces the review CTA. A transient confirmation
  // banner appears for ~3s. (Justin May 27 Q3 lock.)
  const [autoFired, setAutoFired] = useState(flowState === "auto-fired");
  const [showAutoFireToast, setShowAutoFireToast] = useState(false);
  const pricedFromCatalog = autoFired ? Math.max(0, allLinesCount(QUOTE) - missTarget) : 0;
  const handleAutoFire = () => {
    setAutoFired(true);
    setShowAutoFireToast(true);
    setTimeout(() => setShowAutoFireToast(false), 3000);
  };

  // Sort affordance (Justin lock May 27): rep needs to slice the quote by
  // component (alphabetical menu component), category (the chef's category
  // grouping — default), or match strength (worst matches surface first so
  // the rep handles coverage gaps before the easy ready-to-price lines).
  const [sortBy, setSortBy] = useState("category");

  // Flatten + group helpers so the sort logic stays clean.
  const allLines = useMemo(() => {
    const out = [];
    QUOTE.forEach((g, gi) => {
      g.items.forEach((it, ii) => {
        let cumBefore = 0;
        for (let k = 0; k < gi; k++) cumBefore += QUOTE[k].items.length;
        out.push({ ...it, cat: g.cat, gi, ii, lineIdx: cumBefore + ii });
      });
    });
    return out;
  }, []);
  return (
    <PhoneShell>
      <div className="flex items-center justify-between px-5 py-2.5 border-b hairline bg-white">
        <button onClick={() => nav("rep-triage")} className="text-[12px] ink-soft inline-flex items-center gap-1">
          <Icon name="chevron-left" size={13} /> Triage
        </button>
        <span className="text-[11px] ink-faint num">{q.sentAt}</span>
      </div>

      <div className="scroller" style={{ background: "#fff" }}>
        {/* Document header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".14em" }}>INCOMING QUOTE · {q.id}</div>
            <PreviewPill size="xs" />
          </div>
          <h1 className="serif font-semibold ink mt-1" style={{ fontSize: 24, lineHeight: 1.15 }}>
            {q.restaurant}
          </h1>
          <div className="mt-1 text-[12.5px] ink-soft leading-relaxed">
            From <span className="ink">{q.chefFirst} {q.chefLast}</span>
            <span className="ink-faint"> · {q.city} · waiting {q.waitingHours}h</span>
          </div>
          <div className="mt-3">
            <RepMatchStateBadge state={matchState} missingCount={partial ? (q.missingCount || 3) : undefined} />
          </div>
        </div>

        {/* Matcher-uncertainty acknowledgement — quiet operational note.
            Appears only when matches are flagged. Per Moose's May 27 flag: a
            rep seeing "no match" on items they KNOW are in their catalog
            reads it as "QuoteMe couldn't read my catalog." Naming the
            phenomenon, and giving an immediate search affordance, defuses
            that. Never apologetic, never marketing-y — just operational. */}
        {partial && (
          <div
            className="mx-5 mb-3 px-3.5 py-2.5 rounded-md flex items-start gap-2.5"
            style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}
          >
            <Icon name="search" size={13} color="var(--qm-charcoal)" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] ink leading-snug">
                {trueMiss
                  ? `${missTarget} items aren't in your catalog yet.`
                  : `${missTarget} items — matcher wasn't sure.`}
              </div>
              <div className="text-[11px] ink-soft leading-snug mt-0.5">
                {trueMiss
                  ? "Add them to your catalog, swap to a substitute, or skip the line."
                  : "Often a spelling or SKU variant. Search your catalog on each flagged line."}
              </div>
              <button className="text-[11px] ink underline-offset-2 hover:underline mt-1">
                {trueMiss ? "Open catalog →" : "Search them all →"}
              </button>
            </div>
          </div>
        )}

        {/* Quote-level coverage label (doctrine 9.6) — typography only, no chrome.
            Justin May 27 Q8: small uppercase below masthead. */}
        <div className="px-5 pb-3 -mt-1">
          <QuoteCoverageLabelRep state={matchState} />
        </div>

        {/* CTA strip — state-aware (Justin May 27 Q3 lock).
            first-arrival: single primary "Use my catalog prices" + 2 secondaries.
            auto-fired:    primary "Send to chef" + secondary "Review before sending". */}
        <div className="px-5 pb-2">
          {!autoFired ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleAutoFire}
                className="qm-btn qm-btn-orange qm-btn-full"
                style={{ padding: "11px 14px", fontSize: 13, fontWeight: 500 }}
              >
                <Icon name="dollar-sign" size={14} color="#fff" />
                Use my catalog prices
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => nav("rep-incoming", { quoteId: q.id })}
                  className="qm-btn"
                  style={{
                    padding: "9px 12px", fontSize: 12,
                    background: "rgba(127,174,194,.14)",
                    color: "var(--qm-charcoal)",
                    border: "1px solid rgba(127,174,194,.55)",
                  }}
                >
                  <Icon name="square-pen" size={12} color="var(--qm-charcoal)" />
                  Review the quote
                </button>
                <button
                  onClick={() => nav("rep-pricing", { quoteId: q.id })}
                  className="qm-btn qm-btn-text"
                  style={{ padding: "9px 12px", fontSize: 12, color: "var(--qm-gray-700)" }}
                >
                  Go straight to pricing
                </button>
              </div>
              <div className="text-[10.5px] ink-faint italic text-center leading-snug" style={{ fontFamily: "var(--qm-serif)" }}>
                Catalog prices will populate every matched line in one click.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {}}
                className="qm-btn qm-btn-orange qm-btn-full"
                style={{
                  padding: "11px 14px", fontSize: 13, fontWeight: 500,
                  opacity: (pricedFromCatalog === allLinesCount(QUOTE)) ? 1 : 0.6,
                }}
                disabled={pricedFromCatalog < allLinesCount(QUOTE)}
                title={pricedFromCatalog < allLinesCount(QUOTE) ? "Price the remaining lines first" : ""}
              >
                <Icon name="arrow-right" size={14} color="#fff" />
                Send to chef
              </button>
              <button
                onClick={() => nav("rep-incoming", { quoteId: q.id })}
                className="qm-btn qm-btn-text"
                style={{ padding: "9px 12px", fontSize: 12, color: "var(--qm-charcoal)" }}
              >
                <Icon name="square-pen" size={12} color="var(--qm-charcoal)" />
                Review before sending
              </button>
              {pricedFromCatalog < allLinesCount(QUOTE) && (
                <div className="text-[10.5px] ink-faint italic text-center leading-snug" style={{ fontFamily: "var(--qm-serif)" }}>
                  {allLinesCount(QUOTE) - pricedFromCatalog} more {(allLinesCount(QUOTE) - pricedFromCatalog) === 1 ? "line" : "lines"} to go before this can ship.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transient confirmation banner — appears ~3s after auto-fire,
            fades out. "I want to know now" beat — silent populate violates it. */}
        {showAutoFireToast && (
          <div
            className="mx-5 mb-2 px-3.5 py-2.5 rounded-md flex items-start gap-2.5 animate-fade"
            style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-charcoal)" }}
          >
            <Icon name="check" size={13} color="var(--qm-charcoal)" />
            <div className="text-[12px] ink leading-snug flex-1">
              {pricedFromCatalog} of {allLinesCount(QUOTE)} priced from your catalog
              {pricedFromCatalog < allLinesCount(QUOTE) ? " — review before sending." : " — ready to send."}
            </div>
          </div>
        )}

        {/* Sort toolbar — Justin lock May 27. Rep needs to slice the quote
            by category (default), component (alphabetical), or match strength
            (worst-first — brings coverage gaps to the top). Quiet visual
            weight; reads like a kitchen-line filter, not a control panel. */}
        <div className="px-5 pb-3 flex items-center gap-2 flex-wrap" style={{ borderBottom: "1px solid var(--qm-soft-line)" }}>
          <div className="qm-eyebrow" style={{ fontSize: 9.5, letterSpacing: ".14em" }}>SORT</div>
          {[
            { id: "category",  label: "Category" },
            { id: "component", label: "Component" },
            { id: "match",     label: "Match strength" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className="rounded-full"
              style={{
                padding: "3px 10px",
                fontSize: 11,
                background: sortBy === opt.id ? "var(--qm-charcoal)" : "transparent",
                color:      sortBy === opt.id ? "#fff" : "var(--qm-charcoal)",
                border: "1px solid var(--qm-charcoal)",
                fontWeight: sortBy === opt.id ? 500 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Items — sorted view */}
        <div className="px-5 pb-6">
          {sortBy === "category" ? (
            QUOTE.map((group, gi) => (
              <div key={gi} className="mt-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="serif font-medium ink" style={{ fontSize: 13.5, letterSpacing: ".08em", textTransform: "uppercase" }}>
                    {group.cat}
                  </h3>
                  <span className="text-[11px] ink-faint num">{group.items.length} items</span>
                </div>
                <div className="mt-1">
                  {group.items.map((it, ii) => {
                    let cumBefore = 0;
                    for (let k = 0; k < gi; k++) cumBefore += QUOTE[k].items.length;
                    const lineIdx = cumBefore + ii;
                    const missing = partial && lineIdx < missTarget;
                    return <RepIncomingLine key={ii} it={it} missing={missing} trueMiss={trueMiss} nav={nav} quoteId={q.id} />;
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <h3 className="serif font-medium ink" style={{ fontSize: 13.5, letterSpacing: ".08em", textTransform: "uppercase" }}>
                  {sortBy === "component" ? "By component" : "By match strength"}
                </h3>
                <span className="text-[11px] ink-faint num">{allLines.length} items</span>
              </div>
              <div className="mt-1">
                {[...allLines]
                  .sort((a, b) => {
                    if (sortBy === "component") return a.name.localeCompare(b.name);
                    // Match strength — worst first. Demo deterministic:
                    // lineIdx < missTarget = miss (worst), then everything else.
                    const aMiss = partial && a.lineIdx < missTarget ? 0 : 1;
                    const bMiss = partial && b.lineIdx < missTarget ? 0 : 1;
                    if (aMiss !== bMiss) return aMiss - bMiss;
                    return a.lineIdx - b.lineIdx;
                  })
                  .map((it, ii) => {
                    const missing = partial && it.lineIdx < missTarget;
                    return <RepIncomingLine key={ii} it={it} missing={missing} trueMiss={trueMiss} nav={nav} quoteId={q.id} showCat />;
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Items to confirm — separate section BELOW document body.
            Justin May 27 Q5 lock: items the matcher couldn't fit are surfaced
            here (no silent drops). Distinct from inline flagged rows above. */}
        {partial && (
          <div className="mx-5 mb-4 mt-2 px-4 py-3.5 rounded-md" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>ITEMS TO CONFIRM</div>
            <div className="serif font-medium ink mt-1 leading-snug" style={{ fontSize: 14 }}>
              {missTarget} {missTarget === 1 ? "item needs" : "items need"} your call.
            </div>
            <div className="text-[11.5px] ink-soft leading-relaxed mt-1">
              {trueMiss
                ? "Add to your catalog, swap to a substitute, or mark unavailable."
                : "Matcher wasn't sure — confirm or swap."}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button className="qm-btn qm-btn-text" style={{ padding: "6px 10px", fontSize: 11.5, border: "1px solid var(--qm-soft-line)", borderRadius: 4 }}>
                <Icon name="search" size={11} color="var(--qm-charcoal)" /> Search catalog
              </button>
              <button className="qm-btn qm-btn-text" style={{ padding: "6px 10px", fontSize: 11.5, border: "1px solid var(--qm-soft-line)", borderRadius: 4 }}>
                <Icon name="x" size={11} color="var(--qm-charcoal)" /> Mark unavailable
              </button>
              <button className="qm-btn qm-btn-text" style={{ padding: "6px 10px", fontSize: 11.5, border: "1px solid var(--qm-soft-line)", borderRadius: 4 }}>
                <Icon name="flag" size={11} color="var(--qm-charcoal)" /> Flag for catalog manager
              </button>
            </div>
          </div>
        )}

        {/* Quote-level actions — Save for later · Ask the chef · Add notes.
            Below the document body, near where the primary CTA lives.
            Justin May 27 Q6 lock: visible, not buried in a kebab. */}
        <div className="mx-5 mb-4 mt-2 pt-3 flex flex-wrap items-center gap-3 text-[12px] ink-soft" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
          <button className="inline-flex items-center gap-1.5 hover:ink">
            <Icon name="bookmark" size={12} color="var(--qm-gray-700)" />
            Save for later
          </button>
          <span className="ink-faint">·</span>
          <button className="inline-flex items-center gap-1.5 hover:ink">
            <Icon name="message-circle" size={12} color="var(--qm-gray-700)" />
            Ask the chef
          </button>
          <span className="ink-faint">·</span>
          <button className="inline-flex items-center gap-1.5 hover:ink">
            <Icon name="pencil" size={12} color="var(--qm-gray-700)" />
            Add notes for chef
          </button>
        </div>

        {/* Footer affordance */}
        <div className="px-5 pb-8 mt-2 pt-4 text-[11px] ink-faint leading-relaxed" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
          Reply to {q.chefFirst} when you've got prices in. We'll stamp the quote as confirmed and email them a copy.
        </div>
      </div>
    </PhoneShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. RepPricingOnlyView — `?mode=pricing`.
//    Three-panel layout collapses to a single pricing column. Items render
//    as a price-entry list with the orange icon already engaged. The blue
//    review icon stays available on each row in case the rep needs to flip
//    back into review on a specific line.
// ═════════════════════════════════════════════════════════════════════════════
// ===========================================================================
// Coverage primitives + helpers (Justin May 27 Q1/Q2/Q8 locks).
// ===========================================================================
function allLinesCount(quote) {
  let n = 0;
  for (const g of quote) n += g.items.length;
  return n;
}

// QuoteCoverageLabelRep — quote-level coverage signal (doctrine 9.6).
// Typography weight + color only, no chrome. Sits below the masthead.
function QuoteCoverageLabelRep({ state = "ready" }) {
  const map = {
    ready:    { label: "STRONG COVERAGE",  color: "var(--qm-charcoal)",  blurb: "every line aligned to a catalog SKU" },
    review:   { label: "PARTIAL COVERAGE", color: "var(--qm-amber, #C99A3F)", blurb: "a few lines need your eye" },
    coverage: { label: "THIN COVERAGE",    color: "var(--qm-gray-500)",  blurb: "several lines aren't in your catalog yet" },
  }[state] || { label: "COVERAGE", color: "var(--qm-charcoal)", blurb: "" };
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span
        className="serif"
        style={{
          fontSize: 10.5,
          letterSpacing: ".16em",
          fontWeight: 600,
          color: map.color,
        }}
      >
        {map.label}
      </span>
      <span className="text-[11px] ink-faint leading-snug">· {map.blurb}</span>
    </div>
  );
}

// Per-line coverage dot — Strong/Partial/Thin. Tiny peripheral signal.
function LineCoverageDot({ strength = "strong" }) {
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

// ===========================================================================
// RepIncomingLine — a single item row inside RepIncomingQuotePage. Extracted
// so both the category-grouped layout and the flat sorted layout (by
// component or match strength) can render the same row treatment.
function RepIncomingLine({ it, missing, trueMiss, nav, quoteId, showCat }) {
  // Per-line coverage strength. Missing lines = thin/partial signal.
  // Demo deterministic: missing items get thin; normal lines alternate.
  const strength = missing ? (trueMiss ? "thin" : "partial") : "strong";
  return (
    <div className="doc-divider py-2.5 flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <LineCoverageDot strength={strength} />
          <span className="text-[13px] ink leading-snug">{it.name}</span>
        </div>
        <div className="text-[11px] ink-faint mt-0.5 num">
          {it.pack}{it.note ? ` · ${it.note}` : ""}
          {showCat && it.cat ? <span className="ink-faint"> · {it.cat.toLowerCase()}</span> : null}
        </div>
        {missing && (
          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
            <span
              className="text-[10.5px] italic leading-snug"
              style={{ color: "var(--qm-charcoal)", fontFamily: "var(--qm-serif)" }}
            >
              {trueMiss ? "Not in your catalog yet." : "Matcher unsure — confirm or swap."}
            </span>
            <button
              className="text-[10.5px] ink underline-offset-2 hover:no-underline inline-flex items-center gap-1"
              style={{ fontFamily: "var(--qm-sans)" }}
            >
              <Icon name="search" size={10} color="var(--qm-charcoal)" />
              Search your catalog
            </button>
          </div>
        )}
      </div>
                      <div className="text-right num text-[12.5px] ink-soft pt-0.5 shrink-0" style={{ minWidth: 56 }}>
                        {/* No-qty doctrine — case unit only, no qty multiplier */}
                        {it.pack ? <span className="text-[10px] ink-faint">{it.pack.split("/").pop()}</span> : null}
                      </div>
      <IncomingRowIcons
        onReview={() => nav("rep-incoming")}
        onPrice={() => nav("rep-pricing", { quoteId })}
        size={26}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// 7. RepPricingOnlyView — mobile pricing view.
//
// Justin lock May 27: the rep ARRIVES here with prices already in. The matcher
// has aligned the chef's items against the rep's catalog and pulled in current
// catalog prices. The rep's job is mostly confirmation: scan the prices, edit
// the few that need it, fill in any line the catalog didn't carry.
//
// Doctrine landings:
//   • Three states per line: PREFILLED (catalog price, read-only display with
//     pencil affordance), EDITING (rep tapped the pencil; input is editable),
//     EMPTY (no catalog match; price input is blank, rep must type).
//   • The orange CTA on each line is replaced with a quiet pencil affordance
//     that flips that line into edit mode — prefilled lines don't need a
//     standing orange tap target, the price is right there.
//   • The page-level orange CTA stays "Confirm & send back" — implying that
//     the default move is confirm, not enter.
//   • Header gets a one-line operational status: "X of N priced from your
//     catalog" so the rep sees the matcher's work at a glance.
// ════════════════════════════════════════════════════════════════════════════════════════════
function RepPricingOnlyView({ nav = noopNav, quoteId = "Q-1067" }) {
  const q = REP_DEMO.queue.find(x => x.id === quoteId) || REP_DEMO.queue[0];
  // Pre-fill state. Demo deterministic: lines with `unit` set in QUOTE get
  // prefilled from the rep's catalog; a few near the bottom render blank to
  // surface the "rep had to manually price these" state.
  // (Justin May 27: most lines should come PREFILLED.)
  const allLines = useMemo(() => {
    const out = [];
    QUOTE.forEach((g, gi) => {
      g.items.forEach((it, ii) => {
        let cumBefore = 0;
        for (let k = 0; k < gi; k++) cumBefore += QUOTE[k].items.length;
        const lineIdx = cumBefore + ii;
        // Demo: lines 7+ render as unmatched / unpriced.
        const matched = lineIdx < 7;
        out.push({ ...it, gi, ii, lineIdx, matched });
      });
    });
    return out;
  }, []);
  const [editing, setEditing] = useState(new Set());
  const matchedCount = allLines.filter((l) => l.matched).length;

  const toggleEdit = (key) => setEditing((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  return (
    <PhoneShell>
      <div className="flex items-center justify-between px-5 py-2.5 border-b hairline bg-white">
        <button onClick={() => nav("rep-incoming", { quoteId: q.id })} className="text-[12px] ink-soft inline-flex items-center gap-1">
          <Icon name="chevron-left" size={13} /> Quote
        </button>
        <span className="text-[11px] ink-faint num">{q.id}</span>
      </div>

      <div className="scroller">
        {/* Header strip with catalog-match summary */}
        <div className="px-5 pt-4 pb-3" style={{ background: "var(--qm-warm-paper)", borderBottom: "1px solid var(--qm-soft-line)" }}>
          <div className="qm-eyebrow" style={{ fontSize: 9.5 }}>PRICING MODE</div>
          <div className="serif font-medium ink mt-0.5 leading-snug" style={{ fontSize: 17 }}>
            {q.restaurant} · {q.itemCount} lines
          </div>
          <div className="mt-0.5 text-[11px] ink-soft num leading-snug">
            {q.chefFirst} {q.chefLast} · waiting {q.waitingHours}h
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] ink-soft">
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent, #7FAEC2)", display: "inline-block" }} />
            {matchedCount} of {allLines.length} priced from your catalog · {allLines.length - matchedCount} need your eye
          </div>
        </div>

        {/* Price-entry rows */}
        <div className="px-5 py-3" style={{ background: "#fff" }}>
          <div className="grid grid-cols-[1fr_48px_92px_28px] gap-x-2 pb-2 mb-1.5" style={{ borderBottom: "1px solid var(--qm-soft-line)" }}>
            <div className="qm-eyebrow" style={{ fontSize: 9 }}>ITEM</div>
            <div className="qm-eyebrow text-right" style={{ fontSize: 9 }}>QTY</div>
            <div className="qm-eyebrow text-right" style={{ fontSize: 9 }}>UNIT $</div>
            <div></div>
          </div>
          {allLines.map((l) => {
            const key = `${l.gi}-${l.ii}`;
            const isEditing = editing.has(key);
            const matched = l.matched;
            return (
              <div
                key={key}
                className="grid grid-cols-[1fr_48px_92px_28px] gap-x-2 items-center"
                style={{ padding: "10px 0", borderBottom: "1px solid var(--qm-soft-line)" }}
              >
                <div className="min-w-0">
                  <div className="text-[12.5px] ink leading-snug truncate">{l.name}</div>
                  <div className="text-[10.5px] ink-faint num leading-snug">{l.pack}</div>
                </div>
                <div className="text-right text-[12px] ink num">{l.qty}</div>
                <div className="text-right">
                  {matched && !isEditing ? (
                    // Prefilled — read-only display, rep's catalog price.
                    <div className="num">
                      <span className="text-[12.5px] ink font-medium">{money(l.unit)}</span>
                    </div>
                  ) : (
                    // Editable input — either the rep tapped edit on a
                    // prefilled line OR the catalog didn't match this line.
                    <input
                      type="text"
                      inputMode="decimal"
                      defaultValue={matched ? l.unit.toFixed(2) : ""}
                      placeholder="$ —"
                      autoFocus={isEditing}
                      onBlur={() => isEditing && toggleEdit(key)}
                      className="w-full text-right text-[12.5px] num"
                      style={{
                        padding: "5px 7px",
                        border: "1px solid var(--qm-soft-line)",
                        borderRadius: 4,
                        background: "#fff",
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => toggleEdit(key)}
                    className="inline-flex items-center justify-center rounded"
                    style={{
                      width: 26, height: 26,
                      background: "transparent",
                      color: matched ? "var(--qm-gray-500)" : "var(--qm-orange)",
                    }}
                    title={matched ? "Edit this price" : "Price this line"}
                  >
                    <Icon name="square-pen" size={13} color={matched ? "var(--qm-gray-500)" : "var(--qm-orange)"} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky-feeling footer with confirm-and-send */}
        <div className="px-5 py-4" style={{ background: "var(--qm-warm-paper)", borderTop: "1px solid var(--qm-soft-line)" }}>
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] ink-soft">Quote total so far</span>
            <span className="serif font-medium ink num" style={{ fontSize: 17 }}>
              {money(allLines.filter((l) => l.matched).reduce((a, l) => a + l.unit * l.qty, 0))}
            </span>
          </div>
          <div className="mt-0.5 text-[10.5px] ink-faint num leading-snug">
            {allLines.length - matchedCount > 0 ? `${allLines.length - matchedCount} lines still need a price.` : "All lines priced."}
          </div>
          <button
            className="qm-btn qm-btn-orange qm-btn-full mt-3"
            style={{ padding: "11px 14px", fontSize: 13.5 }}
          >
            Confirm &amp; send back <Icon name="arrow-right" size={14} color="white" />
          </button>
          <div className="mt-1.5 text-[10.5px] ink-faint text-center leading-snug">
            Stamps the quote as confirmed. {q.chefFirst} gets emailed.
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. RepTriageQueue — the dispatch list. Doctrine 9.2: "what quote am I
//    building next?" Group quotes by match-state; within each group, order
//    by waiting time descending (oldest at the top of the group). The badge
//    + chef + restaurant + dual icons live on each row.
// ═════════════════════════════════════════════════════════════════════════════
function RepTriageQueue({ nav = noopNav, variant = "mobile", initialMode = "open", showCatalogBanner = true }) {
  const allQuotes = REP_DEMO.queue;
  const groups = [
    { state: "review",   label: "Needs my review",  rows: allQuotes.filter(q => q.matchState === "review")   },
    { state: "coverage", label: "Coverage gaps",    rows: allQuotes.filter(q => q.matchState === "coverage") },
    { state: "ready",    label: "Ready to price",   rows: allQuotes.filter(q => q.matchState === "ready" && q.preview) },
    { state: "draft",    label: "In progress",      rows: allQuotes.filter(q => q.matchState === "ready" && !q.preview && !q.confirmed) },
    { state: "done",     label: "Confirmed",        rows: allQuotes.filter(q => q.confirmed) },
  ].filter(g => g.rows.length > 0);

  const incomingCount = allQuotes.filter(q => q.preview).length;

  const body = (
    <>
      <div>
        <div className="qm-eyebrow" style={{ fontSize: 11 }}>TRIAGE</div>
        <h1 className="serif font-semibold ink mt-1" style={{ fontSize: variant === "mobile" ? 24 : 32, lineHeight: 1.1 }}>
          What are you building next?
        </h1>
        <p className="mt-1.5 text-[13px] ink-soft leading-relaxed" style={{ maxWidth: 540 }}>
          {incomingCount} new {incomingCount === 1 ? "quote" : "quotes"} this morning, ordered by what's waiting longest. Tap a row to open it.
        </p>
      </div>

      {showCatalogBanner && (
        <div className={variant === "mobile" ? "mt-4" : "mt-5"}>
          <CatalogConfirmBanner
            onReview={() => nav("rep-catalog")}
            onDismiss={() => {}}
          />
        </div>
      )}

      <div className={variant === "mobile" ? "mt-5" : "mt-7"}>
        {groups.map((g, gi) => (
          <section key={gi} className={gi === 0 ? "" : "mt-6"}>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2 flex-wrap">
                <RepMatchStateBadge
                  state={g.state === "draft" ? "ready" : g.state === "done" ? "ready" : g.state}
                />
                {g.state === "draft" && <span className="text-[11px] ink-faint italic" style={{ fontFamily: "var(--qm-serif)" }}>· pricing in progress</span>}
                {g.state === "done"  && <span className="text-[11px] ink-faint italic" style={{ fontFamily: "var(--qm-serif)" }}>· confirmed &amp; sent</span>}
              </div>
              <span className="text-[11px] ink-faint num">{g.rows.length}</span>
            </div>
            <div className="mt-1 doc-divider-thick" />
            {g.rows
              .slice()
              .sort((a, b) => (b.waitingHours || 0) - (a.waitingHours || 0))
              .map((q, ri) => (
                <RepTriageRow key={ri} q={q} nav={nav} variant={variant} state={g.state} />
              ))}
          </section>
        ))}
      </div>
    </>
  );

  if (variant === "desktop") {
    return (
      <RepDesktopShell active="triage" nav={nav} initialMode={initialMode}>
        {body}
      </RepDesktopShell>
    );
  }
  return (
    <PhoneShell>
      <div className="flex items-center justify-between px-5 py-3 border-b hairline bg-white">
        <div className="flex items-baseline gap-2">
          <span className="serif text-[18px] font-semibold leading-none ink">QuoteMe</span>
          <span className="qm-eyebrow" style={{ fontSize: 9, letterSpacing: ".16em" }}>REP</span>
        </div>
        <div className="text-[11px] ink-soft num">{REP_DEMO.repFirst} · {REP_DEMO.distShort}</div>
      </div>
      <div className="scroller px-5 py-5">{body}</div>
    </PhoneShell>
  );
}

function RepTriageRow({ q, nav, variant, state }) {
  const isDone = state === "done";
  const isDraft = state === "draft";
  return (
    <div
      className="doc-divider py-3 flex items-start gap-3"
      style={{ opacity: isDone ? 0.7 : 1 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="serif font-medium ink leading-snug" style={{ fontSize: variant === "desktop" ? 16 : 14.5 }}>
            {q.restaurant}
          </span>
          {q.preview && <PreviewPill size="xs" />}
          {isDone && (
            <span className="text-[10px] ink-faint num" style={{ letterSpacing: ".06em" }}>
              CONFIRMED {q.confirmedAt}
            </span>
          )}
        </div>
        <div className="text-[12px] ink-soft num leading-snug mt-0.5">
          {q.id} · {q.chefFirst} {q.chefLast} · {q.itemCount} items
          {!isDone && q.waitingHours > 0 && <span className="ink-faint"> · waiting {q.waitingHours}h</span>}
          {isDraft && q.pricedCount && <span className="ink-faint"> · {q.pricedCount}/{q.totalCount} priced</span>}
        </div>
      </div>
      {/* D5 icons always-visible, except confirmed (read-only). On triage rows
          the icons act on the whole quote (Justin lock May 27): one row =
          one quote, so the orange tooltip reads "Price this whole quote". */}
      {!isDone && (
        <IncomingRowIcons
          onReview={() => nav("rep-incoming", { quoteId: q.id })}
          onPrice={() => nav("rep-pricing", { quoteId: q.id })}
          size={26}
          context="quote"
        />
      )}
      {isDone && (
        <button
          onClick={() => nav("rep-incoming", { quoteId: q.id })}
          className="text-[11px] ink-soft inline-flex items-center gap-0.5 shrink-0"
        >
          Open <Icon name="chevron-right" size={12} color="var(--qm-gray-500)" />
        </button>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. Frame wrappers — what the gallery / route table mounts.
// ═════════════════════════════════════════════════════════════════════════════
function RepTriagePage({ nav = noopNav }) {
  return <RepTriageQueue nav={nav} variant="mobile" />;
}
function RepTriagePageDesktop({ nav = noopNav, initialMode = "open" }) {
  return <RepTriageQueue nav={nav} variant="desktop" initialMode={initialMode} />;
}
function RepIncomingQuoteCoverage({ nav = noopNav }) {
  return <RepIncomingQuotePage nav={nav} coverage="coverage" quoteId="Q-1062" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// RepIconReferenceCard — a tiny gallery-only card the design review uses to
// inspect the D5 icon pair in isolation: both states, both sizes, with copy
// captions. Not part of the running app.
// ─────────────────────────────────────────────────────────────────────────────
function RepIconReferenceCard() {
  return (
    <div className="px-6 py-7 h-full" style={{ background: "var(--qm-warm-paper)" }}>
      <div className="qm-eyebrow" style={{ fontSize: 10 }}>D5 · INLINE ROW ICONS</div>
      <h3 className="serif font-semibold ink mt-1.5" style={{ fontSize: 20, lineHeight: 1.15 }}>
        Two verbs, two icons.
      </h3>
      <p className="text-[12px] ink-soft leading-relaxed mt-1.5">
        Always visible per row. Mobile-first. Reflects the page-level CTAs.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="bg-white border hairline rounded-md px-3 py-3">
          <div className="flex items-center justify-center">
            <BlueReviewIconButton size={32} />
          </div>
          <div className="mt-2 text-center">
            <div className="text-[11.5px] ink font-medium leading-snug">Review</div>
            <div className="text-[10.5px] ink-faint leading-snug">--accent #7FAEC2</div>
          </div>
        </div>
        <div className="bg-white border hairline rounded-md px-3 py-3">
          <div className="flex items-center justify-center">
            <OrangePriceIconButton size={32} />
          </div>
          <div className="mt-2 text-center">
            <div className="text-[11.5px] ink font-medium leading-snug">Price</div>
            <div className="text-[10.5px] ink-faint leading-snug">--qm-orange (primary)</div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="qm-eyebrow" style={{ fontSize: 9 }}>PAIRED, AS A ROW</div>
        <div className="mt-2 bg-white border hairline rounded-md px-3 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12.5px] ink leading-snug">Extra Virgin Olive Oil</div>
            <div className="text-[10.5px] ink-faint num leading-snug">4 × 1L · case</div>
          </div>
          <IncomingRowIcons size={26} />
        </div>
        <div className="mt-2 bg-white border hairline rounded-md px-3 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12.5px] ink leading-snug">Maldon sea salt flakes</div>
            <div className="text-[10.5px] italic leading-snug" style={{ color: "var(--qm-charcoal)", fontFamily: "var(--qm-serif)" }}>
              Matcher unsure — confirm or swap.
            </div>
          </div>
          <IncomingRowIcons size={26} />
        </div>
      </div>

      <div className="mt-4 text-[10.5px] ink-faint leading-relaxed" style={{ fontFamily: "var(--qm-serif)" }}>
        No hover state. No third icon. Skip/flag/unavailable layer in later only if rep behavior demands it.
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. RepPricingTableDesktop — desktop pricing surface.
//
// Justin lock May 27: this is the canonical rep pricing UI. Replaces the
// earlier `RepPricingOnlyView` desktop sketch entirely. The mobile
// `RepPricingOnlyView` stays put for phone — it's already in the right shape
// for a single column.
//
// Doctrine landings:
//   • Two cards stacked: Pricing Controls (bulk adjustment) + the table.
//     The Pricing Controls card always shows; bulk adjustment is the rep's
//     blunt-instrument move ("raise everything 5% to cover diesel"), so it
//     deserves equal weight to per-line editing.
//   • Table has TWO modes: read-only and edit. The toolbar button toggles
//     between "Edit price" → "Save" (orange when active). No separate URL —
//     toggling is in-page state.
//   • The % Change column only shows in edit mode + after a bulk adjustment
//     has been applied. Stays mounted (preserves column rhythm) but renders
//     blank in read-only. Green % up = increase; up/down chevron flips for
//     decreases; 0.0% stays muted.
//   • Component name (the chef's word — "Orecchiette pasta") renders in a
//     deemphasized accent color to distinguish it from the rep's catalog
//     fields (SKU, Brand, Product, Pack). Same chef-vs-rep distinction we use
//     elsewhere in the doc.
//   • +/− nudge buttons flank the price input. Tap = ±$1 (or ±5% if Cmd/Ctrl).
//     The bare number lives in the input — no inline "$" — so the rep can
//     paste numbers from anywhere without stripping.
//   • Save commits the edits and flips back to read-only. The Pricing Controls
//     bulk-adjustment % is preserved in the header until cleared.
//
// State map (intentionally minimal — Claudio's port is clean):
//   editMode      bool         — read-only ↔ edit
//   bulkPercent   number|""    — what's in the bulk input
//   appliedPct    number       — % already applied (controls % Change column)
//   prices        Map<lineId, number>   — current price per row
//   baselines     Map<lineId, number>   — original price per row (for % calc)
// ═════════════════════════════════════════════════════════════════════════════

// Demo data for the pricing table. Mirrors Justin's screenshot.
const REP_PRICING_LINES = [
  { id: "L01", dish: "Orecchiette with Broccoli Rabe", component: "Orecchiette pasta",  sku: "PST-602", brand: "Rustichella",    product: "Artisan Orecchiette",        pack: "12/500g bag",  price: 42.00 },
  { id: "L02", dish: "Orecchiette with Broccoli Rabe", component: "Calabrian chili",    sku: "PEP-201", brand: "Tutto Calabria", product: "Calabrian Chili Paste Hot",   pack: "12/10 oz jar", price: 48.60 },
  { id: "L03", dish: "Orecchiette with Broccoli Rabe", component: "Parmigiano Reggiano",sku: "PRK-001", brand: "BelGioioso",     product: "Parmigiano Reggiano 24mo Aged", pack: "1/10 lb wheel", price: 88.50 },
  { id: "L04", dish: "Orecchiette with Broccoli Rabe", component: "Olive oil",          sku: "OIL-101", brand: "Colavita",       product: "Extra Virgin Olive Oil",      pack: "1/1 gal",      price: 76.75 },
  { id: "L05", dish: "Margherita Pizza",                component: "San Marzano tomatoes",sku: "TOM-401", brand: "Cento",          product: "San Marzano Tomatoes Whole Peeled", pack: "6/#10 can", price: 52.00 },
  { id: "L06", dish: "Margherita Pizza",                component: "Fresh mozzarella",   sku: "MOZ-501", brand: "BelGioioso",     product: "Fresh Mozzarella Log",        pack: "4/3 lb log",   price: 45.00 },
  { id: "L07", dish: "Margherita Pizza",                component: "Olive oil",          sku: "OIL-102", brand: "Partanna",       product: "First Press EVOO",            pack: "6/500ml bottle", price: 62.00 },
];

function RepPricingTableDesktop({ nav = noopNav, initialMode = "open", initialEdit = false, demoBulk = null }) {
  const [editMode, setEditMode]       = useState(initialEdit);
  const [bulkPercent, setBulkPercent] = useState(demoBulk !== null ? demoBulk : 0);
  const [appliedPct, setAppliedPct]   = useState(demoBulk !== null ? demoBulk : 0);
  const [category, setCategory]       = useState("all");

  // Baselines are the "original" prices before any adjustments. Computed once;
  // both bulk apply and per-line edits track % off this.
  const baselines = useMemo(() => {
    const m = new Map();
    REP_PRICING_LINES.forEach(l => m.set(l.id, l.price));
    return m;
  }, []);

  const initialPrices = useMemo(() => {
    const m = new Map();
    REP_PRICING_LINES.forEach(l => m.set(l.id, demoBulk ? +(l.price * (1 + demoBulk / 100)).toFixed(4) : l.price));
    return m;
  }, [demoBulk]);
  const [prices, setPrices] = useState(initialPrices);

  const applyBulk = () => {
    const pct = Number(bulkPercent) || 0;
    setAppliedPct(pct);
    setPrices((p) => {
      const next = new Map();
      baselines.forEach((base, id) => {
        next.set(id, +(base * (1 + pct / 100)).toFixed(4));
      });
      return next;
    });
  };

  const adjustPrice = (id, delta) => {
    setPrices((p) => {
      const next = new Map(p);
      const base = baselines.get(id);
      const cur = next.get(id) ?? base;
      next.set(id, Math.max(0, +(cur + delta).toFixed(4)));
      return next;
    });
  };

  const setPriceDirect = (id, val) => {
    setPrices((p) => {
      const next = new Map(p);
      const num = Number(val);
      if (!Number.isNaN(num)) next.set(id, num);
      return next;
    });
  };

  const pctChange = (id) => {
    const base = baselines.get(id);
    const cur = prices.get(id) ?? base;
    if (!base) return 0;
    return ((cur - base) / base) * 100;
  };

  return (
    <RepDesktopShell active="quotes" nav={nav} initialMode={initialMode}>
      {/* PRICING CONTROLS CARD */}
      <div
        className="bg-white rounded-lg"
        style={{
          border: "1px solid var(--qm-soft-line)",
          padding: "20px 28px 22px",
          boxShadow: "0 1px 2px rgba(43,43,43,0.04)",
        }}
      >
        <div className="serif font-semibold ink" style={{ fontSize: 19, lineHeight: 1.2 }}>
          Pricing Controls
        </div>
        <div className="text-[12.5px] ink-soft mt-1 leading-relaxed">
          Adjust pricing for all items or edit individual prices
        </div>
        <div className="mt-5 flex items-center justify-center gap-4 flex-wrap">
          <label htmlFor="bulkAdj" className="text-[14px] ink">Bulk Adjustment</label>
          <div className="inline-flex items-center gap-2">
            <input
              id="bulkAdj"
              type="number"
              value={bulkPercent}
              onChange={(e) => setBulkPercent(e.target.value)}
              step="0.5"
              className="num text-center"
              style={{
                width: 88, padding: "8px 10px",
                border: "1px solid var(--qm-soft-line)",
                borderRadius: 8, background: "#fff", fontSize: 14,
              }}
            />
            <span className="ink-soft text-[14px]">%</span>
          </div>
          <button
            onClick={applyBulk}
            className="qm-btn qm-btn-orange"
            style={{ padding: "9px 26px", fontSize: 14, fontWeight: 500 }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* TABLE CARD */}
      <div
        className="mt-5 bg-white rounded-lg"
        style={{
          border: "1px solid var(--qm-soft-line)",
          boxShadow: "0 1px 2px rgba(43,43,43,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid var(--qm-soft-line)" }}>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center rounded-md"
              style={{ width: 36, height: 36, border: "1px solid var(--qm-soft-line)", background: "#fff" }}
              title="Filter"
              aria-label="Filter"
            >
              <Icon name="filter" size={14} color="var(--qm-charcoal)" />
            </button>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-[13px] ink"
              style={{
                padding: "8px 32px 8px 12px",
                border: "1px solid var(--qm-soft-line)",
                borderRadius: 8, background: "#fff",
              }}
            >
              <option value="all">All Categories</option>
              <option value="pasta">Pasta &amp; grains</option>
              <option value="dairy">Dairy</option>
              <option value="oil">Oils &amp; vinegars</option>
              <option value="canned">Canned goods</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="qm-btn"
                style={{
                  padding: "8px 14px", fontSize: 13,
                  border: "1px solid var(--qm-soft-line)",
                  background: "#fff", color: "var(--qm-charcoal)",
                  borderRadius: 8,
                }}
              >
                <Icon name="square-pen" size={13} color="var(--qm-charcoal)" />
                Edit price
              </button>
            ) : (
              <button
                onClick={() => setEditMode(false)}
                className="qm-btn qm-btn-orange"
                style={{ padding: "8px 18px", fontSize: 13, fontWeight: 500, borderRadius: 8 }}
              >
                <Icon name="square-pen" size={13} color="#fff" />
                Save
              </button>
            )}
            <button
              className="qm-btn"
              style={{
                padding: "8px 14px", fontSize: 13,
                border: "1px solid var(--qm-soft-line)",
                background: "#fff", color: "var(--qm-charcoal)",
                borderRadius: 8,
              }}
            >
              <Icon name="plus" size={13} color="var(--qm-charcoal)" />
              Add SKU
            </button>
          </div>
        </div>

        {/* Table */}
        <table className="w-full" style={{ borderCollapse: "collapse", fontFamily: "var(--qm-sans)" }}>
          <thead>
            <tr style={{ background: "rgba(247,243,235,.7)" }}>
              <RepHeadCell label="Dish"      width="20%" />
              <RepHeadCell label="Component" width="14%" />
              <RepHeadCell label="SKU"       width="8%"  />
              <RepHeadCell label="Brand"     width="12%" />
              <RepHeadCell label="Product"   width="20%" />
              <RepHeadCell label="Pack"      width="10%" />
              {editMode && <RepHeadCell label="% Change" width="9%" align="right" />}
              <RepHeadCell label="Price"     width={editMode ? "11%" : "10%"} align="right" />
            </tr>
          </thead>
          <tbody>
            {REP_PRICING_LINES.map((line) => {
              const price = prices.get(line.id) ?? line.price;
              const pct   = pctChange(line.id);
              return (
                <tr key={line.id} style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
                  <td className="text-[13px] ink leading-snug align-middle" style={{ padding: "14px 16px 14px 20px" }}>
                    {line.dish}
                  </td>
                  <td className="text-[13px] leading-snug align-middle" style={{ padding: "14px 16px", color: "var(--accent, #7FAEC2)" }}>
                    {line.component}
                  </td>
                  <td className="text-[12.5px] ink num leading-snug align-middle" style={{ padding: "14px 16px" }}>
                    {line.sku}
                  </td>
                  <td className="text-[13px] ink leading-snug align-middle" style={{ padding: "14px 16px" }}>
                    {line.brand}
                  </td>
                  <td className="text-[13px] ink leading-snug align-middle" style={{ padding: "14px 16px" }}>
                    {line.product}
                  </td>
                  <td className="text-[12.5px] ink-soft leading-snug align-middle" style={{ padding: "14px 16px" }}>
                    {line.pack}
                  </td>
                  {editMode && (
                    <td className="text-right align-middle" style={{ padding: "14px 12px" }}>
                      <PctChangeIndicator pct={pct} />
                    </td>
                  )}
                  <td className="text-right align-middle" style={{ padding: "14px 20px 14px 12px" }}>
                    {editMode ? (
                      <PriceEditor
                        value={price}
                        onChange={(v) => setPriceDirect(line.id, v)}
                        onStep={(d) => adjustPrice(line.id, d)}
                      />
                    ) : (
                      <span className="text-[13.5px] ink num font-medium">${money(price).replace(/^\$/, "")}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </RepDesktopShell>
  );
}

function RepHeadCell({ label, width, align = "left" }) {
  return (
    <th
      className="text-[11.5px] ink-soft"
      style={{
        width,
        textAlign: align,
        padding: "12px 16px",
        fontWeight: 500,
        letterSpacing: ".02em",
      }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon name="arrow-up-down" size={10} color="var(--qm-gray-500)" />
      </span>
    </th>
  );
}

function PctChangeIndicator({ pct }) {
  // Green for any positive change (price up), charcoal for zero, charcoal for
  // negative too — never red. A negative move is the rep being generous, not
  // a problem to flag. Keep the chrome calm.
  const positive = pct > 0.005;
  const negative = pct < -0.005;
  const color = positive ? "var(--qm-success, #2F8F4F)"
              : negative ? "var(--qm-charcoal)"
              : "var(--qm-gray-500)";
  const arrow = positive ? "chevron-up" : negative ? "chevron-down" : "chevron-up";
  const sign  = positive ? "+" : "";
  return (
    <span className="inline-flex items-center gap-1 num" style={{ color, fontSize: 12.5 }}>
      <Icon name={arrow} size={11} color={color} style={{ opacity: pct === 0 ? 0.5 : 1 }} />
      {sign}{pct.toFixed(1)}%
    </span>
  );
}

function PriceEditor({ value, onChange, onStep }) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onStep(-1)}
        className="rounded-md inline-flex items-center justify-center"
        style={{ width: 26, height: 30, border: "1px solid var(--qm-soft-line)", background: "#fff" }}
        title="−$1"
        aria-label="Decrease price"
      >
        <span className="ink-soft text-[14px]">−</span>
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="num text-right"
        style={{
          width: 84, padding: "6px 10px",
          border: "1px solid var(--qm-soft-line)",
          borderRadius: 6, background: "#fff", fontSize: 13,
        }}
      />
      <button
        type="button"
        onClick={() => onStep(1)}
        className="rounded-md inline-flex items-center justify-center"
        style={{ width: 26, height: 30, border: "1px solid var(--qm-soft-line)", background: "#fff" }}
        title="+$1"
        aria-label="Increase price"
      >
        <span className="ink-soft text-[14px]">+</span>
      </button>
    </span>
  );
}

// Frame wrappers for the gallery — three demo states (read / edit / +5%).
function RepPricingTableRead({ nav = noopNav })  { return <RepPricingTableDesktop nav={nav} initialEdit={false} />; }
function RepPricingTableEdit({ nav = noopNav })  { return <RepPricingTableDesktop nav={nav} initialEdit={true} />; }
function RepPricingTableBulk5({ nav = noopNav }) { return <RepPricingTableDesktop nav={nav} initialEdit={true} demoBulk={5} />; }

// ===========================================================================
// RepReviewThreePanelDesktop — Path 2 desktop layout (Justin May 27 Q4 lock).
// ===========================================================================
//
// Three columns, simultaneous visibility (doctrine 9.3 — NEVER tabs). Mobile
// collapses to one panel with a swap drawer per line.
//
//   LEFT   Menu       — chef's source, grouped by category. Click = select.
//   CENTER Products   — catalog SKUs for the selected line; alternatives below.
//   RIGHT  Quote      — the document being built; per-line pencil jumps back.
// ===========================================================================

function getProductAlternatives(itemName) {
  return [
    { name: itemName, brand: "Colavita",     pack: "4/1 gal",  strength: "strong",  current: true },
    { name: itemName, brand: "Partanna",     pack: "6/500ml",  strength: "partial" },
    { name: itemName, brand: "Bertolli",     pack: "12/375ml", strength: "partial" },
    { name: itemName, brand: "Generic EVOO", pack: "1/5 gal",  strength: "thin" },
  ];
}

function RepReviewThreePanelDesktop({ nav = noopNav, initialMode = "open", quoteId = "Q-1067" }) {
  const q = REP_DEMO.queue.find((x) => x.id === quoteId) || REP_DEMO.queue[0];
  const allLines = useMemo(() => {
    const out = [];
    QUOTE.forEach((g, gi) => {
      g.items.forEach((it, ii) => {
        let cumBefore = 0;
        for (let k = 0; k < gi; k++) cumBefore += QUOTE[k].items.length;
        out.push({ ...it, cat: g.cat, gi, ii, lineIdx: cumBefore + ii });
      });
    });
    return out;
  }, []);

  const [selectedIdx, setSelectedIdx] = useState(2);
  const [commits, setCommits] = useState(() => {
    const m = new Map();
    allLines.forEach((_, i) => m.set(i, 0));
    return m;
  });

  const selectedLine = allLines[selectedIdx] || allLines[0];
  const alternatives = getProductAlternatives(selectedLine.name);
  const committedAltIdx = commits.get(selectedIdx) ?? 0;
  const swap = (altIdx) => setCommits((prev) => new Map(prev).set(selectedIdx, altIdx));

  return (
    <RepDesktopShell active="quotes" nav={nav} initialMode={initialMode}>
      <div className="flex items-baseline gap-3 flex-wrap">
        <button onClick={() => nav("rep-triage")} className="text-[12.5px] ink-soft inline-flex items-center gap-1">
          <Icon name="chevron-left" size={14} /> Triage
        </button>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".14em" }}>REVIEWING QUOTE · {q.id}</div>
          <h1 className="serif font-semibold ink mt-1" style={{ fontSize: 30, lineHeight: 1.15 }}>
            {q.restaurant}
          </h1>
          <div className="mt-1 text-[13px] ink-soft leading-relaxed">
            From <span className="ink">{q.chefFirst} {q.chefLast}</span>
            <span className="ink-faint"> · {q.city} · waiting {q.waitingHours}h</span>
          </div>
          <div className="mt-2">
            <QuoteCoverageLabelRep state="ready" />
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => nav("rep-pricing", { quoteId: q.id })}
            className="qm-btn qm-btn-text"
            style={{ padding: "10px 14px", fontSize: 13 }}
          >
            Skip to pricing
          </button>
          <button
            className="qm-btn qm-btn-orange"
            style={{ padding: "11px 22px", fontSize: 13.5, fontWeight: 500 }}
          >
            <Icon name="check" size={13} color="#fff" />
            Send to chef
          </button>
        </div>
      </div>

      <div
        className="mt-6 grid gap-4"
        style={{ gridTemplateColumns: "260px 1fr 320px", minHeight: 540 }}
      >
        {/* LEFT — Menu */}
        <aside className="bg-white rounded-lg overflow-hidden" style={{ border: "1px solid var(--qm-soft-line)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "2px solid var(--qm-charcoal)" }}>
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>MENU · CHEF'S SOURCE</div>
            <div className="text-[11px] ink-faint mt-0.5">{allLines.length} components · click to inspect</div>
          </div>
          <div className="py-1" style={{ maxHeight: 540, overflow: "auto" }}>
            {QUOTE.map((group, gi) => (
              <div key={gi} className="mt-2">
                <div className="px-4 pt-2 pb-1 qm-eyebrow" style={{ fontSize: 9, letterSpacing: ".14em" }}>
                  {group.cat}
                </div>
                {group.items.map((it, ii) => {
                  let cumBefore = 0;
                  for (let k = 0; k < gi; k++) cumBefore += QUOTE[k].items.length;
                  const lineIdx = cumBefore + ii;
                  const sel = lineIdx === selectedIdx;
                  return (
                    <button
                      key={ii}
                      onClick={() => setSelectedIdx(lineIdx)}
                      className="w-full text-left px-4 py-2 flex items-start gap-2 hover:bg-gray-50"
                      style={{
                        background: sel ? "var(--qm-warm-paper)" : "transparent",
                        borderLeft: sel ? "2px solid var(--qm-charcoal)" : "2px solid transparent",
                      }}
                    >
                      <LineCoverageDot strength={lineIdx === 0 ? "partial" : "strong"} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] ink leading-snug">{it.name}</div>
                        <div className="text-[10.5px] ink-faint num leading-snug">{it.pack}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER — Products */}
        <section className="bg-white rounded-lg overflow-hidden" style={{ border: "1px solid var(--qm-soft-line)" }}>
          <div className="px-5 py-3 flex items-baseline justify-between gap-3" style={{ borderBottom: "2px solid var(--qm-charcoal)" }}>
            <div className="min-w-0">
              <div className="qm-eyebrow" style={{ fontSize: 10 }}>PRODUCTS · CATALOG MATCHES</div>
              <div className="serif font-medium ink mt-0.5 leading-snug truncate" style={{ fontSize: 17 }}>
                {selectedLine.name}
              </div>
              <div className="text-[11px] ink-faint num leading-snug">{selectedLine.pack} · {selectedLine.cat}</div>
            </div>
            <button className="qm-btn qm-btn-text shrink-0" style={{ padding: "7px 12px", fontSize: 12, border: "1px solid var(--qm-soft-line)", borderRadius: 4 }}>
              <Icon name="search" size={11} color="var(--qm-charcoal)" />
              Search catalog
            </button>
          </div>

          <div className="px-5 py-4">
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>MATCHED SKU</div>
            <ProductAltCard alt={alternatives[committedAltIdx]} selected primary />

            <div className="qm-eyebrow mt-5" style={{ fontSize: 10 }}>OTHER SKUS IN YOUR CATALOG</div>
            <div className="mt-2 flex flex-col gap-2">
              {alternatives.map((alt, ai) => ai === committedAltIdx ? null : (
                <ProductAltCard key={ai} alt={alt} onClick={() => swap(ai)} />
              ))}
            </div>

            <div className="mt-5 pt-4 flex flex-wrap gap-2" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
              <button className="qm-btn qm-btn-text" style={{ padding: "8px 14px", fontSize: 12.5, border: "1px solid var(--qm-soft-line)", borderRadius: 4 }}>
                <Icon name="plus" size={12} color="var(--qm-charcoal)" />
                Add a different SKU
              </button>
              <button className="qm-btn qm-btn-text" style={{ padding: "8px 14px", fontSize: 12.5, border: "1px solid var(--qm-soft-line)", borderRadius: 4 }}>
                <Icon name="x" size={12} color="var(--qm-charcoal)" />
                Mark unavailable
              </button>
              <button className="qm-btn qm-btn-text" style={{ padding: "8px 14px", fontSize: 12.5, border: "1px solid var(--qm-soft-line)", borderRadius: 4 }}>
                <Icon name="message-circle" size={12} color="var(--qm-charcoal)" />
                Ask the chef about this
              </button>
            </div>
            <div className="mt-3">
              <label className="qm-eyebrow block" style={{ fontSize: 10 }} htmlFor="line-note">NOTE ON THIS LINE</label>
              <input
                id="line-note"
                className="qm-input mt-1"
                placeholder="e.g. Subbed Colavita for chef's request — better fit"
                style={{ fontSize: 12.5 }}
              />
            </div>
          </div>
        </section>

        {/* RIGHT — Quote being built */}
        <aside className="bg-white rounded-lg overflow-hidden flex flex-col" style={{ border: "1px solid var(--qm-soft-line)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "2px solid var(--qm-charcoal)" }}>
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>QUOTE · BUILDING</div>
            <div className="text-[11px] ink-faint num mt-0.5">{allLines.length} of {allLines.length} aligned</div>
          </div>
          <div className="flex-1 py-2" style={{ maxHeight: 540, overflow: "auto" }}>
            {allLines.map((it, idx) => {
              const altIdx = commits.get(idx) ?? 0;
              const alt = getProductAlternatives(it.name)[altIdx];
              const sel = idx === selectedIdx;
              return (
                <div
                  key={idx}
                  className="px-3 py-2 doc-divider"
                  style={{ background: sel ? "var(--qm-warm-paper)" : "transparent" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] ink leading-snug">{it.name}</div>
                      <div className="text-[10.5px] ink-faint leading-snug">
                        {alt.brand} · {alt.pack}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedIdx(idx)}
                      className="text-[10px] ink-faint hover:ink shrink-0"
                      title="Edit this line"
                    >
                      <Icon name="square-pen" size={11} color="var(--qm-gray-700)" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 text-[11px] ink-faint leading-relaxed" style={{ background: "var(--qm-warm-paper)", borderTop: "1px solid var(--qm-soft-line)" }}>
            Quote shows aligned SKUs. Prices fill in when you confirm — either via <span className="ink">Use my catalog prices</span> or per-line.
          </div>
        </aside>
      </div>
    </RepDesktopShell>
  );
}

function ProductAltCard({ alt, selected, onClick, primary }) {
  return (
    <div
      onClick={onClick}
      className={cls("px-3.5 py-2.5 rounded-md", onClick ? "cursor-pointer hover:bg-gray-50" : "")}
      style={{
        border: selected ? "1.5px solid var(--qm-charcoal)" : "1px solid var(--qm-soft-line)",
        background: selected ? "var(--qm-warm-paper)" : "#fff",
        marginTop: primary ? 8 : 0,
      }}
    >
      <div className="flex items-start gap-2">
        <LineCoverageDot strength={alt.strength} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] ink leading-snug">{alt.name}</div>
          <div className="text-[11.5px] ink-soft leading-snug">{alt.brand} · {alt.pack}</div>
        </div>
        {!selected && (
          <button className="text-[11px] ink underline-offset-2 hover:underline shrink-0" style={{ background: "none", border: "none", padding: 0 }}>
            Swap
          </button>
        )}
        {selected && (
          <span className="text-[10px] ink-faint uppercase" style={{ letterSpacing: ".12em" }}>Current</span>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  RepReviewThreePanelDesktop, ProductAltCard, getProductAlternatives,
});

// ===========================================================================
// (end of RepReviewThreePanelDesktop)
// ===========================================================================

Object.assign(window, {
  REP_DEMO, RepMatchStateBadge,
  RepNewspaperSidebar, RepDesktopShell,
  CatalogConfirmBanner,
  RepWelcomePage,
  BlueReviewIconButton, OrangePriceIconButton, IncomingRowIcons,
  RepIconReferenceCard,
  RepIncomingQuotePage, RepIncomingQuoteCoverage,
  RepPricingOnlyView,
  RepTriageQueue, RepTriagePage, RepTriagePageDesktop,
  REP_PRICING_LINES, RepPricingTableDesktop, RepHeadCell, PctChangeIndicator, PriceEditor,
  RepPricingTableRead, RepPricingTableEdit, RepPricingTableBulk5,
});
