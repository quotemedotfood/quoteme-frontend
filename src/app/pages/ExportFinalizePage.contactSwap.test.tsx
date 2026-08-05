// ExportFinalizePage.contactSwap.test.tsx
//
// Audit 1c, the instance that ends a customer relationship: the sent recipient
// derived from primaryContact, not from the contact the rep selected. So a rep
// redirects a quote, reads the new chef's name back off the screen as
// confirmation, and the quote goes to the previous address.
//
// Acceptance as a sentence about a person: a rep who redirects a quote to a
// different contact sends it to THAT contact's address, not the one it used to
// go to. These tests verify the API PAYLOAD, because the rendered name is
// exactly what lies today.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { UserProvider } from '../contexts/UserContext';
import { resolveRecipientContact } from './ExportFinalizePage';

// ── Unit: the resolver follows the selection ────────────────────────────────
describe('resolveRecipientContact', () => {
  const A = { id: 'a', is_primary: true, email: 'a@x.com' };
  const B = { id: 'b', is_primary: false, email: 'b@x.com' };

  it('defaults to the primary when every contact is selected (no behavior change)', () => {
    expect(resolveRecipientContact([A, B], ['a', 'b'])?.id).toBe('a');
  });
  it('follows the selection when the primary is deselected', () => {
    expect(resolveRecipientContact([A, B], ['b'])?.id).toBe('b');
  });
  it('falls back to the primary/first before any selection exists', () => {
    expect(resolveRecipientContact([A, B], [])?.id).toBe('a');
  });
  it('returns null with no contacts', () => {
    expect(resolveRecipientContact([], ['x'])).toBeNull();
  });
});

// ── Integration: the SEND payload follows the swap ──────────────────────────
const { getQuote, sendQuote } = vi.hoisted(() => {
  const baseQuote: any = {
    id: 'quote-1',
    status: 'draft',
    quote_status_label: 'Draft',
    state: 'confirmed', // passes the rep-review gate so Send is enabled
    rep_reviewed_at: '2026-01-01T00:00:00Z',
    restaurant: 'Test Kitchen',
    rep: 'Rep Person',
    sent_at: null,
    total_cents: 0,
    total: '$0.00',
    created_at: '2026-01-01T00:00:00Z',
    contacts: [
      { id: 'contact-a', first_name: 'Anna', last_name: 'Primary', role: 'Chef', email: 'anna@rest-one.com', phone: '555-0001', is_primary: true },
      { id: 'contact-b', first_name: 'Ben', last_name: 'Second', role: 'Buyer', email: 'ben@rest-two.com', phone: '555-0002', is_primary: false },
    ],
    lines: [],
  };
  return {
    getQuote: vi.fn(async () => ({ data: { ...baseQuote } })),
    sendQuote: vi.fn(async () => ({ data: { ...baseQuote, status: 'sent' } })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return { ...actual, getQuote, sendQuote };
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

describe('ExportFinalizePage - send follows the selected contact (audit 1c)', () => {
  beforeEach(() => {
    localStorage.clear();
    getQuote.mockClear();
    sendQuote.mockClear();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('sends to the contact the rep selected, not the primary', async () => {
    renderPage();
    // Loaded (both contacts auto-selected -> recipient defaults to primary).
    await screen.findByTestId('edit-quote-details');

    // Redirect: open Edit, deselect the primary (Anna) so only Ben remains.
    fireEvent.click(screen.getByTestId('edit-quote-details'));
    const checkboxes = await screen.findAllByRole('checkbox');
    // Contact order mirrors the contacts array: [Anna(primary), Ben].
    fireEvent.click(checkboxes[0]); // uncheck Anna
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    // handleSaveEdit updates selectedContactIds in state (the recipient the
    // payload derives from) even though jsdom keeps the vaul drawer mounted;
    // hidden:true queries reach the send controls under the lingering overlay.

    // Send: open the email drawer, then send.
    fireEvent.click(screen.getByRole('button', { name: /email quote to chef/i, hidden: true }));
    fireEvent.click(await screen.findByRole('button', { name: /send email/i, hidden: true }));

    await waitFor(() => expect(sendQuote).toHaveBeenCalled());
    // Verify the PAYLOAD, not the rendered name: it must be Ben's address.
    const emailArg = (sendQuote.mock.calls[0] as any[])?.[1];
    expect(emailArg).toBe('ben@rest-two.com');
    expect(emailArg).not.toBe('anna@rest-one.com');
  });
});
