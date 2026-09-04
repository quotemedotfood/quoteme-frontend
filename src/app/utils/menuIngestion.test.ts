import { describe, it, expect } from 'vitest';
import {
  parseMenuText,
  stripPrices,
  reconstructText,
  countIngredients,
  extractionFailureMessage,
  extractionProgressMessage,
} from './menuIngestion';

describe('stripPrices', () => {
  it('removes dollar prices', () => {
    expect(stripPrices('Trout $18.50')).toBe('Trout');
  });

  it('removes a bare decimal price standing alone', () => {
    expect(stripPrices('Trout 18.50')).toBe('Trout');
  });

  it('leaves a number that is part of a name', () => {
    expect(stripPrices('7 Spice Chicken')).toBe('7 Spice Chicken');
  });
});

describe('parseMenuText', () => {
  it('returns nothing for empty text', () => {
    expect(parseMenuText('   ')).toEqual([]);
  });

  it('reads a short comma-free line as a dish header', () => {
    const dishes = parseMenuText('Starters\ntrout, capers, dill');
    expect(dishes).toHaveLength(1);
    expect(dishes[0].name).toBe('Starters');
    expect(dishes[0].ingredients.map(i => i.name)).toEqual(['trout', 'capers', 'dill']);
  });

  it('files ingredients under Menu Items when there is no header', () => {
    const dishes = parseMenuText('trout, capers');
    expect(dishes[0].name).toBe('Menu Items');
  });

  it('strips bullet markers from ingredients', () => {
    const dishes = parseMenuText('Sides\n- roast potatoes');
    expect(dishes[0].ingredients[0].name).toBe('roast potatoes');
  });
});

// The lander submits TEXT, so an edit that never reaches the text is an edit
// that is silently discarded on submit.
describe('reconstructText', () => {
  it('round-trips a parsed menu back to text', () => {
    const text = 'Starters\ntrout, capers, dill';
    expect(parseMenuText(reconstructText(parseMenuText(text)))).toEqual(parseMenuText(text));
  });

  it('carries an edited ingredient name into the text', () => {
    const dishes = parseMenuText('Starters\ntrout, capers');
    dishes[0].ingredients[0].name = 'ocean trout';
    // Assert on the round-tripped INGREDIENT, not on substrings: "ocean trout"
    // contains "trout", so a substring assertion here proves nothing.
    const names = parseMenuText(reconstructText(dishes))[0].ingredients.map(i => i.name);
    expect(names).toEqual(['ocean trout', 'capers']);
  });

  it('drops a removed ingredient from the text', () => {
    const dishes = parseMenuText('Starters\ntrout, capers');
    dishes[0].ingredients = dishes[0].ingredients.filter(i => i.name !== 'capers');
    expect(reconstructText(dishes)).not.toContain('capers');
  });

  it('omits the synthetic Menu Items header', () => {
    expect(reconstructText(parseMenuText('trout, capers'))).not.toContain('Menu Items');
  });
});

describe('countIngredients', () => {
  it('totals across dishes', () => {
    expect(countIngredients(parseMenuText('Starters\ntrout, capers\nMains\nlamb'))).toBe(3);
  });
});

// A chef reads these. Two rules: no backend strings, and never send someone
// round a retry loop that cannot succeed.
describe('extractionFailureMessage', () => {
  it('never leaks a backend code', () => {
    const codes = ['pdf_too_large', 'url_fetch_failed', 'url_unsupported_type', 'service_busy', 'encrypted'];
    for (const c of codes) {
      const msg = extractionFailureMessage(c);
      expect(msg).not.toContain('_');
      expect(msg).not.toContain(c);
    }
  });

  it('does NOT offer a retry when retrying cannot work', () => {
    for (const c of ['pdf_too_large', 'url_unsupported_type', 'encrypted', 'no_text']) {
      expect(extractionFailureMessage(c).toLowerCase()).not.toContain('try again');
    }
  });

  it('offers a retry only where retrying might actually succeed', () => {
    expect(extractionFailureMessage('service_busy').toLowerCase()).toContain('try again');
  });

  it('always leaves the chef a way forward', () => {
    for (const c of ['pdf_too_large', 'url_unsupported_type', 'encrypted', 'no_text', 'service_busy', 'url_fetch_failed', 'anything else']) {
      const msg = extractionFailureMessage(c).toLowerCase();
      expect(msg === '' ? 'x' : msg).toMatch(/paste|upload|try again|check/);
    }
  });

  it('handles an undefined error without saying undefined', () => {
    expect(extractionFailureMessage(undefined).toLowerCase()).not.toContain('undefined');
  });
});

describe('extractionProgressMessage', () => {
  it('changes as the wait grows rather than sitting on one string', () => {
    const stages = [0, 10000, 30000, 90000].map(extractionProgressMessage);
    expect(new Set(stages).size).toBe(4);
  });

  it('offers the paste escape hatch once the wait is long', () => {
    expect(extractionProgressMessage(90000).toLowerCase()).toContain('paste');
  });
});
