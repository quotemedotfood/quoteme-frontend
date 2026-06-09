# Brand shell + pages — wiring handoff (Eighteen/Moose, Jun 6)

For Claudio. The brand front end is built and ready to wire to the live backend.
Two parts: (1) the ONE shell, (2) the brand pages.

---

## 1. ONE shell — exported, role-agnostic

The single shell lives in `src/screens-desktop.jsx` and is shared substrate (loaded
by every entry). **No old sidebar, no double sidebar — every role feeds the same shell.**

### Components

- **`NewspaperShell`** — the one entry point. Picks chrome by `variant`:
  ```jsx
  <NewspaperShell
    variant="desktop" | "mobile"
    edition="Brand Edition"
    identity={{ eyebrow, title, sub, meta, mono, initials }}
    nav={[ { group, items: [{ id, icon, label, count, muted, onClick, sub }] } ]}
    active="dashboard"
    settings={{ id, icon, label, onClick, sub }}   // bottom-pinned
    trust={null}                                    // optional ribbon element
    onNav={fn}
    maxWidth={860}
  >
    {pageBody}
  </NewspaperShell>
  ```
  - `variant="desktop"` → `RoleSidebar` (left column, open/compact/hidden) + content.
  - `variant="mobile"`  → `NewspaperMobileShell` (masthead ☰ → slide-in drawer holding the SAME nav).
- **`RoleSidebar`** / **`NewspaperMobileShell`** are the two halves if you ever need them directly. Both are config-driven by the same `nav` shape.

### Wiring per role
Each role supplies a `nav` config + `identity`; the shell renders identically.
- Brand: `brandNav(nav, active)` + `BRAND_IDENTITY` (in `src/screens-brand.jsx`). Reference impl: `BrandShell`.
- Chef / Rep / Distributor: build the same `nav` shape from their destinations and pass to `NewspaperShell`. The old per-role sidebars (`NewspaperSidebar`, `RepNewspaperSidebar`, `DistNewspaperSidebar`, `BrandNewspaperSidebar`) are superseded by `RoleSidebar` — swap callers to `NewspaperShell` and delete the duplicates. (Chef/rep mobile already moved to `NewspaperMobileShell`; desktop swap is mechanical.)

`nav` item shape:
```
{ id, icon (lucide name), label, count?, muted?, onClick, sub?: [{ label, meta?, onClick }] }
```

---

## 2. Brand shell + pages

All in `src/screens-brand.jsx`. A `role:brand` user lands in `/brand/*` always —
never the rep or distributor shell. **No incoming-quotes surface anywhere.**

### Brand nav (NOT the rep nav)
`Dashboard · Catalog · Capture · Packages · Notifications · Distributors · Team (admin) · Settings`
(+ `Profile`, reached from Settings). Defined in `brandNav()`.

### Pages → components → routes
Every page is a `makeBrandPage(active, Body, maxWidth)` wrapper taking `nav` + `variant`
(`"mobile"` default | `"desktop"`). Mobile routes registered in `FLOW_ROUTES`.

| Route (`/brand/*`) | Component | FLOW_ROUTES key | Notes |
|---|---|---|---|
| dashboard      | `BrandDashboard`      | `brand-dashboard`     | Catalog status, recent packages, notification rail. No inbox. One orange = capture→package. |
| catalog        | `BrandCatalog`        | `brand-catalog`       | Brand's own products, view + upload. Names+specs, **no prices**. |
| capture        | `BrandCapture`        | `brand-capture`       | Paste/upload menu → match **against brand catalog only** → add to package. |
| packages       | `BrandPackages`       | `brand-packages`      | List (draft/sent). |
| package build  | `BrandPackageBuilder` | `brand-package-build` | Pick products + select **ONE** distributor + notify. draft→sent. |
| notifications  | `BrandNotifications`  | `brand-notifications` | Read-only. Sent→Opened→Loaded→In catalog stepper per package. |
| distributors   | `BrandDistributors`   | `brand-distributors`  | Reuses chef distributor design; track + bring-on. |
| (send F3)      | `BrandSendCatalog`    | `brand-send-catalog`  | Brand mints + sends the F3 secured catalog link. |
| team           | `BrandTeam`           | `brand-team`          | Admin: members + invite (magic link). |
| settings       | `BrandSettings`       | `brand-settings`      | Company config that feeds the profile. |
| profile        | `BrandProfilePreview` | `brand-profile`       | Public profile preview (network-facing, no prices). Reuses `BrandProfileBody` from `src/screens-profiles.jsx`. |
| auth chooser   | `AuthRoleChooser{Mobile,Desktop}` | `brand-role-chooser` | "I'm a brand" un-greyed, lands → `brand-dashboard`. |

### Demo data (swap for live)
`BRAND_DEMO`, `BRAND_REPS`, `BRAND_PRODUCTS`, `BRAND_DISTRIBUTORS`,
`BRAND_AREA_DISTRIBUTORS`, `BRAND_PACKAGES`, `BRAND_TEAM` — all top of `src/screens-brand.jsx`.
Notify lifecycle: `sent → opened → loaded → live`. Package status: `draft | sent`.

### Hard rules held in code
- No incoming-quotes surface anywhere in the brand shell.
- One Sacred Orange (#F2993D) per page (brand is a QuoteMe customer; no distributor-accent carve-out here).
- Packages send to exactly ONE distributor; each stays its own thread.
- Catalog/capture never show prices (brands don't price).

### Open / TBD
- Copy is placeholder where Justin's language isn't locked (esp. dashboard, capture, package builder microcopy).
- `Capture → match` is a demo stub (fixed 4-of-5 result); wire to the real brand-catalog matcher.
- Profile preview depends on `src/screens-profiles.jsx` being loaded alongside `screens-brand.jsx`.
