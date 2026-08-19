/**
 * Country derivation fallbacks for the wine list browse view.
 *
 * Every wine that resolves no country sits under a header reading "Other".
 * On the Aquitaine demo list exactly one real French wine was landing there,
 * which is a bad look in front of an audience, and grower Champagne is the
 * shape that will keep landing there on real lists.
 *
 * These are DISPLAY mappings. Nothing here feeds scoring or selection.
 */
import { describe, it, expect } from 'vitest';
import { deriveCountry, deriveRegion } from '../src/lib/wineListVocab.js';

describe('deriveCountry fallbacks', () => {
  it('resolves the Aquitaine demo gap: Marsannay / Aligote', () => {
    expect(deriveCountry({ region: 'Marsannay', grape: 'Aligote' })).toBe('France');
    expect(deriveCountry({ region: 'Marsannay' })).toBe('France');
    expect(deriveCountry({ grape: 'Aligote' })).toBe('France');
  });

  it('accepts the accented and compound forms of Aligote', () => {
    expect(deriveCountry({ grape: 'Aligoté' })).toBe('France');
    expect(deriveCountry({ region: 'Bourgogne Aligote' })).toBe('France');
    expect(deriveCountry({ region: 'Bourgogne Aligoté' })).toBe('France');
  });

  it('resolves grower Champagne villages once a region_head exists', () => {
    ['Dizy', 'Mareuil-sur-Ay', 'Cuis', 'Cumieres', 'Cumières', 'Ay', 'Avize',
     'Cramant', 'Oger', 'Le Mesnil-sur-Oger', 'Bouzy', 'Verzenay', 'Verzy',
     'Ambonnay', 'Vertus', 'Chouilly', 'Trepail', 'Villers-Marmery',
     'Rilly-la-Montagne', 'Hautvillers', 'Epernay', 'Reims', 'Bisseuil',
     'Tours-sur-Marne'].forEach((v) => {
      expect(deriveCountry({ region_head: v }), `village ${v}`).toBe('France');
    });
  });

  it('catches Champagne by cru designation PLUS a Champagne style term', () => {
    // Both halves required. This is the rule that actually fires today,
    // because the parser emits designation far more often than region_head.
    expect(deriveCountry({ designation: 'premier cru', wine_name: 'Brut Tradition' })).toBe('France');
    expect(deriveCountry({ designation: 'grand cru', wine_name: 'Blanc de Blancs' })).toBe('France');
    expect(deriveCountry({ designation: '1er cru', wine_name: 'Extra Brut' })).toBe('France');
    expect(deriveCountry({ designation: 'premier cru', label: 'Rose Brut' })).toBe('France');
  });

  it('does NOT claim France for a cru designation alone', () => {
    // Burgundy and Alsace both use grand cru. A cru with no Champagne style
    // term must stay unresolved rather than be silently called French.
    expect(deriveCountry({ designation: 'grand cru', wine_name: 'Corton-Charlemagne' })).toBe('Other');
    expect(deriveCountry({ designation: 'premier cru', wine_name: 'Les Pucelles' })).toBe('Other');
    expect(deriveCountry({ wine_name: 'Brut' })).toBe('Other');
  });

  it('still prefers the shared vocabulary over any fallback', () => {
    expect(deriveCountry({ region_head: 'barolo' })).toBe('Italy');
    expect(deriveCountry({ grape_head: 'nebbiolo' })).toBe('Italy');
  });

  it('returns Other when nothing resolves', () => {
    expect(deriveCountry({})).toBe('Other');
    expect(deriveCountry({ producer: 'Bombay Sapphire' })).toBe('Other');
  });
});

describe('deriveRegion', () => {
  it('never overrides a region the list actually printed', () => {
    expect(deriveRegion({ designation: 'premier cru', wine_name: 'Brut' }, 'Chablis')).toBe('Chablis');
  });
  it('labels a style-matched Champagne row Champagne when it has no region', () => {
    expect(deriveRegion({ designation: 'premier cru', wine_name: 'Brut' }, '')).toBe('Champagne');
  });
  it('leaves an unresolved row blank', () => {
    expect(deriveRegion({ wine_name: 'Something' }, '')).toBe('');
  });
});
