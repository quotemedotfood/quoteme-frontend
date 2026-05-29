// src/screens-stack.jsx — Single-menu stack across N distributors.
// Desi brief, May 21. Stage 3 — the paid value prop #3 made visual.
//
// Operational flags (Justin May 27):
//   SHOW_PRICES — hides all dollar amounts on the stack until critical-mass
//     chef density is reached. Distributors are skittish about prices sitting
//     next to competitors' prices until enough chefs are on the platform that
//     opting out costs them visibility. The QM admin will flip this globally
//     once we hit that threshold. Layout space is preserved — cells keep their
//     vertical rhythm so toggling the switch doesn't reflow the page.
const SHOW_PRICES = true;

//
// Design landings (these are the answers to the brief's open questions):
//
//   1. SCREEN, not overlay.
//      Reason: this is a kitchen reference document, not a temporary state.
//      Reads from /chef/menus/:id/stack. Bookmarkable, survives reload,
//      lives alongside the menu detail in the chef's working set.
//
//   2. Per-item granularity, not document-by-document side-by-side.
//      Reason: a chef thinks ingredient-first ("who has branzino cheapest"),
//      not document-first. Per-item alignment is what QuoteMe knows that a
//      comparison spreadsheet doesn't — leading with that surfaces the moat.
//
//   3. Unmatched cells stay inline as a faint em-dash. They aren't hidden
//      (the chef needs to see coverage gaps to make a sourcing decision) and
//      they aren't styled as failures. Visual weight: gray-400, no border.
//
//   4. Mobile = per-item card list with distributors stacked underneath each
//      item. Desktop = wide grid, items as rows, distributors as columns.
//      No tabbed-by-distributor view — that's a marketplace pattern.
//
//   5. One orange per screen: a single distributor radio drives the
//      "Build order guide from [Selected]" CTA at the bottom. The chef
//      commits to one distributor; the stack is the decision surface.
//
// Doctrine watch-out (Justin):
//   reads as a kitchen reference document, NOT a marketplace comparison
//   grid. No ranking. No "Best price" badges. No "Recommended" framing.
//   Visual cues are operational (matched / not matched / cheaper here),
//   never qualitative.

// ─────────────────────────────────────────────────────────────────────────────
// Demo data — pricing variants per distributor, derived from the canonical
// QUOTE. Distributors have organic catalog gaps: Northwind = seafood only,
// Foothill = dairy + a sliver of produce, Riverbend = produce only,
// D'Lisius = full coverage (the chef's existing rep).
// ─────────────────────────────────────────────────────────────────────────────
// `role` is the chef-assigned, lightweight free-text label that anchors why
// each distributor sits in the stack. Justin (May 23): roles are how a chef
// thinks about their stack — "my produce guy", "my dairy". Editable in the
// roster surface (see screens-stack-roster.jsx).
const STACK_DISTRIBUTORS = [
  { short: "D'Lisius",          name: "D'Lisius Distribution Co.",   status: "connected",    coverage: "Full catalog",            role: "Main rep · dry goods + meat" },
  { short: "Foothill Dairy",    name: "Foothill Dairy Collective",    status: "connected",    coverage: "Dairy · selected produce", role: "My dairy" },
  { short: "Northwind Seafood", name: "Northwind Seafood Co.",       status: "connected",    coverage: "Seafood",                 role: "My seafood" },
  { short: "Riverbend Produce", name: "Riverbend Farm Produce",       status: "unaffiliated", coverage: "Produce",                 role: "My produce" },
];

