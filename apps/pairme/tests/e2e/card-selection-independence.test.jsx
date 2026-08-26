/**
 * THE SELECTION COLLISION, through the real rendered card list.
 *
 * course_it_out gives every dish its own trio, so one wine legitimately shows
 * up under more than one dish. The cards were keyed by dish while the
 * selection was keyed by wine LABEL, so tapping a card lit every other card
 * that happened to share its wine - and three-per-dish makes that the common
 * case rather than the edge one. The Present handoff had the same bug from the
 * other side: it resolved a selected label with
 * `.find(o => o.wine.label === label)`, i.e. whichever dish came first.
 *
 * src/lib/offeringSelection.test.js pins the logic. This pins what the diner
 * actually touches, on the route that renders TheWine's selectable cards.
 * (/entry and /venue render their own read-only offering lists - no chips, no
 * pick button - so neither exercises this.)
 */
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';
import { DEMO_DEFAULT_PICKED } from '../../src/lib/demoSeed.js';

/** /t/demo -> Menu (dishes pre-picked) -> HowToDrink -> TheWine, glass pool. */
async function reachPerDishCards(user) {
  renderPairMeApp('/t/demo');
  await user.click(await screen.findByRole('button', { name: 'Pair it' }));
  await screen.findByText('How do you want to drink?');
  await user.click(screen.getByRole('button', { name: 'Show wine' }));
  await screen.findByText('Your wine');
  // "By the glass" is the per-dish pool (DIRECTION_FOR_FORMAT -> course_it_out).
  await user.click(screen.getByRole('tab', { name: 'By the glass' }));
  await screen.findAllByText(/^With the /i);
}

/** The pick button of every offering card on screen, in render order. */
function cardButtons() {
  return screen.getAllByText(/^With the /i).map((eyebrow) => eyebrow.closest('button'));
}

const chips = () => screen.queryAllByText(/^(tap to add|presenting)$/);
const presentingCount = () => screen.queryAllByText('presenting').length;

describe('TheWine offering cards: selection is per (dish, wine)', () => {
  it('renders a trio per dish, each card its own tappable card', async () => {
    const user = userEvent.setup();
    await reachPerDishCards(user);

    const buttons = cardButtons();
    expect(buttons.every(Boolean), 'every card has a pick button').toBe(true);
    // Three per dish, minus any dish whose eligible set is genuinely shorter.
    expect(buttons.length).toBeGreaterThan(DEMO_DEFAULT_PICKED.length);
    expect(buttons.length).toBeLessThanOrEqual(DEMO_DEFAULT_PICKED.length * 3);
    // One chip per card, all unselected to start.
    expect(chips()).toHaveLength(buttons.length);
    expect(presentingCount()).toBe(0);
  });

  it('lights exactly one card when one card is tapped', async () => {
    const user = userEvent.setup();
    await reachPerDishCards(user);

    await user.click(cardButtons()[2]);

    expect(presentingCount()).toBe(1);
  });

  it('leaves the other cards in the same trio alone', async () => {
    const user = userEvent.setup();
    await reachPerDishCards(user);

    // The first three cards are one dish's trio: same dish stem, three labels.
    const labels = screen.getAllByText(/^With the /i).slice(0, 3).map((e) => e.textContent);
    const stem = labels[0];
    expect(labels[1]).toContain(stem);
    expect(labels[2]).toContain(stem);

    await user.click(cardButtons()[2]);

    const after = screen.getAllByText(/^With the /i).slice(0, 3);
    expect(within(after[0].closest('button')).queryByText('presenting')).toBeNull();
    expect(within(after[1].closest('button')).queryByText('presenting')).toBeNull();
    expect(within(after[2].closest('button')).getByText('presenting')).toBeInTheDocument();
  });

  it('treats the same wine under two dishes as two independent selections', async () => {
    const user = userEvent.setup();
    await reachPerDishCards(user);

    // Group the cards by their wine, reading the producer line off each card.
    const dishesPerWine = new Map();
    for (const eyebrow of screen.getAllByText(/^With the /i)) {
      const btn = eyebrow.closest('button');
      const dish = eyebrow.textContent.replace(/ \. (another|a third) option$/i, '');
      const wine = within(btn).getByText(/^\$\d+$/).closest('div').parentElement.textContent;
      if (!dishesPerWine.has(wine)) dishesPerWine.set(wine, new Set());
      dishesPerWine.get(wine).add(dish);
    }
    const shared = [...dishesPerWine.entries()].find(([, dishes]) => dishes.size > 1);
    expect(shared, 'expected one wine to win under more than one dish').toBeTruthy();

    // Tap every card in turn. The count may only ever rise by exactly one, so
    // no card is ever lit as a side effect of another sharing its wine.
    const buttons = cardButtons();
    for (let i = 0; i < buttons.length; i += 1) {
      await user.click(buttons[i]);
      expect(presentingCount(), `after tapping card ${i + 1}`).toBe(i + 1);
    }
  });

  it('untapping a card releases only that card', async () => {
    const user = userEvent.setup();
    await reachPerDishCards(user);

    const buttons = cardButtons();
    await user.click(buttons[0]);
    await user.click(buttons[1]);
    expect(presentingCount()).toBe(2);

    await user.click(cardButtons()[0]);

    expect(presentingCount()).toBe(1);
    expect(within(cardButtons()[1]).getByText('presenting')).toBeInTheDocument();
  });
});
