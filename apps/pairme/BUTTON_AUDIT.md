# PairMe control audit

A control that LOOKS interactive but is NOT is the same failure as a button that
does nothing. So every control gets two columns, not one: does it LOOK
interactive, and IS it. A row is only clean when both are yes.

Found on the demo walks. Update this as controls are added or fixed.

| Control | Screen | LOOKS interactive | IS interactive | Status |
|---|---|---|---|---|
| Budget range dots | Q3 Budget | yes (two dots on a range) | **now yes** | FIXED - the two dots are a real two-handle range slider (drag + keyboard); the explainer sliders under it are deleted |
| Entry mic (Type / At home) | Entry | yes (mic icon) | yes | wired to Web Speech API with a text fallback |
| Field mics (budget free-text, "None of these", the setup questions) | Q3/Q others, The Wine | yes (mic icon, toggles a "Listening" hint) | **no** | only toggles a hint; no capture. FOLLOW-UP: route these through the same useSpeech hook the entry mic uses |
| Cellar connectors | (venue connect) | yes (look tappable) | **no** | flagged on the demo walk; needs wiring or a non-interactive treatment |

## Rule
When adding any control, fill BOTH columns before it ships. If it looks
interactive it must be interactive, or it must be restyled so it does not look
interactive. No exceptions - the list above is what happens otherwise.
