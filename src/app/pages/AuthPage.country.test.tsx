// @vitest-environment jsdom
//
// AuthPage.country.test.tsx — P0-B: country selector + Canadian provinces +
// currency on distributor-admin signup.
//
// Real-render test (see QuoteReviewBar.render.test.tsx for the pattern this
// codebase adopted for "dead button" classes of bugs): drives the actual
// AuthPage component, not a reimplemented copy of its logic. Confirms:
//   1. Selecting Canada swaps the region chip-picker to provinces, including 'ON'.
//   2. The signup payload sent to the API includes country='CA' and currency='CAD'.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AuthProvider } from '../contexts/AuthContext';

const { signUp } = vi.hoisted(() => {
  return {
    signUp: vi.fn(async () => ({
      data: { message: 'ok', user: { id: 'user-1' } },
      token: 'mock.jwt.token',
    })),
  };
});

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    signUp,
    searchDistributors: vi.fn(async () => ({ data: [] })),
    getGuestToken: () => null,
  };
});

import { AuthPage } from './AuthPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/auth']}>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillRequiredDistributorFields() {
  fireEvent.click(screen.getByText("I'm a Distributor Admin"));

  fireEvent.change(screen.getByPlaceholderText('Start typing your distributor name...'), {
    target: { value: '100km Foods' },
  });
  fireEvent.change(screen.getByPlaceholderText('Jane'), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByPlaceholderText('Smith'), { target: { value: 'Smith' } });
  fireEvent.change(screen.getByPlaceholderText('jane@yourdistributor.com'), {
    target: { value: 'jane@100kmfoods.ca' },
  });
  fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), {
    target: { value: 'SecurePass123!' },
  });
  fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), {
    target: { value: 'SecurePass123!' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('AuthPage — country selector + Canadian provinces (P0-B)', () => {
  beforeEach(() => {
    localStorage.clear();
    signUp.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('defaults to US states, and selecting Canada swaps to provinces including ON', async () => {
    renderPage();
    fireEvent.click(screen.getByText("I'm a Distributor Admin"));

    // Default country is US - the region picker offers states, no provinces.
    const regionSelect = screen.getByText('Add a state...').closest('select') as HTMLSelectElement;
    expect(regionSelect).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'ON' })).not.toBeInTheDocument();

    // Switch country to Canada.
    const countrySelect = screen.getByLabelText('Country');
    fireEvent.change(countrySelect, { target: { value: 'CA' } });

    // Label flips to "Provinces you serve" and Ontario is now offered.
    expect(screen.getByText('Provinces you serve', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ON' })).toBeInTheDocument();
    // A US-only state code must not appear in the CA region list.
    expect(screen.queryByRole('option', { name: 'TX' })).not.toBeInTheDocument();
  });

  it('submits country=CA and currency=CAD for a Canadian distributor signup', async () => {
    renderPage();
    await fillRequiredDistributorFields();

    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'CA' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalled();
    });

    const payload = signUp.mock.calls[0][0];
    expect(payload.country).toBe('CA');
    expect(payload.currency).toBe('CAD');
  });

  it('submits country=US and currency=USD by default for a US distributor signup', async () => {
    renderPage();
    await fillRequiredDistributorFields();

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalled();
    });

    const payload = signUp.mock.calls[0][0];
    expect(payload.country).toBe('US');
    expect(payload.currency).toBe('USD');
  });
});
