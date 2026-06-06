// src/screens-desktop.jsx — Desktop derivatives.
// • ChefDashboardDesktop — derivative of mobile dashboard.
// • ChefOrderGuideDesktop — desktop-primary (chefs use this at the pass or office).

// ═════════════════════════════════════════════════════════════════════════════
// Desktop Dashboard
// ═════════════════════════════════════════════════════════════════════════════
function ChefDashboardDesktop({ nav = noopNav }) {
  return (
    <div className="desktop">
      <DesktopTopBar restaurant={DEMO.restaurant} />
      <TrustRibbon
        kind="connected"
        catalog={DEMO.catalog}
        distributor={DEMO.distributor}
        updated={DEMO.catalogUpdated}
      />
      <div className="flex" style={{ height: "calc(100% - 105px)" }}>
        <div className="flex-1 overflow-auto px-12 py-10">
          <div className="max-w-[920px] mx-auto">
            <div>
              <h1 className="serif font-semibold ink" style={{ fontSize: 36, lineHeight: 1.1 }}>Hi, {DEMO.chefFirst}.</h1>
              <p className="mt-1 text-[14px] ink-faint num">{DEMO.quoteDate} · {DEMO.restaurantCity}</p>
            </div>

            {/* Current quote — hero card */}
            <div className="mt-7">
              <div className="qm-eyebrow" style={{ fontSize: 11 }}>CURRENT QUOTE</div>
              <button onClick={() => nav("receipt")} className="mt-2 w-full text-left bg-white border hairline rounded-xl p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-baseline justify-between">
                  <div className="serif text-[22px] font-medium ink">{DEMO.quoteNo}</div>
                  <div className="num text-[20px] ink font-semibold">{money(QUOTE_TOTAL)}</div>
                </div>
                <div className="text-[13px] ink-soft mt-1">
                  {QUOTE.reduce((s, c) => s + c.items.length, 0)} items across {QUOTE.length} categories · sent by {DEMO.rep} · {DEMO.quoteDate}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <QuoteStatusPill status="opened" />
                  <span className="text-[12px] ink-faint">Tap to review and build the order guide</span>
                  <Icon name="arrow-right" size={16} color="var(--qm-gray-400)" className="ml-auto" />
                </div>
              </button>
            </div>

            <div className="mt-3">
              <button onClick={() => nav("entry")} className="qm-btn qm-btn-outline">
                <Icon name="plus" size={16} /> Build another quote
              </button>
            </div>

            {/* Continue where you left off */}
            <div className="mt-8">
              <div className="qm-eyebrow flex items-center justify-between" style={{ fontSize: 11 }}>
                <span>CONTINUE WHERE YOU LEFT OFF</span>
                <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>1 draft</span>
              </div>
              <button className="mt-2 w-full text-left rounded-lg p-4 hover:bg-white transition-colors"
                      style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
                <div className="flex items-baseline justify-between">
                  <div className="text-[14px] ink">Late-spring brunch additions</div>
                  <div className="text-[12px] ink-faint">May 11</div>
                </div>
                <div className="text-[12px] ink-faint num mt-0.5">7 of 22 items matched · paused at category review</div>
              </button>
            </div>

            {/* Previous quotes — list */}
            <div className="mt-8">
              <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 11 }}>
                <span>PREVIOUS QUOTES</span>
                <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>{PREVIOUS_QUOTES.length}</span>
              </div>
              <div className="mt-2 doc-divider-thick" />
              {PREVIOUS_QUOTES.map((q, i) => (
                <div key={i} className="doc-divider py-3 flex items-baseline justify-between px-1 hover:bg-gray-50">
                  <button onClick={() => nav("quote-readonly")} className="min-w-0 flex-1 text-left">
                    <div className="text-[14px] ink truncate">{q.label}</div>
                    <div className="text-[12px] ink-faint num">{q.id} · {q.date} · {q.items} items</div>
                  </button>
                  <div className="flex items-center gap-3 pl-3">
                    {q.stale && <RefreshAvailablePill />}
                    <QuoteStatusPill status={q.status} />
                    <div className="num text-[14px] ink-soft w-20 text-right">{money(q.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail — restaurant + rep */}
        <aside className="border-l hairline bg-[#FBFAF7] w-[300px] flex-shrink-0 px-6 py-8 overflow-auto">
          <div>
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>RESTAURANT</div>
            <div className="mt-2 text-[15px] ink leading-snug">{DEMO.restaurant}</div>
            <div className="text-[12px] ink-faint mt-0.5">{DEMO.restaurantCity}</div>
            <button className="text-[12px] underline ink-soft mt-2">Edit details</button>
          </div>

          <div className="mt-7">
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>YOUR REP</div>
            <div className="mt-2 text-[15px] ink leading-snug">{DEMO.rep}</div>
            <div className="text-[12px] ink-soft mt-0.5">{DEMO.distributorShort}</div>
            <div className="mt-2 text-[12.5px] ink num">{DEMO.repPhone}</div>
            <div className="text-[12.5px] ink-soft">{DEMO.repEmail}</div>
            <button className="qm-btn qm-btn-outline mt-3" style={{ padding: "8px 14px", fontSize: 12 }}>
              <Icon name="mail" size={14} /> Message {DEMO.rep.split(" ")[0]}
            </button>
          </div>

          <div className="mt-7 pt-6" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>DISTRIBUTOR</div>
            <div className="mt-2 text-[13px] ink leading-snug">{DEMO.distributor}</div>
            <div className="text-[11.5px] ink-faint mt-1 num">Updated {DEMO.catalogUpdated}</div>
            <button className="text-[12px] underline ink-soft mt-2">Switch distributor</button>
          </div>

          <div className="mt-10 text-[11px] ink-faint leading-snug">
            Need something else? Reach <span className="ink-soft">{DEMO.rep.split(" ")[0]}</span> directly,
            or build another quote anytime.
          </div>
        </aside>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Desktop Order Guide  — primary surface.
//   Chef uses this at the pass or office. Print + Excel + PDF export.
//   Edit qty + par inline. Categories with subtotal columns.
// ═════════════════════════════════════════════════════════════════════════════
function ChefOrderGuideDesktop({ nav = noopNav }) {
  return (
    <div className="desktop">
      <DesktopTopBar restaurant={DEMO.restaurant} />
      <TrustRibbon
        kind="connected"
        catalog={DEMO.catalog}
        distributor={DEMO.distributor}
        updated={DEMO.catalogUpdated}
      />

      <div className="flex" style={{ height: "calc(100% - 105px)" }}>
        <div className="flex-1 overflow-auto">
          <div className="max-w-[920px] mx-auto px-12 py-10">
            {/* Document header */}
            <div className="flex items-start gap-6 mb-6">
              <div className="flex-1">
                <div className="qm-eyebrow" style={{ fontSize: 10 }}>ORDER GUIDE · OG-1042</div>
                <h1 className="serif font-semibold ink mt-1" style={{ fontSize: 32, lineHeight: 1.1 }}>
                  {DEMO.restaurant}
                </h1>
                <div className="mt-2 text-[13px] ink-soft">
                  Built from quote {DEMO.quoteNo} · prepared {DEMO.quoteDate}
                </div>
              </div>
              <div className="text-right">
                <div className="qm-eyebrow" style={{ fontSize: 10 }}>FROM</div>
                <div className="serif text-[18px] font-medium ink mt-1">{DEMO.distributorShort}</div>
                <div className="text-[12.5px] ink mt-1">{DEMO.rep}</div>
                <div className="text-[12px] ink-soft num">{DEMO.repPhone}</div>
                <div className="text-[12px] ink-soft">{DEMO.repEmail}</div>
              </div>
            </div>

            <div className="doc-divider-thick" />

            {/* Column header */}
            <div className="flex items-baseline pt-3 pb-2 doc-divider text-[10px] ink-faint uppercase tracking-wider">
              <div className="flex-1">Item</div>
              <div className="w-24">Pack</div>
              <div className="w-20 text-right">Unit</div>
              <div className="w-16 text-right">Qty</div>
              <div className="w-16 text-right">Par</div>
              <div className="w-24 text-right">Subtotal</div>
            </div>

            {QUOTE.map((group, gi) => {
              const subtotal = group.items.reduce((a, i) => a + i.qty * i.unit, 0);
              return (
                <div key={gi} className="mt-4">
                  <div className="serif text-[13px] ink font-medium uppercase tracking-wider mb-1">{group.cat}</div>
                  {group.items.map((it, ii) => (
                    <div key={ii} className="doc-divider py-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] ink leading-snug truncate">{it.name}</div>
                        {it.note && <div className="text-[11px] ink-faint">{it.note}</div>}
                      </div>
                      <div className="w-24 text-[12px] ink-soft num">{it.pack}</div>
                      <div className="w-20 text-right text-[12.5px] ink-soft num">{money(it.unit)}</div>
                      <input type="text" defaultValue={it.qty}
                             className="w-16 text-right text-[13px] ink num bg-transparent rounded-sm py-1 px-1.5 hover:bg-gray-50"
                             style={{ border: "1px solid transparent" }}
                             onFocus={(e) => e.target.style.border = "1px solid var(--qm-soft-line)"}
                             onBlur={(e) => e.target.style.border = "1px solid transparent"} />
                      <input type="text" defaultValue={it.qty + 2}
                             className="w-16 text-right text-[13px] ink-soft num bg-transparent rounded-sm py-1 px-1.5 hover:bg-gray-50"
                             style={{ border: "1px solid transparent" }}
                             onFocus={(e) => e.target.style.border = "1px solid var(--qm-soft-line)"}
                             onBlur={(e) => e.target.style.border = "1px solid transparent"} />
                      <div className="w-24 text-right text-[13.5px] ink font-medium num">{money(it.qty * it.unit)}</div>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-end pt-2 doc-divider">
                    <span className="text-[11.5px] ink-soft mr-3">Subtotal · {group.cat}</span>
                    <span className="text-[13px] ink font-medium num w-24 text-right">{money(subtotal)}</span>
                  </div>
                </div>
              );
            })}

            {/* Gap line */}
            <div className="mt-7 px-4 py-3 rounded-md" style={{ background: "rgba(165,207,221,.16)", border: "1px solid rgba(165,207,221,.4)" }}>
              <div className="text-[13px] ink leading-snug">
                Some items will be handled directly by your rep.
              </div>
              <ul className="mt-1.5 grid grid-cols-3 gap-x-4 gap-y-0.5">
                {GAP_ITEMS.map((g, i) => (
                  <li key={i} className="text-[12px] ink-soft leading-snug">— {g}</li>
                ))}
              </ul>
            </div>

            <div className="doc-divider-thick mt-6" />
            <div className="flex items-baseline justify-between pt-3">
              <span className="serif text-[18px] ink">Order guide total</span>
              <span className="serif text-[28px] font-semibold ink num">{money(QUOTE_TOTAL)}</span>
            </div>
            <div className="mt-1 text-[11.5px] ink-faint">
              Prices from {DEMO.distributor}, updated {DEMO.catalogUpdated}.
            </div>

            {/* Truck mark in footer per DS */}
            <div className="mt-12 flex items-center gap-3 ink-faint text-[11px]">
              <img src="assets/logo-truck.png" alt="" style={{ height: 20, opacity: .6 }} />
              <span>Order guide built with QuoteMe · printed {DEMO.quoteDate}</span>
            </div>

            <div className="mt-6 px-3 py-2 text-[10.5px] ink-faint leading-snug rounded-md"
                 style={{ background: "var(--qm-warm-paper)", border: "1px dashed var(--qm-soft-line)" }}>
              <b className="ink-soft">Design note:</b> needs alignment pass against canonical rep-export
              template (Daniel: reference inbound). Tokens used here are from the design system.
            </div>
          </div>
        </div>

        {/* Right rail — export actions */}
        <aside className="border-l hairline bg-[#FBFAF7] w-[260px] flex-shrink-0 px-5 py-8 overflow-auto">
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>EXPORT</div>
          <div className="mt-2 flex flex-col gap-2">
            <button className="qm-btn qm-btn-outline qm-btn-full justify-start" style={{ padding: "10px 14px", fontSize: 13 }}>
              <Icon name="printer" size={15} /> Print
            </button>
            <button className="qm-btn qm-btn-outline qm-btn-full justify-start" style={{ padding: "10px 14px", fontSize: 13 }}>
              <Icon name="file-spreadsheet" size={15} /> Export Excel
            </button>
            <button className="qm-btn qm-btn-outline qm-btn-full justify-start" style={{ padding: "10px 14px", fontSize: 13 }}>
              <Icon name="file-text" size={15} /> Export PDF
            </button>
          </div>

          <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>SUMMARY</div>
            <div className="mt-2 space-y-1 text-[12.5px]">
              {QUOTE.map((g, i) => (
                <div key={i} className="flex justify-between">
                  <span className="ink-soft">{g.cat}</span>
                  <span className="ink num">{g.items.length}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 flex justify-between doc-divider">
              <span className="text-[13px] ink">Items</span>
              <span className="text-[13px] ink font-medium num">
                {QUOTE.reduce((s, c) => s + c.items.length, 0)}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-[13px] ink">Total</span>
              <span className="text-[13px] ink font-semibold num">{money(QUOTE_TOTAL)}</span>
            </div>
          </div>

          <div className="mt-8 pt-6 text-[11.5px] ink-faint leading-snug" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
            Editable qty and par. Changes save automatically. Send your rep a question about anything in
            this guide before placing.
          </div>
        </aside>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Newspaper sidebar — chef-facing nav as a magazine table of contents.
//   Justin frame: not SaaS chrome. A leather-bound binder index. The chef sees
//   their own world, sectioned and numbered, never an "app menu."
//
//   Three states:
//     • open    — icon column + section index with copy. Full read.
//     • compact — icon column only, 64px wide. Tooltip on hover.
//     • hidden  — sidebar gone entirely; a floating restore button appears
//                 over the main canvas.
//
//   Icons: Lucide outlines only, stroke 1.5–2px, charcoal. No fills, no color.
//   Active item: thin charcoal vertical bar at the left edge.
// ═════════════════════════════════════════════════════════════════════════════

// One nav destination: icon + (in open mode) label + meta + sub-items.
// `onClick` makes the top row a button; sub-items are individually clickable.
function NavDestination({ icon, label, count, sub = [], current, muted, mode, onClick }) {
  const collapsed = mode === "compact";
  return (
    <div className="px-3">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center w-full py-2.5 rounded-md hover:bg-gray-50 transition-colors text-left"
        style={{
          paddingLeft: 10, paddingRight: collapsed ? 10 : 12,
          borderLeft: current ? "2px solid var(--qm-charcoal)" : "2px solid transparent",
          background: current && collapsed ? "var(--qm-warm-paper)" : "transparent",
          justifyContent: collapsed ? "center" : "flex-start",
          cursor: onClick ? "pointer" : "default",
        }}
        title={collapsed ? label : ""}
      >
        <Icon
          name={icon}
          size={18}
          color={muted ? "var(--qm-gray-500)" : "var(--qm-charcoal)"}
          style={{ flexShrink: 0 }}
        />
        {!collapsed && (
          <>
            <span
              className="ml-3 text-[13.5px] leading-snug flex-1 truncate"
              style={{
                color: muted ? "var(--qm-gray-500)" : "var(--qm-charcoal)",
                fontWeight: current ? 500 : 400,
                fontStyle: muted ? "italic" : "normal",
              }}
            >
              {label}
            </span>
            {count != null && (
              <span className="text-[11px] ink-faint num shrink-0 pl-2">{count}</span>
            )}
          </>
        )}
      </button>

      {/* Sub-items only render in open mode */}
      {!collapsed && sub.length > 0 && (
        <div className="ml-9 mt-0.5 mb-1">
          {sub.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={s.onClick}
              className="w-full text-left flex items-baseline justify-between py-1 hover:opacity-80"
              style={{ cursor: s.onClick ? "pointer" : "default" }}
            >
              <span
                className="text-[12.5px] leading-snug"
                style={{
                  color: s.muted ? "var(--qm-gray-500)" : "var(--qm-gray-700)",
                  fontWeight: s.current ? 500 : 400,
                  fontStyle: s.muted ? "italic" : "normal",
                }}
              >
                {s.label}
              </span>
              {s.meta && (
                <span
                  className="text-[10.5px] num shrink-0 pl-2"
                  style={{ color: "var(--qm-gray-500)" }}
                >
                  {s.meta}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Group label — only renders in open mode. Compact gets a hairline divider instead.
function NavGroupLabel({ label, mode }) {
  if (mode === "compact") {
    return <div className="mx-4 my-2" style={{ borderTop: "1px solid var(--qm-soft-line)" }} />;
  }
  return (
    <div
      className="px-6 mt-5 mb-1.5 qm-eyebrow"
      style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--qm-gray-500)" }}
    >
      {label}
    </div>
  );
}

// NewspaperSidebar — desktop chrome for every chef-facing page.
// Per Desi May 18 lock: every desktop view sits inside this sidebar.
//
// Props:
//   • mode       — "open" | "compact" | "hidden"
//   • onModeChange(next) — flips the mode (also called from the floating restore button)
//   • active     — destination id that should render as current ("home" | "distributors" | "settings" | "order-guides" | "restaurants" | "correspondence")
//   • onNav(target) — called when the chef taps a destination. `target` is a FLOW_ROUTES key.
function NewspaperSidebar({
  mode = "open",
  onModeChange = () => {},
  active = "home",
  onNav = noopNav,
  helpInput = null,
}) {
  const collapsed = mode === "compact";
  const width = collapsed ? 64 : 280;
  const isCurrent = (id) => id === active;

  return (
    <aside
      className="border-r hairline flex-shrink-0 overflow-auto flex flex-col"
      style={{ width, background: "#fff", transition: "width .2s ease" }}
    >
      {/* Masthead + collapse control */}
      <div className={collapsed ? "px-2 pt-5 pb-4" : "px-6 pt-7 pb-5"}>
        <div className="flex items-center justify-between gap-2">
          {!collapsed ? (
            <QuoteMeWordmark variant="horizontal" height={34} />
          ) : (
            <QuoteMeWordmark variant="square" height={34} />
          )}
          {!collapsed && (
            <button
              onClick={() => onModeChange("compact")}
              className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-50 flex-shrink-0"
              title="Collapse to icons"
              aria-label="Collapse to icons"
            >
              <Icon name="panel-left-close" size={16} color="var(--qm-charcoal)" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => onModeChange("open")}
            className="mt-3 w-full h-8 rounded-md flex items-center justify-center hover:bg-gray-50"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <Icon name="panel-left-open" size={16} color="var(--qm-charcoal)" />
          </button>
        )}
      </div>

      {/* Currently viewing — restaurant + chef */}
      {!collapsed ? (
        <div className="px-6 pb-5" style={{ borderTop: "2px solid var(--qm-charcoal)", paddingTop: 16 }}>
          <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".18em" }}>
            CURRENTLY VIEWING
          </div>
          <div className="serif font-medium ink mt-1.5" style={{ fontSize: 16, lineHeight: 1.2 }}>
            {DEMO.restaurant}
          </div>
          <div className="text-[12px] ink-faint mt-0.5">{DEMO.restaurantCity}</div>
          <div className="text-[12px] ink-soft mt-1.5">{DEMO.chefFirst} {DEMO.chefLast}</div>
        </div>
      ) : (
        <div
          className="mx-2 mb-2 py-2 flex items-center justify-center"
          style={{ borderTop: "2px solid var(--qm-charcoal)" }}
          title={`${DEMO.restaurant} · ${DEMO.chefFirst} ${DEMO.chefLast}`}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center border hairline"
            style={{ background: "var(--qm-warm-paper)" }}
          >
            <span className="serif text-[12px] font-semibold ink">
              {DEMO.chefFirst[0]}{DEMO.chefLast[0]}
            </span>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className={collapsed ? "py-1" : "pt-1 pb-2"} style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
        <NavGroupLabel label="THE DAILY WORK" mode={mode} />
        <NavDestination
          icon="file-text"
          label="Quotes"
          count={6}
          current={isCurrent("home")}
          mode={mode}
          onClick={() => onNav("tab-home")}
          sub={[
            { label: "Current quote", meta: DEMO.quoteNo, current: isCurrent("home"), onClick: () => onNav("receipt") },
            { label: "Quote history", meta: "6",            onClick: () => onNav("tab-home") },
            { label: "Build new",     meta: "·",            onClick: () => onNav("entry") },
          ]}
        />
        <NavDestination
          icon="notebook-text"
          label="Menus"
          count={4}
          current={isCurrent("menus")}
          mode={mode}
          onClick={() => onNav("menus")}
          sub={[
            { label: "Saved menus",  meta: "4",  onClick: () => onNav("menus") },
            { label: "Compare spread", meta: "·", onClick: () => onNav("spread") },
          ]}
        />
        <NavDestination
          icon="clipboard-list"
          label="Order Guides"
          count={5}
          current={isCurrent("order-guides")}
          mode={mode}
          onClick={() => onNav("og")}
          sub={[
            { label: "Current guide",  meta: "OG-1042", onClick: () => onNav("og") },
            { label: "Previous guides", meta: "4",       onClick: () => onNav("og") },
          ]}
        />

        <NavGroupLabel label="SOURCING" mode={mode} />
        <NavDestination
          icon="truck"
          label="Distributors"
          count={YOUR_DISTRIBUTORS ? YOUR_DISTRIBUTORS.length : 3}
          current={isCurrent("distributors")}
          mode={mode}
          onClick={() => onNav("tab-distributors")}
          sub={[
            { label: "Your distributors", meta: String(YOUR_DISTRIBUTORS ? YOUR_DISTRIBUTORS.length : 3), onClick: () => onNav("tab-distributors") },
            { label: "Catalogs servicing Hudson, NY", meta: String(AREA_DISTRIBUTORS ? AREA_DISTRIBUTORS.length : 4), onClick: () => onNav("tab-distributors") },
          ]}
        />
        {/* Discovery / Restaurants / Correspondence — REMOVED per Moose c11 lock (May 18).
            Sidebar destinations are now locked to four: Quotes / Order Guides /
            Distributors / Settings. Restaurants lives inside Settings; Correspondence
            and paid Discovery deferred to V2.5+. */}
      </div>

      {/* Spacer pushes settings + help + hide to bottom */}
      <div className="flex-1" />

      {/* Help input — sits above Settings per Moose May 21. Renders only when
          the parent passes one in; older callers stay unchanged. */}
      {helpInput && (
        <div style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
          {helpInput}
        </div>
      )}

      {/* Settings + Hide */}
      <div className="py-2" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
        <NavDestination
          icon="settings"
          label="Settings"
          current={isCurrent("settings")}
          mode={mode}
          onClick={() => onNav("tab-settings")}
          sub={[
            { label: "You",            onClick: () => onNav("tab-settings") },
            { label: "Restaurant",     onClick: () => onNav("tab-settings") },
            { label: "Billing",        onClick: () => onNav("tab-settings") },
          ]}
        />
        <div className={collapsed ? "mt-1 px-2" : "mt-1 px-6"}>
          <button
            onClick={() => onModeChange("hidden")}
            className="w-full flex items-center gap-2 py-2 text-[11.5px] ink-faint hover:ink-soft"
            style={{ justifyContent: collapsed ? "center" : "flex-start" }}
            title="Hide sidebar"
            aria-label="Hide sidebar"
          >
            <Icon name="x" size={14} color="var(--qm-gray-500)" />
            {!collapsed && <span>Hide sidebar</span>}
          </button>
        </div>
      </div>

      {/* Colophon — open mode only */}
      {!collapsed && (
        <div className="px-6 py-4 text-[10px] ink-faint leading-relaxed" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
          <div style={{ letterSpacing: ".14em", textTransform: "uppercase" }}>Colophon</div>
          <div className="mt-1">
            Set in Playfair Display &amp; DM Sans. Printed for {DEMO.chefFirst}, {DEMO.quoteDate}.
          </div>
        </div>
      )}
    </aside>
  );
}

// Floating button to restore the sidebar from the hidden state.
function SidebarRestoreButton({ onShow }) {
  return (
    <button
      onClick={onShow}
      className="absolute z-10 w-10 h-10 rounded-full bg-white border hairline flex items-center justify-center hover:shadow-sm"
      style={{ top: 18, left: 18, boxShadow: "0 1px 2px rgba(43,43,43,.06)" }}
      title="Show sidebar"
      aria-label="Show sidebar"
    >
      <Icon name="panel-left" size={18} color="var(--qm-charcoal)" />
    </button>
  );
}

// Desktop dashboard with newspaper sidebar.
// As of May 18 (Desi lock) this is a thin alias around ChefHomeTabDesktop — the
// canonical "Quotes" tab. Mode lives here; the tab body lives in screens-tabs.jsx.
function ChefDashboardDesktopNewspaper({ initialMode = "open", nav = noopNav }) {
  return <ChefHomeTabDesktop initialMode={initialMode} nav={nav} />;
}

// ═════════════════════════════════════════════════════════════════════════════
// NewspaperMobileShell — THE canonical mobile chrome (Eighteen/Moose, Jun 6).
// "One shell, everywhere." This is the mobile equivalent of NewspaperSidebar:
// a serif masthead header with a menu trigger that opens a slide-in drawer
// holding the SAME nav (NavGroupLabel + NavDestination) the desktop sidebar
// shows. It REPLACES the old MobileTopBar + bottom ChefTabBar/RepTabBar pattern.
//
// Fully prop-driven so chef / rep / brand / distributor all feed it config:
//   • edition   — masthead eyebrow under the wordmark (e.g. "Brand Edition")
//   • identity  — { eyebrow, title, sub, meta, initials } for the drawer head
//   • nav       — [{ group, items: [{ icon, label, count, id, onClick, sub }] }]
//   • active    — id of the current destination
//   • settings  — optional { label, icon, onClick } pinned to the drawer bottom
//   • trust     — optional element rendered under the masthead (TrustRibbon etc.)
//   • children  — page body; wrapped in a .scroller by default
// ═════════════════════════════════════════════════════════════════════════════
function NewspaperMobileShell({
  edition = "Chef Edition",
  identity = {},
  nav = [],
  active,
  settings = null,
  trust = null,
  children,
  scroll = true,
}) {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);
  const { eyebrow = "CURRENTLY VIEWING", title, sub, meta, initials } = identity;

  return (
    <PhoneShell>
      {/* ── Masthead header: menu trigger · wordmark+edition · identity dot ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b hairline bg-white" style={{ flex: "0 0 auto" }}>
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 -ml-1 rounded-md flex items-center justify-center hover:bg-gray-50"
          aria-label="Open menu"
        >
          <Icon name="menu" size={20} color="var(--qm-charcoal)" />
        </button>
        <div className="flex flex-col min-w-0 flex-1" style={{ lineHeight: 1 }}>
          <div className="flex items-center" style={{ gap: 5 }}>
            <span className="serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--qm-charcoal)", letterSpacing: "-.015em" }}>Quote</span>
            <span className="serif" style={{ fontSize: 17, fontWeight: 800, color: "var(--qm-orange)", textShadow: "1.5px 1.5px 0 var(--qm-charcoal)", letterSpacing: "-.015em" }}>ME</span>
          </div>
          {edition && (
            <div style={{ marginTop: 3, fontSize: 8.5, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--qm-gray-500)", fontWeight: 600 }}>
              {edition}
            </div>
          )}
        </div>
        {initials && (
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center border hairline shrink-0"
            style={{ background: "var(--qm-warm-paper)" }}
            aria-label="Account"
          >
            <span className="serif text-[11px] font-semibold ink">{initials}</span>
          </button>
        )}
      </div>

      {trust}

      {scroll ? <div className="scroller">{children}</div> : children}

      {/* ── Slide-in drawer = the desktop sidebar, on mobile ── */}
      <div
        onClick={close}
        style={{
          position: "absolute", inset: 0, zIndex: 40,
          background: "rgba(31,26,20,.42)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .22s ease",
        }}
        aria-hidden={!open}
      />
      <aside
        className="flex flex-col"
        style={{
          position: "absolute", top: 0, bottom: 0, left: 0, zIndex: 41,
          width: 286, maxWidth: "86%",
          background: "#fff",
          boxShadow: "2px 0 28px rgba(31,26,20,.20)",
          transform: open ? "translateX(0)" : "translateX(-102%)",
          transition: "transform .24s cubic-bezier(.4,0,.2,1)",
        }}
        aria-hidden={!open}
      >
        {/* Drawer masthead — wordmark + close */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <QuoteMeWordmark variant="horizontal" height={32} edition={edition} />
          <button onClick={close} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-50" aria-label="Close menu">
            <Icon name="x" size={18} color="var(--qm-charcoal)" />
          </button>
        </div>

        {/* Identity block — mirrors the sidebar "CURRENTLY VIEWING / WORKING AS" */}
        {title && (
          <div className="px-5 pb-4" style={{ borderTop: "2px solid var(--qm-charcoal)", paddingTop: 14 }}>
            <div className="qm-eyebrow" style={{ fontSize: 9.5, letterSpacing: ".18em" }}>{eyebrow}</div>
            <div className="serif font-medium ink mt-1.5" style={{ fontSize: 16, lineHeight: 1.2 }}>{title}</div>
            {sub && <div className="text-[12px] ink-faint mt-0.5">{sub}</div>}
            {meta && <div className="text-[12px] ink-soft mt-1.5">{meta}</div>}
          </div>
        )}

        {/* Nav — same primitives as desktop, always "open" mode here */}
        <div className="overflow-auto flex-1 pt-1 pb-2" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
          {nav.map((grp, gi) => (
            <React.Fragment key={gi}>
              {grp.group && <NavGroupLabel label={grp.group} mode="open" />}
              {grp.items.map((it, ii) => (
                <NavDestination
                  key={ii}
                  icon={it.icon}
                  label={it.label}
                  count={it.count}
                  muted={it.muted}
                  current={it.id === active}
                  mode="open"
                  onClick={() => { close(); it.onClick && it.onClick(); }}
                  sub={(it.sub || []).map((s) => ({ ...s, onClick: s.onClick ? () => { close(); s.onClick(); } : undefined }))}
                />
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* Settings pinned to the bottom — mirrors the sidebar */}
        {settings && (
          <div className="py-2" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
            <NavDestination
              icon={settings.icon || "settings"}
              label={settings.label || "Settings"}
              current={settings.id === active}
              mode="open"
              onClick={() => { close(); settings.onClick && settings.onClick(); }}
              sub={(settings.sub || []).map((s) => ({ ...s, onClick: s.onClick ? () => { close(); s.onClick(); } : undefined }))}
            />
          </div>
        )}
      </aside>
    </PhoneShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RoleSidebar + NewspaperShell — THE ONE SHELL, role-agnostic (Eighteen/Moose,
// Jun 6). Config-driven so EVERY role (chef, rep, brand, distributor) renders
// the same chrome — no per-role sidebar duplication, no old sidebar, no double
// sidebar. This is the export Claudio wires to the live backend.
//
// Feed it:
//   • edition   — masthead eyebrow ("Brand Edition", "Rep Edition", …)
//   • identity  — { eyebrow, title, sub, meta, mono } (mono = logo monogram)
//   • nav       — [{ group, items: [{ id, icon, label, count, muted, onClick, sub }] }]
//   • active    — current destination id
//   • settings  — optional bottom-pinned destination { id, icon, label, onClick, sub }
//   • onNav / onModeChange — wiring hooks
//
// <NewspaperShell variant="desktop|mobile" …>{page}</NewspaperShell> picks the
// right chrome: the left sidebar on desktop, the slide-in drawer on mobile.
// ═════════════════════════════════════════════════════════════════════════════
function RoleSidebar({
  edition = "Edition",
  identity = {},
  nav = [],
  active,
  settings = null,
  onNav = noopNav,
  mode = "open",
  onModeChange = () => {},
}) {
  const collapsed = mode === "compact";
  const width = collapsed ? 64 : 280;
  const isCurrent = (id) => id === active;
  const { eyebrow = "ACCOUNT", title, sub, mono } = identity;
  const markText = mono || (title ? title.split(" ").map((s) => s[0]).slice(0, 2).join("") : "QM");

  const Mark = ({ size }) => (
    <span className="inline-flex items-center justify-center shrink-0 serif"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), background: "#1F1A14", color: "#FBFAF7", fontWeight: 600, fontSize: size * 0.4, lineHeight: 1, letterSpacing: "-.01em" }}
      aria-hidden="true">{markText}</span>
  );

  return (
    <aside className="border-r hairline flex-shrink-0 overflow-auto flex flex-col" style={{ width, background: "#fff", transition: "width .2s ease" }}>
      <div className={collapsed ? "px-2 pt-5 pb-4" : "px-6 pt-7 pb-5"}>
        <div className="flex items-center justify-between gap-2">
          {!collapsed ? <QuoteMeWordmark variant="horizontal" height={34} edition={edition} /> : <QuoteMeWordmark variant="square" height={34} />}
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

      {!collapsed ? (
        <div className="px-6 pb-5 flex items-center gap-3" style={{ borderTop: "2px solid var(--qm-charcoal)", paddingTop: 16 }}>
          <Mark size={40} />
          <div className="min-w-0">
            <div className="qm-eyebrow" style={{ fontSize: 9.5, letterSpacing: ".18em" }}>{eyebrow}</div>
            {title && <div className="serif font-medium ink mt-0.5 truncate" style={{ fontSize: 15.5, lineHeight: 1.15 }}>{title}</div>}
            {sub && <div className="text-[11.5px] ink-faint truncate">{sub}</div>}
          </div>
        </div>
      ) : (
        <div className="mx-2 mb-2 py-2 flex items-center justify-center" style={{ borderTop: "2px solid var(--qm-charcoal)" }} title={title}>
          <Mark size={34} />
        </div>
      )}

      <div className={collapsed ? "py-1" : "pt-1 pb-2"} style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
        {nav.map((grp, gi) => (
          <React.Fragment key={gi}>
            {grp.group && <NavGroupLabel label={grp.group} mode={mode} />}
            {grp.items.map((it, ii) => (
              <NavDestination key={ii} icon={it.icon} label={it.label} count={it.count} muted={it.muted}
                current={isCurrent(it.id)} mode={mode} onClick={it.onClick} sub={collapsed ? [] : (it.sub || [])} />
            ))}
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1" />

      {settings && (
        <div className="py-2" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
          <NavDestination icon={settings.icon || "settings"} label={settings.label || "Settings"} current={isCurrent(settings.id)} mode={mode} onClick={settings.onClick} sub={collapsed ? [] : (settings.sub || [])} />
          <div className={collapsed ? "mt-1 px-2" : "mt-1 px-6"}>
            <button onClick={() => onModeChange("hidden")} className="w-full flex items-center gap-2 py-2 text-[11.5px] ink-faint hover:ink-soft" style={{ justifyContent: collapsed ? "center" : "flex-start" }} aria-label="Hide sidebar">
              <Icon name="x" size={14} color="var(--qm-gray-500)" />
              {!collapsed && <span>Hide sidebar</span>}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function NewspaperShellDesktop({ edition, identity, nav, active, settings, trust, onNav, children, initialMode = "open", maxWidth = 880 }) {
  const [mode, setMode] = useState(initialMode);
  const hidden = mode === "hidden";
  return (
    <div className="desktop flex relative" style={{ minHeight: 760, background: "#fff" }}>
      {hidden ? <SidebarRestoreButton onShow={() => setMode("open")} /> : (
        <RoleSidebar edition={edition} identity={identity} nav={nav} active={active} settings={settings} onNav={onNav} mode={mode} onModeChange={setMode} />
      )}
      <main className="flex-1 min-w-0 overflow-auto flex flex-col" style={{ background: "#fff" }}>
        {trust}
        <div className="px-10 py-9"><div style={{ maxWidth }}>{children}</div></div>
      </main>
    </div>
  );
}

// The one shell. variant="desktop" → sidebar; variant="mobile" → drawer.
function NewspaperShell({ variant = "desktop", edition, identity, nav, active, settings, trust = null, onNav = noopNav, children, initialMode = "open", maxWidth = 880 }) {
  if (variant === "mobile") {
    return (
      <NewspaperMobileShell edition={edition} identity={identity} nav={nav} active={active} settings={settings} trust={trust}>
        {children}
      </NewspaperMobileShell>
    );
  }
  return (
    <NewspaperShellDesktop edition={edition} identity={identity} nav={nav} active={active} settings={settings} trust={trust} onNav={onNav} initialMode={initialMode} maxWidth={maxWidth}>
      {children}
    </NewspaperShellDesktop>
  );
}

Object.assign(window, {
  ChefDashboardDesktop, ChefOrderGuideDesktop,
  ChefDashboardDesktopNewspaper, NewspaperSidebar, SidebarRestoreButton,
  NavDestination, NavGroupLabel, NewspaperMobileShell,
  RoleSidebar, NewspaperShell, NewspaperShellDesktop,
});
