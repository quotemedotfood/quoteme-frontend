// ChefPairingsPage.render.test.tsx
//
// The restaurant's view of what its tables were shown (PairMe 1a). The API is
// mocked; the backend half is pinned by QuoteMe's
// spec/requests/api/v1/chef/pairme_presentations_spec.rb.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

const { getChefPairmePresentations, updateChefPairmePresentation, payload } = vi.hoisted(() => {
  const payload: any = {
    restaurant: { id: 'r-aq', name: 'Aquitaine Boston' },
    time_zone: 'America/New_York',
    menu: {
      dishes: [
        { dish_id: 'aq-d-1', dish: 'STEAK FRITES AQUITAINE', course: 'Entree' },
        { dish_id: 'aq-d-2', dish: 'FRENCH ONION SOUP', course: 'Appetizers' },
      ],
      wines: [
        { wine_id: 'aq-w-1', producer: 'Trapet', wine: 'Bourgogne', list: 'Burgundy', glass_cents: 1600, bottle_cents: 6400 },
        { wine_id: 'aq-w-2', producer: 'Krug', wine: 'Grande Cuvee', list: 'wine_list', glass_cents: null, bottle_cents: 32000 },
      ],
    },
    presentations: [{
      id: 'p-1', presented_at: '2026-09-30T00:40:00Z', local_date: '2026-09-29', local_time: '20:40',
      ticket_ref: null, diner_name: null,
      dishes: [{ dish_id: 'aq-d-1', dish: 'STEAK FRITES AQUITAINE' }],
      wines: [{ wine_id: 'aq-w-1', producer: 'Trapet', wine: 'Bourgogne', list: 'Burgundy', unit: 'glass', price_cents: 1600 }],
      added_dishes: [], added_wines: [], edited_at: null,
    }],
  };
  return {
    payload,
    getChefPairmePresentations: vi.fn(async () => ({ data: payload })),
    updateChefPairmePresentation: vi.fn(async () => ({ data: { presentation: { ...payload.presentations[0] } } })),
  };
});

vi.mock('../../services/api', () => ({ getChefPairmePresentations, updateChefPairmePresentation }));

import { ChefPairingsPage, wineLine } from './ChefPairingsPage';

beforeEach(() => { getChefPairmePresentations.mockClear(); updateChefPairmePresentation.mockClear(); });
afterEach(() => cleanup());

describe('ChefPairingsPage', () => {
  it('shows the time, ticket, diner, dishes and wines presented, never a bare price', async () => {
    render(<ChefPairingsPage />);
    const row = await screen.findByTestId('pairings-row');
    expect(row).toHaveTextContent('2026-09-29 20:40');
    expect(row).toHaveTextContent('Not set');
    expect(row).toHaveTextContent('Guest');
    expect(row).toHaveTextContent('STEAK FRITES AQUITAINE');
    expect(row).toHaveTextContent('Trapet Bourgogne · Burgundy · $16 glass');
  });

  it('says so when no table has been shown wines yet', async () => {
    getChefPairmePresentations.mockResolvedValueOnce({ data: { ...payload, presentations: [] } } as any);
    render(<ChefPairingsPage />);
    expect(await screen.findByTestId('pairings-empty')).toHaveTextContent('No tables yet');
  });

  it('asks a chef with several restaurants which one, then loads that one', async () => {
    getChefPairmePresentations.mockResolvedValueOnce({
      error: 'Select a restaurant', status: 422,
      error_data: { error_code: 'RESTAURANT_CONTEXT_REQUIRED', restaurants: [{ id: 'r-aq', name: 'Aquitaine Boston' }, { id: 'r-mt', name: 'Metropolis' }] },
    } as any);
    render(<ChefPairingsPage />);
    const picker = await screen.findByTestId('pairings-restaurant-picker');
    fireEvent.click(within(picker).getByRole('button', { name: 'Metropolis' }));
    await waitFor(() => expect(getChefPairmePresentations).toHaveBeenLastCalledWith('r-mt'));
  });

  it('offers only the units the list prices, and saves the ticket and additions by id', async () => {
    render(<ChefPairingsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const drawer = await screen.findByTestId('pairings-edit-drawer');
    fireEvent.change(within(drawer).getByLabelText('Ticket or table number'), { target: { value: 'T-14' } });
    fireEvent.click(within(drawer).getByLabelText(/FRENCH ONION SOUP/));
    // The diner's own dish is shown, checked, and cannot be unticked here.
    expect(within(drawer).getByLabelText(/STEAK FRITES AQUITAINE \(from the diner\)/)).toBeDisabled();

    fireEvent.change(within(drawer).getByLabelText('Add a wine from your list'), { target: { value: 'aq-w-2' } });
    // Krug has no glass price on this list: no glass button.
    expect(within(drawer).queryByRole('button', { name: /Add glass/ })).toBeNull();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Add bottle, $320' }));
    expect(drawer).toHaveTextContent('Krug Grande Cuvee · wine_list · $320 bottle');

    fireEvent.click(within(drawer).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateChefPairmePresentation).toHaveBeenCalledWith(
      'p-1',
      { ticket_ref: 'T-14', added_dish_ids: ['aq-d-2'], added_wines: [{ wine_id: 'aq-w-2', unit: 'bottle' }] },
      'r-aq',
    ));
  });

  it('names a wine with no printed price as such, never as a number', () => {
    expect(wineLine({ wine_id: 'x', producer: 'House', wine: 'Red', list: null, unit: 'bottle', price_cents: null }))
      .toBe('House Red · bottle, no printed price');
  });
});
