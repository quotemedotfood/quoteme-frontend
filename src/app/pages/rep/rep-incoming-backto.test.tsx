// B-183 regression: /rep/quotes/:id rendered RepDesktopQuoteView, whose
// back-nav breadcrumb referenced `backTo` and `navigate` — bindings that live
// only in the parent RepIncomingQuotePage scope, never passed as props. esbuild
// does no type-checking, so the undefined reference shipped and threw
// `ReferenceError: backTo is not defined` at render on every rep quote detail.
//
// This test renders the component to static markup (node env, no DOM needed),
// which fully executes the render path including the breadcrumb. Pre-fix it
// throws "backTo is not defined"; post-fix it renders cleanly.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { RepDesktopQuoteView } from './RepIncomingQuotePage';

// Minimal props: empty quote/lines/groups + all conditional sections off so the
// only meaningful thing rendered is the back-nav breadcrumb under test.
const baseProps = {
  quote: null,
  quoteId: 'quote-123',
  lines: [],
  groups: [],
  matchState: 'ready' as const,
  missingLines: [],
  partial: false,
  flowState: 'first-arrival' as const,
  unpricedCount: 0,
  handleUseCatalogPrices: () => {},
  handleConfirmSend: () => {},
  saving: false,
  nav: () => {},
  sortBy: 'category' as const,
  setSortBy: () => {},
  sentAt: '',
  bannerDismissed: false,
  setBannerDismissed: () => {},
  showCatalogBanner: false,
  showAutoFireToast: false,
  pricedLines: [],
  isEmptyMenu: false,
  chefRequestMessage: null,
  restaurantContact: null,
};

describe('B-183: RepDesktopQuoteView back-nav breadcrumb', () => {
  it('renders without throwing when backTo + navigate are provided as props', () => {
    const navigated: string[] = [];
    const html = renderToStaticMarkup(
      createElement(RepDesktopQuoteView, {
        ...baseProps,
        backTo: '/rep/quotes/inbound',
        navigate: (p: string) => { navigated.push(p); },
      } as never),
    );
    // Breadcrumb label resolves from backTo (not command-center → "Triage").
    expect(html).toContain('Triage');
  });

  it('shows the Command Center label when backTo points at command-center', () => {
    const html = renderToStaticMarkup(
      createElement(RepDesktopQuoteView, {
        ...baseProps,
        backTo: '/distributor-admin/command-center/quotes',
        navigate: () => {},
      } as never),
    );
    expect(html).toContain('Command Center');
  });
});
