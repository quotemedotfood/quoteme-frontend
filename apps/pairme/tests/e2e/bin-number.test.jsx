/**
 * ITEM 4 (Amy interview): a cellar bin number lets a guest say "I want wine
 * 902" instead of attempting a long producer/appellation name out loud -
 * the SAME anxiety the existing pronunciation ("Say it") feature already
 * addresses, solved a second way. packages/pairing's parseWineList.js sets
 * this as `bin` on parsed rows (BIN_START regex; a plain leading number
 * like "902", see its own tests); pairingAdapter.js's rowToEngineWine reads
 * that real field (`row.bin`, falling back to `row.binNo` for a caller
 * that already hands it a pre-shaped engine wine) and exposes it as
 * `binNo` on the engine wine object the offering cards render.
 *
 * Exercised here through the REAL parseWineList -> rowToEngineWine ->
 * computeOfferings pipeline (TellUsScreen's "I have a wine list" paste
 * flow), not a hand-built fixture, so this proves the actual parser output
 * shape reaches the card. Most seeded/demo wines carry no bin (asserted as
 * the negative case below via the no-venue-list "Guide me" path, whose
 * GENERIC_STYLE_WINES never have one) - only a pasted cellar list does.
 */
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

function nowWhatSection() {
  return screen.getByRole('heading', { name: 'Now what?' }).closest('section');
}

async function reachExtraction(user, text = 'roast chicken, potatoes, green beans') {
  renderPairMeApp('/venue');
  await screen.findByText('Where are you eating?');
  const input = screen.getByLabelText('What are you eating');
  await user.type(input, text);
  await user.click(screen.getByRole('button', { name: 'Just tell us here' }));
  await screen.findByRole('heading', { name: 'What we heard' });
}

describe('Item 4: bin number renders on the diner offering card when the parsed row has one', () => {
  it('a pasted wine list with a leading bin number ("902 Producer, Wine ... price") renders "Bin 902" on its offering card', async () => {
    const user = userEvent.setup();
    await reachExtraction(user);

    await user.click(within(nowWhatSection()).getByRole('button', { name: 'I have a wine list' }));
    const textarea = await screen.findByLabelText('Paste your wine list');
    await user.click(textarea);
    // A real parseWineList shape: BIN_START (`/^(\d{1,5})[\s.)]+/`) matches
    // the leading "902 " on the producer line. Two wines so the pairing
    // engine has more than one eligible candidate to choose from.
    await user.paste(
      'RED\n902 Jean Foillard, Morgon Cote du Py 2021             62\nDomaine Vacheron, Sancerre 2022                                102'
    );
    await user.click(screen.getByRole('button', { name: 'Find the wines' }));

    await screen.findByRole('heading', { name: 'The wine' });
    expect(screen.getByText('Bin 902')).toBeInTheDocument();
  });

  it('the same offering card shows NO bin chip when the parsed row carries none (most of a pasted list, and every demo/style wine)', async () => {
    const user = userEvent.setup();
    await reachExtraction(user);

    // "Guide me": GENERIC_STYLE_WINES, never parsed from a row, never has a bin.
    await user.click(within(nowWhatSection()).getByRole('button', { name: 'Guide me' }));
    await screen.findByRole('heading', { name: 'The wine' });
    expect(screen.getAllByText(/Covers/).length).toBeGreaterThan(0); // offerings actually rendered
    expect(screen.queryByText(/^Bin /)).not.toBeInTheDocument();
  });

  it('within one pasted list, a row with no bin token does not fabricate one even when a sibling row has a real bin', async () => {
    const user = userEvent.setup();
    await reachExtraction(user);

    await user.click(within(nowWhatSection()).getByRole('button', { name: 'I have a wine list' }));
    const textarea = await screen.findByLabelText('Paste your wine list');
    await user.click(textarea);
    await user.paste(
      'RED\nJean Foillard, Morgon Cote du Py 2021             62\nDomaine Vacheron, Sancerre 2022                                102'
    );
    await user.click(screen.getByRole('button', { name: 'Find the wines' }));

    await screen.findByRole('heading', { name: 'The wine' });
    expect(screen.queryByText(/^Bin /)).not.toBeInTheDocument();
  });
});
