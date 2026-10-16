// The page a restaurant group's payer lands on after Stripe Checkout. It is
// public: the payer has no QuoteMe sign-in (Moose, 2026-10-15: "'Let's get
// pairing' pop up then wherever").
//
// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { PairmeGroupPaidPage } from './PairmeGroupPaidPage';

afterEach(() => cleanup());

// No AuthProvider here on purpose: the page must render for someone who is
// not signed in.
function renderAt(url: string) {
  render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/pairme/paid" element={<PairmeGroupPaidPage />} /></Routes></MemoryRouter>);
}

it("says Let's get pairing after paying, and links on to sign-in", () => {
  renderAt('/pairme/paid');
  expect(screen.getByRole('heading').textContent).toBe("Let's get pairing");
  expect(screen.getByText('Sign in to your restaurant').getAttribute('href')).toBe('/auth');
});

it('says nothing was charged when the payer backed out', () => {
  renderAt('/pairme/paid?canceled=1');
  expect(screen.getByRole('heading').textContent).toBe('No payment was made');
  expect(screen.queryByText("Let's get pairing")).toBeNull();
});
