/**
 * Card identity and selection for TheWine's offering cards.
 *
 * THE BUG THIS EXISTS TO KILL: the cards are keyed by DISH (course_it_out
 * emits one card per dish) while the selection was keyed by WINE LABEL
 * (`presentLabels` held w.label). So a wine that won under two dishes lit
 * BOTH of its cards the moment either was tapped, and the Present handoff's
 * `.find(o => o.wine.label === label)` then resolved to whichever dish
 * happened to come first in the list.
 *
 * Selection is per CARD. A card is (dish, wine).
 */
import { describe, it, expect } from 'vitest';
import { offeringKey, isSelected, toggleOffering } from './offeringSelection.js';

const offering = (dish, wineLabel) => ({ forDish: dish, wine: { label: wineLabel } });

// The trio under one dish, as course_it_out now emits it.
const CARD_1 = offering('Steak frites Aquitaine', 'Trapet, Gevrey-Chambertin');
const CARD_2 = offering('Steak frites Aquitaine', 'Foillard, Morgon');
const CARD_3 = offering('Steak frites Aquitaine', 'Gimonnet, Blanc de Blancs Champagne');

describe('offeringKey', () => {
  it('is determined by the dish and the wine together', () => {
    expect(offeringKey(offering('Sole meuniere', 'Trapet, Gevrey-Chambertin')))
      .toBe(offeringKey(offering('Sole meuniere', 'Trapet, Gevrey-Chambertin')));
  });

  it('separates the same wine under two different dishes', () => {
    expect(offeringKey(offering('Sole meuniere', 'Trapet, Gevrey-Chambertin')))
      .not.toBe(offeringKey(offering('Chicken roti', 'Trapet, Gevrey-Chambertin')));
  });

  it('separates two different wines under the same dish', () => {
    expect(offeringKey(CARD_1)).not.toBe(offeringKey(CARD_2));
  });

  it('falls back to the wine alone when a direction has no per-dish card', () => {
    // one_bottle and several emit table-wide cards with no forDish; the wine
    // label IS the card identity there, and must stay stable.
    const tableWide = { wine: { label: 'Trapet, Gevrey-Chambertin' } };
    expect(offeringKey(tableWide)).toBe(offeringKey({ ...tableWide }));
    expect(offeringKey(tableWide)).not.toBe(offeringKey(CARD_1));
  });

  it('does not collide when a dish name and a wine label could run together', () => {
    // A naive `dish + wine` concatenation would make these two the same card.
    const a = offering('Sole', 'meuniereTrapet');
    const b = offering('Solemeuniere', 'Trapet');
    expect(offeringKey(a)).not.toBe(offeringKey(b));
  });
});

describe('selecting a card', () => {
  it('leaves the other two cards in the same trio alone', () => {
    const selected = toggleOffering([], CARD_3);

    expect(isSelected(selected, CARD_3)).toBe(true);
    expect(isSelected(selected, CARD_1)).toBe(false);
    expect(isSelected(selected, CARD_2)).toBe(false);
  });

  it('treats the same wine under two dishes as two independent selections', () => {
    const steakTrapet = offering('Steak frites Aquitaine', 'Trapet, Gevrey-Chambertin');
    const roastTrapet = offering('Chicken roti', 'Trapet, Gevrey-Chambertin');

    const selected = toggleOffering([], steakTrapet);

    expect(isSelected(selected, steakTrapet)).toBe(true);
    expect(isSelected(selected, roastTrapet), 'the same wine under another dish must NOT light up').toBe(false);

    // And selecting the second one keeps the first: two cards, two selections.
    const both = toggleOffering(selected, roastTrapet);
    expect(isSelected(both, steakTrapet)).toBe(true);
    expect(isSelected(both, roastTrapet)).toBe(true);
    expect(both).toHaveLength(2);
  });

  it('deselects only the card that was tapped', () => {
    const both = toggleOffering(toggleOffering([], CARD_1), CARD_2);
    const afterUntap = toggleOffering(both, CARD_1);

    expect(isSelected(afterUntap, CARD_1)).toBe(false);
    expect(isSelected(afterUntap, CARD_2)).toBe(true);
  });

  it('does not mutate the array it was given', () => {
    const before = [];
    const after = toggleOffering(before, CARD_1);

    expect(before).toEqual([]);
    expect(after).not.toBe(before);
  });

  it('is idempotent under tap-then-untap', () => {
    expect(toggleOffering(toggleOffering([], CARD_1), CARD_1)).toEqual([]);
  });
});
