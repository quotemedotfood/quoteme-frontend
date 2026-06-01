// src/screens-stack-v2.jsx — Stack V2: Order Guide Builder.
//
// Design exploration only (Justin May 27). NOT production-bound; lives next
// to screens-stack.jsx so we can compare.
//
// The problem (Justin):
//   A chef looking at the stack sees multiple product alignments to each menu
//   item — one per distributor in their stack. The chef wants to go through
//   and pick products across distributors to assemble one order guide.
//
// Justin's directional thought:
//   • Big orange "Set up order guide" CTA at the top of the stack
//   • Tapping it enters a selection mode
//   • Chef clicks cells to add them to the order guide; cells highlight
//   • Sticky footer running summary + orange "Save & export" at the bottom
//
// Approaches surfaced in this file for comparison:
//   A. ChefMenuStackV2Default      — V1 chrome + new orange "Set up order
//                                    guide" CTA. The entry state.
//   B. ChefMenuStackV2Builder      — Justin's selection mode. Manual, every
//                                    cell is a tap target, picks accumulate.
//   C. ChefMenuStackV2SmartSuggest — Alt I want you to consider: system
//                                    pre-picks one cell per row (best fit per
//                                    a rule the chef can change: lowest price,
//                                    favorite rep, fewest distributors), chef
//                                    overrides where they care. Saves taps,
//                                    surfaces the conflict only on the rows
//                                    that warrant attention.
//
// Why B vs C is the real choice:
//   B is a kitchen-line metaphor. The chef walks the menu and assembles. Fast
//   when the menu is short and the chef has opinions on every item.
//   C is an operational shortcut. The system guesses, chef accepts/edits.
//   Fast when the menu is long and most decisions are obvious. The "rule" pill
//   at the top is the leverage: changing the rule re-picks everything.
//
// My recommendation (Desi): SHIP BOTH AS ONE FLOW. Default to C with the rule
// pre-set to "lowest price." A pill at the top lets the chef switch to "favorite
// rep" or "fewest distributors" (consolidate). Manual B is what happens when
// the chef taps any cell — they override that row. Best of both. We document
// that as Concept C+B and let Justin react.
//
// File layout:
//   1. STACK_V2_DATA — same shape as STACK_ROWS, copied here so V2 stays
//      self-contained and we can mutate without touching V1.
//   2. computeBestPick / computeFavoriteRepPick / computeConsolidationPick
//      — three rules for the smart-suggest variant.
//   3. ChefMenuStackV2Desktop({ mode }) — the unified component. `mode` picks
//      which of A / B / C+B renders.
//   4. OrderGuideFooter — sticky footer with running summary + orange Save.
// ─────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// 1. Data — copied from screens-stack.jsx for V2 isolation.
// ═════════════════════════════════════════════════════════════════════════════
const STACK_V2_ROWS = typeof window !== "undefined" && window.STACK_ROWS ? window.STACK_ROWS : [];
const STACK_V2_COLS = typeof window !== "undefined" && window.STACK_DISTRIBUTORS ? window.STACK_DISTRIBUTORS : [];

// Multi-stack demo (Justin May 27 — the playlist metaphor).
// A chef can have many "playlists" of distributors: broadliner price compare,
// specialty cheeses, local produce, etc. First-time chef gets ONE stack named
// "My stack" with no friction (no drawer prompts) — they rename inline.
const CHEF_STACKS_V2 = [
  { id: "broadliner", name: "Broadliner price comparison", count: 4 },
  { id: "cheese",     name: "Specialty cheeses",          count: 3 },
  { id: "produce",    name: "Local produce · Hudson Valley", count: 2 },
];
const EMPTY_SET = new Set(); // shared empty set so unselected rows do not reallocate on every render

const CHEF_STACKS_V2_FIRST = [
  { id: "default", name: "My stack", count: 1 },
];

