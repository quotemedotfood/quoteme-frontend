/**
 * The off-the-cuff pipeline, end to end, client-side only: paste a food menu
 * -> parseMenu -> resolveComponents -> pick a seeded cellar -> pair with the
 * client engine. Two things proven here:
 *
 *  1. it holds on the FULL 1,832-wine Barolo Grill list (the hard parse), and
 *     since Barolo is bottle-only the by-the-glass pool is honestly EMPTY, not
 *     faked with bottles wearing a glass price.
 *  2. glass and bottle are SEPARATE POOLS with different strategies, not a
 *     filter: by-the-glass ranks a pour PER dish, single-bottle ranks ONE wine
 *     across every dish and names where it gives ground.
 */
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

const MENU = [
  'MAINS',
  '',
  'Sole meuniere 38',
  'sole, snap pea, potato, lemon',
  '',
  'Steak frites 48',
  'hanger steak, shallot, truffle',
].join('\n');

async function pasteAndPair(user, listNameRe) {
  renderPairMeApp('/entry');
  await user.click(screen.getByRole('button', { name: listNameRe }));
  const textarea = screen.getByLabelText('Paste the menu');
  await user.click(textarea);
  await user.paste(MENU);
  await user.click(screen.getByRole('button', { name: 'Find the dishes' }));
  await screen.findByRole('heading', { name: 'Which of these?' });
  const pick = within(screen.getByRole('heading', { name: 'Which of these?' }).closest('section'));
  await user.click(pick.getByText('Sole meuniere').closest('button'));
  await user.click(pick.getByText('Steak frites').closest('button'));
  await user.click(screen.getByRole('button', { name: 'Pair it' }));
  await screen.findByRole('heading', { name: 'Your wine' });
}

describe('off-the-cuff pipeline: paste -> parse -> pair, two pools', () => {
  it('pairs against the full Barolo Grill cellar; by-the-glass is honestly empty (bottle-only list)', async () => {
    const user = userEvent.setup();
    await pasteAndPair(user, /Barolo Grill/);
    expect(screen.getByText(/From Barolo Grill/)).toBeInTheDocument();

    // By the glass: Barolo has no by-the-glass wines, so we SAY so.
    await user.click(screen.getByRole('tab', { name: 'By the glass' }));
    expect(screen.getByText(/no by-the-glass list/i)).toBeInTheDocument();

    // Single bottle: a real bottle across both dishes, with the compromise named.
    await user.click(screen.getByRole('tab', { name: 'Single bottle' }));
    expect(screen.getByText(/Where this bottle gives ground/i)).toBeInTheDocument();
  });

  it('glass vs bottle are different pools: a pour per dish, vs one compromise bottle', async () => {
    const user = userEvent.setup();
    await pasteAndPair(user, /Aquitaine \(demo\)/);

    // By the glass: per-dish strategy names each course.
    await user.click(screen.getByRole('tab', { name: 'By the glass' }));
    expect(screen.getByText(/With the sole meuniere/i)).toBeInTheDocument();
    // The compromise card belongs to the bottle pool only, not here.
    expect(screen.queryByText(/Where this bottle gives ground/i)).not.toBeInTheDocument();

    // Single bottle: one wine across everything, with its compromise.
    await user.click(screen.getByRole('tab', { name: 'Single bottle' }));
    expect(screen.getByText(/Where this bottle gives ground/i)).toBeInTheDocument();
    expect(screen.queryByText(/With the sole meuniere/i)).not.toBeInTheDocument();
  });
});
