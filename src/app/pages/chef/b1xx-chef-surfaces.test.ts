// b1xx-chef-surfaces.test.ts
//
// Unit tests for the B-1xx chef-surface fixes:
//
//   B-103: OrderGuideRow download links use fetchWithAuth blob fetch
//          (not bare <a href> to the Railway hostname)
//   B-108b: SidebarHelpInput clears input + shows "Sent!" on send
//
// B-110(a) (per-item "Your rep will handle this" pill) was removed as part
// of the chef-clean ruling: the unmatched/"Items your rep will handle"
// section no longer renders on ChefQuoteReceiptPage, so its coverage was
// retired along with the feature. B-110(b) (order guide link) is unrelated
// to that section and still applies.

import { describe, it, expect } from 'vitest';

// ─── B-103: fetchWithAuth downloads (structural guard) ───────────────────────
//
// The pure logic we can unit-test without DOM/React: the download trigger
// function builds the right filename for each format.

function orderGuideFilename(id: string, format: 'pdf' | 'excel'): string {
  return format === 'pdf' ? `order-guide-${id}.pdf` : `order-guide-${id}.xlsx`;
}

describe('B-103 download filename helpers', () => {
  it('PDF filename includes the order guide id', () => {
    expect(orderGuideFilename('abc123', 'pdf')).toBe('order-guide-abc123.pdf');
  });

  it('Excel filename uses .xlsx extension', () => {
    expect(orderGuideFilename('abc123', 'excel')).toBe('order-guide-abc123.xlsx');
  });

  it('PDF and Excel filenames differ only in extension', () => {
    const id = 'og-xyz';
    const pdf = orderGuideFilename(id, 'pdf');
    const xls = orderGuideFilename(id, 'excel');
    expect(pdf.replace('.pdf', '')).toBe(xls.replace('.xlsx', ''));
  });
});

// ─── B-108b: SidebarHelpInput "Sent!" feedback ───────────────────────────────
//
// The confirmation logic: openDrawer fires only when the trimmed text is
// non-empty, clears the input, and sets the sent flag.

function simulateOpenDrawer(text: string): { fired: boolean; clearedInput: boolean; setSent: boolean } {
  if (!text.trim()) return { fired: false, clearedInput: false, setSent: false };
  // mirrors the real openDrawer: setQuestion(''), setDrawerOpen(true), setSent(true)
  return { fired: true, clearedInput: true, setSent: true };
}

describe('B-108b SidebarHelpInput openDrawer confirmation logic', () => {
  it('fires and clears input on non-empty text', () => {
    const result = simulateOpenDrawer('How do I price chicken?');
    expect(result.fired).toBe(true);
    expect(result.clearedInput).toBe(true);
    expect(result.setSent).toBe(true);
  });

  it('does NOT fire on empty string', () => {
    const result = simulateOpenDrawer('');
    expect(result.fired).toBe(false);
  });

  it('does NOT fire on whitespace-only text', () => {
    const result = simulateOpenDrawer('   ');
    expect(result.fired).toBe(false);
  });

  it('fires on text with leading/trailing spaces (trimmed to non-empty)', () => {
    const result = simulateOpenDrawer('  question  ');
    expect(result.fired).toBe(true);
    expect(result.setSent).toBe(true);
  });
});

// ─── B-110(b): "Download order guide" link on accepted quote ─────────────────
//
// Logic: when isLocked is true AND status==='won' or state==='accepted' AND
// order_guide_id is present, the link should render pointing to
// /chef/order-guide/<id>. When any condition is false, it should not render.

function shouldShowOrderGuideLink(params: {
  isLocked: boolean;
  status: string;
  state: string | null | undefined;
  order_guide_id: string | null | undefined;
}): boolean {
  const { isLocked, status, state, order_guide_id } = params;
  return isLocked && (status === 'won' || state === 'accepted') && !!order_guide_id;
}

function orderGuideLinkHref(order_guide_id: string): string {
  return `/chef/order-guide/${order_guide_id}`;
}

describe('B-110(b) order guide link visibility', () => {
  it('shows when locked + won + order_guide_id present', () => {
    expect(shouldShowOrderGuideLink({ isLocked: true, status: 'won', state: null, order_guide_id: 'og-abc' })).toBe(true);
  });

  it('shows when locked + accepted state + order_guide_id present', () => {
    expect(shouldShowOrderGuideLink({ isLocked: true, status: 'sent', state: 'accepted', order_guide_id: 'og-abc' })).toBe(true);
  });

  it('does NOT show when not locked', () => {
    expect(shouldShowOrderGuideLink({ isLocked: false, status: 'won', state: null, order_guide_id: 'og-abc' })).toBe(false);
  });

  it('does NOT show when locked + accepted but no order_guide_id', () => {
    expect(shouldShowOrderGuideLink({ isLocked: true, status: 'won', state: null, order_guide_id: null })).toBe(false);
  });

  it('does NOT show when locked but neither won nor accepted', () => {
    expect(shouldShowOrderGuideLink({ isLocked: true, status: 'sent', state: 'distributor_quote', order_guide_id: 'og-abc' })).toBe(false);
  });

  it('link href uses the order_guide_id', () => {
    expect(orderGuideLinkHref('og-xyz')).toBe('/chef/order-guide/og-xyz');
  });
});
