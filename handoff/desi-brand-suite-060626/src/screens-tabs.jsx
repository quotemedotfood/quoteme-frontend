// src/screens-tabs.jsx — Desi brief, May 18.
// Three new chef-facing tab views for the post-magic-link shell:
//   • ChefHomeTab        — dashboard home, brand-new chef from rep email
//   • ChefDistributorsTab — Your distributors + Catalogs servicing Hudson, NY
//   • ChefSettingsTab    — V1 scope: contact, logo, chefs, locations, billing
//
// Plus empty states for each, plus desktop derivatives.
//
// All copy passes the verb-rules table + Moose May 14 directive:
//   No "sign up", "activate", "create account", "platform", "dashboard",
//   "discover", "browse", "marketplace", "scale", "leverage", "best",
//   "top", "recommended", "AI", "automated", "intelligent", "workflow".
//
// Tabs use the locked chef-flow nav: Quotes · Distributors · Settings.
// Bottom tab bar on mobile (44px hit targets, no FAB cutout — there is no
// orange "start" CTA on these surfaces; build-another lives inside Quotes).
// Top tab strip on desktop, sitting under the existing DesktopTopBar.

// ─────────────────────────────────────────────────────────────────────────────
// Demo data — additional records the existing screens don't already carry.
// (Justin-locked names everywhere; status values map to the V2 spec.)
// ─────────────────────────────────────────────────────────────────────────────

// Distributors the chef has quoted with (Section 1 of Distributors tab).
const YOUR_DISTRIBUTORS = [
  {
    short: "D'Lisius",
    name: "D'Lisius Distribution Co.",
    rep: DEMO.rep,
    repPhone: DEMO.repPhone,
    repEmail: DEMO.repEmail,
    lastQuote: "May 12, 2026",
    quoteCount: 7,
    status: "connected", // rep on QuoteMe, catalog live
  },
  {
    short: "Hudson Provisions",
    name: "Hudson Valley Provisions",
    rep: "Anna Mireles",
    repPhone: "(518) 555-0207",
    repEmail: "anna@hvprovisions.com",
    lastQuote: "Apr 22, 2026",
    quoteCount: 2,
    status: "uploaded", // chef-uploaded price list
  },
  {
    short: "Catskill Specialty",
    name: "Catskill Specialty Cheese",
    rep: "Sam Doyle",
    repPhone: "(845) 555-0119",
    repEmail: null,
    lastQuote: "Mar 30, 2026",
    quoteCount: 1,
    status: "uploaded",
  },
];

// Distributors with verified catalog coverage in Hudson, NY area (Section 2).
// `affiliated:false` → "Unaffiliated · no rep yet on QuoteMe" flag.
const AREA_DISTRIBUTORS = [
  { short: "Northwind Seafood",  name: "Northwind Seafood Co.",          scope: "Hudson Valley · Berkshires", items: 380,  updated: "May 12", affiliated: true  },
  { short: "Foothill Dairy",     name: "Foothill Dairy Collective",     scope: "Columbia · Greene counties", items: 142,  updated: "May 10", affiliated: true  },
  { short: "Riverbend Produce",  name: "Riverbend Farm Produce",        scope: "Hudson Valley",              items: 612,  updated: "May 9",  affiliated: false },
  { short: "Two Stones Bakery",  name: "Two Stones Bakery, wholesale",   scope: "Hudson · Kingston",          items: 84,   updated: "May 7",  affiliated: false },
];

// Other chefs invited to Holloway & Sons (magic-link invites, Section 3 of Settings).
const TEAM_CHEFS = [
  { name: "Marta Quintero", email: "marta@hollowayandsons.com", role: "Sous chef",      joined: "Apr 14, 2026", status: "active"  },
  { name: "Wei Tanaka",     email: "wei@hollowayandsons.com",   role: "Pastry",         joined: null,            status: "invited" },
];

