// RepTabletLinkControl: Send tablet link (Email / Text) on the QM admin
// distributor reps table, with last sent and signed in until dates.
//
// Coverage:
//   1. Email posts { rep_id: user_id, via: email } and reports it sent
//   2. Text posts via sms
//   3. SMS_NOT_CONFIGURED shows the server's message (and refetches, the link was written)
//   4. NO_PHONE shows the server's message
//   5. shows last sent and signed in until dates, or Never sent / Not signed in
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { sendRepTabletLink } = vi.hoisted(() => ({ sendRepTabletLink: vi.fn() }));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, sendRepTabletLink };
});

import { RepTabletLinkControl } from './RepTabletLinkControl';

const rep = {
  user_id: 'u-lexi',
  name: 'Lexi One',
  tablet_link_last_sent_at: '2026-10-20T18:00:00Z',
  signed_in_until: '2026-11-25T18:00:00Z',
};

describe('RepTabletLinkControl', () => {
  beforeEach(() => {
    sendRepTabletLink.mockReset();
  });
  afterEach(() => cleanup());

  it('emails the link for the rep user id and says it was sent', async () => {
    sendRepTabletLink.mockResolvedValue({ data: { link_id: 'l1', via: 'email', expires_at: '2026-11-05T18:00:00Z' } });
    const onSent = vi.fn();
    render(<RepTabletLinkControl rep={rep} onSent={onSent} />);
    fireEvent.click(screen.getByRole('button', { name: 'Email Lexi One their tablet link' }));
    await waitFor(() => expect(screen.getByText('Sent by email.')).toBeTruthy());
    expect(sendRepTabletLink).toHaveBeenCalledTimes(1);
    expect(sendRepTabletLink).toHaveBeenCalledWith('u-lexi', 'email');
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it('texts the link with via sms', async () => {
    sendRepTabletLink.mockResolvedValue({ data: { link_id: 'l2', via: 'sms', expires_at: '2026-11-05T18:00:00Z' } });
    render(<RepTabletLinkControl rep={rep} />);
    fireEvent.click(screen.getByRole('button', { name: 'Text Lexi One their tablet link' }));
    await waitFor(() => expect(screen.getByText('Sent by text.')).toBeTruthy());
    expect(sendRepTabletLink).toHaveBeenCalledWith('u-lexi', 'sms');
  });

  it("shows the server's message on SMS_NOT_CONFIGURED", async () => {
    sendRepTabletLink.mockResolvedValue({
      error: 'Text messages are not set up yet. Send the link by email instead.',
      error_code: 'SMS_NOT_CONFIGURED',
      status: 422,
    });
    const onSent = vi.fn();
    render(<RepTabletLinkControl rep={rep} onSent={onSent} />);
    fireEvent.click(screen.getByRole('button', { name: 'Text Lexi One their tablet link' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Text messages are not set up yet. Send the link by email instead.');
    expect(screen.queryByText('Sent by text.')).toBeNull();
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it("shows the server's message on NO_PHONE", async () => {
    sendRepTabletLink.mockResolvedValue({
      error: 'This rep has no phone number on file.',
      error_code: 'NO_PHONE',
      status: 422,
    });
    const onSent = vi.fn();
    render(<RepTabletLinkControl rep={rep} onSent={onSent} />);
    fireEvent.click(screen.getByRole('button', { name: 'Text Lexi One their tablet link' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('This rep has no phone number on file.');
    expect(onSent).not.toHaveBeenCalled();
  });

  it('shows last sent and signed in until dates', () => {
    render(<RepTabletLinkControl rep={rep} />);
    expect(screen.getByText(/Last sent Oct 20, 2026/)).toBeTruthy();
    expect(screen.getByText(/Signed in until Nov 25, 2026/)).toBeTruthy();
  });

  it('says Never sent and Not signed in when there are no dates', () => {
    render(<RepTabletLinkControl rep={{ user_id: 'u2', name: 'Sam Two', tablet_link_last_sent_at: null, signed_in_until: null }} />);
    expect(screen.getByText(/Never sent/)).toBeTruthy();
    expect(screen.getByText(/Not signed in/)).toBeTruthy();
  });
});