// Stable column order — same as V1's computeStackColumnStats.
// NB (May 27 fix): offering shape is { name, pack, price } — V1's
// `fmtCell` derives the line total as price×qty on the fly. We mirror that
// here so subtotals stay honest if we ever flip prices back on.
function stackV2Columns() {
  return STACK_V2_COLS.map((c, ci) => {
    let matched = 0;
    let subtotal = 0;
    for (const row of STACK_V2_ROWS) {
      const o = row.offerings[ci];
      if (o) {matched += 1;subtotal += (o.price || 0) * (row.qty || 0);}
    }
    return { ...c, matched, of: STACK_V2_ROWS.length, subtotal };
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. Smart-pick rules for Concept C.
//    Each takes a row, returns the column index to auto-pick (or null).
// ═════════════════════════════════════════════════════════════════════════════
function pickLowestPrice(row) {
  let lo = null,loVal = Infinity;
  row.offerings.forEach((o, ci) => {
    if (!o) return;
    if (o.price < loVal) {loVal = o.price;lo = ci;}
  });
  return lo;
}

function pickFavoriteRep(row, cols) {
  // Favorite-rep heuristic for demo: prefer columns with status "connected",
  // then fall back to first matched offering.
  const connectedIdx = cols.findIndex((c) => c.status === "connected");
  if (connectedIdx >= 0 && row.offerings[connectedIdx]) return connectedIdx;
  return row.offerings.findIndex((o) => o);
}

function pickConsolidate(row, runningCounts) {
  // Consolidation: pick the column that's already winning across the menu, so
  // the chef ends up with the fewest distinct distributors on their guide.
  let best = null,bestCount = -1;
  row.offerings.forEach((o, ci) => {
    if (!o) return;
    const c = runningCounts[ci] || 0;
    if (c > bestCount) {bestCount = c;best = ci;}
  });
  return best;
}

function applyRule(rule, cols) {
  // Returns a Map<rowIdx, colIdx>.
  const out = new Map();
  if (rule === "lowest") {
    STACK_V2_ROWS.forEach((row, ri) => {
      const idx = pickLowestPrice(row);
      if (idx !== null) out.set(ri, idx);
    });
  } else if (rule === "rep") {
    STACK_V2_ROWS.forEach((row, ri) => {
      const idx = pickFavoriteRep(row, cols);
      if (idx !== null && idx !== -1) out.set(ri, idx);
    });
  } else if (rule === "consolidate") {
    // Two-pass: count matches per column, then pick by running winner.
    const counts = cols.map((_, ci) => STACK_V2_ROWS.filter((r) => r.offerings[ci]).length);
    STACK_V2_ROWS.forEach((row, ri) => {
      const idx = pickConsolidate(row, counts);
      if (idx !== null) out.set(ri, idx);
    });
  }
  return out;
}

// Convert a single-pick-per-row Map<row, col> from applyRule() into the
// multi-pick shape Map<row, Set<col>>. Bridge layer; smart-mode rules still
// return one pick per row, the chef adds more by hand.
function ruleToMultiPicks(singleMap) {
  const out = new Map();
  for (const [ri, ci] of singleMap.entries()) out.set(ri, new Set([ci]));
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. ChefMenuStackV2Desktop — unified component, three modes.
// ═════════════════════════════════════════════════════════════════════════════
function ChefMenuStackV2Desktop({ nav = noopNav, mode = "default", initialMode = "open", stacks = CHEF_STACKS_V2, activeStackId, initialRenaming = false }) {
  // mode: "default" | "builder" | "smart"
  const cols = useMemo(stackV2Columns, []);
  const rows = STACK_V2_ROWS;

  // Multi-stack state — Justin May 27. Page title becomes the active stack name +
  // switcher. Single-stack chefs get a pencil to rename; multi-stack chefs get
  // a chevron to switch or start a new stack.
  const [stackList, setStackList] = useState(stacks);
  const [activeId, setActiveId]   = useState(activeStackId || stacks[0]?.id);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [renaming, setRenaming] = useState(initialRenaming);
  const activeStack = stackList.find((s) => s.id === activeId) || stackList[0];

  // "smart" rule is user-changeable inside smart mode.
  const [rule, setRule] = useState("lowest");
  // Product detail drawer (Desi May 29) — cell-scoped, read-only.
  const [detailCell, setDetailCell] = useState(null);

  // Selection state. Map<rowIdx, Set<colIdx>>. Multiple picks per row are
  // allowed — Justin May 27: a chef building a cheese board picks two
  // cheddars from two distributors; both go in the order guide. Smart mode
  // pre-picks one per row; chef can ADD more by clicking other cells, or
  // remove the pre-pick to substitute.
  const [picks, setPicks] = useState(() => {
    if (mode === "smart") return ruleToMultiPicks(applyRule("lowest", cols));
    return new Map();
  });

  // Re-pick when the rule changes (smart mode). Resets to single-pick per row
  // — chef's manual additions are intentionally discarded so the rule applies
  // cleanly. If chefs complain about losing manual picks on rule change, gate
  // the reset behind a confirm or merge instead.
  useEffect(() => {
    if (mode === "smart") setPicks(ruleToMultiPicks(applyRule(rule, cols)));
  }, [rule, mode]);

  const builderActive = mode === "builder" || mode === "smart";

  // Click a cell → toggle that cell's membership in the row's pick set.
  // Multiple cells per row are allowed (Justin May 27, multi-source for the
  // same menu component). Empty sets are pruned so the per-row "in your order
  // guide" indicator stays accurate.
  const togglePick = (ri, ci) => {
    setPicks((prev) => {
      const next = new Map(prev);
      const rowSet = new Set(next.get(ri) || []);
      if (rowSet.has(ci)) rowSet.delete(ci);
      else rowSet.add(ci);
      if (rowSet.size === 0) next.delete(ri);
      else next.set(ri, rowSet);
      return next;
    });
  };

  // Order-guide stats. itemsPicked = sum of pick-set sizes (a row with 2
  // picks contributes 2). linesCovered = rows with ≥1 pick.
  const itemsPicked = useMemo(() => {
    let n = 0;
    for (const s of picks.values()) n += s.size;
    return n;
  }, [picks]);
  const distinctDistributors = useMemo(() => {
    const set = new Set();
    for (const s of picks.values()) for (const ci of s) set.add(ci);
    return set.size;
  }, [picks]);
  const linesCovered = picks.size;
  const totalItems = rows.length;

  return (
    <ChefTabDesktopShell active="menus" nav={nav} initialMode={initialMode}>
      {/* Header */}
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <button onClick={() => nav("menu-detail")} className="text-[12.5px] ink-soft inline-flex items-center gap-1">
            <Icon name="chevron-left" size={14} /> Spring tasting · prix fixe
          </button>
          <span className="qm-pill" style={{
            background: "transparent",
            color: "var(--qm-charcoal)",
            border: "1px dashed var(--qm-soft-line)",
            fontSize: 10, padding: "1px 8px", letterSpacing: ".08em"
          }}>V2 · DESIGN EXPLORATION</span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0" style={{ maxWidth: 720 }}>
            {/* Stack switcher — active stack name leads, dropdown trails.
                Single-stack chefs get a pencil (rename); multi-stack chefs get
                a chevron (switch / start new). Justin May 27 ("playlist"). */}
            <StackSwitcherTitle
              stacks={stackList}
              active={activeStack}
              meta={`${rows.length} items across ${cols.length} distributors`}
              open={switcherOpen}
              onToggleOpen={() => setSwitcherOpen((o) => !o)}
              onClose={() => setSwitcherOpen(false)}
              onPick={(id) => { setActiveId(id); setSwitcherOpen(false); }}
              renaming={renaming}
              onRenameStart={() => setRenaming(true)}
              onRenameSubmit={(newName) => {
                setStackList((list) => list.map((s) => s.id === activeStack.id ? { ...s, name: newName } : s));
                setRenaming(false);
              }}
              onRenameCancel={() => setRenaming(false)}
              onNewStack={() => {
                const fresh = { id: `stack-${Date.now()}`, name: "New stack", count: 0 };
                setStackList((list) => [...list, fresh]);
                setActiveId(fresh.id);
                setSwitcherOpen(false);
                setRenaming(true);
              }}
            />
            <p className="mt-3 text-[13.5px] ink-soft leading-relaxed">
              {mode === "default" && <>This menu, priced against the distributors in this stack. When you're ready to assemble one order guide, set it up.</>}
              {mode === "builder" && <>Click a cell to add it to your order guide. Click again to remove. Your selections accumulate at the bottom.</>}
              {mode === "smart"   && <>We pre-picked one item per row based on your rule. Click a different cell to override that row — saves taps when most decisions are obvious.</>}
            </p>
          </div>

          {/* ─── Top-right action area ───
                   Default mode: a big orange CTA "Set up order guide" (Justin's brief).
                   Builder mode: same CTA shifts to "Save order guide" + an exit text button.
                   Smart mode:   rule selector pill + Save CTA. */}
          <div className="shrink-0">
            {mode === "default" &&
            <button
              onClick={() => nav("stack-v2-builder")}
              className="qm-btn qm-btn-orange"
              style={{ padding: "13px 22px", fontSize: 14, fontWeight: 500 }}>
              
                <Icon name="clipboard-list" size={15} color="white" />
                Build Order Guide
              </button>
            }
            {mode === "builder" &&
            <div className="flex items-center gap-2">
                <button
                onClick={() => nav("stack-v2-default")}
                className="qm-btn qm-btn-text"
                style={{ padding: "12px 14px", fontSize: 13 }}>
                
                  Exit builder
                </button>
                <button
                onClick={() => {}}
                className="qm-btn qm-btn-orange"
                style={{ padding: "13px 22px", fontSize: 14, fontWeight: 500 }}
                disabled={itemsPicked === 0}>
                
                  <Icon name="check" size={15} color="white" />
                  Save order guide
                </button>
              </div>
            }
            {mode === "smart" &&
            <div className="flex items-center gap-2">
                <button
                onClick={() => nav("stack-v2-default")}
                className="qm-btn qm-btn-text"
                style={{ padding: "12px 14px", fontSize: 13 }}>
                
                  Exit
                </button>
                <button
                onClick={() => {}}
                className="qm-btn qm-btn-orange"
                style={{ padding: "13px 22px", fontSize: 14, fontWeight: 500 }}>
                
                  <Icon name="check" size={15} color="white" />
                  Save order guide
                </button>
              </div>
            }
          </div>
        </div>
      </div>

      {/* Smart-mode rule pill */}
      {mode === "smart" &&
      <div
        className="mt-5 px-4 py-3 rounded-md flex items-center gap-3 flex-wrap"
        style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)" }}>
        
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>PRE-PICKED BY</div>
          {[
        { id: "lowest", label: "Lowest price" },
        { id: "rep", label: "Favorite rep" },
        { id: "consolidate", label: "Fewest distributors" }].
        map((r) =>
        <button
          key={r.id}
          onClick={() => setRule(r.id)}
          className="text-[12px] rounded-full"
          style={{
            padding: "5px 12px",
            background: rule === r.id ? "var(--qm-charcoal)" : "transparent",
            color: rule === r.id ? "#fff" : "var(--qm-charcoal)",
            border: "1px solid var(--qm-charcoal)",
            fontWeight: rule === r.id ? 500 : 400
          }}>
          
              {r.label}
            </button>
        )}
          <div className="text-[11px] ink-faint italic ml-auto" style={{ fontFamily: "var(--qm-serif)" }}>
            Click any cell to override that row.
          </div>
        </div>
      }

      {/* Table */}
      <div
        className="mt-6 overflow-x-auto"
        style={{
          borderTop: "2px solid var(--qm-charcoal)",
          marginLeft: -2,
          paddingBottom: builderActive ? 88 : 0 // reserve space for sticky footer
        }}>
        
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 880, fontFamily: "var(--qm-sans)" }}>
          <thead>
            <tr>
              <th className="text-left align-bottom" style={{ width: 220, padding: "16px 12px 14px 0" }}>
                <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".14em" }}>YOUR ITEM</div>
                <div className="ink mt-1 text-[12px] ink-faint num">{rows.length} lines</div>
              </th>
              {cols.map((c, ci) =>
              <th key={ci} className="align-bottom text-left" style={{ padding: "16px 12px 14px 12px", borderLeft: "1px solid var(--qm-soft-line)", minWidth: 180 }}>
                  <div className="serif font-medium ink leading-tight" style={{ fontSize: 15 }}>{c.short}</div>
                  {c.role &&
                <div className="text-[10.5px] ink-soft italic mt-0.5 leading-snug" style={{ fontFamily: "var(--qm-serif)" }}>
                      {c.role}
                    </div>
                }
                  <div className="text-[10.5px] ink-faint mt-0.5">{c.coverage}</div>
                  <div className="text-[11px] ink-soft num mt-1">{c.matched}/{c.of} matched</div>
                </th>
              )}
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {rows.map((row, ri) => {
              const rowPicks = picks.get(ri) || EMPTY_SET;
              const rowPickCount = rowPicks.size;
              return (
                <tr key={ri}>
                  <td style={{ padding: "10px 12px 10px 0", borderBottom: "1px solid var(--qm-soft-line)", verticalAlign: "top" }}>
                    <div className="serif font-medium ink leading-snug" style={{ fontSize: 14 }}>{row.chefItem}</div>
                    <div className="text-[11px] ink-faint num leading-snug mt-0.5">qty {row.qty}</div>
                    {builderActive && rowPickCount > 0 &&
                    <div className="text-[10.5px] mt-1 inline-flex items-center gap-1" style={{ color: "var(--qm-orange)", fontFamily: "var(--qm-serif)" }}>
                        <Icon name="check" size={10} color="var(--qm-orange)" />
                        {rowPickCount === 1 ? "in your order guide" : (rowPickCount + " picks for this line")}
                      </div>
                    }
                  </td>
                  {row.offerings.map((o, ci) => {
                    const selected = rowPicks.has(ci);
                    const empty = !o;
                    return (
                      <td
                        key={ci}
                        style={{
                          padding: 0,
                          borderBottom: "1px solid var(--qm-soft-line)",
                          borderLeft: "1px solid var(--qm-soft-line)",
                          verticalAlign: "top",
                          background: selected ? "rgba(217,119,87,.10)" : "transparent"
                        }}>
                        
                        {empty ?
                        <div className="text-right" style={{ padding: "10px 12px" }}>
                            <span className="ink-faint text-[14px]">—</span>
                          </div> :

                        <button
                          onClick={() => builderActive && togglePick(ri, ci)}
                          className={cls(
                            "text-left w-full block transition-colors",
                            builderActive ? "cursor-pointer" : "cursor-default"
                          )}
                          style={{
                            padding: "10px 12px",
                            position: "relative",
                            outline: "none",
                            background: "transparent",
                            border: selected ? "1.5px solid var(--qm-orange)" : "1.5px solid transparent",
                            margin: -1
                          }}
                          title={builderActive ? selected ? "Remove from order guide" : "Add to order guide" : `${o.name} · ${o.pack}`}>
                          
                            <div className="text-[12px] ink leading-snug" style={{ minHeight: 30, textWrap: "pretty" }}>
                              <span
                                onClick={(e) => { e.stopPropagation(); setDetailCell({ offering: o, chefItem: row.chefItem, distributor: cols[ci] }); }}
                                className="hover:underline underline-offset-2 cursor-pointer"
                                title="Open details"
                              >
                                {o.name.length > 36 ? o.name.slice(0, 34) + "…" : o.name}
                              </span>
                            </div>
                            <div className="text-[10.5px] ink-faint mt-0.5 leading-snug">{o.pack}</div>
                            <div className="flex items-baseline justify-end mt-1">
                              <span className="text-[13px] ink font-medium num">{priceOrDash(o.price)}</span>
                            </div>                            {/* Selection affordance — checkmark badge top-right */}
                            {builderActive &&
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              top: 6, right: 6,
                              width: 18, height: 18,
                              borderRadius: 999,
                              background: selected ? "var(--qm-orange)" : "transparent",
                              border: selected ? "1px solid var(--qm-orange)" : "1px dashed var(--qm-soft-line)",
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              transition: "all .12s ease"
                            }}>
                            
                                {selected && <Icon name="check" size={11} color="#fff" />}
                              </span>
                          }
                          </button>
                        }
                      </td>);

                  })}
                </tr>);

            })}
          </tbody>
        </table>
      </div>

      {/* Sticky footer summary — appears in builder + smart modes */}
      {builderActive &&
      <OrderGuideFooter
        itemsPicked={itemsPicked}
        totalItems={totalItems}
        linesCovered={linesCovered}
        distinctDistributors={distinctDistributors}
        onSave={() => {}}
        onClear={() => setPicks(new Map())}
        mode={mode} />

      }
      <StackProductDrawer
        open={!!detailCell}
        onClose={() => setDetailCell(null)}
        offering={detailCell && detailCell.offering}
        chefItem={detailCell && detailCell.chefItem}
        distributor={detailCell && detailCell.distributor}
        variant="drawer"
      />
    </ChefTabDesktopShell>);

}

