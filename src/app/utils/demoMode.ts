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

export const PROD_SIGNUP_URL = 'https://prod.quoteme.food/auth';
