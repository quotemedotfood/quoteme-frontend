// src/screens-brand.jsx — Brand Suite, full flow (Eighteen/Moose, Jun 6).
//
// The Brand account type, expanded to the signed-off 9-page flow. Brands get
// their line carried and tracked across distributors. Brands do NOT receive
// quotes — there is NO incoming-quotes surface anywhere in this shell. They
// send PACKAGES to distributors and track notification status.
//
// ONE SHELL: every page rides the shared NewspaperShell (RoleSidebar on desktop,
// NewspaperMobileShell drawer on mobile) — never the rep or distributor shell.
// A role:brand user lands in /brand/* always.
//
// Brand-specific nav (NOT the rep nav — no New Quote, no Quotes, no Customers):
//   Dashboard · Catalog · Capture · Packages · Notifications · Distributors ·
//   Team (admin) · Settings   (+ Profile, reached from Settings)
//
// Doctrine: QuoteMe Sacred Orange (#F2993D) = one primary action per surface
// (the brand is a QuoteMe customer inside the app). Verb guardrails: no sign up
// / get started / activate / platform / leverage / scale. Playfair + DM Sans,
// calm + operational. Placeholder copy where Justin's language isn't locked.
// ─────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// Demo data — invented off the canonical Hudson, NY cast.
// ═════════════════════════════════════════════════════════════════════════════
const BRAND_DEMO = {
  brand:        "Highland Larder Co.",
  brandShort:   "Highland Larder",
  mono:         "HL",
  category:     "Specialty pantry & preserves",
  city:         "Hudson, NY",
  region:       "Hudson Valley",
  manager:      "Tessa Hartley",
  managerFirst: "Tessa",
  managerEmail: "tessa@highlandlarder.co",
  managerPhone: "(518) 555-0172",
  site:         "highlandlarder.co",
  founded:      "2019",
  catalog: { name: "Highland Larder — 2026 Catalog", items: 38, updated: "May 14, 2026", version: "v4", status: "live" },
};

const BRAND_REPS = [
  { name: "Tessa Hartley",  territory: "Hudson Valley · Capital District", email: "tessa@highlandlarder.co",  publicize: true  },
  { name: "Ramona Vye",     territory: "NYC metro · Long Island",          email: "ramona@highlandlarder.co", publicize: false },
  { name: "Cole Bertram",   territory: "Berkshires · Western MA",          email: null,                       publicize: false },
];

// The brand's OWN product catalog — names + pack specs. Brands don't price.
const BRAND_PRODUCTS = [
  { name: "Wild Ramp Mustard",         spec: "9 oz jar · case of 12",  tag: "Year-round" },
  { name: "Sour Cherry Mostarda",      spec: "8 oz jar · case of 12",  tag: "Seasonal" },
  { name: "Smoked Maple Apple Butter", spec: "10 oz jar · case of 12", tag: "Year-round" },
  { name: "Black Walnut Conserve",     spec: "8 oz jar · case of 12",  tag: "Limited" },
  { name: "Hudson Honey, wildflower",  spec: "1 lb jar · case of 6",   tag: "Year-round" },
  { name: "Pickled Fiddleheads",       spec: "12 oz jar · case of 12", tag: "Seasonal" },
  { name: "Tomato Jam, smoked",        spec: "9 oz jar · case of 12",  tag: "Year-round" },
  { name: "Quince Paste",              spec: "7 oz bar · case of 16",  tag: "Seasonal" },
];

// notify lifecycle the brand TRACKS: sent → opened → loaded → live.
const BRAND_DISTRIBUTORS = [
  { short: "D'Lisius",          name: "D'Lisius Distribution Co.",   region: "Hudson Valley · Capital District", rep: "Marcus Rivera", repEmail: "marcus@dlisius.co",     since: "Feb 2026", notify: "live",   lastUpdate: "May 14, 2026", carriedCount: 31 },
  { short: "Hudson Provisions", name: "Hudson Valley Provisions",    region: "Columbia · Greene counties",       rep: "Anna Mireles",  repEmail: "anna@hvprovisions.com", since: "Mar 2026", notify: "loaded", lastUpdate: "May 12, 2026", carriedCount: 22 },
  { short: "Northwind",         name: "Northwind Seafood Co.",       region: "Hudson Valley · Berkshires",       rep: "Cal Doyle",     repEmail: null,                    since: null,       notify: "opened", lastUpdate: "May 10, 2026", carriedCount: 0  },
  { short: "Foothill Dairy",    name: "Foothill Dairy Collective",   region: "Columbia · Greene counties",       rep: "Dana Webb",     repEmail: null,                    since: null,       notify: "sent",   lastUpdate: "May 9, 2026",  carriedCount: 0  },
];

const BRAND_AREA_DISTRIBUTORS = [
  { short: "Riverbend Produce",  name: "Riverbend Farm Produce",       region: "Hudson Valley",     items: 612, updated: "May 9", affiliated: true  },
  { short: "Two Stones",         name: "Two Stones Bakery, wholesale", region: "Hudson · Kingston", items: 84,  updated: "May 7", affiliated: false },
  { short: "Catskill Specialty", name: "Catskill Specialty Cheese",    region: "Catskill · Greene", items: 119, updated: "May 4", affiliated: false },
];

// Packages — a curated selection of the brand's products sent to ONE
// distributor. status: draft | sent. Sent packages carry a notify lifecycle.
const BRAND_PACKAGES = [
  { id: "PKG-205", title: "Untitled package",                 distributor: null,                items: 3,  status: "draft", notify: null,     created: "May 16" },
  { id: "PKG-204", title: "Spring preserves — Holloway pitch", distributor: "D'Lisius",          items: 8,  status: "sent",  notify: "opened", created: "May 14" },
  { id: "PKG-203", title: "Core line — Hudson Provisions",     distributor: "Hudson Provisions", items: 12, status: "sent",  notify: "loaded", created: "May 10" },
  { id: "PKG-202", title: "Seafood-pairing set — Northwind",   distributor: "Northwind",         items: 5,  status: "sent",  notify: "opened", created: "May 9"  },
  { id: "PKG-198", title: "Core line — D'Lisius",              distributor: "D'Lisius",          items: 14, status: "sent",  notify: "live",   created: "Feb 18" },
];

const BRAND_TEAM = [
  { name: "Tessa Hartley", role: "Owner · admin", email: "tessa@highlandlarder.co",  status: "active"  },
  { name: "Ramona Vye",    role: "Sales",         email: "ramona@highlandlarder.co", status: "active"  },
  { name: "Cole Bertram",  role: "Sales",         email: "cole@highlandlarder.co",   status: "invited" },
];

