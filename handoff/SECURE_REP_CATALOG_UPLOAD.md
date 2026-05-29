# SECURE REP-CATALOG UPLOAD — design handoff (Wave 3 · SU-FE)

**Author:** Desi · **Locked:** May 29, 2026 · **Audience:** Claudio + FE ([64] secure-upload chain)
**Spec ref:** `uploads/SECURE_REP_CATALOG_UPLOAD_SCOPE.md` (v4.5) · Moose Q7/Q8 locks · Moose flow re-correction May 29
**Companion:** `handoff/SECURE_DROP_ZONE_STATUS.md` (status string vocabulary — wire to it verbatim)
**Canonical source:** `handoff/source/screens-secure-catalog.jsx` + `handoff/source/screens-secure-public.jsx`
(if this markdown ever disagrees with the .jsx, **the .jsx wins**).

---

## The flow (re-corrected, Moose lock May 29)

The **chef generates the forwardable link — the ask *is* the link.** The rep does not mint a link and does not need an
app screen; he forwards. One fewer step to a catalog.

```
Chef taps "Ask {rep}"   →   Rep gets an email, forwards it   →   Catalog person uploads   →   ingest + match   →   live
  (link minted here)          (or copies link to text it)        (token-gated landing)                          (one chef email)
```

---

## Ticket map

| Ticket | Surface | Components | Source |
|---|---|---|---|
| **SU-FE-1** | Chef entry point (Distributors tab, catalog-thin Connected distributor → the one orange) | `SecureChefEntryMobile`, `SecureChefEntryDesktop`, `RequestCatalogCallout`, `RequestCatalogAsked`, `ChefDistRow` | `screens-secure-catalog.jsx` |
| **SU-FE-2** | The email the rep receives (forward + copy-link; no read/edit) | `RepCatalogEmail`, `RepCatalogEmailMobile`, `RepCatalogEmailDesktop` | `screens-secure-catalog.jsx` |
| **SU-FE-3** | Tech-person landing (token-gated, no auth, drag-a-file, sent + expired) | `TechLandingMobile`, `TechLandingDesktop`, `ForwardedContext`, `CatalogDropZoneV45`, `V45Sent`, `V45Expired`, `V45Footnote` | `screens-secure-public.jsx` |
| **SU-FE-5** | Chef notification email (one email, at ingestion-complete) | `ChefCatalogEmail`, `ChefCatalogEmailMobile`, `ChefCatalogEmailDesktop` | `screens-secure-public.jsx` |

### ⚠ SU-FE-4 is intentionally absent

The wave is **1/2/3/5 — there is no 4.** SU-FE-4 was the old *rep generate+forward app screen*. The May 29 flow
re-correction (chef mints the link) **deletes that surface.** Do not build it; do not re-number. The rep's entire role
is now the email in **SU-FE-2**. The killed component (`RepForwardBody`/`RepForwardLink*`) has been removed from source.

---

## Locks (do not re-litigate)

- **One Sacred Orange per surface.** SU-FE-1: the "Ask {rep}…" button (Discovery demotes to a text action — Moose Q7).
  SU-FE-2: "Forward to your catalog team." SU-FE-3: "Send it to {rep}." SU-FE-5: "Pick up {quote}." Nowhere two.
- **Trigger for SU-FE-1 (Q7):** a **Connected** distributor whose `catalog_state ∈ {no_catalog, provisional, needs_confirmation}`.
  NOT `unaffiliated` (that's the Pick/discovery lane), NOT a Connected distributor with a verified-current catalog.
  Demo: D'Lisius is Connected, held copy from Feb 3 2026 → catalog-thin.
- **Chef never handles the URL.** Tapping "Ask {rep}" is the whole chef interaction. The link is plumbing.
- **Copy-link lives on the REP side only** (SU-FE-2), so Marcus can text it to his catalog person. He never needs to read or edit it.
- **Token: 7-day single-use (Q8).** Expired landing mirrors the chef expired-magic-link recovery — warm, no error-red,
  one path to a fresh ask. (Q7/Q8 filed for Moose ratification; design against these.)
- **ONE chef email, at `live` only** (SU-FE-5). Never at requested / forwarded / uploading / loading.
- **Voice:** field voice; distributor-warm on SU-FE-2/3. Banned: AI / platform / activate / sign up / streamline / sync / processing.
- **Catalog name is never shown to the chef** — distributor name carries the signal (CLAUDE.md lock). SU-FE-3 may show
  the distributor name; never the catalog filename as identity.
- **Status the chef sees** is the 4-state happy path + `expired`/`stalled` in `handoff/SECURE_DROP_ZONE_STATUS.md`.
  `RequestCatalogAsked` (SU-FE-1) renders `DropStatusStepper` — engineering feeds it the live `status` key.

---

## Dependencies (all already in the prototype)

- `Icon` (lucide passthrough) · `PhoneShell` · `QuoteMeWordmark variant="square"` · `ChefTabDesktopShell` (Newspaper sidebar) ·
  `ChefTabBar` · `CatalogStatusBadge` (`connected`/`uploaded`/`unaffiliated`) · CSS tokens (`colors_and_type.css`, incl. new `--accent`).
- `DROP_STATUS` + `DropStatusStepper` — exported from `screens-secure-catalog.jsx`; consumed by SU-FE-1 and the status showcase.
- `SECURE` demo object (top of `screens-secure-catalog.jsx`) — canonical names below.

## Demo data (locked — do not mutate during port)

Chef Daniel Reeves · Holloway & Sons, Hudson NY · Rep Marcus Rivera, marcus@dlisius.co · Distributor D'Lisius
Distribution Co. (short D'Lisius) · catalog held from Feb 3 2026 · link `quoteme.co/c/8FK2-QX9D` · quote Q-1042 ·
catalog admin Priya Shah · sample file `DLisius_Spring_2026_Master.pdf`.

## Routes (FLOW_ROUTES, mobile)

`secure-chef-entry`, `secure-chef-entry-asked` (SU-FE-1) · `rep-email` (SU-FE-2) · `secure-tech`, `secure-tech-sent`,
`secure-tech-expired` (SU-FE-3) · `secure-email` (SU-FE-5). Desktop derivatives are direct component renders
(`*Desktop`) — see gallery section "ASK 2 · SECURE CATALOG UPLOAD · v4.5" and the `Secure Upload.html` launcher.
