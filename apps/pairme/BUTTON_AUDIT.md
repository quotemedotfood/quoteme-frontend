# PairMe control audit

A control that LOOKS interactive but is NOT is the same failure as a button that
does nothing. So every control gets two columns, not one: does it LOOK
interactive, and IS it. A row is only clean when both are yes.

Found on the demo walks. Update this as controls are added or fixed.

| Control | Screen | LOOKS interactive | IS interactive | Status |
|---|---|---|---|---|
| Budget range dots | Q3 Budget | yes (two dots on a range) | **now yes** | FIXED - the two dots are a real two-handle range slider (drag + keyboard); the explainer sliders under it are deleted |
| Entry mic (Type / At home) | Entry | yes (mic icon) | yes | wired to Web Speech API with a text fallback |
| Field mics (budget free-text, "None of these", the setup questions) | Q3 / Q others / The Wine | yes (mic icon) | **now yes** | FIXED - routed through the app-level useSpeech (App.jsx Phone) off st.listening; a spoken result appends to the field via vm.appendToListening. Same hook as the entry mic |
| Cellar connectors | Settings > Connections | **no (visibly disabled)** | n/a | Moved OUT of onboarding into Settings > Connections (expandable). All four read "Coming soon", visibly disabled - not tappable fictions. Not an onboarding question |
| "I don't use any of these" escape hatch | Welcome (was) | yes | **was no** | RESOLVED by removal: the connectors left onboarding for Settings, so there is no step to skip and no dangling do-nothing button. It did nothing perceptible when tapped (only changed a note); it is gone |

## The rule (hard)
A control ships with BOTH columns yes, or it ships VISIBLY DISABLED. There is no
third state - no control that looks interactive but does nothing. When adding a
control, fill both columns before it ships; if it cannot be made interactive yet,
render it disabled (greyed, a "coming soon" / "not yet" label), never as a live
button. Every row above is what happens when this rule is skipped.
