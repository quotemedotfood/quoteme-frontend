// @vitest-environment jsdom
//
// ChefWelcomePage.refusal.test.tsx: coverage for the refusal-page rework
// (2026-07-29, Justin's dead-end ruling - "a dead end is not an error
// state, it is a lost sale"). The expired-link screen must give the chef a
// live path forward instead of the old generic dead end:
//
//   1. Rep name/email/phone, distributor name, and quote reference render
//      whenever the consume response actually carries them.
//   2. The "Request a new link" button walks idle -> loading -> success on
//      a mocked successful requestNewChefMagicLink call.
//   3. On a failed call, the button falls back gracefully - the rep's
//      mailto/tel links stay visible and usable, nothing dead-ends.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthProvider } from '../../contexts/AuthContext';
import { UserProvider } from '../../contexts/UserContext';

// vi.mock factories are hoisted above imports, so any values they reference
// must go through vi.hoisted rather than plain top-level consts.
const { consumeChefMagicLink, requestNewChefMagicLink, getCurrentUser } = vi.hoisted(() => {
  return {
    consumeChefMagicLink: vi.fn(),
    requestNewChefMagicLink: vi.fn(),
    getCurrentUser: vi.fn(async () => ({ data: undefined })),
  };
});

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    consumeChefMagicLink,
    requestNewChefMagicLink,
    getCurrentUser,
  };
});

import { ChefWelcomePage } from './ChefWelcomePage';

const MOCK_REP = { name: 'Marcus Lee', email: 'marcus@altamira.com', phone: '555-201-9982' };
const MOCK_DISTRIBUTOR = { name: 'Altamira Foods' };
const MOCK_QUOTE_REFERENCE = 'Q-ABCDEF12';

function renderExpiredPage() {
  return render(
    <MemoryRouter initialEntries={['/chef/welcome?token=expired-token-xyz']}>
      <AuthProvider>
        <UserProvider>
          <Routes>
            <Route path="/chef/welcome" element={<ChefWelcomePage />} />
          </Routes>
        </UserProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ChefWelcomePage refusal page: rep/distributor/quote-reference rendering', () => {
  beforeEach(() => {
    localStorage.clear();
    consumeChefMagicLink.mockClear();
    requestNewChefMagicLink.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders rep name, mailto href, tel href, distributor name, and quote reference when the consume response carries them', async () => {
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'expired',
      error_code: 'expired',
      message: 'This link has expired. Ask your rep to resend.',
      rep: MOCK_REP,
      distributor: MOCK_DISTRIBUTOR,
      quote_reference: MOCK_QUOTE_REFERENCE,
      data: undefined,
    });

    renderExpiredPage();

    await waitFor(() => {
      expect(screen.getByText('This link has expired.')).toBeInTheDocument();
    });

    expect(screen.getByText(MOCK_REP.name)).toBeInTheDocument();
    expect(screen.getByText(MOCK_DISTRIBUTOR.name)).toBeInTheDocument();
    expect(screen.getByText(`Quote ${MOCK_QUOTE_REFERENCE}`)).toBeInTheDocument();

    const mailtoLink = screen.getByText(MOCK_REP.email).closest('a');
    expect(mailtoLink).toHaveAttribute('href', `mailto:${MOCK_REP.email}`);

    const telLink = screen.getByText(MOCK_REP.phone).closest('a');
    expect(telLink).toHaveAttribute('href', `tel:${MOCK_REP.phone}`);
  });

  it('does not render the context card at all when the consume response carries no rep/distributor/quote data (current BE behavior)', async () => {
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'expired',
      error_code: 'expired',
      message: 'This link has expired. Ask your rep to resend.',
      data: undefined,
    });

    renderExpiredPage();

    await waitFor(() => {
      expect(screen.getByText('This link has expired.')).toBeInTheDocument();
    });

    expect(screen.queryByText(/^Quote Q-/)).not.toBeInTheDocument();
    // The generic support fallback must still be present - never a dead end.
    expect(screen.getByText('Email us for a fresh link')).toBeInTheDocument();
  });
});

describe('ChefWelcomePage refusal page: Request a new link button states', () => {
  beforeEach(() => {
    localStorage.clear();
    consumeChefMagicLink.mockClear();
    requestNewChefMagicLink.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('walks idle -> loading -> success on a mocked successful call', async () => {
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'expired',
      error_code: 'expired',
      rep: MOCK_REP,
      distributor: MOCK_DISTRIBUTOR,
      quote_reference: MOCK_QUOTE_REFERENCE,
      data: undefined,
    });

    let resolveRequest: (value: unknown) => void = () => {};
    requestNewChefMagicLink.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    renderExpiredPage();

    const button = await screen.findByRole('button', { name: 'Request a new link' });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    // loading state
    await waitFor(() => {
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });
    expect(screen.getByRole('button')).toBeDisabled();

    // resolve the mocked call -> success state
    resolveRequest({ data: { success: true }, error: undefined });

    await waitFor(() => {
      expect(
        screen.getByText('Your rep has been notified, a fresh link is on the way'),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('button')).toBeDisabled();
    expect(requestNewChefMagicLink).toHaveBeenCalledTimes(1);
    expect(requestNewChefMagicLink).toHaveBeenCalledWith('expired-token-xyz');
  });

  it('falls back gracefully on a mocked failed call: rep contact stays visible and an inline message appears, nothing dead-ends', async () => {
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'expired',
      error_code: 'expired',
      rep: MOCK_REP,
      distributor: MOCK_DISTRIBUTOR,
      quote_reference: MOCK_QUOTE_REFERENCE,
      data: undefined,
    });

    requestNewChefMagicLink.mockResolvedValueOnce({
      error: 'network_error',
      data: undefined,
    });

    renderExpiredPage();

    const button = await screen.findByRole('button', { name: 'Request a new link' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText('Could not reach your rep automatically. Use the contact info above.'),
      ).toBeInTheDocument();
    });

    // The rep contact links must still be visible and usable as the fallback path.
    const mailtoLink = screen.getByText(MOCK_REP.email).closest('a');
    expect(mailtoLink).toHaveAttribute('href', `mailto:${MOCK_REP.email}`);
    const telLink = screen.getByText(MOCK_REP.phone).closest('a');
    expect(telLink).toHaveAttribute('href', `tel:${MOCK_REP.phone}`);

    // The button is re-enabled for a retry - never a dead end.
    expect(screen.getByRole('button', { name: 'Request a new link' })).not.toBeDisabled();
  });

  it('falls back to the generic support message on error when no rep contact is available at all', async () => {
    consumeChefMagicLink.mockResolvedValueOnce({
      error: 'expired',
      error_code: 'expired',
      data: undefined,
    });

    requestNewChefMagicLink.mockResolvedValueOnce({
      error: 'network_error',
      data: undefined,
    });

    renderExpiredPage();

    const button = await screen.findByRole('button', { name: 'Request a new link' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText('Could not reach your rep automatically. Email us below and we will get you a fresh link.'),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Email us for a fresh link')).toBeInTheDocument();
  });
});
