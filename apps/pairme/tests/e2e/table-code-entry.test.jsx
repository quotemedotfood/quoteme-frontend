/**
 * Table QR entry: visiting /t/demo directly (the "table code" deep link
 * routes.jsx's TableCodeRoute exists for). Kept as its own small spec,
 * separate from demo-walk.test.jsx's manual "Skip setup -> WhereTo -> search"
 * walk, because /t/:code is a genuinely different entry point with its own
 * behaviour: it skips venue search entirely and lands straight on the Menu
 * screen with the table code captured (routes.jsx's own comment: this is
 * "the same destination WhereTo's 'scan the code' button reaches").
 */
import { describe, it, expect } from 'vitest';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';
import { requestLog } from './msw/handlers.js';

describe('table code entry: GET /t/demo', () => {
  it('lands on the Menu screen directly (no venue search step) with the URL unchanged', async () => {
    const { findByText, currentPath } = renderPairMeApp('/t/demo');

    // Menu screen content (screenIndex 9), same heading demo-walk.test.jsx
    // asserts after a manual venue pick.
    await findByText('Aquitaine');
    await findByText(/Their menu tonight/i);

    // TableCodeRoute stores the code in state (vm.tableCode) rather than
    // navigating - the URL stays exactly where the QR code pointed it.
    expect(currentPath()).toBe('/t/demo');
  });

  it('still bootstraps identity (POST /v1/session) on this entry path like every other one', async () => {
    const { findByText } = renderPairMeApp('/t/demo');
    await findByText('Aquitaine');

    const sessionCalls = requestLog.filter((r) => r.method === 'POST' && r.path === '/v1/session');
    expect(sessionCalls).toHaveLength(1);
  });

  // TODO(A): routes.jsx's own comment says the contract has no documented
  // endpoint yet to resolve a table code to a venue ("TODO once the BE adds
  // a resolver: call it here and set selectedVenueId from the result").
  // vm.tableCode is captured today but has zero consumers anywhere in
  // src/screens/*.jsx (grepped) - there is nothing in the DOM to assert on
  // yet. Once a resolver lands, promote this: mock its endpoint, assert
  // selectedVenueId gets set, and assert the Menu screen reflects that
  // venue (title, list) rather than the static "Aquitaine" demo data.
  it.skip('resolves the table code to a venue via the (not yet built) resolver endpoint', () => {
    // TODO(A)
  });
});