// Per-item offerings per distributor. `null` = not on catalog.
// Index aligns to STACK_DISTRIBUTORS:
//   [D'Lisius, Foothill Dairy, Northwind Seafood, Riverbend Produce]
//
// Spec lock (Daniel, May 21): the LEFT column is what the chef put in —
// short culinary terms like "Cheddar", "Butter", "Branzino". Each distributor
// cell shows THEIR specific offering: brand/name (truncated), pack size, price.
// A future iteration adds a drawer for full description + photo per cell.
const STACK_ROWS = [
  // Cheese & Dairy
  { cat: "Cheese & Dairy", chefItem: "Yellow cheddar", qty: 2, offerings: [
    { name: "Hudson Valley Yellow Cheddar, raw milk",    pack: "5 lb wheel",     price: 42.50 },
    { name: "Cabot Clothbound Cheddar, aged 12mo",       pack: "4 lb wheel",     price: 39.80 },
    null,
    null,
  ]},
  { cat: "Cheese & Dairy", chefItem: "Cultured butter", qty: 6, offerings: [
    { name: "Vermont Creamery cultured salted",          pack: "1 lb roll",      price:  9.75 },
    { name: "Ploughgate cultured butter, Vermont",       pack: "8 oz block",     price:  9.20 },
    null,
    null,
  ]},
  { cat: "Cheese & Dairy", chefItem: "Parmesan", qty: 4, offerings: [
    { name: "Parmigiano-Reggiano DOP, 24-mo",            pack: "1 lb wedge",     price: 24.00 },
    null,
    null,
    null,
  ]},
  { cat: "Cheese & Dairy", chefItem: "Mozzarella", qty: 8, offerings: [
    { name: "Fior di latte, hand-pulled, fresh",         pack: "8 oz ball",      price:  7.40 },
    { name: "Maplebrook fresh mozzarella, Vermont",      pack: "8 oz ball",      price:  7.60 },
    null,
    null,
  ]},

  // Meat & Charcuterie — only D'Lisius carries
  { cat: "Meat & Charcuterie", chefItem: "Pork shoulder", qty: 1, offerings: [
    { name: "Berkshire pork shoulder, skin-on",          pack: "8–10 lb avg",    price:  78.50 },
    null, null, null,
  ]},
  { cat: "Meat & Charcuterie", chefItem: "Beef cheeks", qty: 1, offerings: [
    { name: "Snake River Farms wagyu cheeks, USDA",      pack: "5 lb pack",      price: 138.00 },
    null, null, null,
  ]},
  { cat: "Meat & Charcuterie", chefItem: "Prosciutto", qty: 3, offerings: [
    { name: "Prosciutto di Parma, 18-mo, sliced",        pack: "1 lb",           price:  28.95 },
    null, null, null,
  ]},

  // Seafood — D'Lisius + Northwind
  { cat: "Seafood", chefItem: "Branzino", qty: 12, offerings: [
    { name: "Branzino, whole dressed, Mediterranean",    pack: "1–1.5 lb avg",   price: 14.25 },
    null,
    { name: "Branzino, whole, Croatian farmed",          pack: "1.2 lb avg",     price: 13.40 },
    null,
  ]},
  { cat: "Seafood", chefItem: "Diver scallops", qty: 4, offerings: [
    { name: "Maine diver scallops, U-10 dry",            pack: "1 lb",           price: 32.80 },
    null,
    { name: "Georges Bank dry-pack scallops, U-12",      pack: "1 lb",           price: 31.50 },
    null,
  ]},

  // Pantry & Spice — only D'Lisius
  { cat: "Pantry & Spice", chefItem: "Black pepper", qty: 1, offerings: [
    { name: "Tellicherry peppercorns, single-origin",    pack: "1 lb",           price: 18.40 },
    null, null, null,
  ]},
  { cat: "Pantry & Spice", chefItem: "Sea salt", qty: 2, offerings: [
    { name: "Maldon sea salt flake, English",            pack: "1.5 lb tub",     price: 16.20 },
    null, null, null,
  ]},
  { cat: "Pantry & Spice", chefItem: "Castelvetrano olives", qty: 1, offerings: [
    { name: "Castelvetrano olives, pitted, Sicily",      pack: "2.5 kg jar",     price: 34.75 },
    null, null, null,
  ]},
  { cat: "Pantry & Spice", chefItem: "00 flour", qty: 1, offerings: [
    { name: "Caputo Tipo 00 pizzeria flour",             pack: "55 lb bag",      price: 44.20 },
    null, null, null,
  ]},
  { cat: "Pantry & Spice", chefItem: "San Marzano tomato", qty: 1, offerings: [
    { name: "Bianco DiNapoli organic, DOP-style",         pack: "#10 can, 6 ct",  price: 41.60 },
    null, null, null,
  ]},

  // Produce — D'Lisius + Foothill (partial) + Riverbend (full produce)
  { cat: "Produce", chefItem: "Radicchio", qty: 1, offerings: [
    { name: "Treviso radicchio, Italian seed",            pack: "12 ct case",    price: 32.00 },
    null,
    null,
    { name: "Late Treviso, local Hudson Valley grow",     pack: "12 ct case",    price: null },
  ]},
  { cat: "Produce", chefItem: "Meyer lemons", qty: 1, offerings: [
    { name: "Meyer lemons, California",                   pack: "35 lb case",    price: 58.50 },
    { name: "Meyer lemons, organic, CA",                  pack: "30 lb case",    price: 56.00 },
    null,
    { name: "Meyer lemons, local greenhouse",             pack: "30 lb case",    price: 52.00 },
  ]},
  { cat: "Produce", chefItem: "Heirloom carrots", qty: 1, offerings: [
    { name: "Rainbow carrots, mixed heirloom",            pack: "25 lb case",    price: 46.00 },
    null,
    null,
    { name: "Heirloom carrots, Roxbury Farm CSA",         pack: "25 lb case",    price: 44.80 },
  ]},
  { cat: "Produce", chefItem: "Chicory", qty: 1, offerings: [
    { name: "Castelfranco chicory, speckled",             pack: "10 ct case",    price: 38.40 },
    null,
    null,
    { name: "Castelfranco, Hawthorne Valley Farm",        pack: "10 ct case",    price: 36.10 },
  ]},
];

// Precompute totals and coverage per distributor.
function computeStackColumnStats() {
  return STACK_DISTRIBUTORS.map((d, di) => {
    let matched = 0;
    let subtotal = 0;
    for (const r of STACK_ROWS) {
      const o = r.offerings[di];
      if (o != null) matched += 1;
    }
    // No subtotal — Justin May 27 no-qty doctrine: quotes don't carry totals.
    // Column header now shows coverage count only.
    return { ...d, matched, of: STACK_ROWS.length };
  });
}

// Group rows by category for section subtotals.
function groupStackRows() {
  const out = [];
  for (const r of STACK_ROWS) {
    const last = out[out.length - 1];
    if (last && last.cat === r.cat) last.items.push(r);
    else out.push({ cat: r.cat, items: [r] });
  }
  return out;
}

// Cell value formatter — keeps "—" semantics consistent across views.
function fmtCell(offering) {
  if (offering == null) return null;
  return { unit: offering.price, name: offering.name, pack: offering.pack };
}

// Find lowest non-null unit price across a row — used for the "↓" cheaper-here
// marker. Operational, not "Best price." Quiet treatment: tiny down-caret in
// charcoal next to the cheaper number. Only renders if there's a real choice
// (≥2 non-null offerings).
function lowestPriceIndex(offerings) {
  const valid = offerings
    .map((o, i) => (o == null || o.price == null ? null : { p: o.price, i }))
    .filter(Boolean);
  if (valid.length < 2) return -1;
  return valid.reduce((lo, x) => x.p < lo.p ? x : lo, valid[0]).i;
}

