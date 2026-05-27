<!-- Generated from QuoteMe design prototype (Babel-in-browser JSX).
     Source-of-truth: design prototype project (Desi), files src/screens-pullquote.jsx.
     Canonical spec:  this brief (May 21).
     Generated:       2026-05-21  ·  Author: Desi
     Full source also attached as source/screens-pullquote.jsx in this handoff folder. -->

# v3-pull-quote-flow.md

**Surfaces:** the entry / status / receipt triad when distributor context
is carried from `UseDistributorForQuoteModal → onContinue`.

| route key       | component             | what it is |
|-----------------|----------------------|---|
| `pull-entry`    | `ChefPullEntryPage`   | `/chef/entry` with carried distributor anchor |
| `pull-status`   | `ChefPullStatusPage`  | `/chef/status/:id` matched against carried distributor |
| `pull-receipt`  | `ChefPullReceiptPage` | `/chef/quotes/:id` with distributor anchored throughout |

**Stage:** Stage 2 of the chef Opus build-up.
**Upstream contract:** `UseDistributorForQuoteModal` (v3-use-distributor-modal.md)
drops the chef onto `pull-entry` with the chosen distributor passed through.
The mobile + desktop modal wire-ups in `screens-tabs.jsx` have been updated to:

```jsx
onContinue={() => { const d = modalDist; setModalDist(null); nav("pull-entry", { distributor: d }); }}
```

The 2-arg `nav(target, props)` signature is a one-line change to
`ChefPhoneFlow` in `document.jsx` (passes the second arg into `setExtra`).
The signature is backwards compatible — pre-existing call sites that pass a
single arg behave exactly as before.

## Locks (apply across all three surfaces)

- **`PullDistributorAnchor` is the carried-distributor strip.** Warm-paper
  bg, 1px hairline below, no shadows. Renders an eyebrow + the
  distributor name + (entry/status only) catalog meta `{items} items · updated {date}`.
  On entry, a right-aligned "Change" link routes back to Distributors tab.
  On status + receipt, the strip swaps to a non-actionable label
  (`MATCHING AGAINST` / `QUOTED AGAINST`) and surfaces a "No rep yet" pill
  when `distributor.affiliated === false`.
- **Visual weight identical to rep-initiated flow.** The QuoteDocument's
  type/spacing/dividers are NOT downgraded. The trust contract being
  different is communicated through copy (anchor strip + small warm-paper
  acknowledgement block), never through visual demotion.
- **Two doctrine copy variants, keyed off `distributor.affiliated`.**
  - `true`  → "[Distributor] doesn't have a rep account on QuoteMe yet"
              never appears. House-rep callback framing.
  - `false` → "Prices won't reflect rep-negotiated rates until [Distributor]
              connects" appears in the entry vignette AND the receipt
              acknowledgement block AND the receipt sticky-footer footnote.
- **CTAs on the receipt diverge from the rep-flow receipt.**
  - Orange: `Build Order Guide` (unchanged — same primary action).
  - Outline: `Request a callback` (unaffiliated) OR `Reach out to {Distributor}` (affiliated).
  - Text: `Save & come back` → routes to Home tab.
  - The rep-flow's "Ask Your Rep" mailto is REPLACED — there's no
    established rep relationship to anchor that CTA against yet.
- **TrustRibbon kind switches by affiliation.** `connected` for affiliated
  distributors with a live catalog; `demo` for unaffiliated (the warning
  dot already established by the existing TrustRibbon contract).
- **Quote number is distinct.** The receipt uses `Q-1067` (not `Q-1042`)
  to make clear the pulled quote is its own thread, not a rev of the
  chef's existing rep quote.
- **PreviewPill stamps the receipt.** Pulled quotes are always Preview
  until the distributor's rep (or QuoteMe ops, if unaffiliated) confirms.

## Behavior contract

**Routing chain when `distributor.affiliated === true`** (e.g. Northwind):
```
DistributorsTab → modal → pull-entry → pull-status → pull-receipt → og
                                  ↓                                 ↓
                              tab-distributors                 tab-home
```

