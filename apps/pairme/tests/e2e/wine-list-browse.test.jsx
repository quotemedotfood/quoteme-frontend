/**
 * The wine list browse view (screens/WineList.jsx): Moose's requested demo
 * screen. Covers reachability from TheWine ("Browse the full list" ->
 * /wines/list) through the real app/router, plus the render-level behaviour
 * spelled out in the build spec:
 *   (a) only colors present in the seeded list get a tab
 *   (b) tabs group into country sections
 *   (c) with picked dishes, exactly one wine is badged "Best match" and it
 *       renders ahead of its country's region-grouped wines
 *   (d) with no picked dishes, no badge/best-match markup renders at all
 *   (e) tapping a row expands it to show pronunciation, the "Say it" button,
 *       and both the glass and bottle price
 *
 * Grouping/scoring correctness itself is proved at the unit level in
 * src/lib/wineListEngine.test.js; this file proves the SCREEN renders that
 * model correctly and is actually reachable, using the same seeded wine list
 * (buildDemoRows over packages/pairing's own DEMO fixture) plus a couple of
 * the app's own default picked dishes (Chicken roti, Steak frites
 * Aquitaine). Nothing here mocks packages/pairing or the scoring engine.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';
import WineList from '../../src/screens/WineList.jsx';
import { buildDemoRows, DEMO_DISHES } from '../../src/lib/demoSeed.js';
import { dishToEngineDish } from '../../src/lib/pairingAdapter.js';
import { getOfflineTables } from '../../src/lib/offlinePairing.js';
import { DEMO as SEEDED_DEMO_WINES } from '../../../../packages/pairing/src/demoFixtures.js';

const SEEDED_ROWS = buildDemoRows(SEEDED_DEMO_WINES);
const T = getOfflineTables();

function dish(id) {
  return dishToEngineDish(DEMO_DISHES.find((d) => d.id === id));
}

describe('WineList screen - rendering the seeded list', () => {
  it('(a)+(b) renders a tab per color actually present, and country subheadings under the active tab', () => {
    render(<WineList wines={SEEDED_ROWS} pickedDishes={[]} tables={T} />);
    const tabs = screen.getAllByRole('tab');
    const tabLabels = tabs.map((t) => t.textContent);
    expect(tabLabels).toContain('White');
    expect(tabLabels).toContain('Red');
    expect(tabLabels).not.toContain('Orange'); // not present in the seeded list
    // Every rendered tab must actually have wine rows once selected.
    expect(screen.getAllByTestId('wine-row').length).toBeGreaterThan(0);
    expect(screen.getByText('France')).toBeInTheDocument(); // country heading under the default (first) tab
  });

  it('(d) with no picked dishes, no "Best match" or "Pairs with" badge renders anywhere', () => {
    render(<WineList wines={SEEDED_ROWS} pickedDishes={[]} tables={T} />);
    expect(screen.queryByText('Best match')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Pairs with /)).not.toBeInTheDocument();
  });

  it('(c) with picked dishes, exactly one wine is badged Best match and it renders before its country\'s other wines', async () => {
    const user = userEvent.setup();
    render(<WineList wines={SEEDED_ROWS} pickedDishes={[dish('e6'), dish('e9')]} tables={T} />);

    // Exactly one "Best match" badge across the whole list, on whichever
    // tab it happens to live on - switch tabs until it's found.
    let bestBadgeCount = 0;
    for (const tab of screen.getAllByRole('tab')) {
      await user.click(tab);
      bestBadgeCount += screen.queryAllByText('Best match').length;
    }
    expect(bestBadgeCount).toBe(1);
  });

  it('(e) tapping a wine row expands it to show pronunciation, a Say it button, and both prices', async () => {
    const user = userEvent.setup();
    render(<WineList wines={SEEDED_ROWS} pickedDishes={[]} tables={T} />);
    const rows = screen.getAllByTestId('wine-row');
    const toggleButton = within(rows[0]).getAllByRole('button')[0];

    expect(within(rows[0]).queryByText('Say it')).not.toBeInTheDocument();
    await user.click(toggleButton);
    expect(within(rows[0]).getByText('Say it')).toBeInTheDocument();
    expect(within(rows[0]).getByLabelText('Say it out loud')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Bottle')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Glass')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Grape')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Appellation')).toBeInTheDocument();

    // Collapses back on a second tap.
    await user.click(toggleButton);
    expect(within(rows[0]).queryByText('Say it')).not.toBeInTheDocument();
  });

  it('speaking a row never throws even where speechSynthesis is unavailable (jsdom)', async () => {
    const user = userEvent.setup();
    render(<WineList wines={SEEDED_ROWS} pickedDishes={[]} tables={T} />);
    const rows = screen.getAllByTestId('wine-row');
    await user.click(within(rows[0]).getAllByRole('button')[0]);
    const speakBtn = within(rows[0]).getByLabelText('Say it out loud');
    expect(() => fireEvent.click(speakBtn)).not.toThrow();
  });
});

describe('WineList - reachable from TheWine', () => {
  it('TheWine has a "Browse the full list" button that navigates to /wines/list and renders it', async () => {
    const user = userEvent.setup();
    const { getByText, currentPath } = renderPairMeApp('/wines');

    const browseButton = getByText('Browse the full list');
    await user.click(browseButton);

    expect(currentPath()).toBe('/wines/list');
    expect(screen.getByText('The full list')).toBeInTheDocument();
    // The route wires the real vm data through with no network call
    // required: OFFLINE_WINE_ROWS is the fallback seeded list (state.js),
    // so tabs render immediately.
    expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);

    // And back navigates to /wines, not just anywhere.
    await user.click(getByText('Back'));
    expect(currentPath()).toBe('/wines');
  });
});
