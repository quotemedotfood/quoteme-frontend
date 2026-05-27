// src/document.jsx — shared primitives + demo data for the chef flow.
// Exposes everything to window.* so the screen files can pick up the
// components by global name (each <script type="text/babel"> gets its own
// scope, so this is the cross-file convention for this prototype).

const { useState, useEffect, useRef, useMemo } = React;
// Each <script type="text/babel"> is its own scope; expose hooks globally so
// the screen files (which are separate <script> tags) can use them bare.
window.useState  = React.useState;
window.useEffect = React.useEffect;
window.useRef    = React.useRef;
window.useMemo   = React.useMemo;

// ─────────────────────────────────────────────────────────────────────────────
// Demo data (Justin-locked names)
// ─────────────────────────────────────────────────────────────────────────────
const DEMO = {
  restaurant: "Holloway & Sons",
  restaurantCity: "Hudson, NY",
  chefFirst: "Daniel",
  chefLast: "Reeves",
  chefEmail: "daniel@hollowayandsons.com",
  rep: "Marcus Rivera",
  repPhone: "(518) 555-0143",
  repEmail: "marcus@dlisius.co",
  distributor: "D'Lisius Distribution Co.",
  distributorShort: "D'Lisius",
  catalog: "D'Lisius Spring 2026 Master Catalog",
  catalogUpdated: "May 8, 2026",
  quoteNo: "Q-1042",
  quoteDate: "May 12, 2026",
};

// Quote line items — specific culinary terms per Daniel's note.
const QUOTE = [
  { cat: "Cheese & Dairy", items: [
    { name: "Hudson Valley Yellow Cheddar, raw milk",  pack: "5 lb wheel",    qty: 2, unit: 42.50, note: "" },
    { name: "Cultured salted butter, Vermont",          pack: "1 lb roll",     qty: 6, unit:  9.75, note: "" },
    { name: "Parmigiano-Reggiano, 24-mo",              pack: "1 lb wedge",     qty: 4, unit: 24.00, note: "DOP" },
    { name: "Fior di latte mozzarella, hand-pulled",    pack: "8 oz ball",     qty: 8, unit:  7.40, note: "" },
  ]},
  { cat: "Meat & Charcuterie", items: [
    { name: "Berkshire pork shoulder, skin-on",         pack: "8–10 lb avg",   qty: 1, unit: 78.50, note: "" },
    { name: "Wagyu beef cheeks, USDA",                  pack: "5 lb pack",     qty: 1, unit:138.00, note: "" },
    { name: "Prosciutto di Parma, 18-mo, sliced",        pack: "1 lb",          qty: 3, unit: 28.95, note: "" },
  ]},
  { cat: "Seafood", items: [
    { name: "Branzino, whole, dressed",                  pack: "1–1.5 lb avg", qty: 12, unit: 14.25, note: "per lb · approx" },
    { name: "Maine diver scallops, U-10 dry",             pack: "1 lb",          qty: 4, unit: 32.80, note: "" },
  ]},
  { cat: "Pantry & Spice", items: [
    { name: "Tellicherry black peppercorns",             pack: "1 lb",          qty: 1, unit: 18.40, note: "" },
    { name: "Maldon sea salt flake",                     pack: "1.5 lb tub",    qty: 2, unit: 16.20, note: "" },
    { name: "Castelvetrano olives, pitted",              pack: "2.5 kg jar",    qty: 1, unit: 34.75, note: "" },
    { name: "Caputo Tipo 00 flour",                      pack: "55 lb bag",     qty: 1, unit: 44.20, note: "" },
    { name: "San Marzano tomatoes, DOP",                 pack: "#10 can, 6 ct", qty: 1, unit: 41.60, note: "" },
  ]},
  { cat: "Produce", items: [
    { name: "Treviso radicchio",                          pack: "12 ct case",    qty: 1, unit: 32.00, note: "" },
    { name: "Meyer lemons",                              pack: "35 lb case",    qty: 1, unit: 58.50, note: "" },
    { name: "Heirloom carrots, rainbow",                  pack: "25 lb case",    qty: 1, unit: 46.00, note: "" },
    { name: "Castelfranco chicory",                       pack: "10 ct case",    qty: 1, unit: 38.40, note: "" },
  ]},
];

