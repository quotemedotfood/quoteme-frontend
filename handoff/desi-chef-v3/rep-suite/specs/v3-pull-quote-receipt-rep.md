<!-- Source-of-truth: design prototype project "QuoteMe Chef v2" (Desi),
     file src/screens-pullquote.jsx → PullQuoteDocument.
     Canonical spec:  this brief.
     Generated:       2026-05-25  ·  Author: Desi
     For:             Moose (BE) + Claudio (FE) — receipt header rep surfacing.
     Closes:          C151-E open question, Day 1 mandate. -->

# v3-pull-quote-receipt-rep.md

**Surface:** rep_name + rep_email surfaced on the QuoteDocument header inside
`ChefPullReceiptPage` (`/chef/quotes/:id` with pulled-distributor context).

**Why:** confirms to the chef that the right human got their quote.
Closes the loop opened by the C151-E entry-form rep capture.

## Placement

The receipt's `QuoteDocument` header is a two-column block under the title:

```
QUOTE · Q-1067   [Preview]
Holloway & Sons
For Daniel Reeves · May 12, 2026

┌─────────────────┬─────────────────┐
│ PULLED BY       │ SENT TO         │   ← right column changes
│ Daniel Reeves   │ Cal Doyle       │
│ Holloway & Sons │ cal@northwind…  │
│                 │ at Northwind    │
└─────────────────┴─────────────────┘

[operational acknowledgement card, unchanged]
```

The eyebrow on the right column flips from `DISTRIBUTOR` → `SENT TO`. The
distributor short-name moves from the primary line to a deemphasized
suffix line (`at {d.short}`) so the rep — the actual human who received
the quote — is the dominant fact.

## Exact copy

| slot                  | content                                | typography                          |
|-----------------------|----------------------------------------|-------------------------------------|
| Eyebrow               | `SENT TO`                              | qm-eyebrow, 9px, .14em letterspacing |
| Primary line          | `{rep_name}`                           | sans 13px, `ink`, weight 400         |
| Secondary line        | `{rep_email}`                          | sans 12px, `ink-soft`, `.num` (tabular) |
| Tertiary line         | `at {distributor.short}`               | sans 11.5px, `ink-faint`             |

No "Sent to:" prefix on the primary line — the eyebrow carries that.
Doubling it ("SENT TO" eyebrow + "Sent to:" inline) reads as form-label noise.

## Display rules

1. **Both fields present (canonical):** stacked as above.
2. **Only `rep_name`, no `rep_email`:** show name + `at {distributor}`; omit
   email line. Don't render an empty row or em-dash.
3. **Neither (legacy quotes pre-C151-E):** fall back to:
   - Primary: `{distributor.short}`
   - Secondary: `No rep on QuoteMe yet` (italic, `ink-faint`)
   - No tertiary line.
   This preserves backward compat for any quotes that exist in the DB before
   C151-E shipped — they don't have the fields, and we don't want them to
   render broken.
4. **Long email:** truncate with CSS ellipsis on the secondary line.
   `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` —
   `title` attribute holds the full email so hover reveals it. Do NOT
   break-word; line wrapping looks like a typo.
5. **Long name:** truncate the primary line the same way.
6. **Email never wraps to multiple lines.** Header is fixed-rhythm; preserve
   it.

## Typography

Reuse existing header styles — no new tokens:
- Eyebrow: `qm-eyebrow` class, 9px (matches `PULLED BY` opposite).
- Primary: `text-[13px] ink`.
- Secondary: `text-[12px] ink-soft num` — `.num` engages tabular figures so
  the email aligns visually with the date / quote-id rhythm.
- Tertiary: `text-[11.5px] ink-faint leading-snug`.

The column is `flex-1 text-right min-w-0` (the `min-w-0` is what enables
truncation inside a flex parent — easy to miss).

## Data contract

Component props (FE):

```ts
ChefPullReceiptPage({
  distributor: Distributor,
  repName?:    string,   // chef-supplied via C151-E entry form
  repEmail?:   string,   // chef-supplied via C151-E entry form
  ...
})
```

Threaded into `PullQuoteDocument`:

```ts
PullQuoteDocument({
  distributor,
  sentToName:  repName  ?? distributor.rep,
  sentToEmail: repEmail ?? distributor.repEmail,
})
```

Fallback to `distributor.rep` / `distributor.repEmail` is defensive — should
never fire post-C151-E because the chef-entered values become the source of
truth. Belt-and-suspenders for legacy data + dev mocks.

## Backend touchpoint (Moose, confirm)

The receipt page needs to read back the `rep_name` + `rep_email` the chef
submitted on the entry form. Two options:

1. **Persist on the Quote record.** Each pulled quote stores its own
   `sent_to_name` + `sent_to_email`. Simplest, survives rep edits.
2. **Read from the Rep record at quote time.** Resolve via the rep_id
   foreign key on Quote → ChefRepAutoCreate.

I'd lean (1). The receipt is a historical document — the chef wants to see
who they actually sent it to at the time, not who the rep is today after
some unrelated email change.

## Doctrine watch-outs

- **No "Sent to:" prefix on the primary line.** The eyebrow handles it.
- **Distributor name is suffixed, not primary.** The human carries the
  weight; the distributor is the affiliation. Justin: "rep relationships
  are the product."
- **No icons in the header block.** Existing header is icon-free —
  introducing a mail icon next to email would break the document feel.
- **Don't add a "send another" or "edit recipient" action here.** Receipt
  is read-only by V3 doctrine. If the chef sent to the wrong rep, they
  re-pull a new quote.
- **No "Delivered" / "Opened" status pill on this line.** Lifecycle status
  belongs on the quote-history row (`QuoteStatusPill`), not the receipt
  header. Justin lock (Opus c11 Q7): match-state ≠ status pill, and
  neither belongs adjacent to the recipient.

## Visible-in-prototype reference

`Chef Flow.html` → pull-receipt frame (both affiliated + unaffiliated):
- Affiliated: shows "Cal Doyle / cal@northwindseafood.com / at Northwind"
- Unaffiliated (Riverbend): shows whatever chef typed on the entry form,
  same layout. The "No rep on QuoteMe yet" fallback only fires when both
  fields are missing.

— Desi
