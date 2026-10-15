// The launch checklist on the QM admin restaurant page (Moose, 2026-10-15:
// "checkboxes for each resource, that triggers the creation, send, cc me, and
// confirmation in the admin"). The backend half is pinned by QuoteMe's
// restaurant_onboarding_spec.rb; this pins what the page shows and calls.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({
  getRestaurantOnboarding: vi.fn(),
  setRestaurantOnboardingStep: vi.fn(),
  sendRestaurantOnboardingDocument: vi.fn(),
  downloadRestaurantOnboardingDocument: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { LaunchChecklistSection } from './_launchChecklistSection';

const KEYS = ['qr_inserts', 'cheat_sheet', 'wine_workbook', 'tablet_setup', 'staff_meeting', 'qr_on_menus', 'first_guest', 'first_staff_pairing'];
const LABELS = ['QR inserts', 'Cheat sheet', 'Wine workbook', 'Tablet setup', 'Staff meeting', 'Menus done', 'First guest', 'First server'];
const ICONS = ['qr-code', 'clipboard-list', 'book-open', 'tablet', 'users', 'menu-square', 'wine', 'user-check'];

function step(i: number, extra: Record<string, unknown> = {}) {
  return {
    key: KEYS[i], position: i + 1, title: LABELS[i], description: `What done means for ${LABELS[i]}.`, icon: ICONS[i], document: i < 4, done: false, done_at: null, done_by: null,
    note: null, sent_to: null, cc: null, layout: null, ...extra,
  };
}
function checklist(over: Record<string, unknown> = {}, steps = KEYS.map((_, i) => step(i))) {
  return { percent: 0, paired: true, recipient: { email: 'alexa@example.com', name: 'Alexa', blocked: null }, steps, ...over };
}

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

async function renderWith(data: unknown) {
  m.getRestaurantOnboarding.mockResolvedValue({ data });
  render(<LaunchChecklistSection restaurantId="r1" />);
  await screen.findByTestId('launch-percent');
}

