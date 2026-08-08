/**
 * The five demo states, barrelled for whoever wires routes to them next
 * (see the header comment in each file for the full brief). Each entry is
 * self-contained: default props are the local stub venue/menu/pairing
 * input in stubs.js, so every one of these renders and behaves correctly
 * with no route, no live API, and no network, exactly as it will need to
 * the moment a real venue/menu/profile is threaded in as a prop instead.
 */
import NoWineListState, { handleNoWineList } from './NoWineListState.jsx';
import CellarOutState, { pairWithCellarCheck } from './CellarOutState.jsx';
import UnreadableDishState, { readDish } from './UnreadableDishState.jsx';
import BlankProfileState, { pairForBlankProfile } from './BlankProfileState.jsx';
import NoSignalState, { pairWithNoSignal } from './NoSignalState.jsx';

export {
  NoWineListState, handleNoWineList,
  CellarOutState, pairWithCellarCheck,
  UnreadableDishState, readDish,
  BlankProfileState, pairForBlankProfile,
  NoSignalState, pairWithNoSignal,
};

export const FIVE_STATES = [
  { key: 'no-wine-list', label: 'No wine list for this venue', Component: NoWineListState },
  { key: 'cellar-out', label: 'On the list, out in the cellar', Component: CellarOutState },
  { key: 'unreadable-dish', label: 'A dish we could not read', Component: UnreadableDishState },
  { key: 'blank-profile', label: 'Skipped every onboarding screen', Component: BlankProfileState },
  { key: 'no-signal', label: 'No signal', Component: NoSignalState },
];
