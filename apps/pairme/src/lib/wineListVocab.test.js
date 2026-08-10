import { describe, it, expect } from 'vitest';
import { deriveColor, deriveCountry, COLOR_TAB_ORDER } from './wineListVocab.js';

describe('deriveColor', () => {
  it('reads an explicit color word off the wine name before consulting the vocabulary', () => {
    // Mourvedre is normally a red grape; the producer's own "Rose" on the
    // label must win over that, exactly like Tempier's real Bandol Rose.
    expect(deriveColor({ wine_name: 'Bandol Rose', grape_head: 'mourvedre', region_head: 'bandol' })).toBe('Rose');
  });

  it('detects Sparkling from any of the listed words (Champagne, Cremant, Prosecco, Cava, Blanc de Blancs, Spumante, Sekt)', () => {
    expect(deriveColor({ wine_name: 'Blanc de Blancs Champagne' })).toBe('Sparkling');
    expect(deriveColor({ wine_name: 'Cremant de Bourgogne' })).toBe('Sparkling');
    expect(deriveColor({ wine_name: 'Prosecco Superiore' })).toBe('Sparkling');
    expect(deriveColor({ wine_name: 'Cava Brut Nature' })).toBe('Sparkling');
    expect(deriveColor({ wine_name: 'Franciacorta Spumante' })).toBe('Sparkling');
    expect(deriveColor({ wine_name: 'Sekt Riesling' })).toBe('Sparkling');
  });

  it('detects Orange from "orange", "skin contact" or "ramato"', () => {
    expect(deriveColor({ wine_name: 'Orange Wine Field Blend' })).toBe('Orange');
    expect(deriveColor({ wine_name: 'Skin Contact Ribolla' })).toBe('Orange');
    expect(deriveColor({ wine_name: 'Ramato Pinot Grigio' })).toBe('Orange');
  });

  it('detects Dessert from Port/Sherry/Madeira/Sauternes/late harvest/dessert', () => {
    expect(deriveColor({ wine_name: 'LBV Port' })).toBe('Dessert');
    expect(deriveColor({ wine_name: 'Fino Sherry' })).toBe('Dessert');
    expect(deriveColor({ wine_name: 'Late Harvest Riesling' })).toBe('Dessert');
  });

  it('never false-positives "port" as a substring inside another word (Portugal)', () => {
    expect(deriveColor({ wine_name: 'Portugal Select', region_head: 'douro', grape_head: '' })).not.toBe('Dessert');
  });

  it('falls back to VOCAB.colorFor(region_head) when the name has no color word', () => {
    expect(deriveColor({ wine_name: 'Chablis 1er Cru', region_head: 'chablis', grape_head: 'chardonnay' })).toBe('White');
  });

  it('falls back to VOCAB.colorFor(grape_head) when the region does not resolve', () => {
    expect(deriveColor({ wine_name: 'Morgon', region_head: 'nowhere region', grape_head: 'gamay' })).toBe('Red');
  });

  it('returns empty string when nothing resolves', () => {
    expect(deriveColor({ wine_name: 'Mystery Bottle', region_head: '', grape_head: '' })).toBe('');
  });
});

describe('deriveCountry', () => {
  it('resolves from region_head first', () => {
    expect(deriveCountry({ region_head: 'chablis', grape_head: 'chardonnay' })).toBe('France');
  });

  it('falls back to grape_head when the region does not resolve', () => {
    expect(deriveCountry({ region_head: 'nowhere region', grape_head: 'blaufrankisch' })).toBe('Austria');
  });

  it('falls back to "Other" when neither resolves, never a blank string', () => {
    expect(deriveCountry({ region_head: '', grape_head: '' })).toBe('Other');
  });
});

describe('COLOR_TAB_ORDER', () => {
  it('is exactly the six canonical colors, in display order', () => {
    expect(COLOR_TAB_ORDER).toEqual(['White', 'Red', 'Rose', 'Sparkling', 'Orange', 'Dessert']);
  });
});
