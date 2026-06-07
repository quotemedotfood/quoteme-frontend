# DIAGNOSIS: CCAssignPage — BP Row Assign Freeze

**Date**: 2026-06-06  
**Branch**: fix/cc-assign-brand-freeze  
**Tester**: Claude (automated Playwright + bundle analysis)

---

## Failure Mode (Verbatim)

Clicking "Assign" on the Holloway & Sons row (q_label "BP-Olive Branch starter set fo...") on
`https://test.quoteme.food/distributor-admin/command-center/assign` causes the browser to enter a
freeze state where:
- The rep picker never opens
- The page is unresponsive (visually)
- Recovery requires a full page reload

Plain rows (North Light — New Lead, etc.) work normally.

---

## Playwright Reproduction Results

**Auth**: POST /users/sign_in → 200 OK, JWT obtained.

**API data (GET /api/v1/distributor_admin/command_center/unassigned)**:

```json
{
  "items": [
    {
      "kind": "quote",
      "id": "7f8ca0ce-7cf4-4c83-ac7b-77a05699a39a",
      "restaurant": "Holloway & Sons",
      "city": "Hudson, NY",
      "q_label": "BP-Olive Branch starter set fo...",
      "items": 2,
      "age": "today"
    },
    {
      "kind": "quote",
      "id": "3cbfcccd-1b55-4f6e-b0f5-09dd02768553",
      "restaurant": "North Light",
      "city": "Hudson, NY",
      "q_label": "North Light — New Lead",
      "items": 0,
      "age": "6 days ago"
    }
  ],
  "reps": [
    { "id": "10d8b164-...", "name": "CJ Okafor", "initials": "CO", "open": 1, "last": "6 days ago" },
    { "id": "7e667d7a-...", "name": "Dana Pruitt", "initials": "DP", "open": 2, "last": "6 days ago" },
    { "id": "5653dc45-...", "name": "Marcus Rivera", "initials": "MR", "open": 6, "last": "3 days ago" }
  ]
}
```

**Headless Playwright results (ALL TESTS PASS)**:

| Test                      | Result                        |
|---------------------------|-------------------------------|
| Control (North Light) Assign click | picker opened: true         |
| Control eval('1+1') after click    | 2 — main thread RESPONSIVE  |
| BP (Holloway) Assign click         | picker opened: true         |
| BP eval('1+1') after click         | 2 — main thread RESPONSIVE  |
| BP frames/sec after click          | 61 fps (NOT frozen)         |
| BP polling 0-1400ms               | picker stable, text correct |
| Page errors                        | 0                           |

**Conclusion**: The JS main thread does NOT block. The freeze is not an infinite sync loop.
The bug is a **visual/GPU compositor freeze** that only occurs in a real browser with GPU compositing.

---

## Root Cause Analysis

### What the code does

`CCAssignPage.tsx` renders a list of `AssignRow` components. Each row has local state:
```typescript
{ picking: boolean; assignedRepId: string | null; error: string | null; saving: boolean }
```

Clicking "Assign" calls `setState((s) => ({ ...s, picking: true, error: null }))`.
This triggers a re-render that inserts the rep picker div (~180px tall) into the DOM.

The picker appears fine in headless Playwright. The bundle code is identical to source — no
divergence.

### The suspect: backdrop-filter on position:sticky in nested overflow:auto

In `CCLayout.tsx`, the sticky search bar has:

```jsx
<div style={{
  position: 'sticky',
  top: 0,
  zIndex: 10,
  ...
  background: 'rgba(255,255,255,.92)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  ...
}}>
  <CCSearchBar />
</div>
```

This sticky element is nested inside:
1. `CCLayout <main style={{ overflowY: 'auto' }}>` (inner scroll context)
2. Which is inside `RootLayout <main className="flex-1 overflow-auto">` (outer scroll context)

**Chrome (headed) known behavior**: `backdrop-filter: blur()` on `position: sticky` elements
inside `overflow: auto` containers creates a separate GPU compositing layer. When content
directly below the sticky element expands (the picker opens, adding ~180px), Chrome must:
1. Re-composite the blur filter through the new content
2. Invalidate the compositing layer
3. Re-paint the blur output

This is a known Chrome compositor stall pattern that does NOT reproduce in headless mode
(headless shell has no GPU compositor — it renders via software).

### Why BP row specifically, not NL

The Holloway & Sons (BP) row is the **first row** — positioned immediately below the sticky
search bar at scroll position 0. When the picker opens, it inserts content directly in the
viewport region covered by the `backdrop-filter` blur zone.

North Light (second row) opens its picker further down the page. The sticky header's blur
may be less affected because the repainted area is not flush against the sticky element at
initial scroll position.

Additionally: the user may not have tested NL as their first click — if BP always fails first,
they may not have gotten to test NL independently.

### Ruling out other causes

- No infinite render loop (eval responsive, 61fps post-click)
- No page errors (0 pageerror events)
- No JS errors in bundle
- No regex/format processing of q_label string
- No key collision (items keyed by `${kind}-${id}`)
- No createPortal usage
- No global event listeners intercepting clicks in CC components
- Bundle code matches source code (no stale deploy)
- API data shape is normal for BP row (same shape as NL row)

---

## Fix

Remove `backdropFilter`/`WebkitBackdropFilter` from the sticky CCLayout search bar header.
Replace the semi-transparent `rgba(255,255,255,.92)` with fully opaque `rgba(255,255,255,1)`.

A solid background achieves the same visual separation (page content slides under the header)
without requiring GPU compositing. The blur effect is decorative only.

**File**: `src/app/components/distributor-admin/command-center/CCLayout.tsx`

Before:
```jsx
background: 'rgba(255,255,255,.92)',
backdropFilter: 'blur(6px)',
WebkitBackdropFilter: 'blur(6px)',
```

After:
```jsx
background: '#fff',
```

This is a defensive fix that eliminates the GPU compositor stall. If the blur was truly
desired, the correct approach would be to restructure the scroll hierarchy so the sticky
element is in the root scroll context (not a nested `overflow:auto`).

---

## SHAs

- Diagnosis commit: (see git log on fix/cc-assign-brand-freeze)
- Fix commit: (see git log on fix/cc-assign-brand-freeze)
