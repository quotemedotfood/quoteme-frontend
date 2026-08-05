// ExportFinalizePage.sendGate.test.tsx
//
// Justin, 2026-08-05: gate on the document, never on the rep's attention. The
// rep-review gate is removed. The FE send control must now:
//   - allow send on an UNREVIEWED but complete quote (pressing Send is the
//     review), and
//   - block only when unmatched items are unacknowledged, saying why ON the
//     control (never a silent click).
//
// Acceptance as a sentence about a person: a rep on a finished quote he has not
// separately "reviewed" can still send it; a rep on a quote with unresolved
// items sees the Send control disabled with the reason, not a dead click.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

const matchedLine = (id: string) => ({
  id, component: { name: 'onion', source_dish: 'Dish' }, category: 'Produce',
  unit_price_cents: 500, availability_status: 'available', rep_handled: false,
  product: { id: 'p', item_number: 's', brand: 'b', product: 'Onion', pack_size: '1' },
  alignment_candidates: [],
});
const unmatchedLine = (id: string) => ({
  id, component: { name: 'mystery', source_dish: 'Dish' }, category: 'Produce',
  unit_price_cents: 0, availability_status: 'not_in_catalog', rep_handled: false,
  product: null, alignment_candidates: [],
});

const { getQuote, lines } = vi.hoisted(() => {
  const box: { lines: any[] } = { lines: [] };
  return {
    lines: box,
    getQuote: vi.fn(async () => ({
      data: {
        id: 'quote-1', status: 'draft', quote_status_label: 'Draft',
        state: null, rep_reviewed_at: null, // UNREVIEWED on purpose
        restaurant: 'Test Kitchen', rep: 'Rep',
        contacts: [{ id: 'c1', first_name: 'Chef', last_name: 'J', role: 'Chef', email: 'chef@x.com', phone: '5', is_primary: true }],
        sent_at: null, total_cents: 0, total: '$0.00', created_at: '2026-01-01T00:00:00Z',
        lines: box.lines,
      },
    })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getQuote };
});

import { ExportFinalizePage } from './ExportFinalizePage';

function renderPage() {
  localStorage.setItem('quoteme_token', 'test-token');
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/export-finalize', state: { quoteId: 'quote-1' } }]}>
      <UserProvider>
        <Routes>
          <Route path="/export-finalize" element={<ExportFinalizePage />} />
        </Routes>
      </UserProvider>
    </MemoryRouter>
  );
}

describe('ExportFinalizePage - send gates on document completeness, not review', () => {
  beforeEach(() => { localStorage.clear(); getQuote.mockClear(); });
  afterEach(() => { cleanup(); localStorage.clear(); });

  it('allows send on an UNREVIEWED but complete quote (the case the old gate blocked)', async () => {
    lines.lines = [matchedLine('l1'), matchedLine('l2')];
    renderPage();
    const btn = await screen.findByRole('button', { name: /email quote to chef/i });
    expect(btn).not.toBeDisabled();
    expect(screen.queryByTestId('send-quote-review-required')).toBeNull();
  });

  it('blocks send with the completeness reason when an unmatched item is unacknowledged', async () => {
    lines.lines = [matchedLine('l1'), unmatchedLine('u1')];
    renderPage();
    const btn = await screen.findByRole('button', { name: /email quote to chef/i });
    expect(btn).toBeDisabled();
    expect(screen.getByTestId('send-quote-review-required')).toBeTruthy();
  });
});