describe('Launch checklist section', () => {
  it('shows the eight steps in order and the percent from the server', async () => {
    await renderWith(checklist({ percent: 37 }));
    expect(screen.getByTestId('launch-percent')).toHaveTextContent('37% done');
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.map((b) => b.getAttribute('aria-label'))).toEqual(LABELS.map((l, i) => `${i + 1}. ${l}`));
    expect(m.getRestaurantOnboarding).toHaveBeenCalledWith('r1');
  });

  it('shows each step\'s title, description and icon from the server', async () => {
    await renderWith(checklist());
    KEYS.forEach((k, i) => {
      const row = screen.getByTestId(`launch-step-${k}`);
      expect(row).toHaveTextContent(`${i + 1}. ${LABELS[i]}`);
      expect(row).toHaveTextContent(`What done means for ${LABELS[i]}.`);
      const icon = within(row).getByTestId(`launch-icon-${k}`);
      expect(icon).toHaveAttribute('data-icon', ICONS[i]);
      expect(icon.tagName.toLowerCase()).toBe('svg');
      expect(icon.getAttribute('class')).toContain(`lucide-${ICONS[i] === 'menu-square' ? 'square-menu' : ICONS[i]}`);
    });
  });

  it('offers Download and Send to the admin on steps 1 to 4 only, with a layout choice on the QR inserts', async () => {
    await renderWith(checklist());
    KEYS.forEach((k, i) => {
      const row = screen.getByTestId(`launch-step-${k}`);
      const send = within(row).queryByRole('button', { name: 'Send to alexa@example.com' });
      const dl = within(row).queryByRole('button', { name: 'Download' });
      if (i < 4) { expect(send).not.toBeNull(); expect(dl).not.toBeNull(); } else { expect(send).toBeNull(); expect(dl).toBeNull(); }
    });
    expect(within(screen.getByTestId('launch-step-qr_inserts')).getByLabelText('QR insert layout')).toBeInTheDocument();
    expect(within(screen.getByTestId('launch-step-cheat_sheet')).queryByLabelText('QR insert layout')).toBeNull();
  });

  it('asks before sending, sends the chosen layout, and then shows who it went to', async () => {
    await renderWith(checklist());
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const sent = checklist({ percent: 12 }, KEYS.map((_, i) => (i === 0
      ? step(0, { done: true, done_at: '2026-10-15T18:00:00Z', done_by: 'Moose M', sent_to: 'alexa@example.com', cc: 'moose@example.com', layout: 'horizontal' })
      : step(i))));
    m.sendRestaurantOnboardingDocument.mockResolvedValue({ data: sent });

    const row = screen.getByTestId('launch-step-qr_inserts');
    fireEvent.change(within(row).getByLabelText('QR insert layout'), { target: { value: 'horizontal' } });
    fireEvent.click(within(row).getByRole('button', { name: 'Send to alexa@example.com' }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('alexa@example.com'));
    await waitFor(() => expect(m.sendRestaurantOnboardingDocument).toHaveBeenCalledWith('r1', 'qr_inserts', 'horizontal'));
    const done = await screen.findByTestId('launch-done-qr_inserts');
    expect(done).toHaveTextContent('Sent Oct 15, 2026 to alexa@example.com, cc moose@example.com (horizontal) by Moose M');
    expect(screen.getByTestId('launch-percent')).toHaveTextContent('12% done');
  });

  it('sends nothing when the confirmation is declined', async () => {
    await renderWith(checklist());
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(within(screen.getByTestId('launch-step-cheat_sheet')).getByRole('button', { name: 'Send to alexa@example.com' }));
    expect(m.sendRestaurantOnboardingDocument).not.toHaveBeenCalled();
  });

  it('ticks a manual step with its note, and shows who and when', async () => {
    await renderWith(checklist());
    m.setRestaurantOnboardingStep.mockResolvedValue({
      data: checklist({ percent: 12 }, KEYS.map((_, i) => (i === 4 ? step(4, { done: true, done_at: '2026-10-16T15:00:00Z', done_by: 'Moose M', note: 'All servers' }) : step(i)))),
    });
    fireEvent.change(screen.getByLabelText('Note for Staff meeting'), { target: { value: 'All servers' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '5. Staff meeting' }));
    await waitFor(() => expect(m.setRestaurantOnboardingStep).toHaveBeenCalledWith('r1', 'staff_meeting', true, 'All servers'));
    expect(await screen.findByTestId('launch-done-staff_meeting')).toHaveTextContent('Done Oct 16, 2026 by Moose M');
    expect(screen.getByText('All servers')).toBeInTheDocument();
  });

  it('unticks a done step', async () => {
    await renderWith(checklist({ percent: 12 }, KEYS.map((_, i) => (i === 5 ? step(5, { done: true, done_at: '2026-10-16T15:00:00Z' }) : step(i)))));
    m.setRestaurantOnboardingStep.mockResolvedValue({ data: checklist() });
    fireEvent.click(screen.getByRole('checkbox', { name: '6. Menus done' }));
    await waitFor(() => expect(m.setRestaurantOnboardingStep).toHaveBeenCalledWith('r1', 'qr_on_menus', false, undefined));
  });

  it('disables Send and says why when the admin is the blank sign-in account', async () => {
    await renderWith(checklist({ recipient: { email: null, name: null, blocked: 'The restaurant admin is the blank sign-in account.' } }));
    expect(screen.getByTestId('launch-send-blocked')).toHaveTextContent('blank sign-in account');
    within(screen.getByTestId('launch-step-tablet_setup')).getAllByRole('button').forEach((b) => {
      if (b.textContent?.startsWith('Send')) expect(b).toBeDisabled();
    });
  });

  it('disables Download and Send until the restaurant is paired', async () => {
    await renderWith(checklist({ paired: false }));
    expect(screen.getByTestId('launch-send-blocked')).toHaveTextContent('Not paired yet');
    const row = screen.getByTestId('launch-step-cheat_sheet');
    expect(within(row).getByRole('button', { name: 'Download' })).toBeDisabled();
    expect(within(row).getByRole('button', { name: 'Send to alexa@example.com' })).toBeDisabled();
  });

  it('shows the server refusal when a send is refused', async () => {
    await renderWith(checklist());
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    m.sendRestaurantOnboardingDocument.mockResolvedValue({ error: 'This restaurant is not paired yet, so there is nothing to print.' });
    fireEvent.click(within(screen.getByTestId('launch-step-wine_workbook')).getByRole('button', { name: 'Send to alexa@example.com' }));
    expect(await screen.findByText('This restaurant is not paired yet, so there is nothing to print.')).toBeInTheDocument();
  });
});