// Other restaurant locations the chef has access to.
const LOCATIONS = [
  { name: "Holloway & Sons", city: "Hudson, NY",     role: "Primary",  current: true  },
  { name: "The Maple Room",  city: "Rhinebeck, NY",  role: "Visiting", current: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// UseDistributorForQuoteModal — Opus c11 lock (May 18) Q4.
// Trigger: chef taps "Use for a quote" on a row in Distributors → Section 2.
// Behavior: confirmation modal, two copy variants (affiliated vs unaffiliated),
// Continue routes to /chef/entry with the distributor pre-selected.
// Renders inside the surrounding PhoneShell / desktop frame; the parent passes
// in `distributor` and `onClose` / `onContinue`. No dismiss-by-tap-outside —
// chef must Continue or Cancel.
// ─────────────────────────────────────────────────────────────────────────────
function UseDistributorForQuoteModal({ distributor, onClose, onContinue, variant = "mobile" }) {
  if (!distributor) return null;
  const unaffiliated = distributor.affiliated === false;
  const isDesktop = variant === "desktop";

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "absolute", inset: 0, zIndex: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(31,26,20,.42)",
      }}
    >
      <div
        className="bg-white"
        style={{
          width: "100%",
          maxWidth: isDesktop ? 520 : 360,
          marginBottom: isDesktop ? "auto" : 0,
          marginTop:    isDesktop ? "auto" : 0,
          borderRadius: isDesktop ? "var(--qm-radius-xl)" : "var(--qm-radius-lg) var(--qm-radius-lg) 0 0",
          boxShadow: "0 -8px 32px rgba(31,26,20,.18)",
        }}
      >
        <div className={isDesktop ? "px-7 pt-7 pb-6" : "px-5 pt-6 pb-5"}>
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>NEW QUOTE THREAD</div>
          <h2 className="serif font-semibold ink mt-1.5" style={{ fontSize: isDesktop ? 22 : 19, lineHeight: 1.2 }}>
            Building a new quote with {distributor.short}.
          </h2>
          <p className={cls("ink-soft leading-relaxed mt-2.5", isDesktop ? "text-[13.5px]" : "text-[13px]")}>
            This stays a separate quote thread from your existing distributors. Continue?
          </p>

          {unaffiliated && (
            <div
              className="mt-4 px-3.5 py-3 rounded-md"
              style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}
            >
              <div className="flex items-start gap-2.5">
                <span style={{
                  width: 6, height: 6, marginTop: 6, borderRadius: 999,
                  background: "var(--qm-warning)", flexShrink: 0,
                }} />
                <div className="text-[12px] ink-soft leading-relaxed">
                  <span className="ink">{distributor.short}</span> doesn't have a rep account on QuoteMe yet.
                  We'll match against their catalog, but prices won't reflect rep-negotiated rates until
                  they connect.
                </div>
              </div>
            </div>
          )}

          {/* Operational meta — what the chef is committing to */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-[11.5px]">
            <div>
              <div className="qm-eyebrow" style={{ fontSize: 9 }}>CATALOG</div>
              <div className="ink mt-0.5 num">{distributor.items} items</div>
              <div className="ink-faint num">updated {distributor.updated}</div>
            </div>
            <div>
              <div className="qm-eyebrow" style={{ fontSize: 9 }}>COVERAGE</div>
              <div className="ink mt-0.5">{distributor.scope}</div>
            </div>
          </div>
        </div>

        <div className={cls("flex flex-col gap-2", isDesktop ? "px-7 pb-7" : "px-5 pb-5")} style={{ borderTop: "1px solid var(--qm-soft-line)", paddingTop: 14 }}>
          <button onClick={onContinue} className="qm-btn qm-btn-orange qm-btn-full">
            Continue <Icon name="arrow-right" size={16} color="white" />
          </button>
          <button onClick={onClose} className="qm-btn qm-btn-text qm-btn-full">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuoteCountPill — orange-outlined pill that wraps the entire counter phrase.
// Border is orange; text color is inherited from the parent (ink-faint), so the
// outline is the only thing that catches the eye — never reads as a CTA.
// ─────────────────────────────────────────────────────────────────────────────
function QuoteCountPill({ children, padding = "2px 10px" }) {
  return (
    <span
      className="num"
      style={{
        display: "inline-block",
        border: "1px solid var(--qm-orange)",
        borderRadius: 999,
        padding,
        lineHeight: 1.3,
        fontFeatureSettings: '"tnum" 1',
      }}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ChefMobileShell — the chef's mobile chrome, now the ONE newspaper drawer shell
// (Eighteen/Moose, Jun 6). Replaces MobileTopBar + bottom ChefTabBar. Feeds the
// shared NewspaperMobileShell the same nav the desktop NewspaperSidebar shows.
// ─────────────────────────────────────────────────────────────────────────────
function chefMobileNav(nav, active) {
  return [
    { group: "THE DAILY WORK", items: [
      { id: "home",         icon: "file-text",     label: "Quotes",       count: 6, onClick: () => nav("tab-home"),
        sub: [
          { label: "Current quote", meta: DEMO.quoteNo, onClick: () => nav("receipt") },
          { label: "Quote history", meta: "6",          onClick: () => nav("tab-home") },
          { label: "Build new",     meta: "·",          onClick: () => nav("entry") },
        ] },
      { id: "menus",        icon: "notebook-text", label: "Menus",        count: 4, onClick: () => nav("menus") },
      { id: "order-guides", icon: "clipboard-list", label: "Order Guides", count: 5, onClick: () => nav("og") },
    ] },
    { group: "SOURCING", items: [
      { id: "distributors", icon: "truck", label: "Distributors", count: (typeof YOUR_DISTRIBUTORS !== "undefined" ? YOUR_DISTRIBUTORS.length : 3), onClick: () => nav("tab-distributors") },
    ] },
  ];
}

function ChefMobileShell({ active = "home", nav = noopNav, restaurant = DEMO.restaurant, trust = null, children }) {
  return (
    <NewspaperMobileShell
      edition="Chef Edition"
      identity={restaurant ? {
        eyebrow: "CURRENTLY VIEWING",
        title: restaurant,
        sub: DEMO.restaurantCity,
        meta: `${DEMO.chefFirst} ${DEMO.chefLast}`,
        initials: `${DEMO.chefFirst[0]}${DEMO.chefLast[0]}`,
      } : { initials: `${DEMO.chefFirst[0]}${DEMO.chefLast[0]}` }}
      nav={chefMobileNav(nav, active)}
      active={active}
      settings={{ id: "settings", icon: "settings", label: "Settings", onClick: () => nav("tab-settings"),
        sub: [
          { label: "You",        onClick: () => nav("tab-settings") },
          { label: "Restaurant", onClick: () => nav("tab-settings") },
          { label: "Billing",    onClick: () => nav("tab-settings") },
        ] }}
      trust={trust}
    >
      {children}
    </NewspaperMobileShell>
  );
}

// ChefTabBar — mobile bottom tab strip.
// Three destinations: Quotes / Distributors / Settings. Active tab gets the
// charcoal underscore + serif weight; inactive sit as sans-medium ink-soft.
// No icons-only treatment — labels are short enough to read clean.
// ─────────────────────────────────────────────────────────────────────────────
function ChefTabBar({ active = "home", nav = noopNav }) {
  const wrapRef = React.useRef(null);
  const [hidden, setHidden] = React.useState(false);

  // Hide on scroll-down, reveal on scroll-up. Finds the nearest .scroller
  // inside the same PhoneShell screen and listens to its scroll events.
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const screen = el.closest(".screen");
    const scroller = screen ? screen.querySelector(".scroller") : null;
    if (!scroller) return;
    let lastY = scroller.scrollTop;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = scroller.scrollTop;
        const dy = y - lastY;
        if (Math.abs(dy) >= 6) {
          if (dy > 0 && y > 24) setHidden(true);
          else if (dy < 0) setHidden(false);
          lastY = y;
        }
        ticking = false;
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  const tabs = [
    { id: "home",         label: "Quotes",        target: "tab-home" },
    { id: "distributors", label: "Distributors",  target: "tab-distributors" },
    { id: "settings",     label: "Settings",      target: "tab-settings" },
    { id: "build",        label: "Build Quote",   target: "entry", isAction: true },
  ];
  return (
    <div
      ref={wrapRef}
      className="border-t hairline bg-white flex items-stretch"
      style={{
        flex: "0 0 56px",
        paddingBottom: 12, /* clears home indicator */
        transform: hidden ? "translateY(120%)" : "translateY(0)",
        transition: "transform 240ms ease",
        willChange: "transform",
      }}
    >
      {tabs.map((t) => {
        if (t.isAction) {
          return (
            <button
              key={t.id}
              onClick={() => nav(t.target)}
              className="flex-1 flex items-center justify-center"
              style={{ paddingLeft: 6, paddingRight: 8 }}
            >
              <span
                className="sans"
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--qm-orange)",
                  border: "1.5px solid var(--qm-orange)",
                  background: "transparent",
                  borderRadius: 999,
                  padding: "8px 14px",
                  lineHeight: 1,
                  letterSpacing: 0.1,
                  whiteSpace: "nowrap",
                }}
              >
                Build Quote
              </span>
            </button>
          );
        }
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => nav(t.target)}
            className="flex-1 flex flex-col items-center justify-center gap-1"
            style={{ position: "relative" }}
          >
            <span
              className={cls(on ? "serif" : "sans")}
              style={{
                fontSize: on ? 14 : 13,
                fontWeight: on ? 600 : 500,
                color: on ? "var(--qm-charcoal)" : "var(--qm-gray-500)",
                letterSpacing: on ? 0 : 0.1,
                lineHeight: 1,
              }}
            >
              {t.label}
            </span>
            {on && (
              <span
                style={{
                  position: "absolute", top: 4, height: 2, width: 22,
                  background: "var(--qm-charcoal)", borderRadius: 1,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Desktop tab strip — sits under DesktopTopBar.
function ChefTabStripDesktop({ active = "home", nav = noopNav }) {
  const tabs = [
    { id: "home",         label: "Quotes",       target: "tab-home" },
    { id: "distributors", label: "Distributors", target: "tab-distributors" },
    { id: "settings",     label: "Settings",     target: "tab-settings" },
  ];
  return (
    <div className="border-b hairline bg-white px-8 flex items-end gap-6" style={{ height: 52 }}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => nav(t.target)}
            className={cls("pb-3 transition-colors")}
            style={{
              fontFamily: on ? "var(--qm-serif)" : "var(--qm-sans)",
              fontSize: on ? 16 : 14,
              fontWeight: on ? 600 : 500,
              color: on ? "var(--qm-charcoal)" : "var(--qm-gray-500)",
              borderBottom: on ? "2px solid var(--qm-charcoal)" : "2px solid transparent",
              lineHeight: 1,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge for catalogs — used across Distributors tab.
// Three-state per Opus c11 (May 18): Connected / Uploaded / Unaffiliated.
// (`pending` collapsed into `uploaded`; `demo` lives in TrustRibbon, not here.)
// ─────────────────────────────────────────────────────────────────────────────
function CatalogStatusBadge({ status, withText = false }) {
  const map = {
    connected:    { label: "Connected",    bg: "rgba(127,174,194,.22)",      fg: "#2A5F6F",            dot: "var(--qm-hover-blue)" },
    uploaded:     { label: "Uploaded",     bg: "#F3F4F6",                    fg: "var(--qm-gray-700)", dot: "var(--qm-charcoal)"   },
    unaffiliated: { label: withText ? "Unaffiliated · no rep yet on QuoteMe" : "Unaffiliated",
                                            bg: "#FFF9F3",                    fg: "var(--qm-gray-700)", dot: "var(--qm-warning)"    },
  };
  const m = map[status] || map.connected;
  return (
    <span className="qm-pill" style={{
      background: m.bg, color: m.fg,
      border: status === "unaffiliated" ? "1px solid var(--qm-soft-line)" : "none",
      fontSize: 10, padding: "2px 8px", gap: 5,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: m.dot }} />
      {m.label}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 1.  HOME TAB — brand-new chef from rep email.
//     Per Desi brief Part 6.6:
//       current quote prominent · previous quotes · Build another quote CTA
//       · restaurant info · rep contact · empty state.
//     "Brand-new" = arrived from rep email, has exactly ONE quote (the one
//     in the email), no history yet.
// ═════════════════════════════════════════════════════════════════════════════
function ChefHomeTab({ state = "first-quote", nav = noopNav }) {
  const empty = state === "empty";
  const brandNew = state === "first-quote"; // arrived from rep email, 1 quote
  // Opus c11 lock (May 18) Q9: quote counter visible on Home, above Previous Quotes.
  // Lifetime usage (5 free, V3 Part 7). Brand-new = 1 used (the rep email quote).
  const quotesUsed = brandNew ? 1 : 1 + PREVIOUS_QUOTES.length;
  const QUOTE_LIMIT = 5;

  return (
    <ChefMobileShell
      active="home"
      nav={nav}
      restaurant={empty ? null : DEMO.restaurant}
      trust={!empty && (
        <TrustRibbon
          kind="connected"
          catalog={DEMO.catalog}
          distributor={DEMO.distributor}
          updated={DEMO.catalogUpdated}
          compact
        />
      )}
    >
      <div className="px-5 pt-5 pb-6">
        {/* Greeting — operational, day-aware */}
        <div>
          <div className="serif font-semibold ink" style={{ fontSize: 24, lineHeight: 1.15 }}>
            {empty ? "Let's build your first quote." : `Hi, ${DEMO.chefFirst}.`}
          </div>
          {empty ? (
            <p className="mt-2 text-[13px] ink-soft leading-relaxed" style={{ maxWidth: 320 }}>
              Paste your menu, upload it, or type a concept. We'll match it to a catalog and price it.
            </p>
          ) : (
            <p className="mt-1 text-[12.5px] ink-faint">{DEMO.quoteDate} · {DEMO.restaurantCity}</p>
          )}
        </div>

        {/* PRIMARY: current quote OR empty-state CTA */}
        {empty ? (
          <div className="mt-5">
            <button onClick={() => nav("entry")} className="qm-btn qm-btn-orange qm-btn-full" style={{ padding: "16px 20px", fontSize: 16 }}>
              Build a quote <Icon name="arrow-right" size={18} color="white" />
            </button>
            <div className="mt-2 text-[11.5px] ink-faint text-center">Takes about a minute.</div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>CURRENT QUOTE</div>
            <button onClick={() => nav("receipt")} className="mt-2 w-full text-left bg-white border hairline rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <div className="serif text-[16px] font-medium ink">{DEMO.quoteNo}</div>
                  <PreviewPill />
                </div>
                <div className="num text-[14px] ink font-medium">{money(QUOTE_TOTAL)}</div>
              </div>
              <div className="text-[12px] ink-soft mt-0.5">
                {DEMO.distributorShort} · {QUOTE.reduce((s, c) => s + c.items.length, 0)} items · sent by {DEMO.rep} · {DEMO.quoteDate}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <QuoteStatusPill status="opened" />
                <span className="text-[11px] ink-faint">Tap to review</span>
                <Icon name="arrow-right" size={14} color="var(--qm-gray-400)" className="ml-auto" />
              </div>
            </button>
            <div className="mt-2 text-[10.5px] ink-faint leading-snug">
              Your rep reviews and confirms the draft before anything is finalized.
            </div>
          </div>
        )}

        {/* Build another quote — quieter on mobile so the rep quote stays the obvious next action */}
        {!empty && (
          <button onClick={() => nav("entry")} className="mt-3 qm-btn qm-btn-outline qm-btn-full">
            <Icon name="plus" size={16} /> Build another quote
          </button>
        )}

        {/* PREVIOUS QUOTES */}
        {!empty && (
          <div className="mt-6">
            {/* Quote counter — Opus c11 lock (May 18) Q9. Small, above the section.
                Count gets a thin orange outline so it reads at a glance without
                shifting the surrounding sentence color (still ink-faint). */}
            <div className="text-[11px] ink-faint num leading-snug">
              <QuoteCountPill>{quotesUsed} of {QUOTE_LIMIT} exploratory quotes used</QuoteCountPill>
            </div>
            <div className="qm-eyebrow flex items-baseline justify-between mt-1.5" style={{ fontSize: 10 }}>
              <span>PREVIOUS QUOTES</span>
              {!brandNew && (
                <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>
                  {PREVIOUS_QUOTES.length}
                </span>
              )}
            </div>
            <div className="mt-2 doc-divider-thick" />

            {brandNew ? (
              <div className="py-5 text-[12.5px] ink-faint leading-relaxed">
                None yet. Build another and it shows up here, next to {DEMO.quoteNo}.
              </div>
            ) : (
              PREVIOUS_QUOTES.map((q, i) => (
                <div key={i} className="doc-divider py-3">
                  <button onClick={() => nav("quote-readonly")} className="w-full text-left flex items-baseline gap-2 hover:opacity-80">
                    <div className="text-[13.5px] ink leading-snug truncate flex-1">{q.label}</div>
                    {q.preview && <PreviewPill size="xs" />}
                  </button>
                  <div className="text-[11.5px] ink-faint num mt-0.5 leading-snug">
                    {q.id} · {q.distributor} · {q.date} · {q.items} items · {money(q.total)}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <QuoteStatusPill status={q.status} />
                    {q.stale && <RefreshAvailablePill />}
                    <button onClick={() => nav("entry")} className="text-[11.5px] ink-soft inline-flex items-center gap-1 hover:ink ml-auto">
                      <Icon name="copy" size={12} /> Build another like this
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* RESTAURANT + REP — two cards side-by-side, document weight */}
        {!empty && (
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="bg-white border hairline rounded-lg p-3.5">
              <div className="qm-eyebrow" style={{ fontSize: 9 }}>RESTAURANT</div>
              <div className="text-[13px] ink mt-1 leading-snug">{DEMO.restaurant}</div>
              <div className="text-[11.5px] ink-faint mt-0.5">{DEMO.restaurantCity}</div>
            <button onClick={() => nav("tab-settings")} className="mt-2 inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-50" title="Edit restaurant" aria-label="Edit restaurant">
              <Icon name="pencil" size={13} color="var(--qm-gray-700)" />
            </button>
            </div>
            <div className="bg-white border hairline rounded-lg p-3.5">
              <div className="qm-eyebrow" style={{ fontSize: 9 }}>YOUR REP</div>
              <div className="text-[13px] ink mt-1 leading-snug">{DEMO.rep}</div>
              <div className="text-[11.5px] ink-faint mt-0.5 num">{DEMO.repPhone}</div>
              <a href={`mailto:${DEMO.repEmail}`} className="text-[11.5px] underline ink-soft mt-2 inline-block">Message</a>
            </div>
          </div>
        )}

        {/* Canonical trust line */}
        {!empty && (
          <div className="mt-6 pt-4 text-[10.5px] ink-faint leading-relaxed" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
            QuoteMe helps organize distributor access. It does not redirect relationships.
          </div>
        )}
      </div>

    </ChefMobileShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2.  DISTRIBUTORS TAB
//     Two sections per Part 6.7:
//       1) Your distributors — those that have sent a quote, or that the chef
//          has pulled a quote from. Row: name, rep + contact, last quote,
//          catalog status badge.
//       2) Catalogs servicing Hudson, NY — verified catalog coverage. Unaffiliated
//          distributors get a visible flag.
//     No ranking, no comparison, no marketplace framing.
// ═════════════════════════════════════════════════════════════════════════════
function ChefDistributorsTab({ state = "with-data", nav = noopNav }) {
  const empty = state === "empty";
  // Opus c11 lock (May 18) Q4: confirmation modal before routing a chef to /chef/entry
  // with a Section-2 distributor pre-selected.
  const [modalDist, setModalDist] = useState(null);

  return (
    <ChefMobileShell active="distributors" nav={nav}>
      <div className="px-5 pt-5 pb-6">
        <div>
          <div className="serif font-semibold ink" style={{ fontSize: 24, lineHeight: 1.15 }}>
            Distributors
          </div>
          <p className="mt-1 text-[12.5px] ink-faint">
            Who you've quoted with, and who else is servicing {DEMO.restaurantCity}.
          </p>
        </div>

        {/* SECTION 1 · YOUR DISTRIBUTORS */}
        <div className="mt-6">
          <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
            <span>YOUR DISTRIBUTORS</span>
            {!empty && (
              <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>
                {YOUR_DISTRIBUTORS.length}
              </span>
            )}
          </div>
          <div className="mt-2 doc-divider-thick" />

          {empty ? (
            <div className="py-5">
              <div className="text-[13px] ink leading-snug">
                None yet.
              </div>
              <div className="text-[12px] ink-faint mt-1 leading-snug">
                Distributors show up here once you've gotten a quote from one. Ask your rep
                to send one through, or upload a price list to get going.
              </div>
              <button onClick={() => nav("catalog-upload")} className="qm-btn qm-btn-outline mt-3" style={{ padding: "8px 14px", fontSize: 12.5 }}>
                <Icon name="upload" size={14} /> Upload a price list
              </button>
            </div>
          ) : (
            YOUR_DISTRIBUTORS.map((d, i) => (
              <div key={i} className="doc-divider py-3.5">
                {/* Title row: distributor + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="serif text-[15px] font-medium ink leading-snug">{d.short}</div>
                    <div className="text-[11.5px] ink-faint leading-snug">{d.name}</div>
                  </div>
                  <CatalogStatusBadge status={d.status} />
                </div>
                {/* Rep + last quote */}
                <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
                  <div className="min-w-0">
                    <div className="qm-eyebrow" style={{ fontSize: 9 }}>REP</div>
                    <div className="text-[12.5px] ink mt-0.5 leading-snug">{d.rep}</div>
                    <div className="text-[11.5px] ink-faint num leading-snug">{d.repPhone}</div>
                    {d.repEmail && (
                      <a href={`mailto:${d.repEmail}`} className="text-[11.5px] underline ink-soft leading-snug">
                        {d.repEmail}
                      </a>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="qm-eyebrow" style={{ fontSize: 9 }}>LAST QUOTE</div>
                    <div className="text-[12.5px] ink mt-0.5 num leading-snug">{d.lastQuote}</div>
                    <div className="text-[11px] ink-faint num leading-snug">{d.quoteCount} total</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* SECTION 2 · CATALOGS SERVICING HUDSON, NY */}
        <div className="mt-7">
          <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
            <span>CATALOGS SERVICING HUDSON, NY</span>
            <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>
              {AREA_DISTRIBUTORS.length}
            </span>
          </div>
          <div className="mt-1 text-[11.5px] ink-faint leading-snug" style={{ maxWidth: 320 }}>
            Verified catalogs currently servicing Hudson, NY.
            Order shown by recency of catalog update, not by ranking.
          </div>
          <div className="mt-2 doc-divider-thick" />

          {AREA_DISTRIBUTORS.map((d, i) => (
            <div key={i} className="doc-divider py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] ink leading-snug">{d.short}</div>
                  <div className="text-[11.5px] ink-faint leading-snug">{d.name}</div>
                  <div className="text-[11px] ink-faint num leading-snug mt-0.5">
                    {d.scope} · {d.items} items · updated {d.updated}
                  </div>
                </div>
                {!d.affiliated && <CatalogStatusBadge status="unaffiliated" />}
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[11.5px]">
                <button onClick={() => setModalDist(d)} className="ink-soft underline">Use for a quote</button>
                {!d.affiliated && (
                  <span className="ink-faint leading-snug" style={{ flex: 1 }}>
                    · No rep yet on QuoteMe.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Operational footnote */}
        <div className="mt-7 flex items-start gap-3 text-[11.5px] ink-soft" style={{ borderTop: "1px solid var(--qm-soft-line)", paddingTop: 12 }}>
          <Icon name="map-pin" size={14} color="var(--qm-hover-blue)" />
          <div>
            Area set by your restaurant address. Update it in Settings to change what shows here.
          </div>
        </div>

        {/* Paid-tier multi-distributor send — Opus c11 lock (May 18) Q1.
            Surfaces what was previously a Discovery tab as an in-context action, never as a
            separate destination. Reads as an additive capability, not a paywall. */}
        <div className="mt-5 px-3.5 py-3.5 rounded-md" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>WITH PAID</div>
          <div className="serif font-medium ink mt-1" style={{ fontSize: 14, lineHeight: 1.3 }}>
            Send this menu to another distributor.
          </div>
          <p className="mt-1 text-[11.5px] ink-soft leading-relaxed">
            Request a quote from any distributor servicing {DEMO.restaurantCity}. Each response
            stays a separate quote thread, attached to its own distributor.
          </p>
          <button onClick={() => nav("tab-settings")} className="mt-2.5 text-[11.5px] ink-soft underline inline-flex items-center gap-1">
            See paid · $50/mo <Icon name="arrow-right" size={12} />
          </button>
        </div>
      </div>

      <UseDistributorForQuoteModal
        distributor={modalDist}
        onClose={() => setModalDist(null)}
        onContinue={() => { const d = modalDist; setModalDist(null); nav("pull-entry", { distributor: d }); }}
      />
    </ChefMobileShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3.  SETTINGS TAB
//     V1 scope per Part 6.7:
//       Contact info · Restaurant logo upload · Add chefs to restaurant
//       (magic-link invite) · Add new restaurant location · Payment info
//       (Stripe — paid tier upgrade).
//     "Stays calm and operational, no SaaS settings-page feel."
//     Pattern: every section is a paper card with a thick top rule + serif
//     eyebrow. Inline edit affordances (underlined). Save action lives per
//     section, not a single page-level Save (operational doc feel).
// ═════════════════════════════════════════════════════════════════════════════
function ChefSettingsTab({ state = "with-data", nav = noopNav }) {
  const empty = state === "empty";

  return (
    <ChefMobileShell active="settings" nav={nav}>
      <div className="px-5 pt-5 pb-6">
        <div>
          <div className="serif font-semibold ink" style={{ fontSize: 24, lineHeight: 1.15 }}>
            Settings
          </div>
          <p className="mt-1 text-[12.5px] ink-faint">
            Your details, your kitchen, the people in it.
          </p>
        </div>

        {/* YOU */}
        <SettingsSection title="YOU">
          <SettingRow label="Name"  value={empty ? "—" : `${DEMO.chefFirst} ${DEMO.chefLast}`} />
          <SettingRow label="Email" value={DEMO.chefEmail} />
          <SettingRow label="Phone" value={empty ? "Add a number" : "(518) 555-0188"} placeholder={empty} />
        </SettingsSection>

        {/* RESTAURANT */}
        <SettingsSection title="RESTAURANT">
          <div className="py-3 flex items-center gap-3">
            <div
              className="shrink-0 rounded-md flex items-center justify-center"
              style={{
                width: 56, height: 56,
                background: empty ? "var(--qm-warm-paper)" : "#1F1A14",
                border: "1px solid var(--qm-soft-line)",
                color: empty ? "var(--qm-gray-500)" : "#FBFAF7",
              }}
            >
              {empty ? (
                <Icon name="image-plus" size={20} color="var(--qm-gray-500)" />
              ) : (
                <span className="serif font-semibold" style={{ fontSize: 18, letterSpacing: 0.4 }}>H&amp;S</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] ink leading-snug">{empty ? "Add a logo" : "Logo"}</div>
              <div className="text-[11.5px] ink-faint leading-snug">
                {empty
                  ? "Square PNG or JPG. Shows on your order guides."
                  : "Shows on your order guide header and emails."}
              </div>
              <button className="text-[11.5px] underline ink-soft mt-1">
                {empty ? "Upload" : "Replace"}
              </button>
            </div>
          </div>
          <SettingRow label="Name"    value={empty ? "Holloway & Sons" : DEMO.restaurant} />
          <SettingRow label="Address" value={empty ? "Add address" : "412 Warren St, Hudson, NY 12534"} placeholder={empty} />
          <SettingRow label="Phone"   value={empty ? "Add a number" : "(518) 555-0140"} placeholder={empty} />
        </SettingsSection>

        {/* OTHER CHEFS — magic-link invite, no passwords */}
        <SettingsSection title="OTHER CHEFS HERE" count={empty ? 0 : TEAM_CHEFS.length}>
          {empty ? (
            <div className="py-3 text-[12.5px] ink-faint leading-snug">
              Just you for now. Invite the kitchen and quotes are shared automatically.
            </div>
          ) : (
            TEAM_CHEFS.map((c, i) => (
              <div key={i} className="doc-divider py-3 flex items-start gap-3">
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: c.status === "active" ? "var(--qm-light-blue)" : "var(--qm-warm-paper)",
                    border: c.status === "active" ? "none" : "1px dashed var(--qm-soft-line)",
                  }}
                >
                  <span className="serif text-[11px] font-semibold ink">
                    {c.name.split(" ").map(s => s[0]).join("")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <div className="text-[13px] ink leading-snug">{c.name}</div>
                    {c.status === "invited" && (
                      <span className="qm-pill" style={{ background: "#FEF3C7", color: "#92400E", fontSize: 9.5, padding: "1px 7px" }}>
                        Invite sent
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] ink-faint leading-snug">{c.email}</div>
                  <div className="text-[11px] ink-faint mt-0.5 leading-snug">
                    {c.role}
                    {c.joined && <span> · joined {c.joined}</span>}
                  </div>
                </div>
                <button className="text-[11.5px] ink-soft underline shrink-0">
                  {c.status === "invited" ? "Resend" : "Remove"}
                </button>
              </div>
            ))
          )}
          <button className="qm-btn qm-btn-outline mt-3" style={{ padding: "8px 14px", fontSize: 12.5 }}>
            <Icon name="user-plus" size={14} /> Invite a chef
          </button>
          <div className="text-[10.5px] ink-faint mt-2 leading-snug">
            We send a one-tap link. No password, no account setup on their end.
          </div>
        </SettingsSection>

        {/* OTHER LOCATIONS */}
        <SettingsSection title="OTHER LOCATIONS" count={empty ? 0 : LOCATIONS.length - 1}>
          {empty ? (
            <div className="py-3 text-[12.5px] ink-faint leading-snug">
              {DEMO.restaurant} is your only kitchen right now.
            </div>
          ) : (
            LOCATIONS.filter(l => !l.current).map((l, i) => (
              <div key={i} className="doc-divider py-3 flex items-start gap-3">
                <Icon name="store" size={16} color="var(--qm-gray-700)" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] ink leading-snug">{l.name}</div>
                  <div className="text-[11.5px] ink-faint leading-snug">{l.city} · {l.role}</div>
                </div>
                <button className="text-[11.5px] ink-soft underline shrink-0">Switch to</button>
              </div>
            ))
          )}
          <button className="qm-btn qm-btn-outline mt-3" style={{ padding: "8px 14px", fontSize: 12.5 }}>
            <Icon name="plus" size={14} /> Add another restaurant
          </button>
          <div className="text-[10.5px] ink-faint mt-2 leading-snug">
            Quotes, rep contacts, and order guides stay separate per location.
          </div>
        </SettingsSection>

        {/* DISTRIBUTOR FOLLOW-UPS — V3 Part 9 (locked copy). Single binary preference.
            Anchors the chef-distributor relationship to existing selections, never opens it
            up to algorithmic targeting. Opus c11 lock (May 18) Q8: own section, before BILLING. */}
        <SettingsSection title="DISTRIBUTOR FOLLOW-UPS">
          <DistributorFollowupRow defaultValue={empty ? "allow" : "allow"} />
        </SettingsSection>

        {/* BILLING — last per Justin's operational hierarchy (money lives at the bottom of the doc) */}
        <SettingsSection title="BILLING">
          <div className="py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <div className="serif text-[15px] font-medium ink">{empty ? "Free" : "Free"}</div>
                <span className="qm-pill" style={{ background: "#F3F4F6", color: "var(--qm-gray-700)", fontSize: 10, padding: "2px 8px" }}>
                  Current
                </span>
              </div>
              <div className="text-[11.5px] ink-faint num mt-1">
                <QuoteCountPill>
                  {empty ? "0 of 5 quotes used" : "3 of 5 quotes used · 2 left"}
                </QuoteCountPill>
              </div>
            </div>
            {!empty && (
              <button className="qm-btn qm-btn-orange" style={{ padding: "8px 14px", fontSize: 12.5 }}>
                Add payment
              </button>
            )}
          </div>

          {/* Paid tier explainer — no marketing voice, just what it does */}
          <div className="doc-divider pt-3 pb-1">
            <div className="text-[12.5px] ink leading-snug">
              <span className="serif font-medium">$50/mo</span> · unlimited quotes, plus the ability
              to send one menu to several distributors at once.
            </div>
            <div className="text-[11px] ink-faint mt-1 leading-snug">
              Card on file via Stripe. Cancel from here any month.
            </div>
          </div>

          <div className="pt-3 mt-1 text-[11px] ink-faint leading-snug">
            Need a different setup, or invoicing for a group? Email{" "}
            <a href="mailto:billing@quoteme.food" className="underline ink-soft">billing@quoteme.food</a>.
          </div>
        </SettingsSection>

        {/* Sign out — quiet, bottom of the page */}
        <div className="mt-7 pt-4 flex items-center justify-between" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
          <div className="text-[11.5px] ink-faint">Signed in as {DEMO.chefEmail}</div>
          <button className="text-[11.5px] ink-soft underline">Sign out</button>
        </div>
      </div>

    </ChefMobileShell>
  );
}

// Settings primitives — paper-card section with serif eyebrow and thick rule.
function SettingsSection({ title, count, children }) {
  return (
    <div className="mt-6">
      <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
        <span>{title}</span>
        {typeof count === "number" && (
          <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>
            {count}
          </span>
        )}
      </div>
      <div className="mt-2 doc-divider-thick" />
      {children}
    </div>
  );
}

function SettingRow({ label, value, placeholder = false }) {
  return (
    <div className="doc-divider py-3 flex items-baseline justify-between gap-3">
      <div className="qm-eyebrow shrink-0" style={{ fontSize: 9.5, width: 64, paddingTop: 2 }}>{label}</div>
      <div className="flex-1 min-w-0">
        <div className={cls("text-[13px] leading-snug", placeholder ? "ink-faint" : "ink")}>{value}</div>
      </div>
      <button className="text-[11.5px] ink-soft underline shrink-0">
        Edit
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DistributorFollowupRow — V3 Part 9 (locked).
// Single binary preference. Locked copy must NOT be modified:
//   "Allow your selected distributors to follow up on quotes tied to your menus?"
//   Options: Allow / Do not allow
// Segmented control over a free-form switch — the two options are operationally
// distinct enough that a binary toggle's on/off framing reads wrong.
// ─────────────────────────────────────────────────────────────────────────────
function DistributorFollowupRow({ defaultValue = "allow", desktop = false }) {
  const [value, setValue] = useState(defaultValue);
  const px = desktop ? "py-4" : "py-3.5";
  const titleSize = desktop ? "text-[13.5px]" : "text-[13px]";
  const bodySize  = desktop ? "text-[12px]"   : "text-[11.5px]";

  return (
    <div className={cls(px, "flex flex-col gap-3")}>
      <div>
        <div className={cls(titleSize, "ink leading-snug")}>
          Allow your selected distributors to follow up on quotes tied to your menus?
        </div>
        <div className={cls(bodySize, "ink-faint leading-snug mt-1")}>
          Applies only to distributors you've already quoted with. Never opens you up to
          outreach from distributors you haven't selected.
        </div>
      </div>

      <div
        className="inline-flex rounded-md self-start"
        role="radiogroup"
        aria-label="Distributor follow-ups preference"
        style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)", padding: 3 }}
      >
        {[
          { v: "allow",    label: "Allow" },
          { v: "disallow", label: "Do not allow" },
        ].map(opt => {
          const on = value === opt.v;
          return (
            <button
              key={opt.v}
              role="radio"
              aria-checked={on}
              onClick={() => setValue(opt.v)}
              className="px-3 py-1.5 rounded-[5px] transition-colors"
              style={{
                background: on ? "#fff" : "transparent",
                color: on ? "var(--qm-charcoal)" : "var(--qm-gray-500)",
                fontFamily: on ? "var(--qm-serif)" : "var(--qm-sans)",
                fontSize: desktop ? 12.5 : 12,
                fontWeight: on ? 500 : 500,
                boxShadow: on ? "0 1px 2px rgba(43,43,43,.06)" : "none",
                lineHeight: 1.2,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DESKTOP DERIVATIVES
// Every desktop tab sits inside the Newspaper sidebar (May 18 Desi lock —
// the sidebar is the canonical chef-facing desktop chrome; there is no top-
// tab strip, no separate DesktopTopBar). Per V3 Part 6.7 the sidebar carries
// Quotes / Distributors / Settings as the three named destinations a free-
// tier chef ever sees; Order Guides / Restaurants / Correspondence are
// secondary surfaces inside those destinations.
// ═════════════════════════════════════════════════════════════════════════════

// Wraps content in the desktop frame with sidebar + restore-button affordances.
// `active` matches a NewspaperSidebar destination id ("home"|"distributors"|"settings").
// `initialMode` lets the gallery preview the three sidebar states (open|compact|hidden).
function ChefTabDesktopShell({ active, nav, children, showTrust = false, initialMode = "open" }) {
  const [mode, setMode] = useState(initialMode);
  const hidden = mode === "hidden";
  return (
    <div className="desktop" style={{ position: "relative" }}>
      <div className="flex" style={{ height: "100%" }}>
        {!hidden && (
          <NewspaperSidebar
            mode={mode}
            onModeChange={setMode}
            active={active}
            onNav={nav}
          />
        )}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
          {showTrust && (
            <TrustRibbon
              kind="connected"
              catalog={DEMO.catalog}
              distributor={DEMO.distributor}
              updated={DEMO.catalogUpdated}
            />
          )}
          <div className="flex-1 overflow-auto">
            <div className="px-10 py-9">
              <div style={{ maxWidth: 880 }}>{children}</div>
            </div>
          </div>
        </div>
        {hidden && <SidebarRestoreButton onShow={() => setMode("open")} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop · Home tab — brand-new chef arrival from rep email.
// ─────────────────────────────────────────────────────────────────────────────
function ChefHomeTabDesktop({ state = "first-quote", nav = noopNav, initialMode = "open" }) {
  const empty = state === "empty";
  const brandNew = state === "first-quote";
  // Opus c11 lock (May 18) Q9: quote counter line, lifetime usage, 5 free.
  const quotesUsed = brandNew ? 1 : 1 + PREVIOUS_QUOTES.length;
  const QUOTE_LIMIT = 5;

  return (
    <ChefTabDesktopShell active="home" nav={nav} showTrust={!empty} initialMode={initialMode}>
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: 36, lineHeight: 1.1 }}>
          {empty ? "Let's build your first quote." : `Hi, ${DEMO.chefFirst}.`}
        </h1>
        {empty ? (
          <p className="mt-2 text-[14px] ink-soft leading-relaxed" style={{ maxWidth: 520 }}>
            Paste your menu, upload it, or type a concept. We'll match it to a catalog and price it.
          </p>
        ) : (
          <p className="mt-1 text-[14px] ink-faint num">{DEMO.quoteDate} · {DEMO.restaurantCity}</p>
        )}
      </div>

      {empty ? (
        <div className="mt-6">
          <button onClick={() => nav("entry")} className="qm-btn qm-btn-orange" style={{ padding: "14px 22px", fontSize: 15 }}>
            Build a quote <Icon name="arrow-right" size={18} color="white" />
          </button>
          <div className="mt-2 text-[12px] ink-faint">Takes about a minute.</div>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-[1fr_280px] gap-8">
          {/* MAIN COLUMN */}
          <div>
            <div className="qm-eyebrow" style={{ fontSize: 11 }}>CURRENT QUOTE</div>
            <button onClick={() => nav("receipt")} className="mt-2 w-full text-left bg-white border hairline rounded-xl p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3 min-w-0">
                  <div className="serif text-[22px] font-medium ink">{DEMO.quoteNo}</div>
                  <PreviewPill />
                </div>
                <div className="num text-[20px] ink font-semibold">{money(QUOTE_TOTAL)}</div>
              </div>
              <div className="text-[13px] ink-soft mt-1">
                {DEMO.distributorShort} · {QUOTE.reduce((s, c) => s + c.items.length, 0)} items across {QUOTE.length} categories · sent by {DEMO.rep} · {DEMO.quoteDate}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <QuoteStatusPill status="opened" />
                <span className="text-[12px] ink-faint">Tap to review and build the order guide</span>
                <Icon name="arrow-right" size={16} color="var(--qm-gray-400)" className="ml-auto" />
              </div>
            </button>
            <div className="mt-2 text-[11.5px] ink-faint leading-snug">
              Your rep reviews and confirms the draft before anything is finalized.
            </div>

            <div className="mt-3">
              <button onClick={() => nav("entry")} className="qm-btn qm-btn-outline">
                <Icon name="plus" size={16} /> Build another quote
              </button>
            </div>

            <div className="mt-9">
              <div className="text-[11.5px] ink-faint num leading-snug">
                <QuoteCountPill>{quotesUsed} of {QUOTE_LIMIT} exploratory quotes used</QuoteCountPill>
              </div>
              <div className="qm-eyebrow flex items-baseline justify-between mt-1.5" style={{ fontSize: 11 }}>
                <span>PREVIOUS QUOTES</span>
                {!brandNew && (
                  <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>
                    {PREVIOUS_QUOTES.length}
                  </span>
                )}
              </div>
              <div className="mt-2 doc-divider-thick" />
              {brandNew ? (
                <div className="py-6 text-[13px] ink-faint leading-relaxed" style={{ maxWidth: 480 }}>
                  None yet. Build another quote, or wait on the next one from {DEMO.rep.split(" ")[0]}. They'll line up here, most recent first.
                </div>
              ) : (
                PREVIOUS_QUOTES.map((q, i) => (
                  <div key={i} className="doc-divider py-3 px-1 hover:bg-gray-50">
                    <div className="flex items-baseline justify-between gap-3">
                      <button onClick={() => nav("quote-readonly")} className="min-w-0 flex-1 text-left flex items-baseline gap-2">
                        <div className="text-[14px] ink truncate">{q.label}</div>
                        {q.preview && <PreviewPill size="xs" />}
                      </button>
                      <div className="flex items-center gap-2">
                        {q.stale && <RefreshAvailablePill size="xs" />}
                        <QuoteStatusPill status={q.status} />
                      </div>
                    </div>
                    <div className="text-[12px] ink-faint num mt-0.5 leading-snug">
                      {q.id} · {q.distributor} · {q.date} · {q.items} items · {money(q.total)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT RAIL */}
          <aside>
            <div className="bg-white border hairline rounded-xl p-5">
              <div className="qm-eyebrow" style={{ fontSize: 10 }}>RESTAURANT</div>
              <div className="serif text-[16px] font-medium ink mt-1">{DEMO.restaurant}</div>
              <div className="text-[12px] ink-faint">{DEMO.restaurantCity}</div>
              <button onClick={() => nav("tab-settings")} className="mt-2 inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-50" title="Edit restaurant" aria-label="Edit restaurant">
                <Icon name="pencil" size={13} color="var(--qm-gray-700)" />
              </button>

              <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
                <div className="qm-eyebrow" style={{ fontSize: 10 }}>YOUR REP</div>
                <div className="text-[14px] ink mt-1.5 leading-snug">{DEMO.rep}</div>
                <div className="text-[12px] ink-soft">{DEMO.distributorShort}</div>
                <div className="mt-2 text-[12.5px] ink num">{DEMO.repPhone}</div>
                <a href={`mailto:${DEMO.repEmail}`} className="text-[12.5px] ink-soft underline">{DEMO.repEmail}</a>
              </div>

              <div className="mt-5 pt-4 text-[11px] ink-faint leading-relaxed" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
                QuoteMe helps organize distributor access. It does not redirect relationships.
              </div>
            </div>
          </aside>
        </div>
      )}
    </ChefTabDesktopShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop · Distributors tab
// ─────────────────────────────────────────────────────────────────────────────
function ChefDistributorsTabDesktop({ state = "with-data", nav = noopNav, initialMode = "open" }) {
  const empty = state === "empty";
  // Opus c11 lock (May 18) Q4: same modal pattern as mobile.
  const [modalDist, setModalDist] = useState(null);

  return (
    <ChefTabDesktopShell active="distributors" nav={nav} initialMode={initialMode}>
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: 32, lineHeight: 1.15 }}>
          Distributors
        </h1>
        <p className="mt-1 text-[14px] ink-faint" style={{ maxWidth: 560 }}>
          Who you've quoted with, and who else is servicing {DEMO.restaurantCity}.
        </p>
      </div>

      {/* SECTION 1 */}
      <div className="mt-8">
        <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 11 }}>
          <span>YOUR DISTRIBUTORS</span>
          {!empty && (
            <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>
              {YOUR_DISTRIBUTORS.length}
            </span>
          )}
        </div>
        <div className="mt-2 doc-divider-thick" />

        {empty ? (
          <div className="py-6 text-[13px] ink-soft leading-relaxed" style={{ maxWidth: 560 }}>
            None yet. Distributors show up here once you've gotten a quote from one. Ask your rep
            to send one through, or upload a price list to get going.
          </div>
        ) : (
          <table className="w-full" style={{ fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr className="doc-divider">
                <th className="qm-eyebrow text-left pb-2 pt-2" style={{ fontSize: 10, width: "30%" }}>Distributor</th>
                <th className="qm-eyebrow text-left pb-2 pt-2" style={{ fontSize: 10, width: "32%" }}>Rep</th>
                <th className="qm-eyebrow text-left pb-2 pt-2" style={{ fontSize: 10, width: "18%" }}>Last quote</th>
                <th className="qm-eyebrow text-left pb-2 pt-2" style={{ fontSize: 10, width: "20%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {YOUR_DISTRIBUTORS.map((d, i) => (
                <tr key={i} className="doc-divider align-top hover:bg-gray-50">
                  <td className="py-3.5 pr-3">
                    <div className="serif text-[15px] font-medium ink leading-snug">{d.short}</div>
                    <div className="text-[11.5px] ink-faint leading-snug">{d.name}</div>
                  </td>
                  <td className="py-3.5 pr-3">
                    <div className="text-[13px] ink leading-snug">{d.rep}</div>
                    <div className="text-[11.5px] ink-faint num leading-snug">{d.repPhone}</div>
                    {d.repEmail && (
                      <a href={`mailto:${d.repEmail}`} className="text-[11.5px] underline ink-soft leading-snug">
                        {d.repEmail}
                      </a>
                    )}
                  </td>
                  <td className="py-3.5 pr-3">
                    <div className="text-[13px] ink num leading-snug">{d.lastQuote}</div>
                    <div className="text-[11.5px] ink-faint num leading-snug">{d.quoteCount} total</div>
                  </td>
                  <td className="py-3.5"><CatalogStatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* SECTION 2 */}
      <div className="mt-10">
        <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 11 }}>
          <span>CATALOGS SERVICING HUDSON, NY</span>
          <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>
            {AREA_DISTRIBUTORS.length}
          </span>
        </div>
        <div className="mt-1 text-[12px] ink-faint leading-snug" style={{ maxWidth: 560 }}>
          Verified catalogs currently servicing Hudson, NY.
          Order shown by recency of catalog update, not by ranking.
        </div>
        <div className="mt-2 doc-divider-thick" />
        <table className="w-full" style={{ fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr className="doc-divider">
              <th className="qm-eyebrow text-left pb-2 pt-2" style={{ fontSize: 10, width: "32%" }}>Distributor</th>
              <th className="qm-eyebrow text-left pb-2 pt-2" style={{ fontSize: 10, width: "26%" }}>Area</th>
              <th className="qm-eyebrow text-left pb-2 pt-2" style={{ fontSize: 10, width: "14%" }}>Items</th>
              <th className="qm-eyebrow text-left pb-2 pt-2" style={{ fontSize: 10, width: "14%" }}>Updated</th>
              <th className="qm-eyebrow text-left pb-2 pt-2" style={{ fontSize: 10, width: "14%" }}></th>
            </tr>
          </thead>
          <tbody>
            {AREA_DISTRIBUTORS.map((d, i) => (
              <tr key={i} className="doc-divider align-top hover:bg-gray-50">
                <td className="py-3 pr-3">
                  <div className="text-[14px] ink leading-snug">{d.short}</div>
                  <div className="text-[11.5px] ink-faint leading-snug">{d.name}</div>
                  {!d.affiliated && (
                    <span className="mt-1 inline-flex">
                      <CatalogStatusBadge status="unaffiliated" withText />
                    </span>
                  )}
                </td>
                <td className="py-3 pr-3 text-[12.5px] ink-soft num leading-snug">{d.scope}</td>
                <td className="py-3 pr-3 text-[12.5px] ink num leading-snug">{d.items}</td>
                <td className="py-3 pr-3 text-[12.5px] ink-soft num leading-snug">{d.updated}</td>
                <td className="py-3">
                  <button onClick={() => setModalDist(d)} className="text-[12px] ink-soft underline">Use for a quote</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 pt-5 flex items-start gap-3 text-[12px] ink-soft" style={{ borderTop: "1px solid var(--qm-soft-line)", maxWidth: 560 }}>
        <Icon name="map-pin" size={14} color="var(--qm-hover-blue)" />
        <div>
          Area set by your restaurant address. Update it in Settings to change what shows here.
        </div>
      </div>

      {/* Paid multi-distributor send — Opus c11 lock (May 18) Q1. In-context action, never a tab. */}
      <div className="mt-7 px-6 py-5 rounded-xl" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)", maxWidth: 640 }}>
        <div className="qm-eyebrow" style={{ fontSize: 10 }}>WITH PAID</div>
        <div className="serif font-medium ink mt-1" style={{ fontSize: 17, lineHeight: 1.3 }}>
          Send this menu to another distributor.
        </div>
        <p className="mt-1.5 text-[12.5px] ink-soft leading-relaxed">
          Request a quote from any distributor servicing {DEMO.restaurantCity}. Each response stays a
          separate quote thread, attached to its own distributor.
        </p>
        <button onClick={() => nav("tab-settings")} className="mt-3 text-[12px] ink-soft underline inline-flex items-center gap-1">
          See paid · $50/mo <Icon name="arrow-right" size={12} />
        </button>
      </div>

      <UseDistributorForQuoteModal
        distributor={modalDist}
        onClose={() => setModalDist(null)}
        onContinue={() => { const d = modalDist; setModalDist(null); nav("pull-entry", { distributor: d }); }}
        variant="desktop"
      />
    </ChefTabDesktopShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop · Settings tab — two-column layout (nav rail left, content right).
// Sections same as mobile; the left rail is anchor-style nav per section.
// ─────────────────────────────────────────────────────────────────────────────
function ChefSettingsTabDesktop({ state = "with-data", nav = noopNav, initialMode = "open" }) {
  const empty = state === "empty";

  return (
    <ChefTabDesktopShell active="settings" nav={nav} initialMode={initialMode}>
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: 32, lineHeight: 1.15 }}>
          Settings
        </h1>
        <p className="mt-1 text-[14px] ink-faint">
          Your details, your kitchen, the people in it.
        </p>
      </div>

      <div className="mt-7">
        {/* Sections — single column. The sidebar carries Settings sub-nav, so no
           in-content anchor rail; section eyebrows are enough document signposting. */}
        <div>
          {/* YOU */}
          <section id="you">
            <div className="qm-eyebrow" style={{ fontSize: 11 }}>YOU</div>
            <div className="mt-2 doc-divider-thick" />
            <div className="grid grid-cols-[120px_1fr_auto] items-baseline gap-x-4">
              <DesktopSettingRow label="Name"  value={empty ? "—" : `${DEMO.chefFirst} ${DEMO.chefLast}`} placeholder={empty} />
              <DesktopSettingRow label="Email" value={DEMO.chefEmail} />
              <DesktopSettingRow label="Phone" value={empty ? "Add a number" : "(518) 555-0188"} placeholder={empty} />
            </div>
          </section>

          {/* RESTAURANT */}
          <section id="kitchen" className="mt-10">
            <div className="qm-eyebrow" style={{ fontSize: 11 }}>RESTAURANT</div>
            <div className="mt-2 doc-divider-thick" />
            <div className="py-4 flex items-center gap-4">
              <div
                className="shrink-0 rounded-md flex items-center justify-center"
                style={{
                  width: 72, height: 72,
                  background: empty ? "var(--qm-warm-paper)" : "#1F1A14",
                  border: "1px solid var(--qm-soft-line)",
                  color: empty ? "var(--qm-gray-500)" : "#FBFAF7",
                }}
              >
                {empty ? (
                  <Icon name="image-plus" size={22} color="var(--qm-gray-500)" />
                ) : (
                  <span className="serif font-semibold" style={{ fontSize: 22, letterSpacing: 0.4 }}>H&amp;S</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] ink leading-snug">{empty ? "Add a logo" : "Logo"}</div>
                <div className="text-[12px] ink-faint leading-snug">
                  Square PNG or JPG, up to 2 MB. Shows on your order guide header and emails.
                </div>
                <button className="text-[12px] underline ink-soft mt-1">{empty ? "Upload" : "Replace"}</button>
              </div>
            </div>
            <div className="grid grid-cols-[120px_1fr_auto] items-baseline gap-x-4">
              <DesktopSettingRow label="Name"    value={empty ? "Holloway & Sons" : DEMO.restaurant} />
              <DesktopSettingRow label="Address" value={empty ? "Add address" : "412 Warren St, Hudson, NY 12534"} placeholder={empty} />
              <DesktopSettingRow label="Phone"   value={empty ? "Add a number" : "(518) 555-0140"} placeholder={empty} />
            </div>
          </section>

          {/* OTHER CHEFS */}
          <section id="team" className="mt-10">
            <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 11 }}>
              <span>OTHER CHEFS HERE</span>
              {!empty && (
                <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>
                  {TEAM_CHEFS.length}
                </span>
              )}
            </div>
            <div className="mt-2 doc-divider-thick" />
            {empty ? (
              <div className="py-4 text-[13px] ink-faint leading-relaxed" style={{ maxWidth: 480 }}>
                Just you for now. Invite the kitchen and quotes are shared automatically.
              </div>
            ) : (
              TEAM_CHEFS.map((c, i) => (
                <div key={i} className="doc-divider py-3 flex items-center gap-4">
                  <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background: c.status === "active" ? "var(--qm-light-blue)" : "var(--qm-warm-paper)",
                      border: c.status === "active" ? "none" : "1px dashed var(--qm-soft-line)",
                    }}
                  >
                    <span className="serif text-[12px] font-semibold ink">
                      {c.name.split(" ").map(s => s[0]).join("")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <div className="text-[13.5px] ink leading-snug">{c.name}</div>
                      {c.status === "invited" && (
                        <span className="qm-pill" style={{ background: "#FEF3C7", color: "#92400E", fontSize: 10, padding: "1px 7px" }}>
                          Invite sent
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] ink-faint leading-snug">
                      {c.email} · {c.role}{c.joined && ` · joined ${c.joined}`}
                    </div>
                  </div>
                  <button className="text-[12px] ink-soft underline shrink-0">
                    {c.status === "invited" ? "Resend" : "Remove"}
                  </button>
                </div>
              ))
            )}
            <button className="qm-btn qm-btn-outline mt-3" style={{ padding: "10px 16px", fontSize: 13 }}>
              <Icon name="user-plus" size={15} /> Invite a chef
            </button>
            <div className="text-[11.5px] ink-faint mt-2 leading-snug">
              We send a one-tap link. No password, no account setup on their end.
            </div>
          </section>

          {/* LOCATIONS */}
          <section id="locations" className="mt-10">
            <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 11 }}>
              <span>OTHER LOCATIONS</span>
              {!empty && (
                <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>
                  {LOCATIONS.length - 1}
                </span>
              )}
            </div>
            <div className="mt-2 doc-divider-thick" />
            {empty ? (
              <div className="py-4 text-[13px] ink-faint leading-relaxed" style={{ maxWidth: 480 }}>
                {DEMO.restaurant} is your only kitchen right now.
              </div>
            ) : (
              LOCATIONS.filter(l => !l.current).map((l, i) => (
                <div key={i} className="doc-divider py-3 flex items-center gap-4">
                  <Icon name="store" size={18} color="var(--qm-gray-700)" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] ink leading-snug">{l.name}</div>
                    <div className="text-[12px] ink-faint leading-snug">{l.city} · {l.role}</div>
                  </div>
                  <button className="text-[12px] ink-soft underline shrink-0">Switch to</button>
                </div>
              ))
            )}
            <button className="qm-btn qm-btn-outline mt-3" style={{ padding: "10px 16px", fontSize: 13 }}>
              <Icon name="plus" size={15} /> Add another restaurant
            </button>
            <div className="text-[11.5px] ink-faint mt-2 leading-snug">
              Quotes, rep contacts, and order guides stay separate per location.
            </div>
          </section>

          {/* DISTRIBUTOR FOLLOW-UPS — V3 Part 9 locked copy. Opus c11 lock (May 18) Q8. */}
          <section id="follow-ups" className="mt-10">
            <div className="qm-eyebrow" style={{ fontSize: 11 }}>DISTRIBUTOR FOLLOW-UPS</div>
            <div className="mt-2 doc-divider-thick" />
            <DistributorFollowupRow defaultValue={empty ? "allow" : "allow"} desktop />
          </section>

          {/* BILLING */}
          <section id="billing" className="mt-10">
            <div className="qm-eyebrow" style={{ fontSize: 11 }}>BILLING</div>
            <div className="mt-2 doc-divider-thick" />
            <div className="py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <div className="serif text-[18px] font-medium ink">Free</div>
                  <span className="qm-pill" style={{ background: "#F3F4F6", color: "var(--qm-gray-700)", fontSize: 10, padding: "2px 8px" }}>
                    Current
                  </span>
                </div>
                <div className="text-[12px] ink-faint num mt-1">
                  <QuoteCountPill>
                    {empty ? "0 of 5 quotes used" : "3 of 5 quotes used · 2 left"}
                  </QuoteCountPill>
                </div>
              </div>
              {!empty && (
                <button className="qm-btn qm-btn-orange" style={{ padding: "10px 16px", fontSize: 13 }}>
                  Add payment
                </button>
              )}
            </div>

            <div className="doc-divider pt-4 pb-2 flex items-baseline justify-between gap-6">
              <div className="flex-1">
                <div className="text-[13.5px] ink leading-snug">
                  <span className="serif font-medium">$50/mo</span> · unlimited quotes, plus the ability
                  to send one menu to several distributors at once.
                </div>
                <div className="text-[11.5px] ink-faint mt-1 leading-snug">
                  Card on file via Stripe. Cancel from here any month.
                </div>
              </div>
            </div>

            <div className="pt-3 text-[11.5px] ink-faint leading-snug">
              Need a different setup, or invoicing for a group? Email{" "}
              <a href="mailto:billing@quoteme.food" className="underline ink-soft">billing@quoteme.food</a>.
            </div>
          </section>

          {/* Sign out */}
          <div className="mt-10 pt-5 flex items-center justify-between" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
            <div className="text-[12px] ink-faint">Signed in as {DEMO.chefEmail}</div>
            <button className="text-[12px] ink-soft underline">Sign out</button>
          </div>
        </div>
      </div>
    </ChefTabDesktopShell>
  );
}

function DesktopSettingRow({ label, value, placeholder = false }) {
  return (
    <>
      <div className="qm-eyebrow doc-divider py-3.5 self-stretch" style={{ fontSize: 10, paddingTop: 14 }}>{label}</div>
      <div className="doc-divider py-3.5 self-stretch">
        <div className={cls("text-[13.5px] leading-snug", placeholder ? "ink-faint" : "ink")}>
          {value}
        </div>
      </div>
      <div className="doc-divider py-3.5 self-stretch text-right">
        <button className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-50" title="Edit" aria-label="Edit">
          <Icon name="pencil" size={13} color="var(--qm-gray-700)" />
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────
Object.assign(window, {
  YOUR_DISTRIBUTORS, AREA_DISTRIBUTORS, TEAM_CHEFS, LOCATIONS,
  ChefTabBar, ChefTabStripDesktop, CatalogStatusBadge,
  ChefHomeTab, ChefDistributorsTab, ChefSettingsTab,
  ChefHomeTabDesktop, ChefDistributorsTabDesktop, ChefSettingsTabDesktop,
  SettingsSection, SettingRow, ChefTabDesktopShell, DesktopSettingRow,
  UseDistributorForQuoteModal, DistributorFollowupRow,
});
