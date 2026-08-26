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
 * POST /v1/events IS built and live (V1::EventsController, routes.rb
 * "Item 8 - instrumentation"); it is only the contract doc that has not
 * caught up. Do not read a failure here as "the BE has not landed yet" -
 * that assumption is precisely what hid a year of dropped events, because
 * this client was posting the wrong payload shape and the endpoint was
 * rejecting all of it. See postEvent() in api.js for the required shape.
 *
 * Identity is genuinely optional on this endpoint, so NO_IDENTITY is not an
 * expected outcome either. A network failure is still expected and harmless
 * (an event goes unrecorded, never a broken screen) - but anything else
 * here now means a real bug, and swallowing it is a deliberate trade for
 * the diner's sake, not a sign that nothing is wrong.
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
