/**
 * /v/aquitaine is the path printed on the demo QR sticker. It is a hardcoded,
 * hand-provisioned route for one venue: nothing mints, stores or resolves a
 * token anywhere in it (see the block comment on VenueRoute in routes.jsx).
 *
 * These tests exist for one reason: the string is on paper. If the route is
 * renamed, removed, or stops loading the venue, every printed sticker breaks
 * and no other test in the suite would notice.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

describe('/v/aquitaine, the printed QR route', () => {
  it('resolves rather than falling through to the catch-all', () => {
    const view = renderPairMeApp('/v/aquitaine');
    expect(view.currentPath()).toBe('/v/aquitaine');
  });

  it('lands the diner on the menu screen, not the welcome screen', async () => {
    renderPairMeApp('/v/aquitaine');
    // Menu is screen 9. The welcome CTA must NOT be what greets a scan.
    expect(await screen.findByRole('button', { name: 'Pair it' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Get going' })).not.toBeInTheDocument();
  });

  it('loads the Aquitaine venue, not a blank or generic one', async () => {
    renderPairMeApp('/v/aquitaine');
    await screen.findByRole('button', { name: 'Pair it' });
    // Dishes that only exist on the Aquitaine list.
    expect(await screen.findByText('Steak frites Aquitaine')).toBeInTheDocument();
    expect(screen.getByText('Moules en cassoulette')).toBeInTheDocument();
  });

  it('reaches the same venue as the existing /t/demo path', async () => {
    // The whole point of the implementation: no new data path, no new
    // failure mode. If these two ever diverge, the printed code is on a
    // path nobody is exercising.
    const a = renderPairMeApp('/v/aquitaine');
    await screen.findByRole('button', { name: 'Pair it' });
    const viaVenue = screen.getAllByText(/Steak frites Aquitaine/).length;
    a.unmount();

    const b = renderPairMeApp('/t/demo');
    await screen.findByRole('button', { name: 'Pair it' });
    const viaTable = screen.getAllByText(/Steak frites Aquitaine/).length;
    b.unmount();

    expect(viaVenue).toBe(viaTable);
    expect(viaVenue).toBeGreaterThan(0);
  });
});
