<!-- Generated from QuoteMe design prototype (Babel-in-browser JSX).
     Source-of-truth: design prototype project (Desi), file src/screens-pullquote.jsx.
     Canonical spec:  this brief.
     Generated:       2026-05-23  ·  Author: Desi
     For:             Moose (BE) + Claudio (FE) — Day 1 mandate E2E close. -->

# v3-pull-quote-rep-capture.md

**Surface:** rep_name + rep_email field block on `ChefPullEntryPage`
(`/chef/entry` when carried-distributor context is present).

**Why now:** Day 1 mandate is chef pulling 1 menu from 1 distributor E2E.
BE Friday shipped:
- `C4a` Chef MenuController
- `C4b` Restaurant auto-create
- `C4c` ChefQuoteNotificationService (4-case routing)
- `C4d` ChefRepAutoCreateService

C4c routing + C4d rep auto-create both need `rep_name` and `rep_email` from
the chef. Without them, the rep doesn't get notified and the mandate doesn't
close. Earlier handoff (`v3-pull-quote-flow.md`) didn't spec this; addendum.

## Placement

Inline on `ChefPullEntryPage`, **between** the menu-input block and the
"Build my quote" primary CTA. Single bordered block, warm-paper bg.

Read order on the page:
1. `PullDistributorAnchor` strip (existing)
2. Page title + lede (existing)
3. Menu input (paste / upload / concept tabs) (existing)
4. **Rep capture block (this spec)** ← new
5. "Build my quote" orange CTA (existing, moved down)
6. "This quote stays a separate thread…" footnote (existing)
7. Operational vignette (existing)

NOT a modal. NOT a separate step. Modals break the document feel. A separate
step adds drop-off risk before the chef has invested in seeing their quote.

## Block markup contract

Block has:
- Eyebrow: `SEND TO`
- Title (serif, 15px): `Who at {Distributor short} should get this?`
- Helper (11.5px ink-soft): `We'll email them your quote as soon as it's ready.`
  - **Unaffiliated suffix:** `They don't have a QuoteMe account yet — we'll
    send their first invite from this email.`
- Two stacked inputs (mobile) / two-up grid (desktop, when desktop version lands):

| field      | label       | type    | required | placeholder                              | prefill (affiliated)         | prefill (unaffiliated) |
|------------|-------------|---------|----------|------------------------------------------|------------------------------|------------------------|
| rep_name   | `REP NAME`  | text    | yes      | `Your contact at {Distributor short}`    | `distributor.rep` if present | empty                  |
| rep_email  | `REP EMAIL` | email   | yes      | `name@distributor.com`                   | `distributor.repEmail`       | empty                  |

Unaffiliated placeholders soften the empty state:
- rep_name: `e.g. Pat from Riverbend`
- rep_email: `name@distributor.com` (unchanged)

## Behavior

- **Both required.** Block both submit (`Build my quote`) and `nav("pull-status")`
  if either is empty or email fails validation.
- **Validation:**
  - rep_name: trimmed length ≥ 2.
  - rep_email: HTML5 `type="email"` is the floor; Claudio adds an explicit
    regex check on submit. Standard `^[^\s@]+@[^\s@]+\.[^\s@]+$` is fine.
- **Prefill (affiliated case):** when `distributor.rep` and `distributor.repEmail`
  are populated, prefill — but leave inputs **editable**, not disabled. The
  chef may want to send to a different rep at that distributor.
- **Prefill (unaffiliated case):** always empty. Doctrine: appreciative tone,
  chef is bringing us a new network node.
- **autoComplete:** `name` and `email` respectively so iOS / Chrome offer
  contact suggestions.
- **inputMode="email"** on rep_email so mobile gets the @ keyboard.

## Wire to BE

Submit payload from `Build my quote` should carry:

```json
{
  "menu_input":   "...",        // existing
  "menu_mode":    "paste|upload|concept",  // existing
  "distributor_id": "...",      // carried from UseDistributorForQuoteModal
  "rep_name":     "string, required",
  "rep_email":    "string, required, email"
}
```

C4c routing case fan-out (Moose, confirm):
- rep exists on QuoteMe, catalog connected      → route to existing rep
- rep exists on QuoteMe, catalog uploaded only  → route to existing rep + flag
- rep does NOT exist, catalog connected         → C4d auto-create rep, then route
- rep does NOT exist, catalog uploaded only     → C4d auto-create rep, then route

The chef-supplied `rep_email` is the dedupe key on C4d. If an existing rep
record matches that email, use it (don't double-create).

## Doctrine watch-outs

- **No marketing copy in the block.** "Send to" + "We'll email them your
  quote" is operational, not pitch. Never "Stay connected with your reps",
  "Build your network", "Tell us about your contact".
- **Don't frame as account creation for the rep.** From the chef's view,
  they're addressing an email — full stop. The fact that we auto-create
  a rep record server-side is invisible.
- **No "Optional" suffix on labels.** Both are required for the routing
  to function on Day 1. If product later wants to allow skipping email,
  that's a follow-up.
- **No "Invite your rep" CTA elsewhere on the page.** This block IS the
  rep capture. Adding a duplicate CTA confuses the surface.
- **Privacy-style line not needed.** The helper already establishes the
  operational intent ("we'll email them your quote"). A separate "we
  won't spam them" line would over-explain and read as defensive.

## Files touched (design prototype)

- `src/screens-pullquote.jsx` — `ChefPullEntryPage` adds the rep-capture
  block between menu input and primary CTA. Block conditional copy keys
  off `distributor.affiliated`.

## Open question for Moose

When the chef returns to a pulled quote in `pull-receipt`, are the
captured rep_name + rep_email shown anywhere? Suggest: yes, on the
QuoteDocument header — "Sent to: {rep_name} · {rep_email}" replacing
the current "Rep on call · {distributor}" line. Confirms to the chef
that the right human got it.

— Desi
