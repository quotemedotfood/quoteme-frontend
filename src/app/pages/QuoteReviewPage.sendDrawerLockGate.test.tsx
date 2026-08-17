// QuoteReviewPage.sendDrawerLockGate.test.tsx
//
// L5 round 5. The send drawer here renders on `{sendDrawerOpen && (`, and its
// Send Email button was `disabled={sendEmailMutation.loading || !sendEmail.trim()}`
// with NO quoteLocked term. Nothing dismisses the drawer on a lock flip either.
// So a viewer who opened the drawer and then became locked or admin had the belt
// inside sendEmailMutation as the SOLE protection against a send.
//
// The exposure is only reachable because the trigger's presence is keyed on a
// DIFFERENT value (sendDrawerOpen) than the gate (quoteLocked). That asymmetry is
// what this test drives: open the drawer while writable, flip the viewer to a
// quoteme_admin mid-session (the realistic case being /me resolving late), and
// assert the control is now gated and no send escapes.
//
// The belt itself stays in place behind this, but note it is NOT independently
// covered: adding the disabled term deliberately puts a render gate in front of
// it, which is a net safety win and costs the belt its reachability. See the
// mutation table in the PR body.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

const { getQuote, sendQuote, authBox, navigateMock } = vi.hoisted(() => ({
  authBox: { current: { user: { role: 'rep' } } as any },
  getQuote: vi.fn(async () => ({
    data: {
      id: 'quote-1',
      status: 'draft',
      state: 'preview',
      sent_at: null,
      restaurant: 'Test Kitchen',
      // NOTE: this page renders `quote.distributor` directly as a string at
      // :198 while reading `quote.distributor.currency` at :395. A string keeps
      // the render valid; formatCurrency tolerates the undefined currency.
      distributor: 'Acme Foods',
      contacts: [{ id: 'c-1', is_primary: true, email: 'chef@test.com', first_name: 'A', last_name: 'B' }],
      lines: [
        {
          id: 'line-1',
          category: 'Seafood',
          quantity: 1,
          unit_price_cents: 5062,
          availability_status: 'available',
          product: { id: 'p-1', item_number: 'SQ-1', brand: 'Acme', product: 'Squid Ink Pasta', pack_size: '10lb' },
        },
      ],
    },
  })),
  sendQuote: vi.fn(async () => ({ data: { ok: true } })),
  navigateMock: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getQuote, sendQuote };
});

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock };
});

// Drives the mid-session viewer flip. Reads a mutable box so the test can change
// the resolved role between renders, which is what a late /me resolution or an
// impersonation exit looks like to this component.
vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/AuthContext')>();
  return { ...actual, useOptionalAuth: () => authBox.current };
});

import { QuoteReviewPage } from './QuoteReviewPage';

// Must be a FUNCTION, not a shared element. React bails out of re-rendering
// when handed a referentially identical element, so reusing one constant here
// makes rerender() a no-op and the auth flip never lands.
const makeTree = () => (
  <MemoryRouter initialEntries={[{ pathname: '/quote-review', state: { quoteId: 'quote-1' } }]}>
    <UserProvider>
      <Routes>
        <Route path="/quote-review" element={<QuoteReviewPage />} />
      </Routes>
    </UserProvider>
  </MemoryRouter>
);

function renderPage() {
  localStorage.setItem('quoteme_token', 'test-token');
  return render(makeTree());
}

async function openSendDrawer() {
  await screen.findByRole('button', { name: /send quote/i });
  fireEvent.click(screen.getByRole('button', { name: /send quote/i }));
  return screen.findByRole('button', { name: /send email/i });
}

describe('QuoteReviewPage - the open send drawer is gated when the viewer locks mid-session', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    sendQuote.mockClear();
    navigateMock.mockClear();
    authBox.current = { user: { role: 'rep' } };
  });
  afterEach(cleanup);

  it('an admin viewer cannot even reach the send drawer: the CTA is the marker', async () => {
    authBox.current = { user: { role: 'quoteme_admin' } };
    renderPage();
    await waitFor(() => {
      expect(
        screen.queryByTestId('quote-review-read-only') ||
        screen.queryByRole('button', { name: /send quote/i }) ||
        screen.queryByText(/Confirmed & Sent/i),
      ).toBeTruthy();
    });
    expect(screen.queryByTestId('quote-review-read-only')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /send quote/i })).toBeNull();
  });

  it('positive control: a rep with the drawer open CAN send', async () => {
    renderPage();
    const sendEmail = await openSendDrawer();

    expect(sendEmail).not.toBeDisabled();
    fireEvent.click(sendEmail);

    await waitFor(() => {
      expect(sendQuote).toHaveBeenCalledTimes(1);
    });
  });

  it('never sends once the viewer resolves to a QM admin while the drawer is open', async () => {
    const { rerender } = renderPage();
    const sendEmail = await openSendDrawer();
    // Writable at the moment the drawer opened: this is the state the exposure
    // depended on.
    expect(sendEmail).not.toBeDisabled();

    // The viewer flips: /me resolves as a QM admin after the drawer was already
    // open. Re-render the same tree so the component re-reads the auth context,
    // which is exactly what a context value change does in the real app.
    authBox.current = { user: { role: 'quoteme_admin' } };
    rerender(makeTree());

    const gated = await screen.findByRole('button', { name: /send email/i });
    await waitFor(() => {
      expect(gated).toBeDisabled();
    });
    expect(gated).toHaveAttribute('title', 'Admin view (read-only)');

    fireEvent.click(gated);
    await new Promise(r => setTimeout(r, 0));

    expect(sendQuote).not.toHaveBeenCalled();
  });
});
