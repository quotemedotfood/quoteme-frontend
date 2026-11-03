// SEND PAIRME INFO, the two optional fields of Moose's 2026-11-03 copy: the
// chef's name and the target go-live date (shown filled with 14 days from
// today). Each reaches the server only when the QM admin fills or changes it.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({ sendPairmeInfo: vi.fn() }));
vi.mock('../../services/adminApi', () => ({ sendPairmeInfo: m.sendPairmeInfo }));

import { SendPairmeInfo, defaultGoLive, GO_LIVE_DEFAULT_DAYS } from './_sendPairmeInfo';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const contacts = [{ id: 'c-holly', first_name: 'Holly', last_name: 'Gm', email: 'holly@ultreia.example' }];

function openAndPick() {
  m.sendPairmeInfo.mockResolvedValue({ data: { recipient_email: 'holly@ultreia.example' } });
  render(<SendPairmeInfo restaurantId="r1" contacts={contacts} />);
  fireEvent.click(screen.getByText('Send PairMe info'));
  fireEvent.click(screen.getAllByRole('radio')[0]);
  fireEvent.change(screen.getByLabelText('Contact'), { target: { value: 'c-holly' } });
}

describe('Send PairMe info: chef name and go-live', () => {
  it('defaults go-live to 14 days from today', () => {
    expect(GO_LIVE_DEFAULT_DAYS).toBe(14);
    expect(defaultGoLive(new Date(2026, 10, 3))).toBe('2026-11-17');
    expect(defaultGoLive(new Date(2026, 11, 25))).toBe('2027-01-08');
    openAndPick();
    expect((screen.getByLabelText('Target go-live') as HTMLInputElement).value).toBe(defaultGoLive());
  });

  it('sends neither field when left alone', async () => {
    openAndPick();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(m.sendPairmeInfo).toHaveBeenCalledWith('r1', { restaurant_contact_id: 'c-holly' }));
  });

  it('sends the chef name and a changed go-live date', async () => {
    openAndPick();
    fireEvent.change(screen.getByLabelText("Chef's name"), { target: { value: ' Sam Ortiz ' } });
    fireEvent.change(screen.getByLabelText('Target go-live'), { target: { value: '2027-02-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(m.sendPairmeInfo).toHaveBeenCalledWith('r1', { restaurant_contact_id: 'c-holly', chef_name: 'Sam Ortiz', go_live_on: '2027-02-01' })
    );
  });
});
