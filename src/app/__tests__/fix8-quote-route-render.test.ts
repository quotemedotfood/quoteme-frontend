// fix8-quote-route-render.test.ts
//
// FIX #8 (Constitution X: the quote is the destination, not the process
// screen): /quotes/:id and /rep/quotes/:id previously rendered via
// RepQuoteIdRedirect, an unconditional <Navigate> that bounced the rep to
// /map-ingredients?quoteId=:id — the ingredient-matching step-through —
// instead of rendering the quote itself. A rep opening a ready-quote link
// (magic link or direct URL) landed on "Match Ingredients" instead of their
// quote.
//
// Fix: RepQuoteIdRedirect now targets /quote-builder?quoteId=:id.
// QuoteBuilderPage IS the quote work-product (pricing, line items, totals);
// it reads quoteId from either location.state or the ?quoteId= search param
// (see QuoteBuilderPage.tsx), so the existing redirect shape (query string)
// continues to work unchanged. QuoteBuilderPage still offers a user-initiated
// back-arrow to /map-ingredients for anyone who wants to re-match — the fix
// removes the forced redirect, not the ability to navigate to matching.
//
// This reads the actual routes.tsx source (not a duplicated constant) so a
// regression in the real redirect target fails this test, not just a typo
// in a copy of the string here.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const routesSource = readFileSync(join(here, '..', 'routes.tsx'), 'utf-8');

function functionBody(source: string, fnName: string): string {
  const start = source.indexOf(`function ${fnName}(`);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf('\n}', start);
  return source.slice(start, end);
}

describe('FIX #8: /quotes/:id and /rep/quotes/:id render the quote, not map-ingredients', () => {
  it('RepQuoteIdRedirect navigates to /quote-builder, not /map-ingredients', () => {
    const body = functionBody(routesSource, 'RepQuoteIdRedirect');
    expect(body).toContain('/quote-builder?quoteId=');
    expect(body).not.toContain('/map-ingredients?quoteId=');
  });

  it('/quotes/:id and /rep/quotes/:id both route through RepQuoteIdRedirect (single source of truth)', () => {
    expect(routesSource).toContain('{ path: "quotes/:id", Component: RepQuoteIdRedirect }');
    expect(routesSource).toContain('{ path: ":id", Component: RepQuoteIdRedirect }');
  });
});