**Routing chain when `distributor.affiliated === false`** (e.g. Riverbend):
identical, with extra copy in entry vignette + receipt acknowledgement +
sticky footer footnote.

`pull-status` auto-advances to `pull-receipt` 4s after entering stage 2,
mirroring the rep-flow `ChefStatusPage` contract.

## Dependencies

- `AREA_DISTRIBUTORS` (declared in `screens-tabs.jsx`) — the four area
  distributors that can be carried in. Shape:
  `{ short, name, scope, items, updated, affiliated }`.
- `PullQuoteDocument` (internal to `screens-pullquote.jsx`) — a local
  variant of `QuoteDocument` with the rep block swapped for distributor
  context. **The main `QuoteDocument` is unchanged** — other surfaces
  (rep-flow receipt, welcome page) depend on its current shape.
- `TrustRibbon`, `PreviewPill`, `Icon`, `cls`, `money`, `DEMO`, `QUOTE`,
  `QUOTE_TOTAL`, `MobileTopBar`, `PhoneShell`.

---

## `PullDistributorAnchor`

```jsx
function PullDistributorAnchor({ distributor, mode = "entry", onChange }) {
  if (!distributor) return null;
  const unaffiliated = distributor.affiliated === false;
  const label =
    mode === "entry"  ? "Pulling a quote from" :
    mode === "status" ? "Matching against"     :
    "Quoted against";

  return (
    <div
      className="px-5 py-2.5 flex items-center gap-2.5"
      style={{ background: "var(--qm-warm-paper)", borderBottom: "1px solid var(--qm-soft-line)" }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 999,
        background: unaffiliated ? "var(--qm-warning)" : "var(--qm-hover-blue)",
        flexShrink: 0 }} />
      <div className="text-[11.5px] leading-snug ink-soft min-w-0">
        <span className="qm-eyebrow" style={{ fontSize: 9.5, letterSpacing: ".14em" }}>
          {label}
        </span>
        <div className="ink mt-0.5 text-[12.5px] truncate">
          {distributor.short || distributor.name}
          {mode !== "receipt" && (
            <span className="ink-faint num">
              {" · "}{distributor.items} items · updated {distributor.updated}
            </span>
          )}
        </div>
      </div>
      {mode === "entry" && onChange && (
        <button onClick={onChange} className="text-[11.5px] ink-soft underline shrink-0 ml-auto">
          Change
        </button>
      )}
      {unaffiliated && mode !== "entry" && (
        <span className="qm-pill ml-auto shrink-0" style={{
          background: "#fff", color: "var(--qm-gray-700)",
          border: "1px solid var(--qm-soft-line)",
          fontSize: 9.5, padding: "2px 7px",
        }}>No rep yet</span>
      )}
    </div>
  );
}
```

## Entry / status / receipt page bodies

Full bodies live in `source/screens-pullquote.jsx`. Per-page deltas vs the
rep-flow originals:

| Page             | Delta                                                  |
|------------------|--------------------------------------------------------|
| `ChefPullEntryPage`   | + anchor strip above form · vignette substitutes per affiliated/unaffiliated · CTA stays orange Build my quote · sub-CTA copy reads "This quote stays a separate thread from your existing distributors." |
| `ChefPullStatusPage`  | + anchor strip · stage 2 hint reads "Aligning to {distributor}'s catalog" — substitutes the hardcoded `Aligning to D'Lisius catalog` |
| `ChefPullReceiptPage` | TrustRibbon switches kind · `PullQuoteDocument` substitutes rep block · operational acknowledgement block under header · footer CTAs diverge (Request a callback / Reach out to) · footnote substitutes per affiliated/unaffiliated |

## Verb-rules audit

- "Pulling a quote from" / "Matching against" / "Quoted against" — operational anchors, never marketing.
- "Request a callback" / "Reach out to" — direct, rep-vocabulary verbs.
- No "connect with this distributor," "explore this option," "compare," "marketplace."
- "Prices won't reflect rep-negotiated rates until they connect." — factual statement, not a paywall pitch.
