// A QM admin signed in as a restaurant admin must reach the restaurant
// admin's endpoints AS THAT ADMIN. Moose, 2026-10-13: signing in as Alexa
// (Aquitaine) showed "Forbidden", because these reads sent the QM admin's
// stashed token (adminApi's client prefers quoteme_admin_token) and
// RestaurantAdminHomeController refuses anyone who is not a restaurant admin.
//
// The property under test is the Authorization header that leaves the browser.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getRestaurantAdminHome,
  getRestaurantAdminPairme,
  getRestaurantAdminPresentations,
} from './api';

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.setItem('quoteme_admin_token', 'QM-ADMIN-JWT');
  localStorage.setItem('quoteme_token', 'ALEXA-JWT');
  fetchMock.mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function sentAuth() {
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  return (init.headers as Record<string, string>).Authorization;
}

describe('restaurant admin reads while a QM admin is signed in as them', () => {
  it.each([
    ['home', () => getRestaurantAdminHome(), '/api/v1/restaurant_admin/home'],
    ['pairings', () => getRestaurantAdminPairme('r1'), '/api/v1/restaurant_admin/restaurants/r1/pairme'],
    ['guest tables', () => getRestaurantAdminPresentations('r1'), '/api/v1/restaurant_admin/restaurants/r1/pairme_presentations'],
  ])('%s sends the restaurant admin token, never the QM admin token', async (_name, call, path) => {
    await call();
    expect(String(fetchMock.mock.calls[0][0])).toContain(path);
    expect(sentAuth()).toBe('Bearer ALEXA-JWT');
  });
});
