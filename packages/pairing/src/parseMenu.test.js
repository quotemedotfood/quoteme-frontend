import { describe, it, expect } from 'vitest';
import { parseMenu } from './parseMenu.js';

const SAMPLE = `
APPETIZERS

Roast chicken 18
roast garlic, potatoes, jus

Caesar salad
romaine, parmesan, anchovy dressing

Small Plates

Bruschetta 9

MAINS

Grilled salmon 28
lemon, capers, asparagus

Roasted mushrooms
thyme, sea salt
`;

describe('parseMenu', () => {
  it('splits a pasted menu into dishes, carrying section, price (or null) and description', () => {
    const dishes = parseMenu(SAMPLE);
    expect(dishes).toEqual([
      { name: 'Roast chicken', description: 'roast garlic, potatoes, jus', price: 18, section: 'APPETIZERS' },
      { name: 'Caesar salad', description: 'romaine, parmesan, anchovy dressing', price: null, section: 'APPETIZERS' },
      { name: 'Bruschetta', description: '', price: 9, section: 'Small Plates' },
      { name: 'Grilled salmon', description: 'lemon, capers, asparagus', price: 28, section: 'MAINS' },
      { name: 'Roasted mushrooms', description: 'thyme, sea salt', price: null, section: 'MAINS' },
    ]);
  });

  it('a dish with no price is never disqualified - it still yields a dish, with price: null', () => {
    const dishes = parseMenu('Caesar salad\nromaine, parmesan, anchovy dressing');
    expect(dishes).toHaveLength(1);
    expect(dishes[0].price).toBeNull();
    expect(dishes[0].name).toBe('Caesar salad');
  });

  it('an ALL-CAPS line is a section, never a dish', () => {
    const dishes = parseMenu('MAINS\nGrilled salmon 28');
    expect(dishes).toEqual([{ name: 'Grilled salmon', description: '', price: 28, section: 'MAINS' }]);
  });

  it('a short Title-Case line with every word capitalized is a section too', () => {
    const dishes = parseMenu('Small Plates\nBruschetta 9');
    expect(dishes[0].section).toBe('Small Plates');
  });

  it('a sentence-case dish name (only the first word capitalized) is never mistaken for a section', () => {
    const dishes = parseMenu('Roast chicken 18');
    expect(dishes).toHaveLength(1);
    expect(dishes[0].name).toBe('Roast chicken');
  });

  it('handles empty/blank input without throwing', () => {
    expect(parseMenu('')).toEqual([]);
    expect(parseMenu('\n\n  \n')).toEqual([]);
    expect(parseMenu(undefined)).toEqual([]);
  });

  it('a dish with no description line under it still parses cleanly', () => {
    const dishes = parseMenu('MAINS\nGrilled salmon 28\nRoast chicken 22');
    expect(dishes).toHaveLength(2);
    expect(dishes[0].description).toBe('');
    expect(dishes[1].description).toBe('');
  });
});