// ═════════════════════════════════════════════════════════════════════════════
// Status primitives
// ═════════════════════════════════════════════════════════════════════════════
function NotifyStatusBadge({ status }) {
  const map = {
    live:   { label: "In their catalog", bg: "rgba(127,174,194,.22)", fg: "#2A5F6F",            dot: "var(--accent)" },
    loaded: { label: "Loaded",           bg: "#F3F4F6",               fg: "var(--qm-gray-700)", dot: "var(--qm-charcoal)" },
    opened: { label: "Opened",           bg: "#F3F4F6",               fg: "var(--qm-gray-700)", dot: "var(--qm-gray-400)" },
    sent:   { label: "Sent",             bg: "#FFF9F3",               fg: "var(--qm-gray-700)", dot: "var(--qm-warning)" },
    draft:  { label: "Draft",            bg: "#fff",                  fg: "var(--qm-gray-500)", dot: "var(--qm-gray-400)" },
  };
  const m = map[status] || map.sent;
  return (
    <span className="qm-pill" style={{ background: m.bg, color: m.fg, border: (status === "sent" || status === "draft") ? "1px solid var(--qm-soft-line)" : "none", fontSize: 10, padding: "2px 8px", gap: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: m.dot }} />
      {m.label}
    </span>
  );
}

