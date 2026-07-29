// matchedLineCounts — single source of truth for "N items across M categories"
// on chef-facing surfaces.
//
// Chef welcome bug (2026-07-29): ChefWelcomePage displayed the BE's raw
// quote.item_count/category_count (computed over ALL lines, including
// not_in_catalog), while the quote receipt itself (ChefQuoteReceiptPage)
// only ever shows matched lines (`availability_status === 'available' &&
// l.product`) — the chef-clean filter. The welcome promise ("51 items / 14
// categories") and the quote delivery ("24 / 7") disagreed because the two
// surfaces counted different things.
//
// Both surfaces must use this exact filter/grouping so they can never drift
// apart again. Mirrors the matched-line filter and category grouping key
// used by ChefQuoteReceiptPage/ChefPullReceiptPage's groupByCategory().
import type { QuoteLineResponse } from '../services/api';

export interface MatchedLineCounts {
  itemCount: number;
  categoryCount: number;
}

export function matchedLineCounts(lines: QuoteLineResponse[] | null | undefined): MatchedLineCounts {
  const matched = (lines ?? []).filter(
    (l) => l.availability_status === 'available' && l.product,
  );
  const categories = new Set(matched.map((l) => l.product?.category || l.category || 'Other'));
  return { itemCount: matched.length, categoryCount: categories.size };
}
