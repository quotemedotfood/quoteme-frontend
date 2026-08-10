/**
 * Closing the operator loop: a diner at /t/:code reads the wines the venue
 * pushed (GET /v1/venues/:code/pairings), surfaced FIRST and DISCLOSED as
 * featured - never hidden, never at extra cost.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';
import { server } from './msw/server.js';
import { BASE_URL } from '../../src/lib/api.js';

describe('operator loop: diner reads pushed wines at /t/:code', () => {
  it('surfaces the venue-pushed wine on The Wine, disclosed as featured', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/venues/demo/pairings`, () =>
        HttpResponse.json({
          code: 'demo',
          confirmed: [],
          pushed: [{ dish: 'Moules en cassoulette', wine: 'Gimonnet, Blanc de Blancs Champagne' }],
        }),
      ),
    );
    const user = userEvent.setup();
    const { findByText, getByRole } = renderPairMeApp('/t/demo');

    // /t/demo lands on the Menu (dishes pre-picked); walk to The Wine.
    await user.click(await findByText('Pair it', { selector: 'button' }).catch(() => getByRole('button', { name: 'Pair it' })));
    await findByText('How do you want to drink?');
    await user.click(getByRole('button', { name: 'Show wine' }));
    await findByText('Your wine');

    // The featured block appears, disclosed, with the pushed wine.
    expect(screen.getByText('Featured by the venue')).toBeInTheDocument();
    expect(screen.getByText(/You are not paying more for the suggestion/i)).toBeInTheDocument();
    expect(screen.getByText('Gimonnet')).toBeInTheDocument();
  });
});
