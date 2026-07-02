// Root 1 CONFIRM→SEND state machine — render regression.
//
// After confirming an OPEN quote (no chef contact), confirm does NOT send;
// the page reveals a post-confirm SEND affordance (recipient email input +
// "Send quote" button). esbuild does no type-checking, so any undefined
// binding in that render path would ship and throw at runtime (same defect
// class as the B-183 `backTo is not defined` and NF-25 `setLogoUrl` crashes).
//
// These tests render (node env, no jsdom) the presentational affordance and
// the RepDesktopQuoteView branch that mounts it, asserting both render without
// throwing and show the recipient input + Send button.
//
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { RepDesktopQuoteView, RepSendAffordance } from './RepIncomingQuotePage';

describe('Root 1: RepSendAffordance (presentational)', () => {
  it('renders the recipient email input + Send button without throwing', () => {
    const html = renderToStaticMarkup(
      createElement(RepSendAffordance, {
        email: '',
        onEmailChange: () => {},
        onSend: () => {},
        sending: false,
        error: null,
      }),
    );
    expect(html).toContain('Send quote');
    expect(html).toContain('Recipient email'); // aria-label on the input
    expect(html).toContain('type="email"');
  });

  it('prefills the email value and shows an inline error', () => {
    const html = renderToStaticMarkup(
      createElement(RepSendAffordance, {
        email: 'chef@restaurant.com',
        onEmailChange: () => {},
        onSend: () => {},
        sending: false,
        error: 'Enter a valid email.',
      }),
    );
    expect(html).toContain('chef@restaurant.com');
    expect(html).toContain('Enter a valid email.');
  });

  it('shows the sending state on the button when sending', () => {
    const html = renderToStaticMarkup(
      createElement(RepSendAffordance, {
        email: 'chef@restaurant.com',
        onEmailChange: () => {},
        onSend: () => {},
        sending: true,
        error: null,
      }),
    );
    expect(html).toContain('Sending');
  });
});

// Base props mirroring rep-incoming-backto.test.tsx — all conditional sections
// off except the send affordance, which we flip on to assert it renders in the
// desktop view branch.
const baseProps = {
  quote: { id: 'q1', status: 'open', has_chef_contact: false } as never,
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
  showSendAffordance: true,
  recipientEmail: '',
  setRecipientEmail: () => {},
  handleSendQuote: () => {},
  sending: false,
  sendError: null,
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
  backTo: '/rep/quotes/inbound',
  navigate: () => {},
};

describe('Root 1: RepDesktopQuoteView post-confirm send branch', () => {
  it('renders the send affordance when showSendAffordance is true', () => {
    const html = renderToStaticMarkup(
      createElement(RepDesktopQuoteView, baseProps as never),
    );
    expect(html).toContain('Send quote');
    expect(html).toContain('Recipient email');
  });

  it('does not render the send affordance when showSendAffordance is false', () => {
    const html = renderToStaticMarkup(
      createElement(RepDesktopQuoteView, {
        ...baseProps,
        showSendAffordance: false,
      } as never),
    );
    expect(html).not.toContain('Send quote');
  });
});
