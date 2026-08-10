/**
 * PairMe instrumentation. `track(event, props)` fires a fire-and-forget
 * beacon at POST /v1/events. Analytics must never throw into the render
 * path and must never surface an error banner to the diner, so every
 * failure (network, non-2xx, missing identity) is swallowed here.
 *
 * Full wired event set (see lib/state.js's usePairMe for call sites):
 *   launch, onboard_start, screen_1..screen_6, skip_screen_<n>,
 *   capture_start, capture_ok, parse_ok, correction_made, pair_request,
 *   show_server, rate_submit.
 * Quality props attached where known: wines_found, corrections_per_capture,
 * extraction_source.
 *
 * POST /v1/events is not yet in the documented PairMe API Contract v1 (see
 * Artifacts/PairMe API Contract v1.md); this is wired ahead of the BE
 * catching up, per the demo instrumentation spec. A 404/NO_IDENTITY/network
 * failure here is expected and harmless: it just means an event was not
 * recorded, never a broken screen.
 */
import { postEvent } from './api.js';

export function track(event, props = {}) {
  try {
    const result = postEvent(event, props);
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch (e) {
    // A beacon must never crash the caller.
  }
}
