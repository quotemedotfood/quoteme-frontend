// @vitest-environment jsdom
//
// QuoteReviewBar.dismiss.test.tsx
//
// Justin's second binding criterion: the feedback surface must be dismissible
// WITHOUT submitting sentiment.
//
// Before this change the only path to setState('dismissed') ran through
// handleThumbsUp, which calls reviewQuote(quoteId, 'positive') first.
// handleClose returned to 'idle', not 'dismissed', so it merely collapsed the
// comment form back to the prompt. The idle card rendered two controls and
// both were thumbs. So the only way to make the card go away was to tell the
// system the matches looked good.
//
// That is not merely an annoyance. Every operator who wanted the card gone was
// recorded as a positive review, so reviewQuote(..., 'positive') counted
// something other than what it claims. Claudio has since established that
// quote_feedbacks carries no field separating a genuine positive from a
// dismissal, and that rep_reviewed_at is stamped on every review, so a
// dismissal also unlocked the send gate. That is why dismissal here is
// client-side only and must never reach the backend.
//
// This project's vitest config does not set `globals: true`, so
// @testing-library/react's afterEach auto cleanup never registers.
// afterEach(cleanup) is declared explicitly: without it renders accumulate and
// a later query can pass against an earlier case's DOM.

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const { reviewQuote } = vi.hoisted(() => ({
  reviewQuote: vi.fn(async () => ({ data: { rules_created: 0, rules_summary: [] } })),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, reviewQuote };
});

import { QuoteReviewBar } from './QuoteReviewBar';

const QUOTE_ID = 'quote-abc';

describe('QuoteReviewBar -- dismissible without submitting sentiment', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    reviewQuote.mockClear();
    localStorage.clear();
  });

  it('offers a way out that is not a rating', () => {
    render(<QuoteReviewBar quoteId={QUOTE_ID} onMatchesUpdated={() => {}} />);

    expect(screen.getByRole('button', { name: 'Dismiss without rating these matches' }))
      .toBeInTheDocument();
  });

  it('sends NOTHING to the backend when dismissed', async () => {
    render(<QuoteReviewBar quoteId={QUOTE_ID} onMatchesUpdated={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss without rating these matches' }));

    await waitFor(() =>
      expect(screen.queryByText('How do these matches look?')).not.toBeInTheDocument(),
    );
    // The contamination this whole change exists to stop.
    expect(reviewQuote).not.toHaveBeenCalled();
  });

  it('stays dismissed across a remount, so a dismissal is not a temporary hide', async () => {
    const first = render(<QuoteReviewBar quoteId={QUOTE_ID} onMatchesUpdated={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss without rating these matches' }));
    await waitFor(() =>
      expect(screen.queryByText('How do these matches look?')).not.toBeInTheDocument(),
    );
    first.unmount();

    render(<QuoteReviewBar quoteId={QUOTE_ID} onMatchesUpdated={() => {}} />);

    expect(screen.queryByText('How do these matches look?')).not.toBeInTheDocument();
    expect(reviewQuote).not.toHaveBeenCalled();
  });

  it('scopes the dismissal to ONE quote, so other quotes still ask', async () => {
    const first = render(<QuoteReviewBar quoteId={QUOTE_ID} onMatchesUpdated={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss without rating these matches' }));
    await waitFor(() =>
      expect(screen.queryByText('How do these matches look?')).not.toBeInTheDocument(),
    );
    first.unmount();

    // A different quote is a different question.
    render(<QuoteReviewBar quoteId="quote-xyz" onMatchesUpdated={() => {}} />);

    expect(screen.getByText('How do these matches look?')).toBeInTheDocument();
  });

  it('still records a genuine positive when the operator actually rates it', async () => {
    render(<QuoteReviewBar quoteId={QUOTE_ID} onMatchesUpdated={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'These matches look good' }));

    await waitFor(() => expect(reviewQuote).toHaveBeenCalledTimes(1));
    expect(reviewQuote).toHaveBeenCalledWith(QUOTE_ID, 'positive');
  });

  it('renders normally when storage throws, rather than breaking the card', () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('storage blocked');
      });

    try {
      render(<QuoteReviewBar quoteId={QUOTE_ID} onMatchesUpdated={() => {}} />);
      // Safe failure: show the card. The operator can dismiss it again.
      expect(screen.getByText('How do these matches look?')).toBeInTheDocument();
    } finally {
      getItem.mockRestore();
    }
  });
});
