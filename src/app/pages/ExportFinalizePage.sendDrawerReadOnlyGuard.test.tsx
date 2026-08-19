// ExportFinalizePage.sendDrawerReadOnlyGuard.test.tsx
//
// P0 route/shell guard fix round 2, work item 1: the email drawer's actual
// Send Email button (`sendEmailMutation.run()`) did not gate on
// `quoteReadOnly` at all, unlike every sibling send control on this page
// ("Send to myself" and the sticky "Email Quote to Chef" button both already
// carried `disabled={... || quoteReadOnly}` + a `title` from `readOnlyMarker`
// -- see those buttons around :1374 and :1438). A disabled *outer* trigger
// is not a gate on the *inner* control once the drawer is already open: this
// test opens the drawer while the viewer is a normal rep (not read-only),
// then simulates the read-only signal flipping underneath the still-open
// drawer -- the same "drawer left open" class of race the round-1 fix
// (Save as Stock Quote) was written against -- and asserts the drawer's own
// Send Email button refuses to fire the write.
//
// The flip is modeled on `adminViewer` rather than sent-immutability because
// admin-viewer status is a *live* signal read from `useOptionalAuth()` on
// every render (unlike `sentLocked`, which is pinned to the quote payload
// fetched once on mount) -- exactly the kind of value that can legitimately
// change out from under an already-open drawer without a page navigation.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';

// vi.mock factories are hoisted above imports, so any values they reference
// must go through vi.hoisted rather than plain top-level consts.
const { getQuote, sendQuote, authBox } = vi.hoisted(() => {
  return {
    authBox: { role: 'rep' as string | null },
    getQuote: vi.fn(async () => ({
      data: {
        id: 'quote-1',
        status: 'draft',
        quote_status_label: 'Draft',
        state: 'confirmed',
        rep_reviewed_at: '2026-01-01T00:00:00Z',
        restaurant: 'Test Kitchen',
        rep: 'Rep Person',
        sent_at: null,
        total_cents: 0,
        total: '$0.00',
        created_at: '2026-01-01T00:00:00Z',
        contacts: [
          { id: 'contact-1', first_name: 'Chef', last_name: 'Jones', role: 'Chef', email: 'chef@example.com', phone: '555-1234', is_primary: true },
        ],
        lines: [],
      },
    })),
    sendQuote: vi.fn(async (): Promise<{ data?: any; error?: string }> => ({ data: { status: 'sent' } })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getQuote, sendQuote };
});

// `useOptionalAuth` reads the live viewer role. Modeled as a plain function
// returning `authBox`'s CURRENT value on every call (not React state), so
// mutating `authBox.role` and forcing any re-render (e.g. typing in the
// still-open drawer) picks up the new value immediately -- reproducing "the
// read-only signal changed while the drawer was already open" without
// needing a second network fetch.
vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/AuthContext')>();
  return {
    ...actual,
    useOptionalAuth: () => ({ user: { role: authBox.role } }),
  };
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
    </MemoryRouter>,
  );
}

describe('ExportFinalizePage - email drawer Send Email refuses on a read-only viewer (P0 round 2, item 1)', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    sendQuote.mockClear();
    authBox.role = 'rep';
  });

  afterEach(() => {
    cleanup();
  });

  it('never calls sendQuote if the viewer becomes an admin (read-only) while the drawer is already open', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Status: Draft/)).toBeInTheDocument();
    });

    // Opened as a normal rep on a writable (draft, non-admin) quote -- this
    // part of the flow is legitimate and must stay allowed.
    fireEvent.click(screen.getByRole('button', { name: 'Email Quote to Chef' }));
    const drawerSendButton = await screen.findByRole('button', { name: /Send Email/i });
    expect(drawerSendButton).not.toBeDisabled();

    // The viewer's role flips to quoteme_admin while the drawer stays open
    // (e.g. an impersonation session ending, or a stale role check
    // resolving late) -- no navigation, no drawer close, no second fetch.
    authBox.role = 'quoteme_admin';
    // Force a re-render so the component re-evaluates useOptionalAuth()
    // and recomputes quoteReadOnly with the new role. The value must
    // actually differ from the field's current content (which already
    // shows the contact's email as a fallback) -- assigning the SAME
    // string does not trigger React's change-detection/dispatch at all.
    const emailInput = screen.getByPlaceholderText('chef@restaurant.com');
    fireEvent.change(emailInput, { target: { value: 'chef-changed@example.com' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send Email/i })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Email/i }));

    expect(sendQuote).not.toHaveBeenCalled();
  });
});
