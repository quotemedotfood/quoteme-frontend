// QuotesPage.staleDeleteGuard.test.tsx
//
// P0 route/shell guard fix round 2, work item 3: the row-level Delete
// button is correctly hidden once a quote is Sent/Accepted
// (isSentImmutableQuote), but the confirm modal's Delete button calls
// `handleDeleteQuote(confirmDeleteId)` -- and `confirmDeleteId` is a bare
// string set when the modal opened, disconnected from live quote state.
// If the quote goes out (sent/accepted) WHILE the confirm modal is still
// open -- e.g. a background list refresh reflects another tab/session
// having just sent it -- the modal's Delete button had nothing re-checking
// immutability and would still fire deleteQuote(). This test reproduces
// exactly that: open the confirm modal on a draft (mutable) quote, then
// have a background refetch (triggered here by changing the status filter,
// which the page's own fetchQuotes effect already re-runs on) return that
// SAME quote now Sent, while the modal is still open with the old id --
// and asserts the modal's Delete button no longer calls deleteQuote.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { getQuotes, deleteQuote, quoteBox } = vi.hoisted(() => {
  const quoteBox: { current: any } = {
    current: {
      id: 'quote-1',
      status: 'draft',
      working_label: 'Quote for Test Kitchen',
      restaurant: 'Test Kitchen',
      total_cents: 1000,
      line_count: 2,
      rep_reviewed: true,
      rep_reviewed_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      sent_at: null,
      state: 'confirmed',
    },
  };
  return {
    quoteBox,
    getQuotes: vi.fn(async () => ({ data: [quoteBox.current] })),
    deleteQuote: vi.fn(async (): Promise<{ data?: { success: boolean }; error?: string }> => ({ data: { success: true } })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    getQuotes,
    deleteQuote,
  };
});

import { QuotesPage } from './QuotesPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <QuotesPage />
    </MemoryRouter>,
  );
}

describe('QuotesPage - confirm-modal Delete re-checks live quote state (P0 round 2, item 3)', () => {
  beforeEach(() => {
    getQuotes.mockClear();
    deleteQuote.mockClear();
    quoteBox.current = { ...quoteBox.current, status: 'draft', sent_at: null, state: 'confirmed' };
  });

  afterEach(() => {
    cleanup();
  });

  it('never calls deleteQuote if the quote becomes Sent while the confirm modal is still open', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Test Kitchen').length).toBeGreaterThan(0);
    });

    // Open the confirm modal while the quote is still a mutable draft (the
    // row-level Delete trigger is legitimately visible and clickable here).
    fireEvent.click(screen.getByTitle('Delete'));
    const heading = await screen.findByText('Delete Quote?');
    const modal = heading.parentElement as HTMLElement;
    const confirmButton = within(modal).getByRole('button', { name: 'Delete' });

    // The quote goes out from under the still-open modal: the NEXT
    // getQuotes resolves with this same id now Sent. Drive that refetch
    // through the page's own status-filter control, which fetchQuotes
    // already depends on -- no internals reached into, no state exported
    // just for the test.
    quoteBox.current = { ...quoteBox.current, status: 'sent', sent_at: '2026-08-13T00:00:00Z' };
    fireEvent.change(screen.getByDisplayValue('All statuses'), { target: { value: 'sent' } });

    await waitFor(() => {
      expect(getQuotes).toHaveBeenCalledTimes(2);
    });

    // The confirm modal (keyed off confirmDeleteId, untouched by the
    // refetch) is still open with the same id.
    expect(screen.getByText('Delete Quote?')).toBeInTheDocument();

    fireEvent.click(confirmButton);

    expect(deleteQuote).not.toHaveBeenCalled();
  });

  // Round 3. The round-2 guard read `if (quote && isSentImmutableQuote(quote))`,
  // which FAILS OPEN: when the row is no longer in the loaded list, `quote` is
  // undefined, the condition is false, and the delete proceeds having never
  // evaluated the immutability predicate at all. The modal holds a bare id, so
  // "gone from the list" is reachable the same way "now sent" is.
  //
  // This is a pure-logic guard with no render gate in front of it (the confirm
  // modal is keyed off confirmDeleteId, not off the row), so unlike the drawer
  // belts it is directly exercisable. It fails against the pre-fix code.
  it('never calls deleteQuote if the quote has vanished from the list (fail closed, not open)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Test Kitchen').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByTitle('Delete'));
    const heading = await screen.findByText('Delete Quote?');
    const modal = heading.parentElement as HTMLElement;
    const confirmButton = within(modal).getByRole('button', { name: 'Delete' });

    // The quote disappears from under the still-open modal: the next refetch
    // returns an empty list, so `quotes.find(...)` yields undefined and the
    // guard has nothing to evaluate.
    getQuotes.mockImplementationOnce(async () => ({ data: [] }));
    fireEvent.change(screen.getByDisplayValue('All statuses'), { target: { value: 'sent' } });

    await waitFor(() => {
      expect(getQuotes).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText('Delete Quote?')).toBeInTheDocument();

    fireEvent.click(confirmButton);

    expect(deleteQuote).not.toHaveBeenCalled();
    // ...and the modal is dismissed rather than left hanging over the list.
    await waitFor(() => {
      expect(screen.queryByText('Delete Quote?')).toBeNull();
    });
  });
});