const QUOTE_TOTAL = QUOTE.reduce((s, c) =>
  s + c.items.reduce((a, i) => a + i.qty * i.unit, 0), 0);

// "Some items will be handled directly by your rep" — gap line.
const GAP_ITEMS = [
  "Whole lamb (custom cut)",
  "Local goat dairy program",
  "Dried porcini, by-the-pound",
];

// V2 spec lock: each quote row carries ONE status (mutually exclusive).
// State machine: received → opened → replied → converted.
// `converted` is the terminal positive state and gets different visual weight.
// Per Opus c11 (May 18):
//   • `distributor` anchors the row to its originating distributor (V3 Part 3 enforcement).
//   • `preview` flags rows where the rep hasn't confirmed yet — Preview pill stamps on every surface.
const PREVIOUS_QUOTES = [
  { id: "Q-0987", date: "Apr 28, 2026", items: 18, total: 1426.50, label: "Spring tasting menu",     status: "converted", distributor: "D'Lisius", preview: false, stale: false },
  { id: "Q-0954", date: "Apr 14, 2026", items: 11, total:  712.85, label: "Easter brunch additions", status: "replied",   distributor: "D'Lisius", preview: true,  stale: true  },
  { id: "Q-0921", date: "Mar 30, 2026", items: 24, total: 2104.20, label: "Re-up · weekly staples",  status: "converted", distributor: "D'Lisius", preview: false, stale: true  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const money = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cls = (...xs) => xs.filter(Boolean).join(" ");

// Lucide tag — render an <i data-lucide> placeholder; lucide.createIcons()
// replaces it with an SVG. The MutationObserver in the host re-renders on DOM
// changes, so this works inside React updates.
function Icon({ name, size = 18, color, className = "", style = {} }) {
  return (
    <i
      data-lucide={name}
      className={cls("lucide", className)}
      style={{ width: size, height: size, color, display: "inline-flex", ...style }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PhoneShell — iPhone-ish chrome with status bar + home indicator.
// Children fill the screen; pages handle their own scrolling.
// ─────────────────────────────────────────────────────────────────────────────
function PhoneShell({ children, time = "9:41" }) {
  return (
    <div className="phone">
      <div className="screen">
        <div className="statusbar">
          <span>{time}</span>
          <span className="right">
            <Icon name="signal" size={14} />
            <Icon name="wifi" size={14} />
            <Icon name="battery-full" size={18} />
          </span>
        </div>
        {children}
      </div>
      <div className="home-indicator" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top bar — chef's "absolute minimum" mobile chrome.
//   • Wordmark center-left.
//   • If `restaurant` provided, it sits next to wordmark as a charcoal text pill.
//   • Right: a single account dot (sign-out menu).
// Justin-locked: no nav between sections. This is identity, nothing else.
// ─────────────────────────────────────────────────────────────────────────────
function MobileTopBar({ restaurant, showMenu = true, action = null }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b hairline bg-white">
      <div className="flex items-center gap-2 min-w-0">
        <span className="serif text-[18px] font-semibold leading-none ink">QuoteMe</span>
        {restaurant && (
          <>
            <span className="ink-faint text-[14px] leading-none">·</span>
            <span className="text-[13px] leading-none ink-soft truncate" style={{ maxWidth: 170 }}>{restaurant}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {action}
        {showMenu && (
          <button className="w-7 h-7 rounded-full bg-[#FFF9F3] border hairline flex items-center justify-center" aria-label="Account menu">
            <span className="serif text-[12px] font-semibold ink">{DEMO.chefFirst[0]}{DEMO.chefLast[0]}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Desktop top bar — thin, full-width, same vocabulary.
function DesktopTopBar({ restaurant }) {
  return (
    <div className="flex items-center justify-between px-8 py-4 border-b hairline bg-white">
      <div className="flex items-center gap-4">
        <span className="serif text-[22px] font-semibold leading-none ink">QuoteMe</span>
        {restaurant && (
          <>
            <span className="ink-faint">·</span>
            <span className="text-[14px] leading-none ink">{restaurant}</span>
            <span className="text-[12px] ink-faint leading-none">{DEMO.restaurantCity}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-5 text-[13px] ink-soft">
        <span>{DEMO.chefFirst} {DEMO.chefLast}</span>
        <button className="w-8 h-8 rounded-full bg-[#FFF9F3] border hairline flex items-center justify-center" aria-label="Account menu">
          <span className="serif text-[13px] font-semibold ink">{DEMO.chefFirst[0]}{DEMO.chefLast[0]}</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TrustRibbon — "document metadata", not a banner.
// Brief: "Quoting against [Catalog] — [Distributor], updated [Date]"
// Per Daniel's flag E: one canonical distributor name across all surfaces.
// ─────────────────────────────────────────────────────────────────────────────
function TrustRibbon({ kind = "connected", distributor, compact = false, catalog, updated }) {
  // NOTE: `catalog` and `updated` are accepted for backwards-compat but
  // intentionally NOT rendered. Per Daniel: the catalog name is irrelevant
  // to the chef. The distributor name is the only operational signal that
  // matters here. (See CLAUDE.md → "Catalog name is irrelevant".)
  const tag =
    kind === "connected" ? "Connected" :
    kind === "uploaded"  ? "Uploaded"  :
    "Demo";
  const dotColor =
    kind === "connected" ? "var(--qm-hover-blue)" :
    kind === "uploaded"  ? "var(--qm-charcoal)"    :
    "var(--qm-warning)";
  return (
    <div className="trust" style={{ paddingTop: compact ? 6 : 8, paddingBottom: compact ? 6 : 8 }}>
      <span className="dot" style={{ background: dotColor }} />
      <span>
        <b>{distributor}</b>
      </span>
      <span className="ml-auto qm-pill"
            style={{
              background: kind === "demo" ? "#FEF3C7" : "#F3F4F6",
              color:      kind === "demo" ? "#92400E" : "var(--qm-gray-700)",
              fontSize: 10, padding: "2px 8px"
            }}>{tag}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// RefreshAvailablePill / Banner — quote "out-of-date" treatment.
// Justin doctrine lock (May 21): pricing may have changed, but the
// quote stays fully visible. No greyout, no archive, no "Expired"
// language anywhere. Amber pill (not red). The quote is living, not
// invalidated. Primary action is always "Request Refresh."
// ────────────────────────────────────────────────────────────────
function RefreshAvailablePill({ size = "sm" }) {
  const fontSize = size === "xs" ? 9.5 : 10.5;
  return (
    <span className="qm-pill" style={{
      background: "var(--qm-amber-bg)",
      color: "var(--qm-amber-fg)",
      border: "1px solid rgba(217,119,6,.30)",
      fontSize, padding: "2px 8px",
      letterSpacing: ".04em",
      fontWeight: 500,
    }}>Refresh available</span>
  );
}

// Banner sits at top of a quote receipt. Calm, document-feel. Single
// CTA. Subtitle carries the quote date so the chef anchors when this
// snapshot was taken.
function RefreshAvailableBanner({ quoteDate = DEMO.quoteDate, dense = false, onRefresh }) {
  return (
    <div
      style={{
        background: "var(--qm-amber-bg)",
        borderTop: "1px solid rgba(217,119,6,.30)",
        borderBottom: "1px solid rgba(217,119,6,.30)",
        padding: dense ? "10px 18px" : "12px 22px",
      }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-2">
          <Icon name="alert-circle" size={14} color="var(--qm-amber-fg)" />
          <span className="serif font-medium" style={{ fontSize: dense ? 14 : 15, color: "var(--qm-amber-fg)" }}>
            Pricing may have changed.
          </span>
        </span>
        <span className="text-[12px]" style={{ color: "var(--qm-amber-fg)", opacity: .85 }}>
          Quote from {quoteDate}.
        </span>
        <button
          onClick={onRefresh}
          className="ml-auto qm-btn qm-btn-orange"
          style={{ padding: "8px 14px", fontSize: 12.5 }}
          title="Request a refreshed quote from your rep"
        >
          <Icon name="refresh-cw" size={13} color="white" /> Request Refresh
        </button>
      </div>
    </div>
  );
}
// Two variants:
//   variant="horizontal" → "Quote" + boxed/shadowed "ME" + small truck silhouette,
//                          with "Chef Edition" eyebrow underneath.
//   variant="square"     → just "QM" with offset shadow on the M (CLAUDE.md
//                          licensed heavy shadow). For compact / favicon use.
// ─────────────────────────────────────────────────────────────────────────────
function QuoteMeWordmark({ variant = "horizontal", height = 36, edition = "Chef Edition" }) {
  if (variant === "square") {
    return (
      <div
        className="inline-flex items-baseline justify-center"
        style={{
          width: height,
          height: height,
          fontFamily: "var(--qm-sans)",
          fontWeight: 700,
          color: "var(--qm-charcoal)",
          lineHeight: 1,
          letterSpacing: "-.02em",
          fontSize: height * 0.46,
        }}
        aria-label="QuoteMe"
        title="QuoteMe"
      >
        <span>Q</span>
        <span
          style={{
            color: "var(--qm-orange)",
            textShadow: "2px 2px 0 var(--qm-charcoal)",
            marginLeft: 1,
          }}
        >M</span>
      </div>
    );
  }
  // Horizontal: "QuoteMe" + truck silhouette + Chef Edition eyebrow
  const fontPx = height * 0.62;
  return (
    <div
      className="inline-flex flex-col"
      style={{ lineHeight: 1, fontFamily: "var(--qm-sans)" }}
      aria-label={`QuoteMe ${edition}`}
      title={`QuoteMe ${edition}`}
    >
      <div className="inline-flex items-center" style={{ gap: 6 }}>
        <span
          style={{
            fontWeight: 600,
            color: "var(--qm-charcoal)",
            fontSize: fontPx,
            letterSpacing: "-.015em",
            lineHeight: 1,
          }}
        >Quote</span>
        <span
          style={{
            fontWeight: 800,
            color: "var(--qm-orange)",
            fontSize: fontPx,
            textShadow: "2px 2px 0 var(--qm-charcoal)",
            letterSpacing: "-.015em",
            lineHeight: 1,
          }}
        >ME</span>
        <svg viewBox="0 0 28 18" width={fontPx * 1.05} height={fontPx * 0.68} style={{ marginLeft: 1 }}>
          {/* Truck silhouette — charcoal stroke, no fill, no blue blob */}
          <rect x="1" y="3" width="16" height="10" rx="1.2"
                fill="none" stroke="var(--qm-charcoal)" strokeWidth="1.6" />
          <path d="M17 6 H22 L26 9 V13 H17 Z"
                fill="none" stroke="var(--qm-charcoal)" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="7"  cy="14.5" r="2.2" fill="#fff" stroke="var(--qm-charcoal)" strokeWidth="1.6" />
          <circle cx="20" cy="14.5" r="2.2" fill="#fff" stroke="var(--qm-charcoal)" strokeWidth="1.6" />
        </svg>
      </div>
      {edition && (
        <div
          style={{
            marginTop: height * 0.10,
            fontSize: Math.max(9, height * 0.22),
            letterSpacing: ".22em",
            textTransform: "uppercase",
            color: "var(--qm-gray-700)",
            fontWeight: 500,
          }}
        >
          {edition}
        </div>
      )}
    </div>
  );
}
// ──────────────────────────────────────────────────────────────
// QuoteDocument — the document-feel quote, used on Receipt + Welcome.
// Renders categories with line items, gap line, totals. Looks like a printed
// receipt, not an app UI. Used as the "hero" on Quote Receipt screen.
// ─────────────────────────────────────────────────────────────────────────────
function QuoteDocument({ density = "regular", showHeader = true, preview = false }) {
  const rowPad = density === "tight" ? "py-2" : "py-2.5";
  // Collapsible category groups (Moose May 21 item #5). Default all expanded;
  // per-session memory only. Doctrine: snap, no theater.
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggleCat = (cat) => {
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };
  return (
    <div className="px-5 pt-5 pb-6">
      {showHeader && (
        <div className="mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".14em" }}>QUOTE · {DEMO.quoteNo}</div>
            {preview && <PreviewPill size="xs" />}
          </div>
          <h1 className="serif font-semibold mt-1 ink" style={{ fontSize: 26, lineHeight: 1.15 }}>
            {DEMO.restaurant}
          </h1>
          <div className="mt-1 ink-soft text-[13px] leading-relaxed">
            For <span className="ink">{DEMO.chefFirst} {DEMO.chefLast}</span>
            <span className="ink-faint"> · {DEMO.quoteDate}</span>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="flex-1">
              <div className="qm-eyebrow" style={{ fontSize: 9 }}>YOUR REP</div>
              <div className="text-[13px] ink mt-0.5">{DEMO.rep}</div>
              <div className="text-[12px] ink-soft num">{DEMO.repPhone}</div>
            </div>
            <div className="flex-1 text-right">
              <div className="qm-eyebrow" style={{ fontSize: 9 }}>DISTRIBUTOR</div>
              <div className="text-[13px] ink mt-0.5">{DEMO.distributorShort}</div>
              <div className="text-[12px] ink-soft">{DEMO.catalogUpdated}</div>
            </div>
          </div>
        </div>
      )}

      <div className="doc-divider-thick" />

      {QUOTE.map((group, gi) => {
        const subtotal = group.items.reduce((a, i) => a + i.qty * i.unit, 0);
        const isCollapsed = collapsed.has(group.cat);
        return (
          <div key={gi} className="mt-4">
            <button
              onClick={() => toggleCat(group.cat)}
              className="w-full flex items-baseline justify-between text-left"
              aria-expanded={!isCollapsed}
              title={isCollapsed ? `Expand ${group.cat}` : `Collapse ${group.cat}`}
            >
              <h3 className="serif font-medium ink inline-flex items-baseline gap-2"
                  style={{ fontSize: 15, letterSpacing: ".08em", textTransform: "uppercase" }}>
                <Icon name={isCollapsed ? "chevron-right" : "chevron-down"} size={13} color="var(--qm-gray-700)" />
                {group.cat}
              </h3>
              <span className="text-[11px] ink-faint num">
                {isCollapsed ? `${group.items.length} items · ${money(subtotal)}` : `${group.items.length} items`}
              </span>
            </button>
            {!isCollapsed && (
              <div className="mt-1">
                {group.items.map((it, ii) => (
                  <div key={ii} className={cls("doc-divider flex items-start gap-3", rowPad)}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] ink leading-snug">{it.name}</div>
                      <div className="text-[11px] ink-faint mt-0.5 num">
                        {it.pack}{it.note ? ` · ${it.note}` : ""}
                      </div>
                    </div>
                    <div className="text-right num shrink-0">
                      <div className="text-[12.5px] ink-soft">{it.qty} × {money(it.unit)}</div>
                      <div className="text-[13.5px] ink font-medium">{money(it.qty * it.unit)}</div>
                    </div>
                  </div>
                ))}
                <div className="doc-divider flex items-center justify-between pt-2 pb-1">
                  <span className="text-[12px] ink-soft">Subtotal · {group.cat}</span>
                  <span className="text-[13px] ink font-medium num">{money(subtotal)}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Gap line */}
      <div className="mt-5 px-3 py-3 rounded-md" style={{ background: "rgba(165,207,221,.18)", border: "1px solid rgba(165,207,221,.45)" }}>
        <div className="text-[12.5px] ink leading-snug">
          Some items will be handled directly by your rep.
        </div>
        <ul className="mt-1.5 space-y-0.5">
          {GAP_ITEMS.map((g, i) => (
            <li key={i} className="text-[11.5px] ink-soft leading-snug">— {g}</li>
          ))}
        </ul>
      </div>

      <div className="doc-divider-thick mt-5" />
      <div className="flex items-baseline justify-between pt-3">
        <span className="serif text-[15px] ink">Quote total</span>
        <span className="serif text-[22px] font-semibold ink num">{money(QUOTE_TOTAL)}</span>
      </div>
      <div className="mt-1 text-[11px] ink-faint">
        Prices from {DEMO.distributor}, updated {DEMO.catalogUpdated}.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section header for the canvas — keeps section copy in one place.
// ─────────────────────────────────────────────────────────────────────────────
function SectionNote({ title, body }) {
  return (
    <div style={{ width: 480, paddingTop: 6 }}>
      <div className="serif" style={{ fontSize: 19, fontWeight: 600, color: "rgba(40,30,20,.85)" }}>{title}</div>
      {body && <div style={{ fontSize: 12.5, color: "rgba(60,50,40,.65)", marginTop: 6, lineHeight: 1.5 }}>{body}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// QuoteStatusPill — single, mutually-exclusive state per row.
// V2 spec lock (received → opened → replied → converted).
// Converted gets serif weight + warm-paper bg as the terminal positive state.
// ─────────────────────────────────────────────────────────────────
function QuoteStatusPill({ status }) {
  if (status === "converted") {
    return (
      <span className="qm-pill" style={{
        background: "var(--qm-warm-paper)",
        color: "var(--qm-charcoal)",
        border: "1px solid var(--qm-soft-line)",
        fontSize: 10, padding: "2px 8px",
        fontFamily: "var(--qm-serif)", fontWeight: 500,
      }}>Order guide built</span>
    );
  }
  const map = {
    received: { label: "Received", bg: "#F3F4F6",                 fg: "var(--qm-gray-700)" },
    opened:   { label: "Opened",   bg: "rgba(165,207,221,.25)",   fg: "#2A5F6F"            },
    replied:  { label: "Replied",  bg: "#DCFCE7",                 fg: "#15803D"            },
  };
  const m = map[status] || map.received;
  return (
    <span className="qm-pill" style={{ background: m.bg, color: m.fg, fontSize: 10, padding: "2px 8px" }}>
      {m.label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────
// PreviewPill — stamps on any quote a rep hasn't confirmed yet.
// Opus c11 lock (May 18): visible on every chef surface the quote appears on —
// current-quote tile, previous-quote rows, receipt page. Trust the design to
// not dominate; this is a quiet operational signal, not a banner.
// ────────────────────────────────────────────────────────────────
function PreviewPill({ size = "sm" }) {
  const fontSize = size === "xs" ? 9.5 : 10;
  return (
    <span className="qm-pill" style={{
      background: "var(--qm-warm-paper)",
      color: "var(--qm-gray-700)",
      border: "1px solid var(--qm-soft-line)",
      fontSize, padding: "2px 7px",
      letterSpacing: ".06em",
      textTransform: "uppercase",
      fontWeight: 500,
    }}>Preview</span>
  );
}

// ─────────────────────────────────────────────────────────────────
// ChefPhoneFlow — per-artboard mini-router.
// Each gallery artboard is its own state machine. Buttons inside the phone
// shell call `nav("target")` to advance THIS shell. The gallery is the
// overview; the flow is the way a chef actually walks the surface.
// FLOW_ROUTES is the registry — adding a route here makes it nav-able.
// ─────────────────────────────────────────────────────────────────
const FLOW_ROUTES = {
  "welcome":            { component: "ChefWelcomePage" },
  "entry":              { component: "ChefEntryPage" },
  "status":             { component: "ChefStatusPage" },
  "receipt":            { component: "ChefQuoteReceiptPage" },
  "receipt-stale":      { component: "ChefQuoteReceiptPage", props: { stale: true, quoteDate: "Apr 20, 2026" } },
  "og":                 { component: "ChefOrderGuidePage" },
  "dashboard":          { component: "ChefDashboardEnhanced" },
  "dashboard-basic":    { component: "ChefDashboardPage" },
  "dashboard-empty":    { component: "ChefDashboardPage",  props: { state: "empty" } },
  "dashboard-no-rep":   { component: "ChefDashboardNoRep" },
  "dashboard-no-cat":   { component: "ChefDashboardNoCatalog" },
  "quote-readonly":     { component: "ChefQuoteReadOnly" },
  "catalog":            { component: "ChefCatalogSelectionPage" },
  "catalog-upload":     { component: "ChefCatalogUploadPage" },
  "expired":            { component: "ChefMagicLinkExpired" },
  "stuck":              { component: "ChefStatusStuck" },
  "modal-multi":        { component: "MultiRestaurantModal" },

  // Desi May 18 — tab shell (Quotes / Distributors / Settings)
  "tab-home":               { component: "ChefHomeTab" },

  // Desi May 21 — menus library + pull-quote flow + spread
  "menus":                  { component: "ChefMenusIndexPage" },
  "menus-empty":            { component: "ChefMenusIndexPage",   props: { state: "empty" } },
  "menu-detail":            { component: "ChefMenuDetailPage" },
  "menu-detail-draft":      { component: "ChefMenuDetailPage",   props: { menuId: "M-05" } },
  "pull-entry":             { component: "ChefPullEntryPage" },
  "pull-entry-unaff":       { component: "ChefPullEntryPage",    props: { distributor: { short: "Riverbend Produce", name: "Riverbend Farm Produce", scope: "Hudson Valley", items: 612, updated: "May 9",  affiliated: false } } },
  "pull-status":            { component: "ChefPullStatusPage",   props: { stage: 1 } },
  "pull-receipt":           { component: "ChefPullReceiptPage",  props: { repName: "Cal Doyle", repEmail: "cal@northwindseafood.com" } },
  "pull-receipt-unaff":     { component: "ChefPullReceiptPage",  props: { repName: "Pat Eberle", repEmail: "pat@riverbendfarm.com", distributor: { short: "Riverbend Produce", name: "Riverbend Farm Produce", scope: "Hudson Valley", items: 612, updated: "May 9",  affiliated: false } } },
  "stack":                  { component: "ChefMenuStackMobile" },
  "spread":                 { component: "ChefMenuStackMobile" }, // legacy alias — remove after sweep

  // Desi May 26 — D6 quote-state document chrome (Preview / Distributor / Confirmed).
  "quote-state-preview":     { component: "ChefQuoteStatePreview" },
  "quote-state-distributor": { component: "ChefQuoteStateDistributor" },
  "quote-state-confirmed":   { component: "ChefQuoteStateConfirmed" },

  // Desi May 27 — Chef v3 packet · Rep suite (Phase 1B).
  "rep-welcome":              { component: "RepWelcomePage" },
  "rep-triage":               { component: "RepTriagePage" },
  "rep-triage-desktop":       { component: "RepTriagePageDesktop" },
  "rep-incoming":             { component: "RepIncomingQuotePage" },
  "rep-incoming-coverage":    { component: "RepIncomingQuoteCoverage" },
  "rep-pricing":              { component: "RepPricingOnlyView" },
  "rep-catalog":              { component: "RepTriagePage" }, // stub — catalog confirm page later
  "rep-settings":             { component: "RepTriagePage" }, // stub

  // Desi May 27 — Stack V2 (design exploration only, not production)
  "stack-v2-default":         { component: "ChefMenuStackV2Default" },
  "stack-v2-builder":         { component: "ChefMenuStackV2Builder" },
  "stack-v2-smart":           { component: "ChefMenuStackV2SmartSuggest" },
  "stack-v2-first":           { component: "ChefMenuStackV2FirstStack" },
  "stack-v2-pin-drawer":      { component: "PinToStackDrawerDemo" },

  // Desi May 27 — chef-side distributor entry (grow the network).
  "chef-distributor-entry":          { component: "ChefDistributorEntryPage" },
  "chef-distributor-entry-upload":   { component: "ChefDistributorEntryPage",        props: { mode: "upload" } },
  "chef-distributor-entry-request":  { component: "ChefDistributorEntryPage",        props: { mode: "request" } },
  "chef-distributor-entry-desktop":  { component: "ChefDistributorEntryPageDesktop" },

  // Desi May 23 — Stack roster (chef's hand-picked lineup) + Add page.
  "stack-roster":            { component: "ChefStackRosterMobile" },
  "stack-roster-cards":      { component: "ChefStackRosterMobile", props: { variant: "layered-cards" } },
  "stack-roster-table":      { component: "ChefStackRosterMobile", props: { variant: "doc-table" } },
  "stack-roster-lineup":     { component: "ChefStackRosterMobile", props: { variant: "lineup" } },
  "stack-roster-empty":      { component: "ChefStackRosterMobile", props: { state: "empty" } },
  "stack-roster-add":        { component: "ChefStackAddPage" },
  "tab-home-returning":     { component: "ChefHomeTab",         props: { state: "returning" } },
  "tab-home-empty":         { component: "ChefHomeTab",         props: { state: "empty" } },
  "tab-distributors":       { component: "ChefDistributorsTab" },
  "tab-distributors-empty": { component: "ChefDistributorsTab", props: { state: "empty" } },
  "tab-settings":           { component: "ChefSettingsTab" },
  "tab-settings-empty":     { component: "ChefSettingsTab",     props: { state: "empty" } },
};

function ChefPhoneFlow({ initial = "entry", initialProps = {} }) {
  const [screen, setScreen] = useState(initial);
  const [extra, setExtra] = useState(initialProps);
  // Re-sync when the gallery flips initial (e.g. via Tweaks)
  useEffect(() => { setScreen(initial); setExtra(initialProps); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initial, JSON.stringify(initialProps)]);

  // Navigating away from the initial screen normally clears initialProps —
  // Tweak controls only matter on the initial render. Pages that need to
  // hand state to the next screen (e.g. carried-distributor pull flow) pass
  // it as the second arg to nav(target, props).
  const nav = (target, props = {}) => { setScreen(target); setExtra(props); };

  const route = FLOW_ROUTES[screen];
  if (!route) {
    return (
      <PhoneShell>
        <div className="p-5 text-[13px] ink-faint">Unknown screen: {screen}</div>
      </PhoneShell>
    );
  }
  const Comp = window[route.component];
  if (!Comp) {
    return (
      <PhoneShell>
        <div className="p-5 text-[13px] ink-faint">Loading {route.component}…</div>
      </PhoneShell>
    );
  }
  return <Comp nav={nav} {...(route.props || {})} {...extra} />;
}

// Helpful debug — lets us write `nav?.("target")` everywhere without crashes
// when a screen is rendered standalone (no nav prop wired).
const noopNav = () => {};

// Export
Object.assign(window, {
  DEMO, QUOTE, QUOTE_TOTAL, GAP_ITEMS, PREVIOUS_QUOTES,
  money, cls, noopNav,
  Icon, PhoneShell, MobileTopBar, DesktopTopBar, TrustRibbon, QuoteDocument, SectionNote,
  QuoteMeWordmark,
  QuoteStatusPill, PreviewPill, ChefPhoneFlow, FLOW_ROUTES,
  RefreshAvailablePill, RefreshAvailableBanner,
});
