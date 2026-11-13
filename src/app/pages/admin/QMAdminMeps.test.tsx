// The QM admin MEPs list: name, email, last sign-in, and the one button
// that emails a sign-in link. Nothing is sent until the admin confirms.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  getAdminMeps: vi.fn(),
  sendMepSignInLink: vi.fn(),
  getAdminMepStars: vi.fn(),
  viewAsMep: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { QMAdminMeps, lastSignInLabel } from './QMAdminMeps';

afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); });

const kirk = { id: 'm1', name: 'Kirk Jorgensen', email: 'kirk@example.com', status: 'active', last_login_at: null };

describe('QMAdminMeps', () => {
  it('lists meps with Never for one who has not signed in', async () => {
    m.getAdminMeps.mockResolvedValue({ data: [kirk] });
    render(<QMAdminMeps />);
    expect(await screen.findByText('Kirk Jorgensen')).toBeTruthy();
    expect(screen.getByText('kirk@example.com')).toBeTruthy();
    expect(screen.getByText('Never')).toBeTruthy();
  });

  it('sends nothing when the admin cancels, and sends once when they confirm', async () => {
    m.getAdminMeps.mockResolvedValue({ data: [kirk] });
    m.sendMepSignInLink.mockResolvedValue({ data: { sent: true, email: 'kirk@example.com', expires_at: 'x' } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<QMAdminMeps />);
    const button = await screen.findByRole('button', { name: /send sign-in link/i });

    fireEvent.click(button);
    expect(m.sendMepSignInLink).not.toHaveBeenCalled();

    fireEvent.click(button);
    await waitFor(() => expect(m.sendMepSignInLink).toHaveBeenCalledTimes(1));
    expect(m.sendMepSignInLink).toHaveBeenCalledWith('m1');
    expect(await screen.findByText('Sent to kirk@example.com')).toBeTruthy();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('labels a missing or bad date as Never', () => {
    expect(lastSignInLabel(null)).toBe('Never');
    expect(lastSignInLabel('not a date')).toBe('Never');
  });

  it("S1 shows an MEP's starred accounts when the admin opens them, and hides them again", async () => {
    m.getAdminMeps.mockResolvedValue({ data: [kirk] });
    m.getAdminMepStars.mockResolvedValue({ data: [
      { account_type: 'hotel', id: 'h1', name: 'The Crawford', city: 'Denver', state: 'CO', starred_at: '2026-11-13T18:00:00Z' },
      { account_type: 'restaurant_group', id: 'g1', name: 'Bonanno Concepts', city: null, state: null, starred_at: '2026-11-13T17:00:00Z' },
    ] });
    render(<QMAdminMeps />);
    fireEvent.click(await screen.findByRole('button', { name: /show stars/i }));
    await waitFor(() => expect(m.getAdminMepStars).toHaveBeenCalledWith('m1'));
    const box = await screen.findByTestId('mep-stars');
    await waitFor(() => expect(box.textContent).toContain('The Crawford'));
    expect(box.textContent).toContain('Hotel · Denver, CO');
    expect(box.textContent).toContain('Bonanno Concepts · Restaurant group');

    fireEvent.click(screen.getByRole('button', { name: /hide stars/i }));
    expect(screen.queryByTestId('mep-stars')).toBeNull();
  });

  it('S1 says so when the MEP has no stars', async () => {
    m.getAdminMeps.mockResolvedValue({ data: [kirk] });
    m.getAdminMepStars.mockResolvedValue({ data: [] });
    render(<QMAdminMeps />);
    fireEvent.click(await screen.findByRole('button', { name: /show stars/i }));
    expect(await screen.findByText('No stars yet.')).toBeTruthy();
  });

  it("V1 View as keeps the one-hour token under the MEP key only and opens /mep", async () => {
    m.getAdminMeps.mockResolvedValue({ data: [kirk] });
    m.viewAsMep.mockResolvedValue({ data: { token: 'view-token', expires_at: 'x', mep: { id: 'm1', name: 'Kirk Jorgensen' } } });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    localStorage.setItem('quoteme_token', 'admin-token');
    localStorage.setItem('quoteme_mep_session', 'old-session');
    render(<QMAdminMeps />);
    fireEvent.click(await screen.findByRole('button', { name: 'View as Kirk Jorgensen' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('/mep', '_blank', 'noopener'));
    expect(m.viewAsMep).toHaveBeenCalledWith('m1');
    expect(localStorage.getItem('quoteme_mep_token')).toBe('view-token');
    expect(localStorage.getItem('quoteme_mep_session')).toBeNull();
    expect(localStorage.getItem('quoteme_token')).toBe('admin-token');
    localStorage.clear();
  });
});
