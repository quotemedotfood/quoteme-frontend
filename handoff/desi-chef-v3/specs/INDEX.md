# Chef design handoff — V3 (Desi → Claudio)

## Two ways to consume this package

1. **Per-surface markdowns** (`v3-*.md`) — each surface is one file with
   V3 spec ref + locks + dependencies + FULL component bodies inline.
   Good for sequenced porting.
2. **Raw sources** (`source/*.jsx`) — verbatim copies of the prototype's
   source files. Canonical reference; markdowns are referential.

If anything in the markdowns disagrees with the .jsx files, the .jsx wins.

## Surface map

| # | File | Spec ref | Stage | Status |
|---|---|---|---|---|
| 1 | `v3-distributors-populated.md` | Part 5 + Part 6.7 + Part 7 | V2 | Full body |
| 2 | `v3-settings-populated.md`     | Part 6.7 + Part 9          | V2 | Full body |
| 3 | `v3-use-distributor-modal.md`  | Part 5                     | V2 | Full body |
| 4 | `v3-preview-pill-receipt.md`   | Part 6 Step 5              | V2 | Full body |
| 5 | `v3-per-row-inline-merge.md`   | Part 3                     | V2 | Full body |
| 6 | `v3-newspaper-sidebar.md`      | Part 4 + Part 6.7          | V2 | Full body (May 20, c53 wiring + c59 default-mode doctrine) |
| 7 | `v3-menus-library.md`          | May 21 brief               | Opus Stage 1 | Full body (May 21) |
| 8 | `v3-menu-detail.md`            | May 21 brief               | Opus Stage 1 | Full body (May 21) |
| 9 | `v3-pull-quote-flow.md`        | May 21 brief               | Opus Stage 2 | Full body (May 21) — entry + status + receipt with carried distributor |
| 10 | `v3-menu-spread.md`            | May 21 brief               | Opus Stage 3 | Full body (May 21) |
| 11 | `v3-ack-navy.md`               | May 21 brief               | Tokens       | Navy ack hex lock — replace green confirmations |
| 12 | `v3-icon-rules.md`             | May 21 brief               | Doctrine     | Icon-vs-label rules + verb mapping |
| 13 | `v3-language-tightening.md`    | Justin May 21 PDF review   | V3 polish    | Three string swaps + Quote-out-of-date + Concept Mode copy |

## Raw sources

| File | What's in it |
|---|---|
| `source/screens-tabs.jsx`      | Tabs, distributors, settings, modal, follow-up row, badge, tab bar, desktop shell. Modal `onContinue` now nav'es to `pull-entry` with `{ distributor }` payload (May 21 update). |
| `source/screens-desktop.jsx`   | NewspaperSidebar, NavDestination, NavGroupLabel, SidebarRestoreButton, ChefDashboardDesktop, ChefOrderGuideDesktop |
| `source/document.jsx`          | DEMO data, PREVIOUS_QUOTES, money(), PreviewPill, QuoteDocument, QuoteStatusPill, TrustRibbon, PhoneShell, ChefPhoneFlow (now with 2-arg `nav(target, props)`) |
| `source/screens-existing.jsx`  | ChefQuoteReceiptPage, ChefEntryPage, ChefStatusPage, ChefOrderGuidePage |
| `source/screens-menus.jsx`     | **NEW (May 21)** — MENU_LIBRARY + MENU_DETAIL_LINES, ChefMenusIndexPage, ChefMenuDetailPage, ChefMenusIndexDesktop, MenuRow, MenuRowDesktop, MenuKebab, HistoryStatusPill |
| `source/screens-pullquote.jsx` | **NEW (May 21)** — PullDistributorAnchor, ChefPullEntryPage, ChefPullStatusPage, ChefPullReceiptPage, PullQuoteDocument |
| `source/screens-spread.jsx`    | **NEW (May 21)** — SPREAD_DISTRIBUTORS + SPREAD_ROWS, ChefMenuSpreadDesktop, ChefMenuSpreadMobile, helpers |

## Demo data (locked, do not mutate during port)

- Chef: Daniel Reeves (daniel@hollowayandsons.com)
- Restaurant: Holloway & Sons, Hudson, NY
- Rep: Marcus Rivera, (518) 555-0143, marcus@dlisius.co
- Distributor: D'Lisius Distribution Co. (short: D'Lisius)
- Current quote: Q-1042, May 12, 2026
- Pulled-quote demo number: Q-1067 (distinct thread from Q-1042 — do not collapse)
- May 21 demo distributors for pull flow: Northwind Seafood (affiliated) + Riverbend Produce (unaffiliated)

## Shared dependencies referenced across multiple files

- `CatalogStatusBadge` — status enum: `connected` / `uploaded` / `unaffiliated` (file 1)
- `PreviewPill` — sizes `sm` (default) and `xs` (file 4)
- `Icon` — lucide-react passthrough
- `money()` — `const money = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });`
- CSS tokens — see design-system stylesheet `colors_and_type.css`

## May 21 brief — what's new, why it ships in this order

Stage 1 (Menus library + detail) is the substrate. Until menus are
saved and addressable, neither the pull-quote flow nor the spread has a
durable anchor — the chef has nothing to point at when they decide to
quote against a new distributor. Ship `v3-menus-library.md` +
`v3-menu-detail.md` first.

Stage 2 (Pull-quote flow) is the operational consequence of the
already-shipped `UseDistributorForQuoteModal` (file 3). The chef confirms
the modal, then lands somewhere — these three surfaces are where. Ship
`v3-pull-quote-flow.md` immediately after Stage 1 so the modal doesn't
sit half-wired in prod.

Stage 3 (Spread) is the paid value prop made visual. It depends on Stage
1 (menu addressability) but not Stage 2 — a chef can spread a menu
without having pulled a single distributor-specific quote yet. Ship
`v3-menu-spread.md` whenever Stage 1 is solid.

Stage 4 (live spread qty editing + cross-distributor partial order
guides) is out of scope for this design pass — designs in Stage 3 read
correctly as read-only spreads; the editing affordances are Stage 2+
work that we'll spec when Moose scopes them.

### `nav(target, props)` contract change

`ChefPhoneFlow` in `document.jsx` now accepts a second `props` argument
on `nav()`. Existing single-arg call sites are untouched; new surfaces
that need to hand state to the next screen (pull-quote flow, spread →
build order guide) pass `{ distributor }` as the second arg. The change
is one line — see `source/document.jsx` for the diff context.
