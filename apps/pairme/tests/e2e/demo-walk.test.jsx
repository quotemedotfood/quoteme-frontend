/**
 * The full /t/demo walk (LANE E). One continuous SPA session, driven end to
 * end against MSW-mocked "PairMe API Contract v1" endpoints: session -> venue
 * search -> menu multi-select -> direction (one_bottle) -> three offerings
 * -> server card (no buy/order button) -> rating + share toggle -> profile
 * history + delete.
 *
 * This has to be ONE `it`, not several: the app's state (usePairMe) is real
 * React state living inside one mounted tree, so a fresh `render()` per step
 * would lose everything the previous step did. Each step is commented and
 * asserted on its own, the way Playwright's test.step reads, even though
 * vitest has no such primitive.
 *
 * SELECTORS: every query below is by visible text/role/placeholder, i.e. the
 * actual product copy (Desi's contract), not by data-testid/class - because
 * none of the screens in src/screens/*.jsx have a data-testid today (grepped:
 * zero). Lines that will need to change once Lane A's finalized markup lands
 * are flagged TODO(A) inline; the assertions themselves (what must be true)
 * are not expected to change, only how we locate the element.
 *
 * REAL FINDINGS surfaced while writing this (see PR/report, not fixed here):
 *   - Welcome's "Skip setup", YourProfile's history-row open, and the chrome
 *     Settings gear all change `vm.s` via a raw `patch()`, bypassing `go()` -
 *     so the screen changes but the URL does not. Every other transition in
 *     this walk (venue pick, CTA advances, "Back to wine") goes through
 *     `go()` and does update the URL. This test asserts the CURRENT truth
 *     (URL unchanged) at each of those three spots rather than assuming
 *     consistency that is not there yet.
 *   - RateIt's "Save it" only POSTs /v1/rating when `st.captureId` is set -
 *     i.e. only if the session went through the camera-capture pipeline.
 *     This walk deliberately takes the camera detour so that assertion is a
 *     real passing POST, not a documented gap.
 */