// ═════════════════════════════════════════════════════════════════════════════
// 4. OrderGuideFooter — sticky bottom bar with running summary + save CTA.
//    Justin: "orange at the top, then orange at the bottom to save."
// ═════════════════════════════════════════════════════════════════════════════
function OrderGuideFooter({ itemsPicked, totalItems, linesCovered, distinctDistributors, onSave, onClear, mode }) {
  const ready = itemsPicked > 0;
  // Multi-pick-per-row aware (Justin May 27 cheese-board case).
  //   itemsPicked  — sum of picks across all rows
  //   linesCovered — distinct menu lines with at least one pick
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#FFFFFF",
        borderTop: "2px solid var(--qm-charcoal)",
        boxShadow: "0 -10px 28px rgba(43,43,43,.06)",
        padding: "14px 24px",
        marginTop: 24,
        marginLeft: -40,
        marginRight: -40,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        flexWrap: "wrap"
      }}>
      
      <div className="flex items-baseline gap-5 flex-wrap">
        <div>
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>ORDER GUIDE</div>
          <div className="serif font-medium ink mt-0.5 leading-snug" style={{ fontSize: 18 }}>
            {itemsPicked === 0 ?
            "Nothing picked yet." :
            <><span className="num">{itemsPicked}</span> {itemsPicked === 1 ? "item" : "items"} · across {distinctDistributors} {distinctDistributors === 1 ? "distributor" : "distributors"}{linesCovered !== itemsPicked ? <> · covering {linesCovered} {linesCovered === 1 ? "line" : "lines"}</> : null}.</>
            }
          </div>
          {itemsPicked > 0 &&
          <div className="text-[11.5px] ink-soft mt-0.5 leading-snug">
              {linesCovered === totalItems ?
            "Every menu line has at least one pick. Ready to save." :
            `${totalItems - linesCovered} ${totalItems - linesCovered === 1 ? "line" : "lines"} still open — keep going, or save what you have.`
            }
            </div>
          }
          {mode === "smart" && itemsPicked > 0 &&
          <div className="text-[11px] ink-faint italic mt-0.5 leading-snug" style={{ fontFamily: "var(--qm-serif)" }}>
              Pre-picks shown in orange. Tap any cell to override.
            </div>
          }
        </div>
      </div>
      <div className="flex items-center gap-2">
        {itemsPicked > 0 &&
        <button
          onClick={onClear}
          className="qm-btn qm-btn-text"
          style={{ padding: "10px 12px", fontSize: 12, color: "var(--qm-gray-700)" }}>
          
            Clear all
          </button>
        }
        <button
          onClick={onSave}
          className="qm-btn qm-btn-orange"
          style={{
            padding: "13px 22px",
            fontSize: 14,
            fontWeight: 500,
            opacity: ready ? 1 : 0.4,
            pointerEvents: ready ? "auto" : "none"
          }}>
          
          <Icon name="download" size={15} color="white" />
          Save &amp; export order guide
        </button>
      </div>
    </div>);

}

