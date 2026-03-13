export function isDemoMode(): boolean {
  return window.location.hostname === 'demo.quoteme.food';
}

export const PROD_SIGNUP_URL = 'https://prod.quoteme.food/auth';