import { describe, it, expect } from 'vitest';
import { screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';
import { requestLog } from './msw/handlers.js';

function starButtonsForRow(labelText) {
  const label = screen.getByText(labelText);
  return within(label.parentElement).getAllByRole('button');
}

describe('PairMe demo walk: session -> venue -> menu -> direction -> offerings -> server -> rate -> profile', () => {
  it(
    'walks every step against the MSW-mocked contract',
    async () => {
      const user = userEvent.setup();
      const { container, findByText, getByText, getByRole, getByPlaceholderText, currentPath } =
        renderPairMeApp('/');

      // --- STEP 1: session ---------------------------------------------
      // Bootstrap effect (usePairMe) fires POST /v1/session then GET
      // /v1/profile on mount, unconditionally, before any user action.
      await waitFor(() => {
        expect(requestLog.filter((r) => r.method === 'POST' && r.path === '/v1/session')).toHaveLength(1);
      });
      expect(localStorage.getItem('pairme:anon_id')).toBe('anon_e2e_test');
      await waitFor(() => {
        expect(requestLog.filter((r) => r.method === 'GET' && r.path === '/v1/profile')).toHaveLength(1);
      });
      // Every request after session bootstrap must carry the identity
      // header (contract: "the only thing kept in localStorage").
      const profileCall = requestLog.find((r) => r.path === '/v1/profile');
      expect(profileCall.anon).toBe('anon_e2e_test');

      // Skip the six onboarding questions (Welcome's alt button) to reach
      // venue selection quickly - this is the path a returning/impatient
      // diner takes.
      await user.click(getByRole('button', { name: 'Skip setup' }));
      await findByText('Where are you eating?'); // WhereTo screen heading
      // FINDING (see file header): this transition uses raw patch(), not
      // go() - the URL does NOT change here, unlike every go()-backed
      // transition later in this walk.
      expect(currentPath()).toBe('/');

      // --- STEP 2: venue --------------------------------------------------
      const venueInput = getByPlaceholderText('start typing');
      await user.type(venueInput, 'Aquitaine');
      await waitFor(
        () => {
          const venueCalls = requestLog.filter((r) => r.method === 'GET' && r.path === '/v1/venues');
          expect(venueCalls.length).toBeGreaterThan(0);
          expect(venueCalls.at(-1).search).toContain('q=Aquitaine');
        },
        { timeout: 2000 }
      );
      await findByText(/Aquitaine \. Boston, MA/);

      // Take the camera path instead of clicking the venue hit (clicking a
      // hit navigates straight to Menu, which would skip the capture
      // pipeline this walk also wants to exercise for the rating step).
      await user.click(getByRole('button', { name: /Photograph the menu/i }));
      await findByText('Fit the list in the frame'); // Camera screen (camTitle)
      expect(currentPath()).toBe('/capture'); // goCamera uses go(), URL does update.

      const fileInput = container.querySelector('input[type="file"][capture]');
      expect(fileInput).toBeTruthy();
      const winePhoto = new File(['fake wine list photo bytes'], 'wine-list.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [winePhoto] } });

      await waitFor(() => {
        expect(requestLog.filter((r) => r.method === 'POST' && r.path === '/v1/capture')).toHaveLength(1);
      });
      // /v1/capture/:id/rows is NOT BUILT (404) per the contract - api.js
      // swallows it into { notBuilt: true } rather than surfacing an error.
      await waitFor(() => {
        expect(
          requestLog.filter((r) => r.method === 'POST' && r.path === '/v1/capture/cap_e2e_1/rows')
        ).toHaveLength(1);
      });
      await findByText('Aquitaine'); // back on Menu (chrome title), capture pipeline landed here
      expect(currentPath()).toBe('/menu');

      // --- STEP 3: menu multi-select --------------------------------------
      // Desi's demo starts with 5 dishes pre-picked (a2,a5,e6,e9,s2). Prove
      // the toggle actually works both ways: ADD one dish not in the
      // default set, REMOVE one that is.
      await user.click(getByRole('button', { name: /Oysters, half dozen/i }));
      await user.click(getByRole('button', { name: /Truffle frites/i }));

      // --- STEP 4: direction (one_bottle) ---------------------------------
      await user.click(getByRole('button', { name: 'Pair it' }));
      await findByText('How do you want to drink?');
      expect(currentPath()).toBe('/direction');

      await user.click(getByRole('button', { name: /By the bottle/i }));
      await user.click(getByRole('button', { name: /Single, just the one/i }));
      await user.click(getByRole('button', { name: /The whole dinner/i }));
      await findByText(/One bottle, across the whole dinner\./);

      await user.click(getByRole('button', { name: 'Show wine' }));
      await waitFor(() => {
        expect(requestLog.filter((r) => r.method === 'POST' && r.path === '/v1/pair')).toHaveLength(1);
      });
      const pairCall = requestLog.find((r) => r.path === '/v1/pair');
      expect(pairCall.body.direction).toBe('one_bottle');
      expect(new Set(pairCall.body.dish_ids)).toEqual(new Set(['a2', 'a5', 'e6', 'e9', 'r1']));
      expect(pairCall.body.dish_ids).not.toContain('s2');
      await waitFor(() => expect(currentPath()).toBe('/wines'));

      // --- STEP 5: three offerings -----------------------------------------
      // TODO(A): TheWine.jsx does not read pairOfferings/pairCompromise from
      // the POST /v1/pair response yet (state.js: "stays Desi's static demo
      // data ... rather than guessing at a shape"). These assertions target
      // the CURRENT rendered offer cards (offerSet, still real product copy
      // with role/why/pronunciation), not the mocked /v1/pair payload. Once
      // wired, add a parallel assertion here that offer content matches
      // pairCall's mocked offerings (house/suited/crowd labels, wine.name,
      // wine.pronunciation from tests/e2e/msw/handlers.js's buildPairResponse).
      await findByText('Three wines, no assumptions'); // offerTitle when blank
      const offerRoleTexts = ['Safe, and we mean that kindly', 'If you want a red', 'House suggestion'];
      for (const roleText of offerRoleTexts) {
        expect(screen.getByText(roleText)).toBeInTheDocument();
      }
      // reason text (why) + pronunciation (say) present for each offering.
      expect(screen.getByText(/Sancerre disappoints the fewest people/)).toBeInTheDocument(); // vach why
      expect(screen.getByText('vash-ROHN, sahn-SEHR')).toBeInTheDocument(); // vach say
      expect(screen.getByText(/Gamay is the one red that rarely gets in anyone's way/)).toBeInTheDocument(); // foil why
      expect(screen.getByText('fwah-YAR, mor-GOHN')).toBeInTheDocument(); // foil say
      expect(screen.getByText(/Chenin sits between the two above/)).toBeInTheDocument(); // huet why
      expect(screen.getByText('oo-AY, voo-VRAY')).toBeInTheDocument(); // huet say

      // Pick two of the three to present at the table (feeds Present's
      // "Bottle one"/"Bottle two" handoff, step 6).
      await user.click(getByRole('button', { name: /Domaine Vacheron/i }));
      await user.click(getByRole('button', { name: /Jean Foillard/i }));

      // --- STEP 6: server card, no buy/order button -----------------------
      await user.click(getByRole('button', { name: 'Present' }));
      await findByText('For the table');
      expect(currentPath()).toBe('/server');

      expect(screen.getByText('Oysters, half dozen')).toBeInTheDocument();
      expect(screen.queryByText('Truffle frites')).not.toBeInTheDocument(); // proves the deselect in step 3 worked
      expect(screen.getByText('Bottle one')).toBeInTheDocument();
      expect(screen.getByText('Bottle two')).toBeInTheDocument();
      expect(screen.getByText('vash-ROHN, sahn-SEHR')).toBeInTheDocument(); // pronunciation shown again in the handoff

      const serverButtons = within(container).getAllByRole('button');
      for (const btn of serverButtons) {
        expect(btn.textContent || '').not.toMatch(/\bbuy\b|\border\b|\bpurchase\b|\bcheckout\b/i);
      }
      expect(screen.getByText(/Nothing has been ordered\./)).toBeInTheDocument();

      // --- STEP 7: rating + share toggle -----------------------------------
      await user.click(getByRole('button', { name: 'Rate it' }));
      await findByText('How was it?');
      expect(currentPath()).toBe('/rate');

      // Click values deliberately different from the {dish:4,wine:5,pair:4}
      // defaults, so a passing assertion later proves the click handlers -
      // not the initial state - produced the posted numbers.
      await user.click(starButtonsForRow('The food')[1]); // -> 2
      await user.click(starButtonsForRow('The wine')[2]); // -> 3
      await user.click(starButtonsForRow('How they went together')[0]); // -> 1

      const feedback = getByPlaceholderText(/the Gevrey was the right call/);
      await user.type(feedback, 'Loved the crowd pleaser call.');
      await user.click(getByRole('button', { name: /Let Aquitaine see this/i })); // default true -> false

      await user.click(getByRole('button', { name: 'Save it' }));
      await waitFor(() => expect(currentPath()).toBe('/profile'));

      // captureId was set in step 2's camera detour, so the s===13 cta
      // handler's `if (st.captureId)` guard is satisfied and this actually
      // posts - unlike a walk that never touched the camera.
      const ratingCalls = requestLog.filter((r) => r.method === 'POST' && r.path === '/v1/rating');
      expect(ratingCalls).toHaveLength(1);
      expect(ratingCalls[0].body).toMatchObject({
        capture_id: 'cap_e2e_1',
        dish: 2,
        wine: 3,
        pairing: 1,
        free_text: 'Loved the crowd pleaser call.',
        share_with_venue: false,
      });

      // --- STEP 8: profile history + delete --------------------------------
      await findByText('Moose');
      expect(getByText('Domaine Huet, Vouvray Sec')).toBeInTheDocument();
      expect(getByText('with the sole meuniere')).toBeInTheDocument();

      await user.click(getByRole('button', { name: /Domaine Huet, Vouvray Sec/i }));
      await findByText('oo-AY, voo-VRAY'); // BottleBrief for this history row (bottle: 'huet')
      // FINDING (see file header): history row open() is also a raw patch(),
      // not go() - URL stays on /profile even though BottleBrief is showing.
      expect(currentPath()).toBe('/profile');

      await user.click(getByRole('button', { name: 'Back to wine' }));
      await findByText('Moose'); // back on YourProfile
      expect(currentPath()).toBe('/profile'); // "Back to wine" DOES use go(), landing on the same path.

      // Delete: Settings.jsx has no delete-account control today (confirmed
      // by reading the file - Reading/Sound/Account sections only - and by
      // api.js's own comment on deleteAccount()). Assert that current, real
      // absence rather than assuming a control exists.
      await user.click(getByRole('button', { name: 'Settings' })); // chrome gear icon, aria-label="Settings"
      // Not `findByText('Settings')`: the chrome gear button itself also
      // renders the word "Settings" (its own <span>), so that query matches
      // two elements. This subtitle is unique to the Settings screen body.
      await findByText('Read it your way. Nothing here changes what we pick.');
      expect(currentPath()).toBe('/profile'); // FINDING: goSettings is also a raw patch(), not go().
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

      // TODO(A): once a delete-account control exists on Settings.jsx (or a
      // future dedicated screen), replace the assertion above with:
      //   await user.click(getByRole('button', { name: /delete/i }));
      //   <confirm step, if Lane A adds one>
      //   await waitFor(() => {
      //     expect(requestLog.filter(r => r.method === 'DELETE' && r.path === '/v1/account')).toHaveLength(1);
      //   });
      // The DELETE /v1/account contract endpoint itself is already proven
      // live in api-contract.test.js - only the click-through is pending.
    },
    20000
  );
});
