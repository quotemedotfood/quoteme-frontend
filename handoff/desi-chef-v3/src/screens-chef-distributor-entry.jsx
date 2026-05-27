// src/screens-chef-distributor-entry.jsx — Chef supplies distributor + rep + catalog.
//
// Chef v3 surface (Moose May 26). Path: /chef/distributor/new
//
// The chef can grow their network three ways. This page is the standalone
// version of the "Add distributor to stack" column inside screens-stack.jsx —
// reachable from multiple entry points (sidebar, distributors tab, stack
// roster, stack comparison view, empty states).
//
// Three modes, segmented at the top:
//   1. PICK FROM NETWORK — distributors servicing the chef's area.
//   2. UPLOAD A CATALOG — PDF / CSV / photos of an order guide.
//   3. REQUEST FROM A REP — we help the chef draft the email.
//
// Mode (3) is the network-effect lever: every email is a new node pulled
// toward QuoteMe. Treat appreciatively, never apologetically.
//
// Doctrine watch-outs:
//   • No "Add distributor" marketing copy. Operational verbs only.
//   • The "request" mode pre-fills a sentence-fragment note so the chef
//     never stares at a blank textarea. Chef can edit or clear.
//   • Selecting a network distributor or uploading a catalog routes to
//     existing stack flows; this page is the entry, not the destination.

