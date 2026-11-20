// The manager link card: texts the number typed, shows the link and what the
// store's PIN means for the manager, clears the number, and shows a refusal.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const m = vi.hoisted(() => ({ textAdminStoreLink: vi.fn() }));
vi.mock('../../services/adminApi', () => m);

import { StoreLinkCard } from './_storeLinkCard';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('StoreLinkCard', () => {
  it('texts the typed number and says what the PIN means', async () => {
    render(<StoreLinkCard storeId="s1" card="" heading="" />);
    const btn = screen.getByRole('button', { name: 'Text the link' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    const box = screen.getByLabelText("Manager's mobile number") as HTMLInputElement;
    fireEvent.change(box, { target: { value: ' (720) 555-0142 ' } });

    m.textAdminStoreLink.mockResolvedValueOnce({ data: { sent: true, url: 'https://app.pairme.wine/store/total-bev', pin: 'standard' } });
    fireEvent.click(btn);
    const sent = await screen.findByTestId('store-link-sent');
    expect(m.textAdminStoreLink).toHaveBeenCalledWith('s1', '(720) 555-0142');
    expect(sent.textContent).toContain('https://app.pairme.wine/store/total-bev');
    expect(sent.textContent).toContain('still the standard one');
    expect(box.value).toBe('');
  });

  it('shows a refusal and keeps the number', async () => {
    render(<StoreLinkCard storeId="s1" card="" heading="" />);
    const box = screen.getByLabelText("Manager's mobile number") as HTMLInputElement;
    fireEvent.change(box, { target: { value: '555-0142' } });
    m.textAdminStoreLink.mockResolvedValueOnce({ error: 'Type a US mobile number.' });
    fireEvent.click(screen.getByRole('button', { name: 'Text the link' }));
    expect((await screen.findByRole('alert')).textContent).toContain('US mobile number');
    expect(box.value).toBe('555-0142');
    expect(screen.queryByTestId('store-link-sent')).toBeNull();
  });

  it('puts the PIN in only when the box is ticked, then turns the option off again', async () => {
    render(<StoreLinkCard storeId="s1" card="" heading="" />);
    const box = screen.getByLabelText("Manager's mobile number") as HTMLInputElement;
    const btn = screen.getByRole('button', { name: 'Text the link' }) as HTMLButtonElement;
    const option = screen.getByRole('checkbox', { name: 'Put the PIN in the text' }) as HTMLInputElement;
    expect(option.checked).toBe(false);
    expect(screen.queryByLabelText("Store's staff PIN")).toBeNull();

    fireEvent.change(box, { target: { value: '720-555-0142' } });
    fireEvent.click(option);
    expect(btn.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Store's staff PIN"), { target: { value: ' 0482 ' } });
    expect(btn.disabled).toBe(false);

    m.textAdminStoreLink.mockResolvedValueOnce({ data: { sent: true, url: 'https://app.pairme.wine/store/total-bev', pin: 'own' } });
    fireEvent.click(btn);
    await screen.findByTestId('store-link-sent');
    expect(m.textAdminStoreLink).toHaveBeenCalledWith('s1', '720-555-0142', '0482');
    expect(option.checked).toBe(false);
    expect(screen.queryByLabelText("Store's staff PIN")).toBeNull();
  });
});
