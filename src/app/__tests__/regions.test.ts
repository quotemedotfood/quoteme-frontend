// regions.test.ts
//
// Canada support #1+#2: locks the consolidated region registry
// (src/app/constants/regions.ts) that replaced four hardcoded US-state copies
// across CreateRestaurantPage, admin/_addRestaurantModal,
// admin/QMAdminDistributorDetail (StatesServedEditor) and AuthPage.

import { describe, it, expect } from 'vitest';
import {
  US_STATES,
  CA_PROVINCES,
  VALID_REGIONS,
  regionsForCountry,
  isValidRegion,
} from '../constants/regions';

describe('regions registry', () => {
  it('has the 51 US region codes (50 states + DC)', () => {
    expect(US_STATES).toHaveLength(51);
    expect(US_STATES).toContain('CA');
    expect(US_STATES).toContain('DC');
  });

  it('has the 13 CA province/territory codes including ON', () => {
    expect(CA_PROVINCES).toHaveLength(13);
    expect([...CA_PROVINCES].sort()).toEqual(
      ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
    );
  });

  it('VALID_REGIONS is the union of both lists', () => {
    expect(VALID_REGIONS).toHaveLength(US_STATES.length + CA_PROVINCES.length);
    expect(VALID_REGIONS).toContain('ON');
    expect(VALID_REGIONS).toContain('NY');
  });

  describe('regionsForCountry', () => {
    it('returns CA provinces for country CA', () => {
      expect(regionsForCountry('CA')).toBe(CA_PROVINCES);
    });

    it('returns US states for country US and for unknown/absent country', () => {
      expect(regionsForCountry('US')).toBe(US_STATES);
      expect(regionsForCountry(null)).toBe(US_STATES);
      expect(regionsForCountry(undefined)).toBe(US_STATES);
    });
  });

  describe('isValidRegion', () => {
    it('accepts ON when country is CA (the 100km Foods unblock)', () => {
      expect(isValidRegion('ON', 'CA')).toBe(true);
      expect(isValidRegion('on', 'CA')).toBe(true); // case-insensitive
    });

    it('rejects ON when country is US', () => {
      expect(isValidRegion('ON', 'US')).toBe(false);
    });

    it('accepts NY for US and rejects unknown codes', () => {
      expect(isValidRegion('NY', 'US')).toBe(true);
      expect(isValidRegion('ZZ', 'US')).toBe(false);
      expect(isValidRegion('', 'CA')).toBe(false);
    });
  });
});
