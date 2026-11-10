// The QM admin MEPs list: name, email, last sign-in, and the one button
// that emails a sign-in link. Nothing is sent until the admin confirms.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  getAdminMeps: vi.fn(),
  sendMepSignInLink: vi.fn(),
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
});
