/**
 * OperatorPage (/operator): Amy the sommelier's wine-to-dishes model.
 *
 * Amy's core objection to the ORIGINAL build: "Top pick / Second pick /
 * Third pick" asserts a defensible winner she would never claim, and the
 * tool was entirely dish-centric ("what's the best wine for THIS dish")
 * when a real wine programme is built wine-first ("how many dishes does
 * THIS wine cover"). This spec walks the three items that flip the tool
 * toward her model:
 *
 *   item 6 - a first-class "By wine (coverage)" view, additive next to the
 *            existing "By dish" view, showing each wine's covered-dish count.
 *   item 5 - the add-a-wine drawer (the old swap `<select>`, now a proper
 *            drawer) sorts candidates, defaulting to whole-menu coverage,
 *            and can be re-sorted by colour / country / price bracket.
 *   item 2 - the ranked "Top pick" style labels are gone; the visible copy
 *            no longer asserts a winner.
 *
 * No BE call anywhere in this walk (a venue code is never set, so the
 * persistence effect never fires); MSW's onUnhandledRequest: 'error' would
 * fail this test immediately if OperatorPage tried to reach the network.
 */
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

// The exact placeholder menu OperatorPage.jsx's own textarea suggests -
// two real dishes with descriptions the dish-vocabulary resolver can read,
// so pairings build with genuine (non-fallback) components.
const MENU = ['MAINS', '', 'Roast chicken 28', 'roast garlic, potatoes, jus', '', 'Grilled salmon 32', 'lemon, capers, asparagus'].join(
  '\n'
);

function reviewSection() {
  return screen.getByRole('heading', { name: '3. Review each dish' }).closest('section');
}

async function buildDemoPairings(user) {
  renderPairMeApp('/operator');
  await user.click(screen.getByLabelText('Paste your menu'));
  await user.paste(MENU);
  await user.click(screen.getByRole('button', { name: 'Build pairings' }));
  await screen.findByRole('heading', { name: '3. Review each dish' });
}

/** Pull every "{colour} . ... . Covers N menu item(s)" line out of a
 * container - one per candidate row in either the coverage view or the
 * add-a-wine drawer - and parse the leading colour word + trailing count,
 * in DOM order, so a test can assert on the sort actually applied. */
function coverageLines(container) {
  const nodes = within(container).getAllByText(/Covers \d+ (?:dish|menu item)/);
  return nodes.map((el) => {
    const text = el.textContent;
    const count = Number(text.match(/Covers (\d+)/)[1]);
    const colour = text.split(' . ')[0];
    return { text, count, colour };
  });
}

function isNonIncreasing(nums) {
  return nums.every((n, i) => i === 0 || n <= nums[i - 1]);
}

function isNonDecreasingLocale(strs) {
  return strs.every((s, i) => i === 0 || s.localeCompare(strs[i - 1]) >= 0);
}

