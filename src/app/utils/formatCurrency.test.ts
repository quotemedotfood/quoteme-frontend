import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatCurrency';

// CANADA-CURRENCY — shared money formatter unit spec.
// Locale is pinned to 'en-US' (not the caller's browser locale) so USD output
// is byte-for-byte unchanged from every pre-existing file-local formatter
// ("$1,234.56"), and CAD gets a disambiguating "CA$" prefix rather than a
// bare "$" (verified: under 'en-CA' locale, CAD renders as a bare "$1,234.56"
// with no prefix — 'en-US' was chosen specifically to keep CAD and USD
// visually distinguishable on surfaces that can show either).

describe('formatCurrency', () => {
  it('formats USD cents as a fixed-2-decimal dollar string', () => {
    expect(formatCurrency(123456, 'USD')).toBe('$1,234.56');
  });

  it('formats whole-dollar cents with a trailing .00', () => {
    expect(formatCurrency(2000, 'USD')).toBe('$20.00');
  });

  it('formats zero cents as $0.00', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('formats CAD cents with the disambiguating "CA$" prefix', () => {
    // Exact output produced by `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' })`
    // — verified by running it directly (Node v22 / ICU data in this environment).
    expect(formatCurrency(123456, 'CAD')).toBe('CA$1,234.56');
  });

  it('defaults to USD when currencyCode is omitted', () => {
    expect(formatCurrency(123456)).toBe('$1,234.56');
  });

  it('defaults to USD when currencyCode is null', () => {
    expect(formatCurrency(123456, null as unknown as string)).toBe('$1,234.56');
  });

  it('defaults to USD when currencyCode is an empty string', () => {
    expect(formatCurrency(123456, '')).toBe('$1,234.56');
  });

  it('defaults to USD when currencyCode is blank/whitespace', () => {
    expect(formatCurrency(123456, '   ')).toBe('$1,234.56');
  });

  it('defaults to USD when currencyCode is unrecognized (invalid ISO 4217 code)', () => {
    expect(formatCurrency(123456, 'bogus')).toBe('$1,234.56');
  });

  it('is case-insensitive for currency codes', () => {
    expect(formatCurrency(123456, 'cad')).toBe('CA$1,234.56');
  });

  it('treats a non-finite/NaN cents value as 0', () => {
    expect(formatCurrency(NaN, 'USD')).toBe('$0.00');
  });
});
