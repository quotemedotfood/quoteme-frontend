export function isDemoMode(): boolean {
  return window.location.hostname === 'demo.quoteme.food';
}

export function isLiquorDemo(): boolean {
  return isDemoMode() && window.location.pathname.startsWith('/liquor');
}

export function demoType(): 'liquor' | 'food' {
  return isLiquorDemo() ? 'liquor' : 'food';
}

export const FOOD_DEMO_DISTRIBUTOR_ID = '88c1038d-6b3b-4cc0-ba35-32c32f435f91';

// The signup destination offered to demo visitors. The standing app lives on
// the `prod.quoteme.food` host (the bare apex `quoteme.food` does not serve
// /auth). Overridable via VITE_PROD_SIGNUP_URL, the same pattern as
// VITE_API_BASE_URL in services/api.ts and VITE_COLD_LANDING_HOST in
// CCLayout.tsx, falling back to the prod URL so an unset var behaves exactly
// as before.
export const PROD_SIGNUP_URL = import.meta.env.VITE_PROD_SIGNUP_URL || 'https://prod.quoteme.food/auth';