// ─────────────────────────────────────────────────────────────────────────────
// Catalog candidates servicing the area — same data shape as the stack
// suggestions, but rendered as full cards (page surface, not a column).
// ─────────────────────────────────────────────────────────────────────────────
const DISTRIBUTOR_ENTRY_CANDIDATES = [
  { short: "Hudson Provisions",  name: "Hudson Provisions Co.",      city: "Hudson Valley",        items: 1840, updated: "May 22, 2026", affiliated: true,  coverage: ["Dry goods", "Specialty"] },
  { short: "Catskill Farms",     name: "Catskill Farms Distributors", city: "Hudson Valley · Ulster", items: 612, updated: "May 18, 2026", affiliated: true,  coverage: ["Produce", "Dairy"] },
  { short: "Berkshire Meats",    name: "Berkshire Meat Collective",  city: "Hudson Valley · Berkshires", items: 290, updated: "May 11, 2026", affiliated: true,  coverage: ["Meat", "Charcuterie"] },
  { short: "Coast Line",         name: "Coast Line Seafood",          city: "Lower Hudson",         items: 168,  updated: "May 6, 2026",  affiliated: false, coverage: ["Seafood"] },
  { short: "Two Stones",         name: "Two Stones Bakery, wholesale", city: "Hudson · Kingston",   items: 84,   updated: "Apr 29, 2026", affiliated: false, coverage: ["Bread", "Pastry"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Segmented mode header — three pills at the top of the page.
// Lifted out so mobile + desktop share the chrome.
// ─────────────────────────────────────────────────────────────────────────────
function DistEntryModeTabs({ mode, onChange }) {
  const tabs = [
    { id: "pick",    label: "Pick from network",  sub: "Servicing your area" },
    { id: "upload",  label: "Upload a catalog",   sub: "PDF, CSV, or photos" },
    { id: "request", label: "Request from a rep", sub: "We'll help draft the email" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {tabs.map((t) => {
        const active = t.id === mode;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="text-left rounded-md transition-colors"
            style={{
              padding: "10px 12px",
              background: active ? "var(--qm-warm-paper)" : "transparent",
              border: `1px solid ${active ? "var(--qm-charcoal)" : "var(--qm-soft-line)"}`,
            }}
          >
            <div className={cls("text-[12.5px] leading-snug", active ? "ink font-medium" : "ink")}>
              {t.label}
            </div>
            <div className="text-[10.5px] ink-faint leading-snug mt-0.5">{t.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PICK FROM NETWORK — card list of distributors servicing the area.
// ─────────────────────────────────────────────────────────────────────────────
function DistEntryPickPanel({ nav }) {
  return (
    <div className="mt-5">
      <div className="qm-eyebrow" style={{ fontSize: 10 }}>AVAILABLE IN {DEMO.restaurantCity.toUpperCase()}</div>
      <div className="text-[11.5px] ink-soft leading-relaxed mt-1.5" style={{ maxWidth: 560 }}>
        Distributors with a verified catalog. Order shown by recency of catalog update, not by ranking.
      </div>
      <div className="mt-4 doc-divider-thick" />
      {DISTRIBUTOR_ENTRY_CANDIDATES.map((d, i) => (
        <button
          key={i}
          onClick={() => nav("pull-entry", { distributor: { ...d } })}
          className="w-full text-left doc-divider py-3.5 flex items-start gap-3 hover:bg-white"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="serif font-medium ink leading-snug" style={{ fontSize: 15 }}>{d.short}</span>
              {!d.affiliated && (
                <span
                  className="qm-pill"
                  style={{
                    background: "#FFF9F3", color: "var(--qm-gray-700)",
                    border: "1px solid var(--qm-soft-line)",
                    fontSize: 9.5, padding: "1px 7px",
                  }}
                >
                  No rep yet on QuoteMe
                </span>
              )}
            </div>
            <div className="text-[11.5px] ink-faint leading-snug">{d.name}</div>
            <div className="text-[11px] ink-soft num leading-snug mt-1">
              {d.coverage.join(" · ")} · {d.items.toLocaleString()} items · updated {d.updated}
            </div>
          </div>
          <Icon name="chevron-right" size={14} color="var(--qm-gray-500)" />
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD A CATALOG — drop zone + format guidance.
// ─────────────────────────────────────────────────────────────────────────────
function DistEntryUploadPanel({ nav }) {
  return (
    <div className="mt-5">
      <div className="qm-eyebrow" style={{ fontSize: 10 }}>UPLOAD</div>
      <div className="text-[11.5px] ink-soft leading-relaxed mt-1.5" style={{ maxWidth: 560 }}>
        We'll parse it and match the items against your menu. Photos of an order guide work too —
        most reps' price lists are just a printed PDF anyway.
      </div>

      <label
        className="block mt-4 rounded-md text-center cursor-pointer transition-colors"
        style={{
          padding: "28px 16px",
          border: "1.5px dashed var(--qm-soft-line)",
          background: "var(--qm-warm-paper)",
        }}
      >
        <input type="file" className="hidden" accept=".pdf,.csv,.xlsx,image/*" multiple />
        <div className="inline-flex items-center justify-center rounded-full mx-auto" style={{ width: 36, height: 36, background: "#fff", border: "1px solid var(--qm-soft-line)" }}>
          <Icon name="upload" size={16} color="var(--qm-charcoal)" />
        </div>
        <div className="serif font-medium ink mt-2.5 leading-snug" style={{ fontSize: 15 }}>
          Drop a catalog or order guide
        </div>
        <div className="text-[11.5px] ink-soft mt-1 leading-snug">
          PDF, CSV, XLSX, or photos · multiple files OK
        </div>
        <div className="mt-3 inline-flex items-center gap-1 text-[12px] ink underline-offset-2 underline">
          Choose a file
        </div>
      </label>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] ink-soft leading-snug">
        <div className="flex items-start gap-1.5">
          <Icon name="file-text" size={11} color="var(--qm-gray-700)" /> Price list PDF
        </div>
        <div className="flex items-start gap-1.5">
          <Icon name="image" size={11} color="var(--qm-gray-700)" /> Photo of order guide
        </div>
        <div className="flex items-start gap-1.5">
          <Icon name="table-2" size={11} color="var(--qm-gray-700)" /> CSV / spreadsheet
        </div>
      </div>

      <div className="mt-5 pt-4 text-[11px] ink-faint leading-relaxed" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
        We don't need the rep's contact info to ingest a catalog. You can add a rep later when one
        comes on board with the distributor.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST FROM A REP — assisted email composer.
// Pre-fills note copy; chef edits or clears.
// ─────────────────────────────────────────────────────────────────────────────
function DistEntryRequestPanel({ nav }) {
  const [dist, setDist]   = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote]   = useState(
    "Hi — building out our spring menu at " + DEMO.restaurant + " and would love to see your latest price list. Happy to send over what we're looking at."
  );

  return (
    <div className="mt-5">
      <div className="qm-eyebrow" style={{ fontSize: 10 }}>REQUEST A CATALOG</div>
      <div className="text-[11.5px] ink-soft leading-relaxed mt-1.5" style={{ maxWidth: 560 }}>
        We'll send a short note from your address asking for the rep's current price list. When they
        reply with the catalog, we'll add it to your distributors automatically.
      </div>

      <div className="mt-5">
        <label className="qm-eyebrow block" htmlFor="de_dist" style={{ fontSize: 9 }}>DISTRIBUTOR</label>
        <input
          id="de_dist"
          value={dist}
          onChange={(e) => setDist(e.target.value)}
          className="qm-input mt-1"
          placeholder="e.g. Hudson Provisions Co."
        />
      </div>

      <div className="mt-3">
        <label className="qm-eyebrow block" htmlFor="de_email" style={{ fontSize: 9 }}>REP EMAIL</label>
        <input
          id="de_email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="qm-input mt-1"
          placeholder="name@distributor.com"
          inputMode="email"
          autoComplete="email"
        />
        <div className="text-[10.5px] ink-faint italic leading-snug mt-1" style={{ fontFamily: "var(--qm-serif)" }}>
          Don't have an email? Phone or full company name works — we'll figure out where to send it.
        </div>
      </div>

      <div className="mt-3">
        <label className="qm-eyebrow block" htmlFor="de_note" style={{ fontSize: 9 }}>YOUR NOTE</label>
        <textarea
          id="de_note"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="qm-input mt-1"
          style={{ resize: "none", padding: "10px 12px" }}
        />
        <div className="text-[10.5px] ink-faint leading-snug mt-1" style={{ fontFamily: "var(--qm-serif)" }}>
          Pre-filled — edit anything that doesn't sound like you.
        </div>
      </div>

      <div className="mt-4 px-4 py-3 rounded-md" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
        <div className="qm-eyebrow" style={{ fontSize: 9 }}>SENT FROM</div>
        <div className="text-[12.5px] ink mt-0.5 leading-snug">{DEMO.chefFirst} {DEMO.chefLast} · {DEMO.chefEmail}</div>
        <div className="text-[11px] ink-soft leading-snug">{DEMO.restaurant} · {DEMO.restaurantCity}</div>
      </div>

      <button className="qm-btn qm-btn-orange qm-btn-full mt-5" style={{ padding: "12px 16px", fontSize: 13.5 }}>
        Send request <Icon name="arrow-right" size={14} color="white" />
      </button>
      <div className="mt-2 text-[10.5px] ink-faint text-center leading-snug">
        We'll let you know when the rep replies. You can keep building quotes in the meantime.
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ChefDistributorEntryPage — mobile.
// ═════════════════════════════════════════════════════════════════════════════
function ChefDistributorEntryPage({ nav = noopNav, mode: initialMode = "pick" }) {
  const [mode, setMode] = useState(initialMode);
  return (
    <PhoneShell>
      <MobileTopBar restaurant={DEMO.restaurant} />
      <div className="scroller px-5 pt-5 pb-6" style={{ background: "#fff" }}>
        <div>
          <button onClick={() => nav("tab-distributors")} className="text-[12px] ink-soft inline-flex items-center gap-1">
            <Icon name="chevron-left" size={13} /> Distributors
          </button>
          <h1 className="serif font-semibold ink mt-2" style={{ fontSize: 24, lineHeight: 1.15 }}>
            Add a distributor.
          </h1>
          <p className="mt-1.5 text-[12.5px] ink-soft leading-relaxed">
            Pick one we already know, upload a catalog you have on hand, or have us reach out to a rep.
          </p>
        </div>
        <div className="mt-4">
          <DistEntryModeTabs mode={mode} onChange={setMode} />
        </div>
        {mode === "pick"    && <DistEntryPickPanel    nav={nav} />}
        {mode === "upload"  && <DistEntryUploadPanel  nav={nav} />}
        {mode === "request" && <DistEntryRequestPanel nav={nav} />}
      </div>
      <ChefTabBar active="distributors" nav={nav} />
    </PhoneShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Desktop derivative — sits in the chef Newspaper sidebar.
// ═════════════════════════════════════════════════════════════════════════════
function ChefDistributorEntryPageDesktop({ nav = noopNav, mode: initialMode = "pick", initialMode: sidebarMode = "open" }) {
  const [mode, setMode] = useState(initialMode);
  return (
    <ChefTabDesktopShell active="distributors" nav={nav} initialMode={sidebarMode}>
      <div>
        <button onClick={() => nav("tab-distributors")} className="text-[12.5px] ink-soft inline-flex items-center gap-1">
          <Icon name="chevron-left" size={14} /> Distributors
        </button>
        <h1 className="serif font-semibold ink mt-2" style={{ fontSize: 32, lineHeight: 1.1 }}>
          Add a distributor.
        </h1>
        <p className="mt-2 text-[14px] ink-soft leading-relaxed" style={{ maxWidth: 600 }}>
          Pick one we already know, upload a catalog you have on hand, or have us reach out to a rep.
        </p>
      </div>
      <div className="mt-6" style={{ maxWidth: 720 }}>
        <DistEntryModeTabs mode={mode} onChange={setMode} />
        {mode === "pick"    && <DistEntryPickPanel    nav={nav} />}
        {mode === "upload"  && <DistEntryUploadPanel  nav={nav} />}
        {mode === "request" && <DistEntryRequestPanel nav={nav} />}
      </div>
    </ChefTabDesktopShell>
  );
}

Object.assign(window, {
  DISTRIBUTOR_ENTRY_CANDIDATES,
  DistEntryModeTabs, DistEntryPickPanel, DistEntryUploadPanel, DistEntryRequestPanel,
  ChefDistributorEntryPage, ChefDistributorEntryPageDesktop,
});
