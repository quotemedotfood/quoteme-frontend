/**
 * PASTE end-to-end (entry-points brief, gate B): paste a menu with a
 * section header and a no-price dish -> parseMenu yields the dishes ->
 * pick -> the client scoring engine returns the 3-offerings screen. No BE
 * call anywhere in this walk (EntryScreen.jsx is all client-side).
 */
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

/** The "Which of these?" pick list, scoped so a query for a dish name never
 * also matches the pasted raw text still sitting in the textarea above it
 * (jsdom mirrors a controlled textarea's value into its own textContent). */
function pickSection() {
  return screen.getByRole('heading', { name: 'Which of these?' }).closest('section');
}

const MENU = [
  'MAINS',
  '',
  'Sole meuniere 38',
  'sole, snap pea, potato, lemon',
  '',
  'Cheese plate',
  'comte, roquefort',
].join('\n');

describe('EntryScreen (/entry): PASTE, end to end', () => {
  it('paste a menu with a section + a no-price dish -> parse -> pick -> 3-offerings screen', async () => {
    const user = userEvent.setup();
    renderPairMeApp('/entry');

    // Which wine list? - pick the small, deterministic demo list.
    await user.click(screen.getByRole('button', { name: /Aquitaine \(demo\)/ }));

    // PASTE is the default tab.
    const textarea = screen.getByLabelText('Paste the menu');
    await user.click(textarea);
    await user.paste(MENU);
    await user.click(screen.getByRole('button', { name: 'Find the dishes' }));

    // parseMenu found both dishes, including the one with NO price.
    await screen.findByRole('heading', { name: 'Which of these?' });
    const pick = within(pickSection());
    expect(pick.getByText('Sole meuniere')).toBeInTheDocument();
    expect(pick.getByText('Cheese plate')).toBeInTheDocument();
    // The no-price dish still shows up as a pickable row, not disqualified.
    expect(pick.getByText('comte, roquefort')).toBeInTheDocument();

    // PICK: select the sole (has real matches in dish_axes.csv's
    // vocabulary: sole/snap pea/potato/lemon).
    await user.click(pick.getByText('Sole meuniere').closest('button'));

    // PAIR
    await user.click(screen.getByRole('button', { name: 'Pair it' }));

    // The 3-offerings screen: role-labelled offerings from the client
    // scoring engine (packages/pairing), not a BE call.
    expect(await screen.findByRole('heading', { name: 'Your wine' })).toBeInTheDocument();
    const roleLabels = ['House suggestion', 'Suited to you', 'Crowd pleaser'];
    const rendered = roleLabels.filter((label) => screen.queryByText(label));
    expect(rendered.length).toBeGreaterThan(0);
  });

  it('the no-price dish parses with price: null and is never dropped from the pick step', async () => {
    const user = userEvent.setup();
    renderPairMeApp('/entry');
    await user.click(screen.getByRole('button', { name: /Aquitaine \(demo\)/ }));
    const textarea = screen.getByLabelText('Paste the menu');
    await user.click(textarea);
    await user.paste('Caesar salad\nromaine, parmesan, anchovy dressing');
    await user.click(screen.getByRole('button', { name: 'Find the dishes' }));

    await screen.findByRole('heading', { name: 'Which of these?' });
    const pick = within(pickSection());
    expect(pick.getByText('Caesar salad')).toBeInTheDocument();
    // No $ price rendered next to it, inside the pick row.
    expect(pick.queryByText(/^\$/)).not.toBeInTheDocument();
  });

  it('the four entry points are all reachable by tapping, no venue picker required to switch tabs', async () => {
    const user = userEvent.setup();
    renderPairMeApp('/entry');

    await user.click(screen.getByRole('button', { name: 'Type it' }));
    expect(screen.getByLabelText('What are you having?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'At home' }));
    expect(screen.getByLabelText('What are you cooking, or ordering in?')).toBeInTheDocument();
    // AT HOME always shows the wine-list picker.
    expect(screen.getByText('Which wine list?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Camera' }));
    expect(screen.getByRole('button', { name: 'Take a photo of the menu' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Paste the menu' }));
    expect(screen.getByLabelText('Paste the menu')).toBeInTheDocument();
  });
});