// Truncate a long distributor product name to fit a column. Keeps the
// front portion (brand/variety) and adds an ellipsis if cut. ~26 chars
// reads cleanly at 12px font in a 150px column.
function truncProductName(name, max = 30) {
  if (!name) return "";
  return name.length <= max ? name : name.slice(0, max - 1).trimEnd() + "…";
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. ChefMenuStackDesktop — primary surface.
//    The chef looks at this at the pass or office. Wide reading width,
//    distributor columns scan left-to-right, items rows scan top-to-bottom.
//    A radio in each column header drives which distributor the "Build
//    order guide" CTA points to — that's the single orange.
// ═════════════════════════════════════════════════════════════════════════════
function ChefMenuStackDesktop({ nav = noopNav, initialMode = "open" }) {
  const cols = useMemo(computeStackColumnStats, []);
  const groups = useMemo(groupStackRows, []);
  // Multi-select: a Set of column indices. Default — the chef's existing rep.
  const [picks, setPicks] = useState(() => new Set([0]));
  // Export format toggle: one combined document or N separate documents.
  const [exportFormat, setExportFormat] = useState("one");
  // Add-distributor column state (Justin May 26): the far-right column lets the
  // chef grow their stack from inside the comparison view. Two affordances live
  // here — pick-from-network (routes out) and upload-a-catalog (routes out).
  // The third action — request-from-a-rep — opens a right-side drawer at the
  // page level (May 27 revision) because it's a multi-field composer that
  // deserves room to breathe, not a column it gets jammed into.
  const [addMode, setAddMode] = useState("choose");
  // Drawer state: which add-mode is the right-side drawer showing?
  // null = closed; "network" | "upload" | "request" = open with that body.
  // (Justin May 27: every add-distributor action opens the drawer — it's the
  //  standard chrome for this whole interaction now, not just request.)
  const [drawerMode, setDrawerMode] = useState(null);
  // Product detail drawer (Desi May 29): click a cell's product name to dive in.
  // Cell-scoped, read-only. { offering, chefItem, distributor } or null.
  const [detailCell, setDetailCell] = useState(null);
  const togglePick = (ci) => {
    setPicks((cur) => {
      const next = new Set(cur);
      if (next.has(ci)) next.delete(ci);
      else next.add(ci);
      return next;
    });
  };
  const pickedIdx = Array.from(picks);
  // Visual anchor — the first picked column carries the highlight rhythm.
  const anchor = pickedIdx[0] ?? 0;
  const n = pickedIdx.length;
  const pickedCols = pickedIdx.map((i) => cols[i]);

  // Subtotals per distributor per section — needed twice (cell + footer total).
  const sectionSubtotals = groups.map(g => cols.map((_, ci) =>
    g.items.reduce((s, it) => {
      const o = it.offerings[ci];
      // No-qty doctrine: count matches, not summed dollars.
      return o == null ? s : s + 1;
    }, 0)
  ));

  return (
    <ChefTabDesktopShell active="menus" nav={nav} initialMode={initialMode}>
      {/* Header — menu identity + count of distributors compared */}
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <button onClick={() => nav("menu-detail")} className="text-[12.5px] ink-soft inline-flex items-center gap-1">
            <Icon name="chevron-left" size={14} /> Spring tasting · prix fixe
          </button>
        </div>
        <h1 className="serif font-semibold ink mt-2" style={{ fontSize: 32, lineHeight: 1.1 }}>
          Your stack · {STACK_ROWS.length} items across {cols.length} distributors
        </h1>
        <p className="mt-2 text-[13.5px] ink-soft leading-relaxed" style={{ maxWidth: 580 }}>
          This menu priced against the distributors you source from. Pick one to build a
          single order guide, or several to split the menu across your stack. Items not on
          a catalog show as “—” so coverage gaps stay visible.
        </p>
      </div>

      {/* Operational note hidden now that prices are back (Justin lock May 27).
          Kept the gate (SHOW_PRICES) so QM admin can flip prices off globally if
          distributor density changes — see screens-stack.jsx top-of-file flag. */}
      <div className="mt-6 overflow-x-auto" style={{ borderTop: "2px solid var(--qm-charcoal)", marginLeft: -2 }}>
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 880, fontFamily: "var(--qm-sans)" }}>
          {/* Column header row */}
          <thead>
            <tr>
              <th className="text-left align-bottom" style={{ width: 200, padding: "16px 12px 14px 0" }}>
                <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".14em" }}>YOUR ITEM</div>
                <div className="ink mt-1 text-[12px] ink-faint num">{STACK_ROWS.length} lines</div>
              </th>
              {cols.map((c, ci) => {
                const on = picks.has(ci);
                return (
                <th
                  key={ci}
                  className="align-bottom text-left"
                  style={{
                    padding: "16px 12px 14px 12px",
                    background: on ? "rgba(165,207,221,.10)" : "transparent",
                    borderLeft: "1px solid var(--qm-soft-line)",
                    minWidth: 170,
                  }}
                >
                  <label className="flex items-start gap-2 cursor-pointer" htmlFor={`stack-pick-${ci}`}>
                    <input
                      id={`stack-pick-${ci}`}
                      type="checkbox"
                      checked={on}
                      onChange={() => togglePick(ci)}
                      style={{ accentColor: "var(--qm-orange)", marginTop: 4, width: 14, height: 14 }}
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="serif text-[15px] font-medium ink leading-tight">{c.short}</span>
                        {c.status === "unaffiliated" && (
                          <span className="qm-pill" style={{
                            background: "#FFF9F3", color: "var(--qm-gray-700)",
                            border: "1px solid var(--qm-soft-line)",
                            fontSize: 9, padding: "1px 6px",
                          }}>Unaffiliated</span>
                        )}
                      </div>
                      {c.role && (
                        <div className="text-[10.5px] ink-soft italic mt-0.5 leading-snug" style={{ fontFamily: "var(--qm-serif)" }}>
                          {c.role}
                        </div>
                      )}
                      <div className="text-[10.5px] ink-faint mt-0.5">{c.coverage}</div>
                      <div className="text-[11px] ink-soft num mt-1">{c.matched}/{c.of} matched</div>
                      {/* No subtotal here per no-qty doctrine. Reserve space
                          so the header row keeps its vertical rhythm. */}
                      <div style={{ height: 22 }} aria-hidden="true" />
                    </div>
                  </label>
                </th>
                );
              })}
              {/* Add distributor to stack — far-right column.
                  Justin lock May 26: every chef × distributor surface needs an
                  affordance to grow the stack. From the comparison view that
                  means: (1) pick from network, (2) upload a catalog, (3) ask
                  the rep to send one. (3) is the new lever — every “request”
                  email is a node pulled toward the network. */}
              <th
                className="align-top text-left"
                style={{
                  padding: "16px 12px 14px 14px",
                  borderLeft: "1.5px dashed var(--qm-soft-line)",
                  background: "var(--qm-warm-paper)",
                  minWidth: 230,
                  width: 240,
                }}
              >
                <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".14em" }}>+ ADD DISTRIBUTOR TO STACK</div>
                {addMode === "choose" && (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    <button
                      onClick={() => setDrawerMode("network")}
                      className="text-left rounded-md hover:bg-white transition-colors"
                      style={{ padding: "8px 10px", border: "1px solid var(--qm-soft-line)", background: "#FFFFFF" }}
                    >
                      <div className="text-[12.5px] ink leading-snug font-medium">Pick from network</div>
                      <div className="text-[10.5px] ink-faint leading-snug mt-0.5">Distributors servicing Hudson, NY</div>
                    </button>
                    <button
                      onClick={() => setDrawerMode("upload")}
                      className="text-left rounded-md hover:bg-white transition-colors"
                      style={{ padding: "8px 10px", border: "1px solid var(--qm-soft-line)" }}
                    >
                      <div className="text-[12.5px] ink leading-snug font-medium">Upload a catalog</div>
                      <div className="text-[10.5px] ink-faint leading-snug mt-0.5">PDF, CSV, or photos of an order guide</div>
                    </button>
                    <button
                      onClick={() => setDrawerMode("request")}
                      className="text-left rounded-md hover:bg-white transition-colors"
                      style={{ padding: "8px 10px", border: "1px solid var(--qm-soft-line)" }}
                    >
                      <div className="text-[12.5px] ink leading-snug font-medium">Request from a rep</div>
                      <div className="text-[10.5px] ink-faint leading-snug mt-0.5">We'll help you draft the email</div>
                    </button>
                    <div className="text-[10.5px] ink-faint italic leading-snug mt-1" style={{ fontFamily: "var(--qm-serif)" }}>
                      Up to {7 - cols.length} more in your stack.
                    </div>
                  </div>
                )}
              </th>
            </tr>
          </thead>

          {/* Section bodies */}
          {groups.map((g, gi) => {
            const subs = sectionSubtotals[gi];
            return (
              <tbody key={gi}>
                {/* Section eyebrow row */}
                <tr>
                  <td colSpan={cols.length + 2} style={{ paddingTop: 18 }}>
                    <div className="doc-divider-thick" />
                    <div className="serif font-medium ink mt-2"
                         style={{ fontSize: 12.5, letterSpacing: ".10em", textTransform: "uppercase" }}>
                      {g.cat}
                    </div>
                  </td>
                </tr>

                {/* Item rows */}
                {g.items.map((it, ii) => {
                  const lo = lowestPriceIndex(it.offerings);
                  return (
                    <tr key={ii} className="hover:bg-gray-50">
                      <td style={{ padding: "10px 12px 10px 0", borderBottom: "1px solid var(--qm-soft-line)", verticalAlign: "top" }}>
                        <div className="serif font-medium ink leading-snug" style={{ fontSize: 14 }}>{it.chefItem}</div>
                        {it.note && (
                          <div className="text-[11px] ink-faint leading-snug mt-0.5">{it.note}</div>
                        )}
                      </td>
                      {it.offerings.map((o, ci) => {
                        const cell = fmtCell(o);
                        const isLow = ci === lo;
                        const on = picks.has(ci);
                        return (
                          <td
                            key={ci}
                            className="num"
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid var(--qm-soft-line)",
                              borderLeft: "1px solid var(--qm-soft-line)",
                              background: on ? "rgba(165,207,221,.06)" : "transparent",
                              verticalAlign: "top",
                            }}
                          >
                            {cell ? (
                              <button
                                onClick={() => setDetailCell({ offering: o, chefItem: it.chefItem, distributor: cols[ci] })}
                                className="text-left w-full block hover:underline underline-offset-2 cursor-pointer"
                                title={`${cell.name} · ${cell.pack} — open details`}
                              >
                                <div className="text-[12px] ink leading-snug" style={{ minHeight: 30, textWrap: "pretty" }}>
                                  {truncProductName(cell.name, 36)}
                                </div>
                                <div className="text-[10.5px] ink-faint mt-0.5 leading-snug">{cell.pack}</div>
                                {SHOW_PRICES ? (
                                  /* No-qty doctrine: unit price for this case
                                     size only. No line total. */
                                  <div className="flex items-baseline justify-end gap-2 mt-1">
                                    {isLow && (
                                      <Icon name="arrow-down" size={10} color="var(--qm-charcoal)" />
                                    )}
                                    <span className="text-[13px] ink font-medium num">{priceOrDash(cell.unit)}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end mt-1" style={{ minHeight: 18 }}>
                                    <Icon name="check" size={11} color="var(--qm-gray-500)" />
                                  </div>
                                )}
                              </button>
                            ) : (
                              <div className="text-right"><span className="ink-faint text-[14px]">—</span></div>
                            )}
                          </td>
                        );
                      })}
                      {/* Add-distributor column · row placeholder */}
                      <td
                        style={{
                          padding: "10px 12px",
                          borderBottom: "1px solid var(--qm-soft-line)",
                          borderLeft: "1.5px dashed var(--qm-soft-line)",
                          background: "rgba(255,249,243,.55)",
                          textAlign: "center",
                          verticalAlign: "middle",
                        }}
                      >
                        <span className="ink-faint text-[12px] italic" style={{ fontFamily: "var(--qm-serif)" }}>
                          —
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Section coverage row — "X of Y matched" per distributor.
                    Per Justin May 27 no-qty doctrine: no dollar subtotals here.
                    Replaced with match-count visualization — quotes show
                    coverage, order guides show totals. */}
                <tr>
                  <td style={{ padding: "8px 12px 8px 0", verticalAlign: "top" }}>
                    <span className="text-[11.5px] ink-soft leading-snug">{g.cat} coverage</span>
                  </td>
                  {cols.map((_, ci) => {
                    const v = subs[ci]; // now = matched-line count for this category
                    const total = g.items.length;
                    const on = picks.has(ci);
                    return (
                      <td
                        key={ci}
                        className="text-right num"
                        style={{
                          padding: "8px 12px",
                          borderLeft: "1px solid var(--qm-soft-line)",
                          background: on ? "rgba(165,207,221,.06)" : "transparent",
                        }}
                      >
                        <span className={cls("text-[12px]", v > 0 ? "ink-soft" : "ink-faint")}>
                          {v}/{total}
                        </span>
                      </td>
                    );
                  })}
                  {/* Add-distributor column · coverage placeholder */}
                  <td
                    style={{
                      padding: "8px 12px",
                      borderLeft: "1.5px dashed var(--qm-soft-line)",
                      background: "rgba(255,249,243,.55)",
                    }}
                  />
                </tr>
              </tbody>
            );
          })}

          {/* Grand coverage row — NOT a dollar total.
              Per Justin May 27 no-qty doctrine: dollar totals belong on the
              order-guide document (post-confirm), not on the stack quote view.
              This row rolls up coverage stats per distributor. */}
          <tfoot>
            <tr>
              <td colSpan={cols.length + 2} style={{ paddingTop: 14 }}>
                <div className="doc-divider-thick" />
              </td>
            </tr>
            <tr>
              <td style={{ padding: "10px 12px 14px 0" }}>
                <span className="serif text-[14px] ink">Coverage · {STACK_ROWS.length} items</span>
              </td>
              {cols.map((c, ci) => {
                const on = picks.has(ci);
                return (
                <td
                  key={ci}
                  className="text-right num"
                  style={{
                    padding: "10px 12px 14px",
                    borderLeft: "1px solid var(--qm-soft-line)",
                    background: on ? "rgba(165,207,221,.10)" : "transparent",
                  }}
                >
                  <div className="serif text-[18px] ink font-semibold num">
                    {c.matched}<span className="ink-faint text-[14px]">/{c.of}</span>
                  </div>
                  <div className="text-[10.5px] ink-faint num leading-snug">
                    matched · {c.of - c.matched} gap
                  </div>
                </td>
                );
              })}
              {/* Add-distributor column · footer placeholder */}
              <td
                style={{
                  padding: "10px 12px 14px",
                  borderLeft: "1.5px dashed var(--qm-soft-line)",
                  background: "rgba(255,249,243,.55)",
                  textAlign: "center",
                  verticalAlign: "middle",
                }}
              >
                <button
                  onClick={() => setDrawerMode("network")}
                  className="text-[11px] ink-soft inline-flex items-center gap-1 hover:ink"
                  title="Add a distributor to your stack"
                >
                  <Icon name="plus" size={11} color="var(--qm-gray-700)" /> add
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Decision rail — multi-aware. Different copy + CTAs by selection count. */}
      <div
        className="mt-6 px-5 py-4 rounded-lg flex items-center gap-4 flex-wrap"
        style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>SOURCING DECISION</div>
          {n === 0 && (
            <>
              <div className="serif font-medium ink mt-1" style={{ fontSize: 16, lineHeight: 1.2 }}>
                Select one or more distributors above.
              </div>
              <div className="text-[12px] ink-soft mt-1 leading-snug">
                Pick a single distributor to build one order guide, or two-plus to compare or export side-by-side.
              </div>
            </>
          )}
          {n === 1 && (
            <>
              <div className="serif font-medium ink mt-1" style={{ fontSize: 16, lineHeight: 1.2 }}>
                Build the order guide from {pickedCols[0].short}.
              </div>
              <div className="text-[12px] ink-soft mt-1 leading-snug">
                {pickedCols[0].matched}/{pickedCols[0].of} items matched.{" "}
                {pickedCols[0].of - pickedCols[0].matched > 0 ? (
                  <>The remaining {pickedCols[0].of - pickedCols[0].matched} stay open in the guide for your rep to source elsewhere.</>
                ) : (
                  <>Full coverage.</>
                )}
                {pickedCols[0].status === "unaffiliated" && (
                  <> {pickedCols[0].short} doesn't have a rep on QuoteMe yet — prices won't reflect rep-negotiated rates until they connect.</>
                )}
              </div>
            </>
          )}
          {n >= 2 && (
            <>
              <div className="serif font-medium ink mt-1" style={{ fontSize: 16, lineHeight: 1.2 }}>
                {n} distributors selected · {pickedCols.map(c => c.short).join(" · ")}
              </div>
              <div className="text-[12px] ink-soft mt-1 leading-snug">
                Build {n} order guides side-by-side, or export {n} quotes to share with your team.
              </div>
              <div className="mt-2 inline-flex items-center gap-2 text-[11.5px]">
                <span className="ink-faint">Export format:</span>
                <button
                  onClick={() => setExportFormat("one")}
                  className="px-2.5 py-1 rounded"
                  style={{
                    background: exportFormat === "one" ? "var(--qm-charcoal)" : "transparent",
                    color: exportFormat === "one" ? "#fff" : "var(--qm-charcoal)",
                    border: "1px solid var(--qm-charcoal)",
                  }}
                >
                  One combined document
                </button>
                <button
                  onClick={() => setExportFormat("split")}
                  className="px-2.5 py-1 rounded"
                  style={{
                    background: exportFormat === "split" ? "var(--qm-charcoal)" : "transparent",
                    color: exportFormat === "split" ? "#fff" : "var(--qm-charcoal)",
                    border: "1px solid var(--qm-charcoal)",
                  }}
                >
                  {n} separate documents
                </button>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => nav("menu-detail")} className="qm-btn qm-btn-text" style={{ padding: "10px 14px", fontSize: 13 }}>
            Back to menu
          </button>
          {n >= 2 && (
            <button
              className="qm-btn qm-btn-outline"
              style={{ padding: "11px 16px", fontSize: 13 }}
              title={exportFormat === "one" ? "Export one combined document" : `Export ${n} separate documents`}
            >
              <Icon name="download" size={14} color="var(--qm-charcoal)" /> Export {n} Quote{n === 1 ? "" : "s"}
            </button>
          )}
          <button
            onClick={() => n === 1 && nav("pull-receipt", { distributor: { ...pickedCols[0], items: 0, updated: "May 12" } })}
            className="qm-btn qm-btn-orange"
            disabled={n === 0}
            style={{ padding: "11px 18px", fontSize: 14, opacity: n === 0 ? 0.55 : 1, cursor: n === 0 ? "not-allowed" : "pointer" }}
          >
            {n <= 1 ? <>Build Order Guide</> : <>Build {n} Order Guides</>} <Icon name="arrow-right" size={15} color="white" />
          </button>
        </div>
      </div>

      {/* Operational footnote — the moat phrasing, no marketing voice */}
      <div className="mt-5 flex items-start gap-3 text-[12px] ink-soft leading-relaxed" style={{ maxWidth: 620 }}>
        <Icon name="info" size={14} color="var(--qm-hover-blue)" />
        <div>
          Prices come from each distributor's current catalog. Coverage gaps reflect what
          they carry, not what's available in the region. Quoting against one distributor
          doesn't lock you in — you can re-price your stack any time the menu changes.
        </div>
      </div>
      {/* Right-side drawer — Stack-add composer.
          Lives at the page level so it covers the whole desktop shell
          (Justin May 27): a multi-field composer (or a long list, or a file
          drop zone) deserves room to breathe — not a column it gets jammed
          into. Drawer is the standard chrome for any add-distributor action. */}
      <StackAddDrawer mode={drawerMode} onClose={() => setDrawerMode(null)} nav={nav} />
      <StackProductDrawer
        open={!!detailCell}
        onClose={() => setDetailCell(null)}
        offering={detailCell && detailCell.offering}
        chefItem={detailCell && detailCell.chefItem}
        distributor={detailCell && detailCell.distributor}
        variant="drawer"
      />
    </ChefTabDesktopShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════════════════════
// RequestRepDrawer — right-side overlay covering the full viewport.
//
// Used by the desktop stack page when the chef chooses “Request from a rep.”
// Doctrine (Justin May 27): a request-an-email is a multi-field composer that
// deserves room to breathe — inside a 240px table column it reads cramped and
// signals “marketing form,” which is exactly what this product isn't.
//
// Behavior:
//   • Slides in from the right; warm-paper page bg, white panel.
//   • ESC closes; click on the backdrop closes.
//   • Pre-fills the note copy so chef never stares at an empty textarea.
//   • No internal scroll quirks — the panel itself scrolls if content overflows.
// ════════════════════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════════════════════
// StackAddDrawer — page-level right-side drawer for ALL add-distributor flows.
//
// Justin lock May 27: every add-distributor action (pick from network, upload
// a catalog, request from a rep) opens this drawer. Drawer is the standard
// chrome for this whole interaction — a single header + footer pattern, three
// swappable bodies. Reads as one product motion, not three.
//
// `mode`: null — closed. "network" | "upload" | "request" — open with body.
//
// All three modes share:
//   • ESC + backdrop-click to close.
//   • Same header / footer chrome (eyebrow, title, body copy, X close).
//   • ~520px panel, white on dimmed backdrop, slides from right.
// ════════════════════════════════════════════════════════════════════════════════════════════
function StackAddDrawer({ mode, onClose, nav = noopNav }) {
  const open = mode !== null && mode !== undefined;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const header = {
    network: {
      eyebrow: "ADD TO STACK · PICK FROM NETWORK",
      title:   "Pick a distributor servicing your area.",
      lede:    "Verified catalogs, ordered by recency of update — not by ranking. Tap one to add it to your stack.",
    },
    upload: {
      eyebrow: "ADD TO STACK · UPLOAD A CATALOG",
      title:   "Upload a catalog or order guide.",
      lede:    "PDF, CSV, XLSX, or photos. We'll parse it, match against your menu, and add the distributor to your stack.",
    },
    request: {
      eyebrow: "ADD TO STACK · REQUEST A CATALOG",
      title:   "Ask a rep for their catalog.",
      lede:    "We'll send a short note from your address. When the rep replies, we add their catalog to your stack automatically.",
    },
  }[mode];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={header.title}
      style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", justifyContent: "flex-end" }}
    >
      <button
        onClick={onClose}
        aria-label="Close drawer"
        style={{ position: "absolute", inset: 0, background: "rgba(43,43,43,.32)", border: "none", cursor: "default" }}
      />
      <div
        style={{
          position: "relative",
          width: "min(560px, 92vw)",
          height: "100%",
          background: "#FFFFFF",
          borderLeft: "1px solid var(--qm-soft-line)",
          boxShadow: "-20px 0 40px rgba(43,43,43,.10)",
          display: "flex",
          flexDirection: "column",
          animation: "qmDrawerIn .22s cubic-bezier(.2,.7,.2,1)",
        }}
      >
        {/* Shared header */}
        <div
          className="flex items-start justify-between gap-3"
          style={{ padding: "22px 28px 18px", borderBottom: "2px solid var(--qm-charcoal)" }}
        >
          <div className="min-w-0">
            <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".14em" }}>{header.eyebrow}</div>
            <h2 className="serif font-semibold ink mt-1" style={{ fontSize: 24, lineHeight: 1.15 }}>
              {header.title}
            </h2>
            <p className="text-[12.5px] ink-soft leading-relaxed mt-1.5" style={{ maxWidth: 440 }}>
              {header.lede}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-50"
            aria-label="Close"
            title="Close (Esc)"
          >
            <Icon name="x" size={16} color="var(--qm-charcoal)" />
          </button>
        </div>

        {/* Mode-specific body */}
        <div className="flex-1 overflow-auto" style={{ padding: "22px 28px 28px" }}>
          {mode === "network" && <StackAddNetworkBody onClose={onClose} />}
          {mode === "upload"  && <StackAddUploadBody  onClose={onClose} />}
          {mode === "request" && <StackAddRequestBody onClose={onClose} />}
        </div>

        <style>{`
          @keyframes qmDrawerIn {
            from { transform: translateX(24px); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Body: PICK FROM NETWORK. List of distributors servicing the chef's area.
// Each row is a tap-target that would add the distributor to the stack and
// close the drawer.
// ────────────────────────────────────────────────────────────────────────────────────────────
function StackAddNetworkBody({ onClose }) {
  const candidates = (typeof window !== "undefined" && window.DISTRIBUTOR_ENTRY_CANDIDATES) || [];
  return (
    <div>
      <div className="qm-eyebrow" style={{ fontSize: 10 }}>AVAILABLE IN {DEMO.restaurantCity ? DEMO.restaurantCity.toUpperCase() : "YOUR AREA"}</div>
      <div className="mt-3 doc-divider-thick" />
      {candidates.length === 0 && (
        <div className="py-6 text-[12px] ink-faint italic leading-snug text-center">
          No distributor data loaded.
        </div>
      )}
      {candidates.map((d, i) => (
        <button
          key={i}
          onClick={onClose}
          className="w-full text-left doc-divider py-3.5 flex items-start gap-3 hover:bg-gray-50 rounded"
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
                  No rep yet
                </span>
              )}
            </div>
            <div className="text-[11.5px] ink-faint leading-snug">{d.name}</div>
            <div className="text-[11px] ink-soft num leading-snug mt-1">
              {(d.coverage || []).join(" · ")} · updated {d.updated}
            </div>
          </div>
          <span
            className="inline-flex items-center justify-center shrink-0"
            style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid var(--qm-charcoal)" }}
            title="Add to stack"
          >
            <Icon name="plus" size={13} color="var(--qm-charcoal)" />
          </span>
        </button>
      ))}
      <div className="mt-5 text-[11px] ink-faint leading-relaxed" style={{ fontFamily: "var(--qm-serif)" }}>
        Don't see who you're looking for? Try <button onClick={onClose} className="underline ink-soft hover:ink">uploading their catalog</button> or <button onClick={onClose} className="underline ink-soft hover:ink">requesting one from a rep</button>.
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Body: UPLOAD A CATALOG.
// ────────────────────────────────────────────────────────────────────────────────────────────
function StackAddUploadBody({ onClose }) {
  return (
    <div>
      <label
        className="block rounded-md text-center cursor-pointer transition-colors"
        style={{
          padding: "36px 18px",
          border: "1.5px dashed var(--qm-soft-line)",
          background: "var(--qm-warm-paper)",
        }}
      >
        <input type="file" className="hidden" accept=".pdf,.csv,.xlsx,image/*" multiple />
        <div
          className="inline-flex items-center justify-center rounded-full mx-auto"
          style={{ width: 42, height: 42, background: "#fff", border: "1px solid var(--qm-soft-line)" }}
        >
          <Icon name="upload" size={18} color="var(--qm-charcoal)" />
        </div>
        <div className="serif font-medium ink mt-3 leading-snug" style={{ fontSize: 16 }}>
          Drop a catalog or order guide
        </div>
        <div className="text-[11.5px] ink-soft mt-1 leading-snug">
          PDF, CSV, XLSX, or photos · multiple files OK
        </div>
        <div className="mt-3 inline-flex items-center gap-1 text-[12px] ink underline-offset-2 underline">
          Choose a file
        </div>
      </label>

      <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] ink-soft leading-snug">
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

      <div className="mt-6 px-4 py-3 rounded-md" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
        <div className="qm-eyebrow" style={{ fontSize: 9 }}>DISTRIBUTOR NAME</div>
        <input
          className="qm-input mt-1"
          placeholder="e.g. Hudson Provisions Co."
          style={{ fontSize: 13.5 }}
        />
        <div className="text-[10.5px] ink-faint italic leading-snug mt-1" style={{ fontFamily: "var(--qm-serif)" }}>
          We'll attach the upload to this distributor in your stack.
        </div>
      </div>

      <div className="mt-5 text-[11px] ink-faint leading-relaxed" style={{ fontFamily: "var(--qm-serif)" }}>
        No rep needed to ingest a catalog. You can add a rep later when one comes on board with the distributor.
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <button onClick={onClose} className="qm-btn qm-btn-text" style={{ padding: "10px 14px", fontSize: 13 }}>Cancel</button>
        <button onClick={onClose} className="qm-btn qm-btn-orange" style={{ padding: "10px 18px", fontSize: 13 }}>
          Upload &amp; add to stack <Icon name="arrow-right" size={14} color="white" />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────═══════════════════════════════════════════════════════
// Body: REQUEST FROM A REP — assisted email composer.
// ────────────────────────────────────────────────────═══════════════════════════════════════════════════════
function StackAddRequestBody({ onClose }) {
  const [dist, setDist]   = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote]   = useState(
    "Hi — building out our spring menu at " + DEMO.restaurant + " and would love to see your latest price list. Happy to send over what we're working with."
  );
  return (
    <div>
      <div>
        <label className="qm-eyebrow block" htmlFor="rrd_dist" style={{ fontSize: 9 }}>DISTRIBUTOR</label>
        <input
          id="rrd_dist"
          value={dist}
          onChange={(e) => setDist(e.target.value)}
          placeholder="e.g. Hudson Provisions Co."
          className="qm-input mt-1"
          style={{ fontSize: 13.5 }}
        />
      </div>
      <div className="mt-4">
        <label className="qm-eyebrow block" htmlFor="rrd_email" style={{ fontSize: 9 }}>REP EMAIL</label>
        <input
          id="rrd_email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@distributor.com"
          className="qm-input mt-1"
          autoComplete="email"
          inputMode="email"
          style={{ fontSize: 13.5 }}
        />
        <div className="text-[10.5px] ink-faint italic leading-snug mt-1" style={{ fontFamily: "var(--qm-serif)" }}>
          Don't have an email? Phone or full company name works — we'll figure out where to send it.
        </div>
      </div>
      <div className="mt-4">
        <label className="qm-eyebrow block" htmlFor="rrd_note" style={{ fontSize: 9 }}>YOUR NOTE</label>
        <textarea
          id="rrd_note"
          rows={5}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="qm-input mt-1"
          style={{ fontSize: 13, resize: "none", padding: "10px 12px" }}
        />
        <div className="text-[10.5px] ink-faint leading-snug mt-1" style={{ fontFamily: "var(--qm-serif)" }}>
          Pre-filled — edit anything that doesn't sound like you.
        </div>
      </div>
      <div className="mt-5 px-4 py-3 rounded-md" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
        <div className="qm-eyebrow" style={{ fontSize: 9 }}>SENT FROM</div>
        <div className="text-[12.5px] ink mt-0.5 leading-snug">{DEMO.chefFirst} {DEMO.chefLast} · {DEMO.chefEmail}</div>
        <div className="text-[11px] ink-soft leading-snug">{DEMO.restaurant} · {DEMO.restaurantCity}</div>
      </div>
      <div className="mt-6 flex items-center justify-end gap-2">
        <button onClick={onClose} className="qm-btn qm-btn-text" style={{ padding: "10px 14px", fontSize: 13 }}>Cancel</button>
        <button onClick={onClose} className="qm-btn qm-btn-orange" style={{ padding: "10px 18px", fontSize: 13 }}>
          Send request <Icon name="arrow-right" size={14} color="white" />
        </button>
      </div>
    </div>
  );
}

// Legacy RequestRepDrawer kept as alias so other call-sites don't break.
function RequestRepDrawer({ open, onClose }) {
  return <StackAddDrawer mode={open ? "request" : null} onClose={onClose} />;
}

// 2. ChefMenuStackMobile — desktop-only lockout.
//    Daniel May 21: the stack is too dense for a phone. Mobile shows a
//    calm "use desktop" notice instead of trying to cram the comparison.
// ═════════════════════════════════════════════════════════════════════════════
function ChefMenuStackMobile({ nav = noopNav }) {
  const cols = useMemo(computeStackColumnStats, []);
  return (
    <PhoneShell>
      <div className="flex items-center justify-between px-5 py-3 border-b hairline bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => nav("menu-detail")} className="text-[12px] ink-soft inline-flex items-center gap-1">
            <Icon name="chevron-left" size={14} /> Menu
          </button>
          <span className="ink-faint text-[14px] leading-none">·</span>
          <span className="text-[13px] leading-none ink-soft truncate" style={{ maxWidth: 180 }}>Spring tasting · prix fixe</span>
        </div>
      </div>

      <div className="scroller" style={{ background: "var(--qm-warm-paper)" }}>
        {/* Title block */}
        <div className="px-5 pt-6 pb-3">
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>YOUR STACK</div>
          <h1 className="serif font-semibold mt-1 ink" style={{ fontSize: 26, lineHeight: 1.1 }}>
            {STACK_ROWS.length} items across your {cols.length} distributors.
          </h1>
          <p className="mt-2 text-[13px] ink-soft leading-relaxed">
            The stack prices this menu against every distributor you source from — different
            brands, different pack sizes, different prices. Reads best on a wider screen.
          </p>
        </div>

        {/* Calm lockout card */}
        {/* Note (May 23, Justin): the mobile lockout is intentional. Stack is a
            kitchen reference document; the comparison reads at desktop width. */}
        <div className="mx-5 my-3 px-5 py-5 rounded-lg" style={{ background: "#fff", border: "1px solid var(--qm-soft-line)" }}>
          <div className="flex items-baseline gap-2">
            <Icon name="monitor" size={14} color="var(--qm-ack-navy)" />
            <div className="qm-eyebrow" style={{ fontSize: 10, color: "var(--qm-ack-navy)" }}>OPEN ON DESKTOP</div>
          </div>
          <div className="serif font-medium ink mt-2 leading-snug" style={{ fontSize: 16 }}>
            Best viewed on a wider screen.
          </div>
          <div className="text-[12.5px] ink-soft mt-1.5 leading-relaxed">
            We'll keep your stack saved against this menu. Open {DEMO.restaurant} on a laptop
            to see your {cols.length} distributors side-by-side — brands, pack sizes, and prices.
          </div>
          <button
            className="mt-3 qm-btn qm-btn-outline w-full"
            style={{ padding: "10px 14px", fontSize: 13 }}
            title="Email me the link"
          >
            <Icon name="mail" size={14} color="var(--qm-charcoal)" /> Email me the desktop link
          </button>
        </div>

        {/* Distributor coverage summary — read-only chips, no decision affordance */}
        <div className="px-5 pb-4 mt-2">
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>WHO'S COVERED</div>
          <div className="mt-1.5 doc-divider-thick" />
          <div className="mt-2 space-y-2">
            {cols.map((c, ci) => (
              <div key={ci} className="doc-divider py-2.5 flex items-baseline gap-2">
                <div className="flex-1 min-w-0">
                  <div className="serif text-[14px] font-medium ink leading-snug">{c.short}</div>
                  <div className="text-[11px] ink-faint leading-snug mt-0.5">{c.coverage}</div>
                </div>
                <div className="text-right num">
                  <div className="text-[11px] ink-soft">{c.matched}/{c.of}</div>
                  <div className="text-[11.5px] ink-faint">matched</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-6 mt-2 flex items-start gap-3 text-[11.5px] ink-soft leading-relaxed">
          <Icon name="info" size={13} color="var(--qm-hover-blue)" />
          <div>
            On desktop you can multi-select distributors and export {STACK_ROWS.length}-item
            quotes side-by-side. Mobile keeps this view read-only for now.
          </div>
        </div>
      </div>

      {/* Sticky bottom rail — back to menu */}
      <div className="border-t hairline bg-white px-5 py-3">
        <button
          onClick={() => nav("menu-detail")}
          className="qm-btn qm-btn-outline qm-btn-full"
          style={{ padding: "11px 14px", fontSize: 13 }}
        >
          <Icon name="chevron-left" size={14} color="var(--qm-charcoal)" /> Back to menu
        </button>
      </div>
    </PhoneShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
Object.assign(window, {
  STACK_DISTRIBUTORS, STACK_ROWS,
  ChefMenuStackDesktop, ChefMenuStackMobile,
});
