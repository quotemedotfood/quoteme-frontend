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

  // PART 2: the generic resolver, GET /v1/t/:code (superset #340, not built
  // server side yet - see lib/api.js's getTableCode). Any code other than
  // "demo" now calls it (state.js's /t/:code effect); mocked in
  // msw/handlers.js per the same CONTRACT this FE codes against.
  it('resolves a generic table code to its venue via GET /v1/t/:code, feeding the /t/demo data path', async () => {
    const { findByText, currentPath } = renderPairMeApp('/t/table-42');

    // The mocked resolver's venue name replaces the "Aquitaine" fallback -
    // proof this is real data from the resolver, not the static default.
    await findByText('Le Petit Bistro');
    await findByText(/Their menu tonight/i);
    expect(currentPath()).toBe('/t/table-42');

    const resolverCalls = requestLog.filter((r) => r.method === 'GET' && r.path === '/v1/t/table-42');
    expect(resolverCalls).toHaveLength(1);
  });

  it('shows plain-language copy, never a code, when the resolver 404s (VENUE_NOT_FOUND)', async () => {
    const { findByText, queryByText } = renderPairMeApp('/t/TABLE_CODE_NOT_FOUND');

    await findByText(/We could not find that table\. Ask your server for the code, or point your camera at the wine list instead\./);
    // Never the raw error_code or an HTTP status.
    expect(queryByText(/VENUE_NOT_FOUND/)).not.toBeInTheDocument();
    expect(queryByText(/404/)).not.toBeInTheDocument();

    // The walk is not stuck: Menu still renders with Desi's static DISHES
    // (the pre-resolver fallback) rather than a broken/blank screen.
    await findByText(/Their menu tonight/i);
  });
});
