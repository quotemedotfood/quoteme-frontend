// @vitest-environment jsdom
//
// QuoteReviewBar.render.test.tsx — FE-TESTING epic slice 1.
//
// This is the FIRST test in the codebase that mounts a REAL component with
// @testing-library/react instead of reimplementing its logic as a parallel
// pure function (compare src/app/pages/chef/ChefPullEntryPage.test.tsx,
// which explicitly notes: "Project test env is node-only ... render tests
// are deferred to E2E"). That pattern lets a component's real JSX drift from
// the reimplemented copy without any test ever failing — exactly the "dead
// buttons ship silently because build==typecheck" gap Moose flagged.
//
// Target: QuoteReviewBar, rendered live on the quoting flow (both
// QuoteBuilderPage and MapIngredientsPage mount it — see
// src/app/pages/QuoteBuilderPage.tsx:980 and
// src/app/pages/MapIngredientsPage.tsx:1158). It has real disabled-until-valid
// button logic: the "Redo Matches" submit button is `disabled={!comment.trim()}`
// (src/app/components/QuoteReviewBar.tsx). This test drives that logic
// through the actual rendered DOM, not a copy of it.

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuoteReviewBar } from './QuoteReviewBar';

describe('QuoteReviewBar — real render smoke test (quoting flow)', () => {
  it('Redo Matches button is disabled with an empty comment and enables once text is typed', () => {
    render(<QuoteReviewBar quoteId="quote-123" onMatchesUpdated={() => {}} />);

    // Real user path: click "Needs fixes" (thumbs down) to expand the panel.
    fireEvent.click(screen.getByTitle('Needs fixes'));

    const submitButton = screen.getByRole('button', { name: 'Redo Matches' });
    expect(submitButton).toBeDisabled();

    // Type a comment via the real textarea — this is the "dead button" class
    // of bug: if the real disable condition ever stops matching real input,
    // this assertion (not a reimplemented copy of the condition) catches it.
    fireEvent.change(screen.getByPlaceholderText(/No Sysco products/i), {
      target: { value: 'Wrong protein matched on line 2' },
    });

    expect(submitButton).toBeEnabled();
  });
});