// Horizontal notify stepper for the read-only Notifications page.
function NotifyStepper({ status }) {
  const steps = ["sent", "opened", "loaded", "live"];
  const labels = { sent: "Sent", opened: "Opened", loaded: "Loaded", live: "In catalog" };
  const idx = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {steps.map((s, i) => {
        const done = i <= idx;
        return (
          <React.Fragment key={s}>
            <span className="inline-flex items-center gap-1">
              <span style={{ width: 7, height: 7, borderRadius: 999, background: done ? "var(--accent)" : "var(--qm-gray-200)" }} />
              <span className="num" style={{ fontSize: 9.5, color: done ? "var(--qm-charcoal)" : "var(--qm-gray-400)", letterSpacing: ".02em" }}>{labels[s]}</span>
            </span>
            {i < steps.length - 1 && <span style={{ flex: 1, height: 1, background: i < idx ? "var(--accent)" : "var(--qm-gray-200)", minWidth: 8 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function BrandMark({ size = 44, radius, onDark = false }) {
  return (
    <span className="inline-flex items-center justify-center shrink-0 serif"
      style={{ width: size, height: size, borderRadius: radius != null ? radius : Math.round(size * 0.22),
        background: onDark ? "rgba(255,255,255,.12)" : "#1F1A14", color: onDark ? "#fff" : "#FBFAF7",
        fontWeight: 600, fontSize: size * 0.4, lineHeight: 1, letterSpacing: "-.01em" }} aria-hidden="true">
      {BRAND_DEMO.mono}
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// THE ONE SHELL, brand-configured. Nav + identity feed the shared NewspaperShell.
// ═════════════════════════════════════════════════════════════════════════════
function brandNav(nav, active) {
  const draftCount = BRAND_PACKAGES.filter(p => p.status === "draft").length;
  const sentCount  = BRAND_PACKAGES.filter(p => p.status === "sent").length;
  return [
    { group: "THE DAILY WORK", items: [
      { id: "dashboard",     icon: "layout-grid",   label: "Dashboard",     onClick: () => nav("brand-dashboard") },
      { id: "capture",       icon: "scan-line",     label: "Capture",       onClick: () => nav("brand-capture") },
      { id: "packages",      icon: "package",       label: "Packages",      count: BRAND_PACKAGES.length, onClick: () => nav("brand-packages") },
      { id: "notifications", icon: "bell",          label: "Notifications", count: sentCount, onClick: () => nav("brand-notifications") },
    ] },
    { group: "YOUR LINE", items: [
      { id: "catalog",       icon: "notebook-text", label: "Catalog",       count: BRAND_PRODUCTS.length, onClick: () => nav("brand-catalog") },
    ] },
    { group: "NETWORK", items: [
      { id: "distributors",  icon: "truck",         label: "Distributors",  count: BRAND_DISTRIBUTORS.length, onClick: () => nav("brand-distributors") },
      { id: "team",          icon: "users",         label: "Team",          onClick: () => nav("brand-team") },
    ] },
  ];
}

const brandSettingsDest = (nav) => ({
  id: "settings", icon: "settings", label: "Settings", onClick: () => nav("brand-settings"),
  sub: [
    { label: "Company", onClick: () => nav("brand-settings") },
    { label: "Profile", onClick: () => nav("brand-profile") },
    { label: "Billing", onClick: () => nav("brand-settings") },
  ],
});

const BRAND_IDENTITY = {
  eyebrow: "BRAND", title: BRAND_DEMO.brandShort, sub: BRAND_DEMO.city,
  meta: BRAND_DEMO.manager, mono: BRAND_DEMO.mono, initials: BRAND_DEMO.mono,
};

// One wrapper, both form factors. variant="mobile" → drawer; "desktop" → sidebar.
function BrandShell({ active, nav = noopNav, variant = "mobile", trust = null, children, maxWidth = 820, initialMode = "open" }) {
  return (
    <NewspaperShell
      variant={variant}
      edition="Brand Edition"
      identity={BRAND_IDENTITY}
      nav={brandNav(nav, active)}
      active={active}
      settings={brandSettingsDest(nav)}
      trust={trust}
      onNav={nav}
      maxWidth={maxWidth}
      initialMode={initialMode}
    >
      {variant === "mobile" ? <div className="px-5 pt-5 pb-8">{children}</div> : children}
    </NewspaperShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// AUTH ROLE-CHOOSER — four live role cards. "I'm a brand" un-greyed, NEW flag.
// ═════════════════════════════════════════════════════════════════════════════
const ROLE_CARDS = [
  { id: "restaurant",  icon: "utensils",  title: "I run a restaurant",      sub: "Build quotes from your menu and price them against your distributors." },
  { id: "rep",         icon: "briefcase", title: "I'm a rep",               sub: "Price quotes for your chefs and keep your book in one place." },
  { id: "distributor", icon: "warehouse", title: "I run a distributorship", sub: "Manage your catalog, your reps, and the chefs you serve." },
  { id: "brand",       icon: "package",   title: "I'm a brand",             sub: "Get your line carried, loaded, and tracked across distributors.", isNew: true },
];

function RoleCard({ role, onPick, desktop = false }) {
  return (
    <button onClick={() => onPick && onPick(role.id)} className="w-full text-left bg-white border hairline rounded-lg hover:shadow-sm transition-shadow flex items-center gap-4"
      style={{ padding: desktop ? "20px 22px" : "16px 16px" }}>
      <span className="inline-flex items-center justify-center shrink-0 rounded-md" style={{ width: desktop ? 48 : 42, height: desktop ? 48 : 42, background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
        <Icon name={role.icon} size={desktop ? 22 : 20} color="var(--qm-charcoal)" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="serif font-medium ink" style={{ fontSize: desktop ? 18 : 16, lineHeight: 1.2 }}>{role.title}</span>
          {role.isNew && <span className="qm-pill" style={{ background: "rgba(127,174,194,.22)", color: "#2A5F6F", fontSize: 9, padding: "1px 7px", letterSpacing: ".06em" }}>NEW</span>}
        </span>
        <span className="block ink-soft mt-1 leading-snug" style={{ fontSize: desktop ? 13 : 12 }}>{role.sub}</span>
      </span>
      <Icon name="arrow-right" size={desktop ? 20 : 18} color="var(--qm-gray-400)" />
    </button>
  );
}

function RoleChooserBody({ desktop = false, onPick }) {
  return (
    <div>
      <div className="qm-eyebrow" style={{ fontSize: desktop ? 11 : 10 }}>WELCOME TO QUOTEME</div>
      <h1 className="serif font-semibold ink mt-2" style={{ fontSize: desktop ? 34 : 25, lineHeight: 1.12, letterSpacing: "-.01em" }}>Which best describes you?</h1>
      <p className="ink-soft mt-2 leading-relaxed" style={{ fontSize: desktop ? 14.5 : 13, maxWidth: desktop ? 460 : 320 }}>
        Pick the one that fits. You can add another later — accounts can wear more than one hat.
      </p>
      <div className="mt-6 flex flex-col gap-3" style={{ maxWidth: desktop ? 520 : "100%" }}>
        {ROLE_CARDS.map((r) => <RoleCard key={r.id} role={r} onPick={onPick} desktop={desktop} />)}
      </div>
      <div className="mt-7 flex items-center gap-2 text-[12px] ink-faint" style={{ borderTop: "1px solid var(--qm-soft-line)", paddingTop: 16 }}>
        <Icon name="link" size={14} color="var(--qm-gray-400)" />
        <span>Already have a link from a colleague? Open it and you'll land right where you left off.</span>
      </div>
    </div>
  );
}

function AuthRoleChooserMobile({ nav = noopNav }) {
  const onPick = (id) => { if (id === "brand") nav("brand-dashboard"); };
  return (
    <PhoneShell>
      <div className="flex items-center gap-2 px-5 py-3 border-b hairline bg-white" style={{ flex: "0 0 auto" }}>
        <QuoteMeWordmark variant="horizontal" height={30} edition={null} />
      </div>
      <div className="scroller px-5 pt-6 pb-8"><RoleChooserBody onPick={onPick} /></div>
    </PhoneShell>
  );
}
function AuthRoleChooserDesktop({ nav = noopNav }) {
  const onPick = (id) => { if (id === "brand") nav("brand-dashboard"); };
  return (
    <div className="desktop" style={{ background: "var(--qm-warm-paper)", minHeight: 760 }}>
      <div className="flex items-center px-10 py-5 border-b hairline" style={{ background: "#fff" }}>
        <QuoteMeWordmark variant="horizontal" height={34} edition={null} />
      </div>
      <div className="flex items-center justify-center" style={{ padding: "64px 40px" }}>
        <div className="bg-white border hairline rounded-xl" style={{ maxWidth: 600, width: "100%", padding: "44px 44px 36px", boxShadow: "var(--qm-shadow-lg)" }}>
          <RoleChooserBody desktop onPick={onPick} />
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// /brand/dashboard — brand home. Catalog status · recent packages · notifications.
// NO inbox. One orange = the brand's core verb (capture → build a package).
// ═════════════════════════════════════════════════════════════════════════════
function BrandDashboardBody({ desktop = false, nav = noopNav }) {
  const cat = BRAND_DEMO.catalog;
  const recent = BRAND_PACKAGES.slice(0, 4);
  const live = BRAND_DISTRIBUTORS.filter(d => d.notify === "live").length;

  return (
    <>
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: desktop ? 34 : 24, lineHeight: 1.12 }}>Hi, {BRAND_DEMO.managerFirst}.</h1>
        <p className="ink-faint mt-1 num" style={{ fontSize: desktop ? 14 : 12.5 }}>{BRAND_DEMO.brand} · {BRAND_DEMO.city}</p>
      </div>

      <div className={desktop ? "mt-7 grid grid-cols-[1fr_300px] gap-8 items-start" : "mt-5"}>
        <div>
          {/* CATALOG STATUS */}
          <div className="qm-eyebrow" style={{ fontSize: desktop ? 11 : 10 }}>YOUR CATALOG</div>
          <button onClick={() => nav("brand-catalog")} className="mt-2 w-full text-left bg-white border hairline rounded-xl hover:shadow-sm transition-shadow" style={{ padding: desktop ? 22 : 18 }}>
            <div className="flex items-start gap-4">
              <BrandMark size={desktop ? 50 : 46} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="serif font-medium ink leading-snug" style={{ fontSize: desktop ? 18 : 16 }}>{cat.name}</div>
                </div>
                <div className="ink-soft mt-1 num" style={{ fontSize: desktop ? 13 : 12 }}>{cat.items} products · {cat.version} · updated {cat.updated}</div>
                <div className="mt-2"><CatalogStatusBadge status="connected" /></div>
              </div>
            </div>
          </button>

          {/* ONE ORANGE — capture → package */}
          <button onClick={() => nav("brand-capture")} className="qm-btn qm-btn-orange qm-btn-full mt-4" style={{ padding: "14px 18px", fontSize: 15 }}>
            <Icon name="scan-line" size={17} color="#fff" /> Capture a menu &amp; build a package
          </button>
          <div className="mt-2 text-[11.5px] ink-faint" style={{ textAlign: desktop ? "left" : "center" }}>
            Paste a menu, match it to your line, and send the right products to a distributor.
          </div>

          {/* RECENT PACKAGES */}
          <div className={desktop ? "mt-8" : "mt-7"}>
            <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
              <span>RECENT PACKAGES</span>
              <button onClick={() => nav("brand-packages")} className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>See all →</button>
            </div>
            <div className="mt-2 doc-divider-thick" />
            {recent.map((p, i) => (
              <button key={i} onClick={() => nav("brand-packages")} className="w-full text-left doc-divider py-3 flex items-center gap-3 hover:opacity-90">
                <div className="min-w-0 flex-1">
                  <div className="ink leading-snug" style={{ fontSize: 13.5 }}>{p.title}</div>
                  <div className="text-[11px] ink-faint num leading-snug">{p.id} · {p.distributor || "no distributor yet"} · {p.items} products</div>
                </div>
                <NotifyStatusBadge status={p.status === "draft" ? "draft" : p.notify} />
              </button>
            ))}
          </div>
        </div>

        {/* Right rail / stacked */}
        <div className={desktop ? "" : "mt-7"}>
          <div className="px-4 py-4 rounded-md bg-white border hairline">
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>WHERE YOUR LINE STANDS</div>
            <p className="mt-1 text-[11.5px] ink-faint leading-snug">{live} carrying your line. Quotes go to distributors, never to you.</p>
            <div className="mt-2.5 flex flex-col gap-2">
              {BRAND_DISTRIBUTORS.map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] ink leading-snug truncate">{d.short}</span>
                  <NotifyStatusBadge status={d.notify} />
                </div>
              ))}
            </div>
            <button onClick={() => nav("brand-notifications")} className="mt-3 text-[11.5px] ink-soft underline inline-flex items-center gap-1">
              Track all notifications <Icon name="arrow-right" size={12} />
            </button>
          </div>

          <div className="mt-4 px-4 py-4 rounded-md" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>GROW YOUR REACH</div>
            <div className="serif font-medium ink mt-1" style={{ fontSize: 14.5, lineHeight: 1.3 }}>Bring on another distributor.</div>
            <button onClick={() => nav("brand-distributors")} className="mt-2 text-[11.5px] ink-soft underline inline-flex items-center gap-1">
              See distributors servicing {BRAND_DEMO.city} <Icon name="arrow-right" size={12} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// /brand/catalog — the brand's OWN product catalog: view + upload. Brand-scoped
// version of the distributor catalog page. Names + specs, never prices.
// ═════════════════════════════════════════════════════════════════════════════
function BrandCatalogBody({ desktop = false, nav = noopNav }) {
  const cat = BRAND_DEMO.catalog;
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="serif font-semibold ink" style={{ fontSize: desktop ? 32 : 24, lineHeight: 1.15 }}>Catalog</h1>
          <p className="mt-1 ink-faint num" style={{ fontSize: desktop ? 13.5 : 12.5 }}>{cat.name} · {cat.version} · updated {cat.updated}</p>
        </div>
        <button className="qm-btn qm-btn-orange shrink-0" style={{ padding: "10px 15px", fontSize: 13 }}>
          <Icon name="upload" size={15} color="#fff" /> Upload
        </button>
      </div>

      {/* Upload affordance */}
      <div className="mt-5 rounded-lg text-center" style={{ border: "1.5px dashed var(--qm-gray-200)", padding: desktop ? "26px 24px" : "22px 18px", background: "var(--qm-warm-paper)" }}>
        <Icon name="upload" size={20} color="var(--qm-gray-400)" />
        <div className="mt-2 text-[13px] ink leading-snug">Drop a catalog file to add or update products</div>
        <div className="text-[11.5px] ink-faint mt-1">PDF, spreadsheet, or a photo of your sell sheet · names &amp; pack specs, no prices</div>
      </div>

      {/* Products */}
      <div className="mt-6">
        <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
          <span>PRODUCTS</span>
          <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>{BRAND_PRODUCTS.length}</span>
        </div>
        <div className="mt-2 doc-divider-thick" />
        {BRAND_PRODUCTS.map((p, i) => (
          <div key={i} className="doc-divider py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13.5px] ink leading-snug">{p.name}</div>
              <div className="text-[11.5px] ink-faint num leading-snug">{p.spec}</div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="qm-pill" style={{ background: "var(--qm-warm-paper)", color: "var(--qm-gray-700)", border: "1px solid var(--qm-soft-line)", fontSize: 9.5, padding: "1px 7px" }}>{p.tag}</span>
              <button className="text-[11px] ink-faint underline">Edit</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 text-[11.5px] ink-soft" style={{ borderTop: "1px solid var(--qm-soft-line)", paddingTop: 12 }}>
        <Icon name="info" size={14} color="var(--qm-gray-500)" />
        <div>This is your own catalog. Pricing is set by your distributors, never here — your products show prices only inside a distributor's catalog.</div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// /brand/capture — paste/upload a menu, match against the brand catalog ONLY.
// ═════════════════════════════════════════════════════════════════════════════
function BrandCaptureBody({ desktop = false, nav = noopNav }) {
  const [mode, setMode] = useState("paste");
  const [matched, setMatched] = useState(false);
  const tabs = [{ id: "paste", label: "Paste" }, { id: "upload", label: "Upload" }, { id: "photo", label: "Photo" }];
  const matches = BRAND_PRODUCTS.slice(0, 5).map((p, i) => ({ ...p, hit: i < 4 }));

  if (matched) {
    return (
      <div>
        <button onClick={() => setMatched(false)} className="text-[12px] ink-soft inline-flex items-center gap-1 mb-3"><Icon name="arrow-left" size={14} /> Capture</button>
        <div className="qm-eyebrow" style={{ fontSize: desktop ? 11 : 10 }}>MATCHED AGAINST YOUR CATALOG</div>
        <h1 className="serif font-semibold ink mt-2" style={{ fontSize: desktop ? 30 : 23, lineHeight: 1.14 }}>4 of your products fit this menu.</h1>
        <p className="ink-soft mt-2 leading-relaxed" style={{ fontSize: desktop ? 14 : 13, maxWidth: 460 }}>
          We matched the menu against <b className="ink">your catalog only</b>. Add the matches to a package and send it to a distributor.
        </p>
        <div className="mt-5" style={{ maxWidth: desktop ? 520 : "100%" }}>
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>YOUR PRODUCTS THAT FIT</div>
          <div className="mt-2 doc-divider-thick" />
          {matches.filter(m => m.hit).map((m, i) => (
            <div key={i} className="doc-divider py-2.5 flex items-center gap-3">
              <Icon name="circle-check" size={16} color="var(--accent)" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] ink leading-snug">{m.name}</div>
                <div className="text-[11px] ink-faint num leading-snug">{m.spec}</div>
              </div>
            </div>
          ))}
          <button onClick={() => nav("brand-package-build")} className="qm-btn qm-btn-orange qm-btn-full mt-4" style={{ padding: "13px 18px", fontSize: 15 }}>
            <Icon name="package" size={16} color="#fff" /> Add matches to a package
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="qm-eyebrow" style={{ fontSize: desktop ? 11 : 10 }}>CAPTURE</div>
      <h1 className="serif font-semibold ink mt-2" style={{ fontSize: desktop ? 30 : 23, lineHeight: 1.14 }}>What menu are you working from?</h1>
      <p className="ink-soft mt-2 leading-relaxed" style={{ fontSize: desktop ? 14 : 13, maxWidth: 460 }}>
        Paste or drop a menu. We'll match it against your catalog to find which of your products fit — <b className="ink">only your line, nothing else</b>.
      </p>

      <div className="mt-5" style={{ maxWidth: desktop ? 520 : "100%" }}>
        <div className="inline-flex p-1 rounded-full" style={{ background: "var(--qm-gray-100)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setMode(t.id)} className="px-3.5 py-1.5 rounded-full" style={{ fontSize: 12.5, fontWeight: 500, background: mode === t.id ? "#fff" : "transparent", color: mode === t.id ? "var(--qm-charcoal)" : "var(--qm-gray-500)", boxShadow: mode === t.id ? "var(--qm-shadow-sm)" : "none" }}>{t.label}</button>
          ))}
        </div>

        {mode === "paste" ? (
          <textarea className="qm-textarea mt-3" style={{ minHeight: 150 }} placeholder={"Paste the menu here — dishes, a spec sheet, an email…"} />
        ) : (
          <div className="mt-3 rounded-lg text-center" style={{ border: "1.5px dashed var(--qm-gray-200)", padding: "30px 22px", background: "var(--qm-warm-paper)" }}>
            <Icon name={mode === "photo" ? "camera" : "upload"} size={20} color="var(--qm-gray-400)" />
            <div className="mt-2 text-[13px] ink leading-snug">{mode === "photo" ? "Take a photo of the menu" : "Drop a PDF, doc, or image"}</div>
            <div className="text-[11.5px] ink-faint mt-1">We'll read it and match against your catalog.</div>
          </div>
        )}

        <button onClick={() => setMatched(true)} className="qm-btn qm-btn-orange qm-btn-full mt-4" style={{ padding: "13px 18px", fontSize: 15 }}>
          <Icon name="search" size={16} color="#fff" /> Match against my catalog
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// /brand/packages — list + builder. Build, select ONE distributor, notify.
// ═════════════════════════════════════════════════════════════════════════════
function BrandPackagesBody({ desktop = false, nav = noopNav }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="serif font-semibold ink" style={{ fontSize: desktop ? 32 : 24, lineHeight: 1.15 }}>Packages</h1>
          <p className="mt-1 ink-faint" style={{ fontSize: desktop ? 13.5 : 12.5 }}>A set of your products, sent to one distributor.</p>
        </div>
        <button onClick={() => nav("brand-package-build")} className="qm-btn qm-btn-orange shrink-0" style={{ padding: "10px 15px", fontSize: 13 }}>
          <Icon name="plus" size={15} color="#fff" /> New package
        </button>
      </div>

      <div className="mt-6">
        <div className="qm-eyebrow" style={{ fontSize: 10 }}>ALL PACKAGES</div>
        <div className="mt-2 doc-divider-thick" />
        {BRAND_PACKAGES.map((p, i) => (
          <button key={i} onClick={() => nav(p.status === "draft" ? "brand-package-build" : "brand-notifications")} className="w-full text-left doc-divider py-3.5 block hover:opacity-95">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="serif text-[15px] font-medium ink leading-snug">{p.title}</div>
                <div className="text-[11.5px] ink-faint num leading-snug">{p.id} · {p.items} products · {p.distributor || "no distributor selected"}</div>
              </div>
              <NotifyStatusBadge status={p.status === "draft" ? "draft" : p.notify} />
            </div>
            <div className="mt-1.5 text-[11px] ink-faint num">{p.status === "draft" ? `Started ${p.created}` : `Sent ${p.created}`}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function BrandPackageBuilderBody({ desktop = false, nav = noopNav }) {
  const [picked, setPicked] = useState(() => BRAND_PRODUCTS.slice(0, 4).map(p => p.name));
  const [dist, setDist] = useState(null);
  const [sent, setSent] = useState(false);
  const toggle = (name) => setPicked(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  if (sent) {
    const d = BRAND_DISTRIBUTORS.find(x => x.short === dist);
    return (
      <div>
        <div className="inline-flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: "rgba(127,174,194,.18)" }}>
          <Icon name="check" size={22} color="var(--qm-ack-navy)" />
        </div>
        <h1 className="serif font-medium ink mt-4" style={{ fontSize: desktop ? 26 : 21, lineHeight: 1.2 }}>Package sent to {dist}.</h1>
        <p className="ink-soft mt-2 leading-relaxed" style={{ fontSize: desktop ? 14 : 13, maxWidth: 440 }}>
          {picked.length} products are on their way to {d ? d.rep : "the distributor"}. Watch it move from Sent → Opened → Loaded → In their catalog under Notifications.
        </p>
        <div className="mt-5 flex gap-2">
          <button onClick={() => nav("brand-notifications")} className="qm-btn qm-btn-outline" style={{ fontSize: 13 }}>Track in Notifications</button>
          <button onClick={() => nav("brand-packages")} className="qm-btn qm-btn-text" style={{ fontSize: 13 }}>All packages</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => nav("brand-packages")} className="text-[12px] ink-soft inline-flex items-center gap-1 mb-3"><Icon name="arrow-left" size={14} /> Packages</button>
      <h1 className="serif font-semibold ink" style={{ fontSize: desktop ? 30 : 23, lineHeight: 1.14 }}>Build a package</h1>
      <p className="ink-soft mt-2 leading-relaxed" style={{ fontSize: desktop ? 14 : 13, maxWidth: 460 }}>Pick the products, choose one distributor, and notify them.</p>

      <div className={desktop ? "mt-6 grid grid-cols-2 gap-x-10 items-start" : "mt-6"} style={{ maxWidth: desktop ? "none" : "100%" }}>
        {/* Products */}
        <div>
          <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
            <span>PRODUCTS</span><span className="ink-faint num" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>{picked.length} selected</span>
          </div>
          <div className="mt-2 doc-divider-thick" />
          {BRAND_PRODUCTS.map((p, i) => {
            const on = picked.includes(p.name);
            return (
              <button key={i} onClick={() => toggle(p.name)} className="w-full text-left doc-divider py-2.5 flex items-center gap-3">
                <Icon name={on ? "check-square" : "square"} size={17} color={on ? "var(--qm-charcoal)" : "var(--qm-gray-400)"} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] ink leading-snug">{p.name}</div>
                  <div className="text-[11px] ink-faint num leading-snug">{p.spec}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Distributor — single select */}
        <div className={desktop ? "" : "mt-7"}>
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>SEND TO ONE DISTRIBUTOR</div>
          <div className="mt-2 doc-divider-thick" />
          {BRAND_DISTRIBUTORS.map((d, i) => {
            const on = dist === d.short;
            return (
              <button key={i} onClick={() => setDist(d.short)} className="w-full text-left doc-divider py-3 flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-full shrink-0" style={{ width: 18, height: 18, border: `1.5px solid ${on ? "var(--qm-charcoal)" : "var(--qm-gray-400)"}` }}>
                  {on && <span style={{ width: 9, height: 9, borderRadius: 999, background: "var(--qm-charcoal)" }} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] ink leading-snug">{d.short}</div>
                  <div className="text-[11px] ink-faint leading-snug">{d.region}</div>
                </div>
                <NotifyStatusBadge status={d.notify} />
              </button>
            );
          })}

          <button disabled={!dist || picked.length === 0} onClick={() => setSent(true)} className="qm-btn qm-btn-orange qm-btn-full mt-4" style={{ padding: "13px 18px", fontSize: 15, opacity: (!dist || picked.length === 0) ? 0.5 : 1, cursor: (!dist || picked.length === 0) ? "not-allowed" : "pointer" }}>
            <Icon name="send" size={16} color="#fff" /> Notify {dist || "a distributor"}
          </button>
          <div className="mt-2 text-[11px] ink-faint">Saved as a draft until you send. One distributor per package — each stays its own thread.</div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// /brand/notifications — track sent packages + status, read-only.
// ═════════════════════════════════════════════════════════════════════════════
function BrandNotificationsBody({ desktop = false, nav = noopNav }) {
  const sent = BRAND_PACKAGES.filter(p => p.status === "sent");
  return (
    <>
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: desktop ? 32 : 24, lineHeight: 1.15 }}>Notifications</h1>
        <p className="mt-1 ink-faint" style={{ fontSize: desktop ? 13.5 : 12.5 }}>Where every package you've sent stands. Read-only — nothing to action here.</p>
      </div>

      <div className="mt-6">
        <div className="qm-eyebrow" style={{ fontSize: 10 }}>SENT PACKAGES</div>
        <div className="mt-2 doc-divider-thick" />
        {sent.map((p, i) => (
          <div key={i} className="doc-divider py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="serif text-[14.5px] font-medium ink leading-snug">{p.title}</div>
                <div className="text-[11.5px] ink-faint num leading-snug">{p.id} · {p.distributor} · {p.items} products · sent {p.created}</div>
              </div>
              <NotifyStatusBadge status={p.notify} />
            </div>
            <NotifyStepper status={p.notify} />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 text-[11.5px] ink-soft" style={{ borderTop: "1px solid var(--qm-soft-line)", paddingTop: 12 }}>
        <Icon name="bell" size={14} color="var(--accent)" />
        <div>You'll be notified as each package advances. Quotes are between chefs and distributors — they never come to you.</div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// /brand/distributors — reuse the chef Distributors-tab design. Track + send F3.
// ═════════════════════════════════════════════════════════════════════════════
function BrandDistributorsBody({ desktop = false, nav = noopNav }) {
  return (
    <>
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: desktop ? 32 : 24, lineHeight: 1.15 }}>Distributors</h1>
        <p className="mt-1 ink-faint" style={{ fontSize: desktop ? 13.5 : 12.5 }}>Who carries your line, and who else is servicing {BRAND_DEMO.city}.</p>
      </div>

      <div className="mt-6">
        <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
          <span>YOUR DISTRIBUTORS</span><span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>{BRAND_DISTRIBUTORS.length}</span>
        </div>
        <div className="mt-2 doc-divider-thick" />
        {BRAND_DISTRIBUTORS.map((d, i) => (
          <button key={i} onClick={() => nav("brand-distributors")} className="w-full text-left doc-divider py-3.5 block hover:opacity-95">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="serif text-[15px] font-medium ink leading-snug">{d.short}</div>
                <div className="text-[11.5px] ink-faint leading-snug">{d.name}</div>
              </div>
              <NotifyStatusBadge status={d.notify} />
            </div>
            <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
              <div className="min-w-0">
                <div className="qm-eyebrow" style={{ fontSize: 9 }}>REGION</div>
                <div className="text-[12px] ink mt-0.5 leading-snug">{d.region}</div>
              </div>
              <div className="text-right">
                <div className="qm-eyebrow" style={{ fontSize: 9 }}>{d.notify === "live" ? "CARRYING" : "STATUS"}</div>
                <div className="text-[12px] ink mt-0.5 num leading-snug">{d.notify === "live" ? `${d.carriedCount} products` : `Updated ${d.lastUpdate}`}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-7">
        <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
          <span>SERVICING {BRAND_DEMO.city.toUpperCase()}</span><span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>{BRAND_AREA_DISTRIBUTORS.length}</span>
        </div>
        <div className="mt-1 text-[11.5px] ink-faint leading-snug" style={{ maxWidth: 340 }}>Distributors servicing your area. Order shown by recency of catalog update, not by ranking.</div>
        <div className="mt-2 doc-divider-thick" />
        {BRAND_AREA_DISTRIBUTORS.map((d, i) => (
          <div key={i} className="doc-divider py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] ink leading-snug">{d.short}</div>
                <div className="text-[11.5px] ink-faint leading-snug">{d.name}</div>
                <div className="text-[11px] ink-faint num leading-snug mt-0.5">{d.region} · {d.items} items · updated {d.updated}</div>
              </div>
              {!d.affiliated && <CatalogStatusBadge status="unaffiliated" />}
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-[11.5px]">
              <button onClick={() => nav("brand-send-catalog")} className="ink-soft underline">Send a catalog link</button>
              {!d.affiliated && <span className="ink-faint leading-snug">· No catalog on QuoteMe yet</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 px-4 py-4 rounded-md" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
        <div className="qm-eyebrow" style={{ fontSize: 10 }}>BRING ON A DISTRIBUTOR</div>
        <div className="serif font-medium ink mt-1" style={{ fontSize: 14.5, lineHeight: 1.3 }}>Send a secure catalog link.</div>
        <p className="mt-1 text-[11.5px] ink-soft leading-relaxed">For a distributor that isn't on QuoteMe yet. Their catalog person drops the current catalog through a secure link — then chefs in range can order your line.</p>
        <button onClick={() => nav("brand-send-catalog")} className="qm-btn qm-btn-orange mt-3" style={{ padding: "10px 16px", fontSize: 13 }}>
          <Icon name="link" size={15} color="#fff" /> Send a catalog link
        </button>
      </div>
    </>
  );
}

// /brand/distributors → send the F3 secured catalog link (the bring-on action).
function BrandSendCatalogBody({ desktop = false, nav = noopNav }) {
  const [sent, setSent] = useState(false);
  const [dist, setDist] = useState("");
  if (sent) {
    return (
      <div>
        <div className="inline-flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: "rgba(127,174,194,.18)" }}>
          <Icon name="check" size={22} color="var(--qm-ack-navy)" />
        </div>
        <h1 className="serif font-medium ink mt-4" style={{ fontSize: desktop ? 26 : 21, lineHeight: 1.2 }}>Link sent to {dist || "the distributor"}.</h1>
        <p className="ink-soft mt-2 leading-relaxed" style={{ fontSize: desktop ? 14 : 13, maxWidth: 440 }}>
          Their catalog person can drop the current catalog through it — no account needed. You'll see them move to Loaded here once it's in.
        </p>
        <div className="mt-5 flex gap-2">
          <button onClick={() => nav("brand-distributors")} className="qm-btn qm-btn-outline" style={{ fontSize: 13 }}>Back to distributors</button>
          <button onClick={() => { setSent(false); setDist(""); }} className="qm-btn qm-btn-text" style={{ fontSize: 13 }}>Send another</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <button onClick={() => nav("brand-distributors")} className="text-[12px] ink-soft inline-flex items-center gap-1 mb-3"><Icon name="arrow-left" size={14} /> Distributors</button>
      <div className="qm-eyebrow" style={{ fontSize: desktop ? 11 : 10 }}>BRING ON A DISTRIBUTOR</div>
      <h1 className="serif font-semibold ink mt-2" style={{ fontSize: desktop ? 30 : 23, lineHeight: 1.14 }}>Send a secure catalog link.</h1>
      <p className="ink-soft mt-2 leading-relaxed" style={{ fontSize: desktop ? 14 : 13, maxWidth: 460 }}>
        We'll generate a secure, single-purpose link. Forward it to whoever keeps the distributor's catalog — they drop the current price list and it loads into QuoteMe. Nothing for them to sign into.
      </p>
      <div className="mt-6" style={{ maxWidth: desktop ? 460 : "100%" }}>
        <label className="qm-eyebrow block" style={{ fontSize: 10 }}>DISTRIBUTOR</label>
        <input className="qm-input mt-1.5" placeholder="Distributor name" value={dist} onChange={(e) => setDist(e.target.value)} />
        <label className="qm-eyebrow block mt-4" style={{ fontSize: 10 }}>CATALOG CONTACT · EMAIL</label>
        <input className="qm-input mt-1.5" placeholder="catalog@distributor.com" />
        <div className="mt-4 px-3.5 py-3 rounded-md flex items-start gap-2.5" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
          <Icon name="lock" size={14} color="var(--qm-charcoal)" style={{ marginTop: 2 }} />
          <div className="text-[11.5px] ink-soft leading-relaxed">The link is good for seven days and only does one thing: take a catalog. Their prices stay private — you never see a distributor's pricing.</div>
        </div>
        <button onClick={() => setSent(true)} className="qm-btn qm-btn-orange qm-btn-full mt-4" style={{ padding: "13px 18px", fontSize: 15 }}>
          <Icon name="send" size={16} color="#fff" /> Send the link
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// /brand/team (admin) — manage the brand's team.
// ═════════════════════════════════════════════════════════════════════════════
function BrandTeamBody({ desktop = false, nav = noopNav }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="serif font-semibold ink" style={{ fontSize: desktop ? 32 : 24, lineHeight: 1.15 }}>Team</h1>
          <p className="mt-1 ink-faint" style={{ fontSize: desktop ? 13.5 : 12.5 }}>The people who work your line. Admin only.</p>
        </div>
        <button className="qm-btn qm-btn-orange shrink-0" style={{ padding: "10px 15px", fontSize: 13 }}>
          <Icon name="plus" size={15} color="#fff" /> Invite
        </button>
      </div>
      <div className="mt-6">
        <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
          <span>MEMBERS</span><span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>{BRAND_TEAM.length}</span>
        </div>
        <div className="mt-2 doc-divider-thick" />
        {BRAND_TEAM.map((m, i) => (
          <div key={i} className="doc-divider py-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full flex items-center justify-center border hairline shrink-0" style={{ background: "var(--qm-warm-paper)" }}>
              <span className="serif text-[11px] font-semibold ink">{m.name.split(" ").map(s => s[0]).join("")}</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] ink leading-snug">{m.name}</div>
              <div className="text-[11.5px] ink-faint leading-snug">{m.role} · {m.email}</div>
            </div>
            {m.status === "invited"
              ? <span className="qm-pill" style={{ background: "#FFF9F3", color: "var(--qm-gray-700)", border: "1px solid var(--qm-soft-line)", fontSize: 9.5, padding: "1px 8px" }}>Invited</span>
              : <button className="text-[11px] ink-faint underline">Manage</button>}
          </div>
        ))}
      </div>
      <div className="mt-5 px-4 py-3.5 rounded-md flex items-start gap-2.5" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
        <Icon name="link" size={14} color="var(--qm-charcoal)" style={{ marginTop: 2 }} />
        <div className="text-[11.5px] ink-soft leading-relaxed">Invites go out as a one-tap link — no password to set. They land in your team with the role you choose.</div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// /brand/settings — own config (feeds the profile). + /brand/profile (preview).
// ═════════════════════════════════════════════════════════════════════════════
function BrandSettingsBody({ desktop = false, nav = noopNav }) {
  const Row = ({ label, value }) => (
    <div className="doc-divider py-3 flex items-baseline justify-between gap-3">
      <span className="qm-eyebrow" style={{ fontSize: 9 }}>{label}</span>
      <span className="flex items-baseline gap-2 text-right min-w-0">
        <span className="text-[13px] ink leading-snug truncate">{value}</span>
        <button className="text-[11px] ink-faint underline shrink-0">Edit</button>
      </span>
    </div>
  );
  const Section = ({ title, children }) => (
    <div className={desktop ? "mt-8" : "mt-7"}>
      <div className="qm-eyebrow" style={{ fontSize: 10 }}>{title}</div>
      <div className="mt-2 doc-divider-thick" />{children}
    </div>
  );
  return (
    <>
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: desktop ? 32 : 24, lineHeight: 1.15 }}>Settings</h1>
        <p className="mt-1 ink-faint" style={{ fontSize: desktop ? 13.5 : 12.5 }}>Your company details. This is what powers your public profile.</p>
        <button onClick={() => nav("brand-profile")} className="mt-2 text-[12px] ink-soft underline inline-flex items-center gap-1">View your public profile <Icon name="arrow-right" size={13} /></button>
      </div>
      <div className={desktop ? "grid grid-cols-2 gap-x-10 items-start" : ""}>
        <div>
          <Section title="LOGO">
            <div className="py-3.5 flex items-center gap-4">
              <BrandMark size={56} radius={12} />
              <div className="min-w-0">
                <button className="qm-btn qm-btn-outline" style={{ padding: "8px 14px", fontSize: 12.5 }}><Icon name="upload" size={14} /> Replace logo</button>
                <div className="text-[11px] ink-faint mt-1.5 leading-snug">Shown on your profile and across the network. PNG or SVG, square.</div>
              </div>
            </div>
          </Section>
          <Section title="COMPANY">
            <Row label="Name" value={BRAND_DEMO.brand} />
            <Row label="Email" value={BRAND_DEMO.managerEmail} />
            <Row label="Website" value={BRAND_DEMO.site} />
            <Row label="Phone" value={BRAND_DEMO.managerPhone} />
            <Row label="Category" value={BRAND_DEMO.category} />
          </Section>
        </div>
        <div>
          <Section title="REPS">
            {BRAND_REPS.map((r, i) => (
              <div key={i} className="doc-divider py-3 flex items-baseline justify-between gap-3">
                <div className="min-w-0"><div className="text-[13px] ink leading-snug">{r.name}</div><div className="text-[11px] ink-faint leading-snug">{r.territory}</div></div>
                <span className="text-[10.5px] ink-faint">{r.publicize ? "Contact public" : "Name only"}</span>
              </div>
            ))}
          </Section>
          <Section title="BILLING">
            <div className="py-3.5">
              <div className="flex items-baseline justify-between">
                <div><div className="text-[13px] ink">Free plan</div><div className="text-[11.5px] ink-faint leading-snug mt-0.5">Send your line to distributors at no cost.</div></div>
              </div>
            </div>
          </Section>
        </div>
      </div>
      <div className="mt-8 flex gap-2">
        <button className="qm-btn qm-btn-orange" style={{ fontSize: 14 }}>Save changes</button>
        <button className="qm-btn qm-btn-text" style={{ fontSize: 14 }}>Discard</button>
      </div>
    </>
  );
}

function BrandProfilePreviewBody({ desktop = false, nav = noopNav }) {
  return (
    <div>
      <div className="mb-4 px-4 py-3 rounded-md flex items-center gap-2.5" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
        <Icon name="eye" size={14} color="var(--qm-gray-500)" />
        <span className="text-[11.5px] ink-soft">This is your public profile — how distributors and the network see you. Edit details in <button onClick={() => nav("brand-settings")} className="underline ink">Settings</button>.</span>
      </div>
      {typeof BrandProfileBody === "function"
        ? <BrandProfileBody desktop={desktop} viewerLoggedIn={true} />
        : <div className="text-[13px] ink-faint">Profile preview loads with the Profiles module.</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Page assemblies — each rides BrandShell. Mobile is the default (variant).
// ═════════════════════════════════════════════════════════════════════════════
function makeBrandPage(active, Body, maxWidth) {
  return function BrandPage({ nav = noopNav, variant = "mobile", initialMode = "open" }) {
    return <BrandShell active={active} nav={nav} variant={variant} maxWidth={maxWidth} initialMode={initialMode}><Body desktop={variant === "desktop"} nav={nav} /></BrandShell>;
  };
}

const BrandDashboard      = makeBrandPage("dashboard",     BrandDashboardBody,        860);
const BrandCatalog        = makeBrandPage("catalog",       BrandCatalogBody,          760);
const BrandCapture        = makeBrandPage("capture",       BrandCaptureBody,          760);
const BrandPackages       = makeBrandPage("packages",      BrandPackagesBody,         760);
const BrandPackageBuilder = makeBrandPage("packages",      BrandPackageBuilderBody,   860);
const BrandNotifications  = makeBrandPage("notifications", BrandNotificationsBody,    760);
const BrandDistributors   = makeBrandPage("distributors",  BrandDistributorsBody,     760);
const BrandSendCatalog    = makeBrandPage("distributors",  BrandSendCatalogBody,      680);
const BrandTeam           = makeBrandPage("team",          BrandTeamBody,             760);
const BrandSettings       = makeBrandPage("settings",      BrandSettingsBody,         760);
const BrandProfilePreview = makeBrandPage("settings",      BrandProfilePreviewBody,   760);

// ═════════════════════════════════════════════════════════════════════════════
// FLOW_ROUTES registration — brand mobile screens walk inside ChefPhoneFlow.
// ═════════════════════════════════════════════════════════════════════════════
if (typeof FLOW_ROUTES !== "undefined") {
  FLOW_ROUTES["brand-role-chooser"]  = { component: "AuthRoleChooserMobile" };
  FLOW_ROUTES["brand-dashboard"]     = { component: "BrandDashboard" };
  FLOW_ROUTES["brand-catalog"]       = { component: "BrandCatalog" };
  FLOW_ROUTES["brand-capture"]       = { component: "BrandCapture" };
  FLOW_ROUTES["brand-packages"]      = { component: "BrandPackages" };
  FLOW_ROUTES["brand-package-build"] = { component: "BrandPackageBuilder" };
  FLOW_ROUTES["brand-notifications"] = { component: "BrandNotifications" };
  FLOW_ROUTES["brand-distributors"]  = { component: "BrandDistributors" };
  FLOW_ROUTES["brand-send-catalog"]  = { component: "BrandSendCatalog" };
  FLOW_ROUTES["brand-team"]          = { component: "BrandTeam" };
  FLOW_ROUTES["brand-settings"]      = { component: "BrandSettings" };
  FLOW_ROUTES["brand-profile"]       = { component: "BrandProfilePreview" };
  // back-compat alias
  FLOW_ROUTES["brand-overview"]      = { component: "BrandDashboard" };
}

Object.assign(window, {
  BRAND_DEMO, BRAND_REPS, BRAND_PRODUCTS, BRAND_DISTRIBUTORS, BRAND_AREA_DISTRIBUTORS, BRAND_PACKAGES, BRAND_TEAM,
  NotifyStatusBadge, NotifyStepper, BrandMark, brandNav, brandSettingsDest, BRAND_IDENTITY, BrandShell,
  ROLE_CARDS, RoleCard, RoleChooserBody, AuthRoleChooserMobile, AuthRoleChooserDesktop,
  BrandDashboardBody, BrandCatalogBody, BrandCaptureBody, BrandPackagesBody, BrandPackageBuilderBody,
  BrandNotificationsBody, BrandDistributorsBody, BrandSendCatalogBody, BrandTeamBody, BrandSettingsBody, BrandProfilePreviewBody,
  BrandDashboard, BrandCatalog, BrandCapture, BrandPackages, BrandPackageBuilder,
  BrandNotifications, BrandDistributors, BrandSendCatalog, BrandTeam, BrandSettings, BrandProfilePreview,
});
