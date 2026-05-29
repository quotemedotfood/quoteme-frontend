# STACK — prices + product drawer — design handoff (Wave 3 · STACK-FE)

**Author:** Desi · **Locked:** May 29, 2026 · **Audience:** Claudio + FE
**Spec ref:** Justin price-doctrine inversion (May 27→29) · Desi product-drawer ask (May 29) · Moose Stack V1 doctrine
**Canonical source:** `handoff/source/screens-stack.jsx` (V1, single-Stack), `handoff/source/screens-stack-v2.jsx`
(V2, multi-Stack exploration), `handoff/source/screens-stack-drawer.jsx` (shared drawer)
(if this markdown ever disagrees with the .jsx, **the .jsx wins**).

---

## Ticket map

| Ticket | What | Where | Source |
|---|---|---|---|
| **STACK-FE-1** | Prices show by default in every cell | V1 already rendered them; **V2 cells gained a price line** | `screens-stack-v2.jsx` cell body |
| **STACK-FE-2** | Carried-but-unpriced = `$—` (the one allowed em-dash in a price slot) | `priceOrDash()` everywhere a unit price renders | `screens-stack-drawer.jsx` (`priceOrDash`), V1 + V2 cells |
| **STACK-FE-3** | Cell-scoped, read-only **product drawer** (click a product name) | `StackProductDrawer` + body | `screens-stack-drawer.jsx`, wired in V1 + V2 |
| **STACK-FE-4** | Multi-pack-ready product detail data shape + mobile bottom-sheet variant | `STACK_PRODUCT_DETAIL`, `variant="sheet"` | `screens-stack-drawer.jsx` |

---

## STACK-FE-1/2 — price treatment

Two distinct absences, two treatments — **do not collapse them:**

| Case | Cell renders | Notes |
|---|---|---|
| Distributor **doesn't carry** the item | whole-cell `—` (gray-400, no border) | unchanged; coverage gap stays visible |
| Distributor **carries it, no price held** | product name + pack, **`$—`** in the price slot | the ONLY place an em-dash is allowed in a price slot (Justin) |
| Distributor carries it, price held | product name + pack + `money(price)` | default |

**Helper (single source of truth):** `const priceOrDash = (p) => (p == null ? "$—" : money(p));` — exported from
`screens-stack-drawer.jsx`. Every unit-price render site uses it (V1 cell, V2 cell, every pack row in the drawer).

**Exact diffs:**
- **V1 (`screens-stack.jsx`):** cell price `money(cell.unit)` → `priceOrDash(cell.unit)`. `lowestPriceIndex()` now skips
  `price == null` so the "↓ cheaper-here" marker never points at an unpriced cell.
- **V2 (`screens-stack-v2.jsx`):** the cell previously showed name + pack only. Added a right-aligned price line
  `<span className="text-[13px] ink font-medium num">{priceOrDash(o.price)}</span>` under the pack.
- **Demo unpriced cell:** `STACK_ROWS` → Produce → Radicchio → Riverbend (unaffiliated) "Late Treviso" `price: null`.
  Renders `$—`. ⚠ **Ratification flag:** demoed on an *Unaffiliated* distributor (no rep → no price loaded, reads
  naturally). If Justin wants the example on a *Connected* distributor, it's a one-line data change — confirm before port.

**Global gate untouched:** the legacy `SHOW_PRICES` flag in `screens-stack.jsx` still lets QM admin blank prices
globally (distributor-density skittishness). It is *separate* from the per-cell `$—`: `SHOW_PRICES=false` hides all
amounts and keeps layout rhythm; `$—` is the per-cell "carried, unpriced" state when prices are on.

## STACK-FE-3 — product drawer (cell-scoped, read-only)

Click a product **name** inside any cell → `StackProductDrawer` opens for **that distributor's offering of that item.**

- **API:** `<StackProductDrawer open onClose offering chefItem distributor variant />`
  - `offering` = the cell's `{ name, pack, price }`; `chefItem` = the left-column term ("Yellow cheddar");
    `distributor` = the column `{ short, name, status, role }`; `variant` = `"drawer"` (desktop right) | `"sheet"` (mobile bottom).
- **Body shows:** distributor eyebrow (+ "no rep yet" if unaffiliated), product name, "Your line: {chefItem}",
  a striped **"product shot"** placeholder, description, a 2-col fact grid (SKU · ORIGIN · BRAND · SOLD BY), the
  **PACK SIZES** list (each row = label + SKU + `priceOrDash`), and a provenance footnote
  ("From {distributor}'s catalog, updated {date}" — distributor name, never catalog name).
- **READ-ONLY (locked).** No "swap this match" / "add pack to order guide" action here. The replace-match interaction
  **already exists in the Rep Flow — do not duplicate.** (Backlogged; if it comes chef-side later, match the Rep Flow Figma.)
- **Wiring:** product name is a `<span onClick stopPropagation>` so it opens the drawer without triggering V2's
  cell-selection (builder mode). Drawer state (`detailCell`) lives in the page component; render once near the page root.
- **Chrome:** desktop = right-side drawer (shares the `StackAddDrawer` rhythm, ESC + backdrop close).
  Mobile = bottom sheet (`variant="sheet"`, grab-handle, slides up).

## STACK-FE-4 — data shape (multi-pack ready)

`STACK_PRODUCT_DETAIL` is keyed by `offering.name`. Anything **not** enriched degrades gracefully to the cell's own
`{ name, pack, price }` (single-pack). Shape:

```js
"<offering.name>": {
  desc, sku, origin, brand, unit, updated,
  packs: [ { label, price, sku }, ... ]   // ≥1; price may be null (→ "$—"); packs[0] is the "shown in stack" default
}
```

Most catalogs won't carry multiple packs for a while — the drawer is **built ready** (renders a "PACK SIZES · N options"
list with a "shown in stack" badge on `packs[0]`). Single-pack offerings render one row, no badge.

---

## Coverage display — stays (Ask 1 Q5, confirmed)

Per-distributor column headers keep "X/Y matched" + the grand coverage footer. No dollar subtotals on the stack
(no-qty doctrine — totals live on the order-guide document post-confirm). Justin filed a doctrine question on whether
match-counts cross his external-subtle line; **build assuming they stay.**

## Backlog (told Opus)

1. **Row-scoped** (one menu item across all distributors) and **column-scoped** product detail. Cell-scoped ships first.
2. **Drawer "swap this match"** action — read-only for now; lives in the Rep Flow, not duplicated here.

## Dependencies / demo data

`Icon` · `money()` · `ChefTabDesktopShell` · CSS tokens (`--qm-*`, `--accent`). Demo restaurant/distributors per
`STACK_DISTRIBUTORS` + `STACK_ROWS` (D'Lisius full · Foothill Dairy · Northwind Seafood · Riverbend Produce unaffiliated).
