// chefProductName.test.ts: strip asterisk-wrapped warehouse tokens from CJ
// product names before they reach a chef-facing surface.
//
// Governing constitution: VIII (chef sees a clean quote) + XVIII (no
// technical/warehouse language to the chef).

import { describe, it, expect } from 'vitest';
import { chefProductName } from './chefProductName';

describe('chefProductName', () => {
  it('strips a single asterisk-wrapped warehouse token', () => {
    expect(chefProductName('SALMON *DEAD* FILLET')).toBe('SALMON FILLET');
  });

  it('strips multiple asterisk-wrapped tokens in the same name', () => {
    expect(chefProductName('*CNSEA* GINGER *SWEET* PASTE')).toBe('GINGER PASTE');
  });

  it('strips a leading token', () => {
    expect(chefProductName('*DEAD* SALMON FILLET')).toBe('SALMON FILLET');
  });

  it('strips a trailing token', () => {
    expect(chefProductName('SALMON FILLET *DEAD*')).toBe('SALMON FILLET');
  });

  it('collapses consecutive whitespace left behind after stripping', () => {
    expect(chefProductName('SALMON   *DEAD*   FILLET')).toBe('SALMON FILLET');
  });

  it('collapses whitespace even when the token has no surrounding spaces', () => {
    expect(chefProductName('SALMON*DEAD*FILLET')).toBe('SALMON FILLET');
  });

  it('trims leading and trailing whitespace after stripping', () => {
    expect(chefProductName('  *DEAD* SALMON FILLET *SWEET*  ')).toBe('SALMON FILLET');
  });

  it('passes through a name with no warehouse tokens unchanged (aside from trim)', () => {
    expect(chefProductName('SALMON FILLET')).toBe('SALMON FILLET');
  });

  it('passes through a name with no tokens and internal single spaces unchanged', () => {
    expect(chefProductName('Extra Virgin Olive Oil')).toBe('Extra Virgin Olive Oil');
  });

  it('returns an empty string for an empty input', () => {
    expect(chefProductName('')).toBe('');
  });

  it('is undefined-safe', () => {
    expect(chefProductName(undefined)).toBe('');
  });

  it('is null-safe', () => {
    expect(chefProductName(null)).toBe('');
  });

  it('handles a name that is only a warehouse token', () => {
    expect(chefProductName('*DEAD*')).toBe('');
  });
});
