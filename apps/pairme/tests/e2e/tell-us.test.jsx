/**
 * WhereTo's fourth path (items 6/7/8, "Just tell us here"): the at-home /
 * no-menu case. Type or speak what you are eating on WhereTo -> land on the
 * extraction step showing what we heard -> correct it -> one of three
 * choices. See screens/WhereTo.jsx's new "Or what are you eating?" card and
 * screens/TellUsScreen.jsx.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

function nowWhatSection() {
  return screen.getByRole('heading', { name: 'Now what?' }).closest('section');
}

// fEatText's mic button (asserted below) now feature-detects and hides with
// no SpeechRecognition (R4/D4 fix), so this file needs a browser that
// supports voice, same as jsdom lacking one would otherwise hide it here
// exactly as it correctly would on Firefox.
class FakeRecognition {
  constructor() {
    this.onstart = null; this.onaudiostart = null; this.onspeechstart = null;
    this.onresult = null; this.onnomatch = null; this.onerror = null; this.onend = null;
  }
  start() {}
  stop() { if (this.onend) this.onend(); }
  abort() {}
}
beforeEach(() => { window.SpeechRecognition = FakeRecognition; });
afterEach(() => { delete window.SpeechRecognition; });

describe('WhereTo: the fourth path ("Or what are you eating?")', () => {
  it('renders its own heading, a type-or-speak input, and a "Just tell us here" button, disabled until something is typed', async () => {
    renderPairMeApp('/venue');
    await screen.findByText('Where are you eating?');

    expect(screen.getByText('Or what are you eating?')).toBeInTheDocument();
    const input = screen.getByLabelText('What are you eating');
    expect(input).toBeInTheDocument();
    // The mic sits right on the same field, same pattern as "Or find it"'s fVenue mic.
    expect(screen.getByRole('button', { name: 'Tell us what you are eating' })).toBeInTheDocument();

    const cta = screen.getByRole('button', { name: 'Just tell us here' });
    expect(cta).toBeDisabled();

    const user = userEvent.setup();
    await user.type(input, 'roast chicken, potatoes');
    expect(cta).toBeEnabled();
  });

  it('"Just tell us here" routes to the extraction step showing the parsed dishes, editable', async () => {
    const user = userEvent.setup();
    const { currentPath } = renderPairMeApp('/venue');
    await screen.findByText('Where are you eating?');

    const input = screen.getByLabelText('What are you eating');
    await user.type(input, 'roast chicken, green beans and a cheese plate');
    await user.click(screen.getByRole('button', { name: 'Just tell us here' }));

    expect(currentPath()).toBe('/tell-us');
    await screen.findByRole('heading', { name: 'What we heard' });

    // parseFreeText split on ",", "and" - three editable rows, one per dish.
    expect(screen.getByLabelText('Dish 1')).toHaveValue('roast chicken');
    expect(screen.getByLabelText('Dish 2')).toHaveValue('green beans');
    expect(screen.getByLabelText('Dish 3')).toHaveValue('a cheese plate');

    // CORRECT IT: edit one, remove one, add one - never sent to pairing uncorrected.
    await user.clear(screen.getByLabelText('Dish 1'));
    await user.type(screen.getByLabelText('Dish 1'), 'roast duck');
    expect(screen.getByLabelText('Dish 1')).toHaveValue('roast duck');

    await user.click(screen.getByRole('button', { name: 'Remove green beans' }));
    expect(screen.queryByLabelText('Dish 3')).not.toBeInTheDocument(); // only 2 rows left, re-indexed

    await user.type(screen.getByLabelText('Add a dish'), 'truffle frites');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByLabelText('Dish 3')).toHaveValue('truffle frites');
  });
});

describe('TellUsScreen: the three choices under the corrected list', () => {
  async function reachExtraction(user) {
    renderPairMeApp('/venue');
    await screen.findByText('Where are you eating?');
    const input = screen.getByLabelText('What are you eating');
    await user.type(input, 'roast chicken, potatoes, green beans');
    await user.click(screen.getByRole('button', { name: 'Just tell us here' }));
    await screen.findByRole('heading', { name: 'What we heard' });
  }

  it('all three render, and "Local options" is a real disabled button, never a live one', async () => {
    const user = userEvent.setup();
    await reachExtraction(user);

    const now = within(nowWhatSection());
    expect(now.getByRole('button', { name: 'Guide me' })).toBeInTheDocument();
    expect(now.getByRole('button', { name: 'I have a wine list' })).toBeInTheDocument();

    const localOptions = now.getByRole('button', { name: 'Local options' });
    expect(localOptions).toBeDisabled();
    expect(localOptions).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/Coming soon/)).toBeInTheDocument();

    // Disabled means inert: clicking it must not change anything on screen
    // (no offerings, no navigation away from the extraction step).
    await user.click(localOptions);
    expect(screen.queryByRole('heading', { name: 'The wine' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What we heard' })).toBeInTheDocument();
  });

  it('"Guide me" pairs against GENERIC_STYLE_WINES (no venue list) and lands on the offerings', async () => {
    const user = userEvent.setup();
    await reachExtraction(user);

    await user.click(within(nowWhatSection()).getByRole('button', { name: 'Guide me' }));

    await screen.findByRole('heading', { name: 'The wine' });
    expect(screen.getByText(/our general wine styles/)).toBeInTheDocument();
    // At least one offering card rendered from the style-based pool.
    expect(screen.getAllByText(/Covers/).length).toBeGreaterThan(0);
  });

  it('"I have a wine list" reveals a paste step; pasting a real wine-list fixture snippet pairs and lands on the offerings', async () => {
    const user = userEvent.setup();
    await reachExtraction(user);

    await user.click(within(nowWhatSection()).getByRole('button', { name: 'I have a wine list' }));
    const textarea = await screen.findByLabelText('Paste your wine list');
    // A real snippet from packages/pairing/data/wine_list_fixtures/brixton.txt
    // (price_last shape parseWineList already has full coverage for).
    await user.click(textarea);
    await user.paste(
      'WHITE\nDomaine Ostertag, Riesling "Les Jardins" Alsace, France 2022             94\nDomaine Ostertag, Sylvaner Alsace, France 2017                           74'
    );
    await user.click(screen.getByRole('button', { name: 'Find the wines' }));

    await screen.findByRole('heading', { name: 'The wine' });
    expect(screen.getByText(/the wine list you gave us/)).toBeInTheDocument();
  });
});
