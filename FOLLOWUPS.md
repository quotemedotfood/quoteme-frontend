# Follow-ups

Latent bugs / deferred work surfaced during ticket work but not fixed in-place.
Add new entries at the top; prune as they ship or get reclassified.

## Bug #2b — QuoteReviewPage throws "Oops! Something went wrong" on render

`/review` is a registered route (`src/app/routes.tsx:181` → `QuoteReviewPage`),
but rendering it triggers the root `errorElement` boundary. The chef-flow
Finish-quote bypass (PR #8) sends users to `/export-finalize` instead, so the
broken page has no remaining ingress from the chef seam.

Investigate root cause; if no live entry path remains, consider deleting both
the `/review` route registration and `src/app/pages/QuoteReviewPage.tsx`.
