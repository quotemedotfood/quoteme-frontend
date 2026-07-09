// Canonical region-code registry — the single source of truth for
// state/province dropdowns and validation across the frontend.
//
// Before this, the same US-state array was hardcoded in four places
// (CreateRestaurantPage, admin/_addRestaurantModal, admin/QMAdminDistributorDetail
// StatesServedEditor, and AuthPage's signup service-states field). Adding a
// region (e.g. Canadian provinces) meant remembering to touch every copy.
// Canada support #1+#2 (2026-07-09) consolidates the FE side here; it mirrors
// the backend Geo module (app/models/geo.rb).

export type CountryCode = 'US' | 'CA';

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

// 13 Canadian province/territory codes (mirrors Geo::CA_PROVINCES on the BE).
export const CA_PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
] as const;

// Combined allow-list — every recognized region code.
export const VALID_REGIONS = [...US_STATES, ...CA_PROVINCES] as const;

export const COUNTRY_OPTIONS: { value: CountryCode; label: string }[] = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
];

export const DEFAULT_COUNTRY: CountryCode = 'US';

// Returns the region list (states or provinces) for the given country.
// Falls back to US states for any unrecognized country code.
export function regionsForCountry(country?: string | null): readonly string[] {
  return country === 'CA' ? CA_PROVINCES : US_STATES;
}

// True when `region` is a valid state/province for the given country.
export function isValidRegion(region: string, country?: string | null): boolean {
  if (!region) return false;
  return regionsForCountry(country).includes(region.toUpperCase());
}
