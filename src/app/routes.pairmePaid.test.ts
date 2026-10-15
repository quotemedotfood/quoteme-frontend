// /pairme/paid must sit OUTSIDE the signed-in layout (RootLayout sends anyone
// not signed in to /auth): the person who pays a restaurant group's Stripe
// link has no QuoteMe sign-in. The backend sends Stripe there
// (Pairme::GroupBilling::PAID_PATH).
//
// @vitest-environment jsdom
import { it, expect } from 'vitest';
import { router } from './routes';
import { RootLayout } from './components/RootLayout';
import { PairmeGroupPaidPage } from './pages/PairmeGroupPaidPage';

type R = { path?: string; Component?: unknown; element?: any; children?: R[] };

// The data router keeps the component on element.type (Component is cleared).
const isA = (r: R, c: unknown) => r.Component === c || r.element?.type === c;

function chainTo(routes: R[], target: unknown, chain: R[] = []): R[] | null {
  for (const r of routes) {
    const here = [...chain, r];
    if (isA(r, target)) return here;
    const found = r.children && chainTo(r.children, target, here);
    if (found) return found;
  }
  return null;
}

it('serves /pairme/paid with no signed-in layout above it', () => {
  const chain = chainTo(router.routes as R[], PairmeGroupPaidPage);
  expect(chain?.map((r) => r.path).filter(Boolean)).toEqual(['/', 'pairme/paid']);
  expect(chain!.some((r) => isA(r, RootLayout))).toBe(false);
  // The check can see RootLayout at all: it does sit above the signed-in pages.
  expect(chainTo(router.routes as R[], RootLayout)).not.toBeNull();
});
