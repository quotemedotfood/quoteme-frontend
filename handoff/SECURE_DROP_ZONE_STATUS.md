# SECURE DROP ZONE — STATUS VOCABULARY

**Author:** Desi · **Locked:** May 29, 2026 · **For:** engineering ([64] secure-upload chain), Sixteen
**Source flow:** `src/screens-secure-catalog.jsx` (`DROP_STATUS`, `DropStatusStepper`) · scope `uploads/SECURE_REP_CATALOG_UPLOAD_SCOPE.md`

The chef asks for a distributor's catalog → the catalog lands through the secure upload pipeline. This is the
**chef-facing** status the chef watches on the distributor row (Distributors tab / Stack). Wire display strings to
these exact keys. One ordered happy path + two off-track states.

---

## Re-corrected flow (Moose lock, May 29)

The **chef** generates the forwardable link — the ask *is* the link. The rep receives it, forwards it to whoever keeps
the catalog current, that person uploads. So there is **no rep app screen**; the rep gets an email. The status below is
what the chef sees through that whole motion.

```
chef taps "Ask {rep}"  →  rep forwards link  →  catalog person uploads  →  ingest + match  →  live
        requested                (no chef-visible change)        uploading            loading        live
```

---

## Happy path (ordered) — `DROP_STATUS`

| order | `key`       | label (display)        | chef sub-line                                                        | dot         |
|-------|-------------|------------------------|----------------------------------------------------------------------|-------------|
| 1     | `requested` | **Requested**          | Asked {rep} — he passes it to whoever keeps the catalog current.     | accent      |
| 2     | `uploading` | **Coming in**          | {rep}'s team is sending the catalog over now.                        | orange (active) |
| 3     | `loading`   | **Loading it in**      | Reading the catalog and matching it to your menu.                    | orange (active) |
| 4     | `live`      | **Live in your Stack** | Updated and ready — your quotes price against it now.                | accent (done) |

`{rep}` interpolates the rep first name (demo: **Marcus**).

**Transition triggers (engineering):**
- `requested` — chef confirmed the ask; link minted + emailed to rep.
- `uploading` — token link opened on the tech-person landing page **and** a file is mid-upload. (Link-opened alone does
  *not* advance the chef-visible status — avoids a surveillance-y "someone opened your link" beat.)
- `loading` — file received; parsing + menu-match running.
- `live` — catalog ingested, matched, and queryable. **Fires the one chef email** (`ChefCatalogEmail`). End of pipeline.

---

## Off-track states (not in the stepper)

| `key`     | label (display)   | chef sub-line                                  | when                                          | recovery |
|-----------|-------------------|------------------------------------------------|-----------------------------------------------|----------|
| `expired` | **Link expired**  | Send {rep} a fresh ask — the last link timed out. | 7-day single-use token elapsed, never used. | One-tap re-ask (mints a new link). |
| `stalled` | **Still waiting** | Nudge {rep}? It's been a few days.             | ≥5 days in `requested`/`uploading`, no progress. | Optional nudge; non-nagging, chef-initiated. |

`expired` mirrors the chef expired-magic-link recovery posture (warm, no error-red). `stalled` is advisory only —
never auto-emails the rep.

---

## Pre-state (before any ask)

Not a Drop-Zone status — it's the **trigger condition** that surfaces the orange "Ask {rep}" CTA:

- `no_catalog` — Connected distributor, no catalog held.
- `thin_catalog` — Connected distributor, catalog stale / partial (demo: D'Lisius, held copy from Feb 3, 2026).

These live in the distributor's `catalog_state` (`no_catalog | provisional | needs_confirmation`), per the scope doc.
`Unaffiliated` distributors do **not** get this CTA — that's the Pick-mode / discovery lane, a different flow.

---

## Notes / locks

- **Chef sees ONE email**, at `live` only. Never at `requested`, `uploading`, or `loading`.
- Catalog **name** is never shown on chef surfaces — the **distributor** name carries the signal (CLAUDE.md lock).
- Copy is field-voice. No "processing", "syncing", "activating", "ingested" (internal-only term), or progress percentages.
- Visual reference: `DropStatusShowcase` in `screens-secure-catalog.jsx` renders all four happy-path states.
