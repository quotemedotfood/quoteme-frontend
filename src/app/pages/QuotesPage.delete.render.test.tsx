// QuotesPage.delete.render.test.tsx
//
// BUG #28 (naked delete): the confirm-modal Delete button had no `disabled`
// at all, and handleDeleteQuote had no in-flight guard. A fast double click
// on that button could fire deleteQuote() twice for the same quote. It is
// now routed through useAsyncMutation (synchronous inFlightRef guard) and
// the button is disabled while the delete is in flight.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const { getQuotes, deleteQuote, baseQuote } = vi.hoisted(() => {
  const baseQuote: any = {
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
  };
  return {
    baseQuote,
    getQuotes: vi.fn(async () => ({ data: [baseQuote] })),
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

describe('QuotesPage - delete guard (BUG #28)', () => {
  beforeEach(() => {
    getQuotes.mockClear();
    deleteQuote.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('a synchronous double-click on the confirm-modal Delete button fires deleteQuote exactly once', async () => {
    const gate = deferred<{ data?: { success: boolean }; error?: string }>();
    deleteQuote.mockImplementation(() => gate.promise);

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Test Kitchen').length).toBeGreaterThan(0);
    });

    // Desktop row trash icon opens the confirm modal (title="Delete";
    // disambiguates it from the mobile card's text-labeled Delete button,
    // which is also present in jsdom since there's no real viewport to
    // hide it behind a media query).
    fireEvent.click(screen.getByTitle('Delete'));

    const heading = await screen.findByText('Delete Quote?');
    const modal = heading.parentElement as HTMLElement;
    const confirmButton = within(modal).getByRole('button', { name: 'Delete' });

    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(deleteQuote).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve({ data: { success: true } });
    });

    await waitFor(() => {
      expect(screen.queryByText('Delete Quote?')).not.toBeInTheDocument();
    });

    expect(deleteQuote).toHaveBeenCalledTimes(1);
  });
});