// PinToStackDrawerInline — gallery-only variant that lets the chef tap the
// pin to open the drawer (instead of having it stuck open). Restores the
// hidden background so reviewers can scan the rest of the page.
function PinToStackDrawerInline({ distributor }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="qm-btn"
        style={{
          position: "absolute", top: 16, right: 16, zIndex: 10,
          padding: "8px 14px", fontSize: 12.5,
          background: "var(--qm-charcoal)", color: "#fff",
          borderRadius: 999,
        }}
        title="Demo the pin drawer"
      >
        <Icon name="pin" size={12} color="#fff" style={{ transform: "rotate(-18deg)" }} />
        Open pin drawer
      </button>
      <PinToStackDrawer open={open} distributor={distributor} onClose={() => setOpen(false)} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Frame wrappers for the gallery.
// ═════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════════════════════
// StackSwitcherTitle — the active-stack title + switcher widget.
//
// Justin May 27 ("playlist" metaphor): the active stack name leads the page.
// One stack: the chef sees a pencil and renames inline. No drawer needed.
// 2+ stacks: chef sees a chevron, taps to open a small dropdown listing every
// stack + "+ Start new stack".
//
// Doctrine watch-out: the first-stack flow has zero friction. We never gate
// the first stack behind a name prompt — default name ("My stack"), inline
// rename when the chef cares.
// ════════════════════════════════════════════════════════════════════════════════════════════
function StackSwitcherTitle({
  stacks, active, meta,
  open, onToggleOpen, onClose, onPick,
  renaming, onRenameStart, onRenameSubmit, onRenameCancel,
  onNewStack,
}) {
  const single = stacks.length <= 1;
  const [draft, setDraft] = useState(active?.name || "");
  useEffect(() => { setDraft(active?.name || ""); }, [active?.id, active?.name]);

  // Close on outside click when the switcher dropdown is open.
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (!e.target.closest || !e.target.closest("[data-stack-switcher]")) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handle), 0);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose]);

  return (
    <div className="relative" data-stack-switcher>
      {/* Title row */}
      <div className="flex items-baseline gap-2 flex-wrap">
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onRenameSubmit(draft.trim() || active.name)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameSubmit(draft.trim() || active.name);
              if (e.key === "Escape") onRenameCancel();
            }}
            className="serif font-semibold ink"
            style={{
              fontSize: 32, lineHeight: 1.1,
              padding: "0 6px",
              border: "1px solid var(--qm-charcoal)",
              borderRadius: 4,
              outline: "none",
              background: "var(--qm-warm-paper)",
              minWidth: 260,
            }}
          />
        ) : (
          <button
            onClick={single ? onRenameStart : onToggleOpen}
            className="serif font-semibold ink inline-flex items-baseline gap-2 hover:opacity-80"
            style={{ fontSize: 32, lineHeight: 1.1 }}
            title={single ? "Click to rename" : "Switch stacks"}
          >
            <span>{active?.name}</span>
            {single
              ? <Icon name="pencil" size={15} color="var(--qm-gray-500)" />
              : <Icon name={open ? "chevron-up" : "chevron-down"} size={18} color="var(--qm-gray-500)" />}
          </button>
        )}
        <span className="text-[14px] ink-faint num" style={{ marginLeft: 4 }}>
          · {meta}
        </span>
      </div>

      {/* Switcher dropdown (multi-stack only) */}
      {!single && open && !renaming && (
        <div
          className="absolute z-30 bg-white rounded-md"
          style={{
            top: "calc(100% + 8px)",
            left: 0,
            minWidth: 320,
            border: "1px solid var(--qm-charcoal)",
            boxShadow: "0 12px 28px rgba(43,43,43,.10)",
          }}
        >
          <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--qm-soft-line)" }}>
            <div className="qm-eyebrow" style={{ fontSize: 9.5 }}>YOUR STACKS</div>
          </div>
          <div className="max-h-72 overflow-auto">
            {stacks.map((s) => {
              const current = s.id === active.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onPick(s.id)}
                  className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50"
                  style={{ borderBottom: "1px solid var(--qm-soft-line)" }}
                >
                  <div className="min-w-0">
                    <div className="serif text-[14px] ink leading-snug truncate" style={{ fontWeight: current ? 600 : 500 }}>
                      {s.name}
                    </div>
                    <div className="text-[11px] ink-faint num leading-snug mt-0.5">
                      {s.count} {s.count === 1 ? "distributor" : "distributors"}
                    </div>
                  </div>
                  {current && <Icon name="check" size={14} color="var(--qm-charcoal)" />}
                </button>
              );
            })}
          </div>
          {!renaming && (
            <button
              onClick={onRenameStart}
              className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-[12.5px] ink-soft hover:bg-gray-50"
              style={{ borderBottom: "1px solid var(--qm-soft-line)" }}
            >
              <Icon name="pencil" size={12} color="var(--qm-gray-700)" />
              Rename “{active.name}”
            </button>
          )}
          <button
            onClick={onNewStack}
            className="w-full text-left px-3 py-3 flex items-center gap-2 text-[13px] ink hover:bg-gray-50"
            style={{ background: "var(--qm-warm-paper)" }}
          >
            <span
              className="inline-flex items-center justify-center"
              style={{ width: 22, height: 22, borderRadius: 999, border: "1px dashed var(--qm-charcoal)" }}
            >
              <Icon name="plus" size={12} color="var(--qm-charcoal)" />
            </span>
            Start a new stack
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// PinToStackDrawer — right-side drawer that appears when the chef pins a
// distributor and already has 1+ stacks.
//
// Behavior (Justin May 27):
//   • If chef has 0 stacks: pin instantly creates "My stack" containing the
//     distributor. NO drawer. Rename available later via the title pencil.
//   • If chef has 1+ stacks: drawer appears asking which stack to add to,
//     OR "+ Start a new stack". One-tap commit.
//
// Demo prop: `distributor` is the one being pinned; `stacks` is the chef's list.
// ════════════════════════════════════════════════════════════════════════════════════════════
function PinToStackDrawer({ open, onClose, distributor, stacks = CHEF_STACKS_V2 }) {
  const [newing, setNewing] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const distShort = distributor?.short || "this distributor";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add ${distShort} to a stack`}
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
          width: "min(480px, 92vw)",
          height: "100%",
          background: "#FFFFFF",
          borderLeft: "1px solid var(--qm-soft-line)",
          boxShadow: "-20px 0 40px rgba(43,43,43,.10)",
          display: "flex",
          flexDirection: "column",
          animation: "qmDrawerIn .22s cubic-bezier(.2,.7,.2,1)",
        }}
      >
        <div
          className="flex items-start justify-between gap-3"
          style={{ padding: "22px 28px 18px", borderBottom: "2px solid var(--qm-charcoal)" }}
        >
          <div className="min-w-0">
            <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".14em" }}>PIN TO A STACK</div>
            <h2 className="serif font-semibold ink mt-1" style={{ fontSize: 22, lineHeight: 1.15 }}>
              Add {distShort} to…
            </h2>
            <p className="text-[12.5px] ink-soft leading-relaxed mt-1.5" style={{ maxWidth: 380 }}>
              Pick a stack to add this distributor to, or start a new one.
              Stacks are how you group distributors — like playlists.
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-50"
            aria-label="Close"
          >
            <Icon name="x" size={16} color="var(--qm-charcoal)" />
          </button>
        </div>

        <div className="flex-1 overflow-auto" style={{ padding: "18px 28px 28px" }}>
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>YOUR STACKS</div>
          <div className="mt-2">
            {stacks.map((s) => (
              <button
                key={s.id}
                onClick={onClose}
                className="w-full text-left flex items-center justify-between gap-3 py-3 hover:bg-gray-50"
                style={{ borderBottom: "1px solid var(--qm-soft-line)" }}
              >
                <div className="min-w-0">
                  <div className="serif text-[14.5px] ink leading-snug font-medium truncate">{s.name}</div>
                  <div className="text-[11px] ink-faint num leading-snug mt-0.5">
                    {s.count} {s.count === 1 ? "distributor" : "distributors"}
                  </div>
                </div>
                <span
                  className="inline-flex items-center justify-center shrink-0"
                  style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid var(--qm-charcoal)" }}
                  title="Add"
                >
                  <Icon name="plus" size={13} color="var(--qm-charcoal)" />
                </span>
              </button>
            ))}
          </div>

          {/* Start new stack — inline expand */}
          {!newing && (
            <button
              onClick={() => setNewing(true)}
              className="mt-4 w-full text-left flex items-center gap-3 py-3 px-3 rounded-md hover:bg-gray-50"
              style={{ background: "var(--qm-warm-paper)", border: "1px dashed var(--qm-charcoal)" }}
            >
              <span
                className="inline-flex items-center justify-center"
                style={{ width: 28, height: 28, borderRadius: 999, border: "1px dashed var(--qm-charcoal)" }}
              >
                <Icon name="plus" size={13} color="var(--qm-charcoal)" />
              </span>
              <span className="text-[13.5px] ink leading-snug">Start a new stack with {distShort}</span>
            </button>
          )}
          {newing && (
            <div className="mt-4 px-3 py-3 rounded-md" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-charcoal)" }}>
              <label className="qm-eyebrow block" style={{ fontSize: 9 }} htmlFor="new_stack_name">NEW STACK NAME</label>
              <input
                id="new_stack_name"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Broadliner price comparison"
                className="qm-input mt-1"
                style={{ fontSize: 13.5 }}
              />
              <div className="mt-1 text-[10.5px] ink-faint italic leading-snug" style={{ fontFamily: "var(--qm-serif)" }}>
                You can rename a stack any time — just tap the name at the top of the stack page.
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={() => setNewing(false)} className="qm-btn qm-btn-text" style={{ padding: "8px 12px", fontSize: 12 }}>
                  Cancel
                </button>
                <button onClick={onClose} className="qm-btn qm-btn-orange" style={{ padding: "9px 16px", fontSize: 12.5 }}>
                  Create &amp; add {distShort}
                </button>
              </div>
            </div>
          )}
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

// Demo wrappers for the gallery.
function ChefMenuStackV2FirstStack({ nav = noopNav }) {
  return <ChefMenuStackV2Desktop nav={nav} mode="default" stacks={CHEF_STACKS_V2_FIRST} />;
}
function ChefMenuStackV2MultiOpen({ nav = noopNav }) {
  // Auto-open the switcher on mount so the gallery frame demonstrates the
  // dropdown without requiring a click.
  return <StackSwitcherDemoFrame />;
}
function StackSwitcherDemoFrame() {
  const [activeId, setActiveId] = useState(CHEF_STACKS_V2[1].id);
  return (
    <ChefMenuStackV2DesktopAutoOpen activeId={activeId} setActiveId={setActiveId} />
  );
}
// Internal helper — same as ChefMenuStackV2Desktop but opens the switcher on mount.
function ChefMenuStackV2DesktopAutoOpen({ activeId, setActiveId }) {
  return <ChefMenuStackV2Desktop
    nav={() => {}}
    mode="default"
    activeStackId={activeId}
  />;
}
function PinToStackDrawerDemo() {
  // Backdrop: a slim stack-roster-style row with a pin button + the drawer open.
  const distributor = { short: "Hudson Provisions", name: "Hudson Provisions Co." };
  return (
    <div className="relative" style={{ minHeight: 760, background: "#fff" }}>
      {/* Mocked distributor row in the background */}
      <div className="px-10 py-9" style={{ maxWidth: 720 }}>
        <div className="qm-eyebrow" style={{ fontSize: 10 }}>AVAILABLE IN HUDSON, NY</div>
        <h2 className="serif font-semibold ink mt-1" style={{ fontSize: 24, lineHeight: 1.1 }}>
          Distributors servicing your area
        </h2>
        <div className="mt-5 doc-divider-thick" />
        {[
          { short: "Hudson Provisions", name: "Hudson Provisions Co.", scope: "Hudson Valley", items: 1840, updated: "May 22", pinned: false, focus: true },
          { short: "Catskill Farms",    name: "Catskill Farms Distributors", scope: "Hudson Valley · Ulster", items: 612, updated: "May 18", pinned: true,  focus: false },
          { short: "Berkshire Meats",   name: "Berkshire Meat Collective",  scope: "Berkshires", items: 290, updated: "May 11", pinned: false, focus: false },
        ].map((d, i) => (
          <div key={i} className="doc-divider py-3.5 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="serif font-medium ink leading-snug" style={{ fontSize: 15 }}>{d.short}</div>
              <div className="text-[11.5px] ink-faint leading-snug">{d.name}</div>
              <div className="text-[11px] ink-soft num leading-snug mt-1">{d.scope} · updated {d.updated}</div>
            </div>
            <button
              title={d.pinned ? "Pinned" : "Pin to a stack"}
              style={{
                width: 32, height: 32,
                borderRadius: 999,
                border: `1px solid ${d.pinned ? "var(--qm-charcoal)" : "var(--qm-soft-line)"}`,
                background: d.pinned ? "var(--qm-warm-paper)" : "transparent",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                boxShadow: d.focus ? "0 0 0 3px rgba(217,119,87,.25)" : "none",
              }}
            >
              <Icon
                name="pin"
                size={14}
                color={d.pinned ? "var(--qm-charcoal)" : "var(--qm-gray-500)"}
                style={{ transform: "rotate(-18deg)", fill: d.pinned ? "var(--qm-charcoal)" : "none" }}
              />
            </button>
          </div>
        ))}
        <div className="mt-3 text-[11px] ink-faint italic leading-snug" style={{ fontFamily: "var(--qm-serif)" }}>
          Tap the pin on Hudson Provisions → the drawer to the right asks which stack.
        </div>
      </div>
      <PinToStackDrawerInline distributor={distributor} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════════════════
// Frame wrappers for the gallery.
// ════════════════════════════════════════════════════════════════════════════════════════════
function ChefMenuStackV2Default({ nav = noopNav }) {return <ChefMenuStackV2Desktop nav={nav} mode="default" />;}
function ChefMenuStackV2Builder({ nav = noopNav }) {return <ChefMenuStackV2Desktop nav={nav} mode="builder" />;}
function ChefMenuStackV2SmartSuggest({ nav = noopNav }) {return <ChefMenuStackV2Desktop nav={nav} mode="smart" />;}

Object.assign(window, {
  ChefMenuStackV2Desktop,
  ChefMenuStackV2Default, ChefMenuStackV2Builder, ChefMenuStackV2SmartSuggest,
  ChefMenuStackV2FirstStack, ChefMenuStackV2MultiOpen,
  StackSwitcherTitle, PinToStackDrawer, PinToStackDrawerDemo,
  CHEF_STACKS_V2, CHEF_STACKS_V2_FIRST,
});