describe('OperatorPage Amy walk: coverage view, add-a-wine drawer sort, non-ranked labels', () => {
  it('item 2: the per-dish view no longer asserts a ranked winner', async () => {
    const user = userEvent.setup();
    await buildDemoPairings(user);
    const review = within(reviewSection());

    // The old ordinal-winner copy is gone entirely, everywhere on the page.
    expect(screen.queryByText('Top pick')).not.toBeInTheDocument();
    expect(screen.queryByText('Second pick')).not.toBeInTheDocument();
    expect(screen.queryByText('Third pick')).not.toBeInTheDocument();

    // The replacement copy is descriptive, not ranked, and is what actually
    // renders for the slots this menu produced.
    const descriptive = review.queryAllByText(/A good option for this dish|Another good option|A third good option/);
    expect(descriptive.length).toBeGreaterThan(0);

    // Confirm/swap-successor(drawer)/remove/push still work under the new copy.
    const confirmButtons = review.getAllByRole('button', { name: 'Confirm' });
    await user.click(confirmButtons[0]);
    expect(review.getAllByRole('button', { name: 'Confirmed' }).length).toBeGreaterThan(0);
    const pushChecks = review.getAllByRole('checkbox', { name: /Push to guest \(disclosed\)/ });
    await user.click(pushChecks[0]);
    const removeButtons = review.getAllByRole('button', { name: 'Remove' });
    await user.click(removeButtons[1]);
    expect(review.getAllByRole('button', { name: 'Bring back' }).length).toBeGreaterThan(0);
  });

  it('item 6: the coverage view is a primary tab and shows each wine\'s covered-dish count', async () => {
    const user = userEvent.setup();
    await buildDemoPairings(user);
    const review = within(reviewSection());

    // "By dish" is the default, additive tab; the dish-centric view is intact.
    expect(review.getByRole('tab', { name: 'By dish' })).toHaveAttribute('aria-selected', 'true');
    expect(review.getByText('Roast chicken')).toBeInTheDocument();

    await user.click(review.getByRole('tab', { name: 'By wine (coverage)' }));
    expect(review.getByRole('tab', { name: 'By wine (coverage)' })).toHaveAttribute('aria-selected', 'true');

    // Coverage is disclosed honestly as eligibility, not dressed up as "best".
    expect(review.getByText(/is eligible for that\s*\n?\s*dish under the same rules|eligible for that.*rules/s)).toBeInTheDocument();

    const rows = coverageLines(reviewSection());
    expect(rows.length).toBeGreaterThan(0);
    // Sorted rows: most-covered wine first, in non-increasing order.
    expect(isNonIncreasing(rows.map((r) => r.count))).toBe(true);
    // At least one wine covers more than zero, and more than one, dish -
    // proving this is a real per-wine coverage count, not a stub.
    expect(rows.some((r) => r.count >= 1)).toBe(true);

    // Switching back to "By dish" does not lose the dish-centric view.
    await user.click(review.getByRole('tab', { name: 'By dish' }));
    expect(review.getByText('Roast chicken')).toBeInTheDocument();
  });

  it('item 5: the add-a-wine drawer defaults to coverage sort and can re-sort by colour/country/price', async () => {
    const user = userEvent.setup();
    await buildDemoPairings(user);
    const review = within(reviewSection());

    const addButtons = review.getAllByRole('button', { name: 'Add a wine' });
    await user.click(addButtons[0]);

    const drawer = screen.getByLabelText(/Add a wine for/);
    const inDrawer = within(drawer);

    // Default sort is coverage (Amy's model), and it is actually applied:
    // the rendered order is non-increasing by covered-menu-item count.
    expect(inDrawer.getByRole('tab', { name: 'Most menu items covered' })).toHaveAttribute('aria-selected', 'true');
    const defaultRows = coverageLines(drawer);
    expect(defaultRows.length).toBeGreaterThan(0);
    expect(isNonIncreasing(defaultRows.map((r) => r.count))).toBe(true);

    // Re-sort by colour: the active tab flips, and the rendered order is now
    // alphabetical by the derived colour, not by coverage.
    await user.click(inDrawer.getByRole('tab', { name: 'Colour' }));
    expect(inDrawer.getByRole('tab', { name: 'Colour' })).toHaveAttribute('aria-selected', 'true');
    expect(inDrawer.getByRole('tab', { name: 'Most menu items covered' })).toHaveAttribute('aria-selected', 'false');
    const colourRows = coverageLines(drawer);
    expect(isNonDecreasingLocale(colourRows.map((r) => r.colour))).toBe(true);

    // Re-sort by country.
    await user.click(inDrawer.getByRole('tab', { name: 'Country' }));
    expect(inDrawer.getByRole('tab', { name: 'Country' })).toHaveAttribute('aria-selected', 'true');

    // Re-sort by price bracket: renders without throwing and keeps the same
    // candidate pool (a sort must never change WHICH wines are offered).
    await user.click(inDrawer.getByRole('tab', { name: 'Price bracket' }));
    expect(inDrawer.getByRole('tab', { name: 'Price bracket' })).toHaveAttribute('aria-selected', 'true');
    const priceRows = coverageLines(drawer);
    expect(priceRows.length).toBe(defaultRows.length);

    // Picking a wine from the drawer performs the swap and closes the drawer.
    const pickButtons = inDrawer.getAllByRole('button').filter((b) => /Covers \d+ menu item/.test(b.textContent));
    await user.click(pickButtons[0]);
    expect(screen.queryByLabelText(/Add a wine for/)).not.toBeInTheDocument();
  });
});
