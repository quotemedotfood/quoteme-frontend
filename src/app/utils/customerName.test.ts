import { describe, it, expect } from 'vitest';
import { displayCustomerName, isAllCaps } from './customerName';

describe('displayCustomerName', () => {
  it('turns an ALL CAPS name into a capital first letter per word', () => {
    expect(displayCustomerName('LA FORET')).toBe('La Foret');
    expect(displayCustomerName('THE WINE BAR & GRILL')).toBe('The Wine Bar & Grill');
  });

  it('starts a new word after a hyphen, slash or parenthesis', () => {
    expect(displayCustomerName('SMITH-JONES CAFE')).toBe('Smith-Jones Cafe');
    expect(displayCustomerName('BAR/KITCHEN (DENVER)')).toBe('Bar/Kitchen (Denver)');
  });

  it('keeps digits and lowers letters after an apostrophe', () => {
    expect(displayCustomerName("JOE'S 2ND STREET")).toBe("Joe's 2nd Street");
  });

  it('leaves any name with a lower case letter exactly as it is', () => {
    expect(displayCustomerName('McGregor')).toBe('McGregor');
    expect(displayCustomerName('the KITCHEN')).toBe('the KITCHEN');
    expect(displayCustomerName('Bistro VG')).toBe('Bistro VG');
  });

  it('leaves names with no letters and empty values alone', () => {
    expect(displayCustomerName('1234')).toBe('1234');
    expect(displayCustomerName('')).toBe('');
    expect(displayCustomerName(null)).toBe('');
    expect(displayCustomerName(undefined)).toBe('');
  });

  it('handles accented capitals', () => {
    expect(displayCustomerName('CAFÉ ÉTOILE')).toBe('Café Étoile');
  });
});

describe('isAllCaps', () => {
  it('is true only when there are letters and none is lower case', () => {
    expect(isAllCaps('LA FORET')).toBe(true);
    expect(isAllCaps('La Foret')).toBe(false);
    expect(isAllCaps('123')).toBe(false);
  });
});
