// QM admin Wine Kinds (Moose Q85): each list shows its kinds, Add puts any
// kind into a list, Move and Clear change one, all by term id.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach, describe } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({ getWineFamiliarities: vi.fn(), setWineFamiliarity: vi.fn() }));
vi.mock('../../services/adminApi', () => m);

import { WineKindsTab } from './_wineKindsTab';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const term = (id: string, name: string, familiarity: string | null, wines = 1) =>
  ({ id, key: `grape:${name.toLowerCase()}`, kind: 'grape', name, familiarity, wines });

const TERMS = [
  term('t-cab', 'Cabernet Sauvignon', 'traditional', 435),
  term('t-franc', 'Cabernet Franc', 'adventurous', 10),
  term('t-wb', 'White Blend', null, 118),
];

function setup() {
  m.getWineFamiliarities.mockResolvedValue({ data: { terms: TERMS, familiarities: ['traditional', 'adventurous'] } });
  m.setWineFamiliarity.mockImplementation(async (id: string, f: string | null) =>
    ({ data: { term: { ...TERMS.find((t) => t.id === id)!, familiarity: f } } }));
  render(<WineKindsTab />);
}

const list = async (name: string) => screen.findByRole('region', { name });

describe('WineKindsTab', () => {
  it('WK1 puts each kind in its list, and an unset one under Not set', async () => {
    setup();
    expect(within(await list('Traditional')).getByText('Cabernet Sauvignon')).toBeTruthy();
    expect(within(await list('Adventurous')).getByText('Cabernet Franc')).toBeTruthy();
    expect(within(await list('Not set')).getByText('White Blend')).toBeTruthy();
    expect(within(await list('Traditional')).queryByText('Cabernet Franc')).toBeNull();
    expect(within(await list('Traditional')).queryByText('White Blend')).toBeNull();
    expect(within(await list('Adventurous')).queryByText('White Blend')).toBeNull();
  });

  it('WK2 Add in a list sends that flag by id and the kind moves there', async () => {
    setup();
    const trad = await list('Traditional');
    fireEvent.change(within(trad).getByLabelText('Add a kind to traditional'), { target: { value: 'white' } });
    fireEvent.click(within(trad).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(m.setWineFamiliarity).toHaveBeenCalledWith('t-wb', 'traditional'));
    await waitFor(() => expect(within(trad).getByText('White Blend')).toBeTruthy());
    expect(screen.queryByRole('region', { name: 'Not set' })).toBeNull();
  });

  it('WK3 Add search leaves out kinds already in that list', async () => {
    setup();
    const adv = await list('Adventurous');
    fireEvent.change(within(adv).getByLabelText('Add a kind to adventurous'), { target: { value: 'cabernet' } });
    const adds = within(adv).getAllByRole('button', { name: 'Add' });
    expect(adds).toHaveLength(1);
    expect(adds[0].closest('li')!.textContent).toContain('Cabernet Sauvignon');
  });

  it('WK4 Move and Clear send the other flag, or none', async () => {
    setup();
    fireEvent.click(within(await list('Adventurous')).getByRole('button', { name: 'Move to traditional' }));
    await waitFor(() => expect(m.setWineFamiliarity).toHaveBeenCalledWith('t-franc', 'traditional'));
    fireEvent.click(within(await list('Traditional')).getAllByRole('button', { name: 'Clear' })[0]);
    await waitFor(() => expect(m.setWineFamiliarity).toHaveBeenLastCalledWith('t-cab', null));
  });

  it('WK5 a refused change shows the error and leaves the lists as they were', async () => {
    setup();
    m.setWineFamiliarity.mockResolvedValueOnce({ error: 'Familiarity is traditional or adventurous' });
    fireEvent.click(within(await list('Not set')).getByRole('button', { name: 'Adventurous' }));
    expect((await screen.findByRole('alert')).textContent).toContain('traditional or adventurous');
    expect(within(await list('Not set')).getByText('White Blend')).toBeTruthy();
  });
});
