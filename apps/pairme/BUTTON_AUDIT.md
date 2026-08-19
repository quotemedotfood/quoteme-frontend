# PairMe control audit

A control that LOOKS interactive but is NOT is the same failure as a button that
does nothing. So every control gets two columns, not one: does it LOOK
interactive, and IS it. A row is only clean when both are yes.

Found on the demo walks. Update this as controls are added or fixed.

| Control | Screen | LOOKS interactive | IS interactive | Status |
|---|---|---|---|---|
| Budget range dots | Q3 Budget | yes (two dots on a range) | **now yes** | FIXED - the two dots are a real two-handle range slider (drag + keyboard); the explainer sliders under it are deleted |
| Entry mic (Type / At home) | Entry | yes (mic icon), hidden entirely with no SpeechRecognition | yes | wired to the shared useSpeech hook (src/lib/useSpeech.js); interimResults fills the field live, a fresh recognizer per press, and all four states (idle/listening/heard/error) render, error as one plain-language sentence |
| Field mics (budget free-text, "None of these", the setup questions, 12 sites) | Q1-Q6 / Menu / TheWine / WhereTo (x2) / RateIt | yes (mic icon), hidden entirely with no SpeechRecognition (field().micVisible) | **now yes** | FIXED (13-site voice pass) - routed through the app-level useSpeech (App.jsx Phone) off st.listening; a spoken result appends to the field via vm.appendToListening as interim results arrive, not just once at the end; switching fields mid-listen now works (was a silent no-op, D3); an error surfaces one plain-language sentence in the field's own hint instead of just turning the mic off silently. Same hook as the entry mic |
| Cellar connectors | Settings > Connections | **no (visibly disabled)** | n/a | Moved OUT of onboarding into Settings > Connections (expandable). All four read "Coming soon", visibly disabled - not tappable fictions. Not an onboarding question |
| "I don't use any of these" escape hatch | Welcome (was) | yes | **was no** | RESOLVED by removal: the connectors left onboarding for Settings, so there is no step to skip and no dangling do-nothing button. It did nothing perceptible when tapped (only changed a note); it is gone |

## The rule (hard)
A control ships with BOTH columns yes, or it ships VISIBLY DISABLED. There is no
third state - no control that looks interactive but does nothing. When adding a
control, fill both columns before it ships; if it cannot be made interactive yet,
render it disabled (greyed, a "coming soon" / "not yet" label), never as a live
button. Every row above is what happens when this rule is skipped.
