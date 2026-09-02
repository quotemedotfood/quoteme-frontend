/**
 * Local stub input for the five demo states (venue / menu / pairing input).
 * Each state screen/handler is built against these so it stands on its own
 * - no route, no live venue lookup, no real capture pipeline. Lane A wires
 * real routes and real data sources in later; these stubs exist so that
 * work does not block building and proving each state today.
 */

// ---------------------------------------------------------------------------
// (a) A venue we hold no wine list for.
// ---------------------------------------------------------------------------
export const STUB_VENUE_NO_LIST = {
  id: 'v_stub_no_list',
  name: 'Trattoria Bergamo',
  city: 'Boston',
  state: 'MA',
  hasWineList: false,
};

// ---------------------------------------------------------------------------
// (b) A wine on the printed list but out in the cellar.
//
// Shape matches what packages/pairing's scoring engine expects on a wine
// row (label/grape_head/region_head/price/glass), plus one field the
// engine does not read: `stock`. Filtering on `stock` is this app's job,
// same layer that would eventually read a live 86'd list from the venue.
// ---------------------------------------------------------------------------
export const STUB_WINE_LIST_WITH_86 = [
  { label: 'Gimonnet, Blanc de Blancs Champagne', grape_head: 'chardonnay', region_head: 'champagne', price: 138, glass: true, stock: 0 },
  { label: 'Domaine Vacheron, Sancerre', grape_head: 'sauvignon blanc', region_head: 'sancerre', price: 102, glass: true, stock: 14 },
  { label: 'Pepiere, Muscadet Clos des Briords', grape_head: 'melon de bourgogne', region_head: 'muscadet', price: 56, glass: true, stock: 8 },
  { label: 'Foillard, Morgon', grape_head: 'gamay', region_head: 'beaujolais', price: 102, glass: true, stock: 11 },
  { label: 'Huet, Vouvray Demi-Sec', grape_head: 'chenin blanc', region_head: 'vouvray', price: 100, glass: false, stock: 9 },
];
// Chosen because, among STUB_WINE_LIST_WITH_86's five wines, the Gimonnet
// (the one that's 86'd) is the honest #1 pick for this dish - so the
// substitution note in CellarOutState.jsx actually has something to say.
// Verified against packages/pairing/data's real tables: Gimonnet 130,
// Huet 113, Vacheron 105.
export const STUB_DISH_FOR_86 = {
  name: 'Artichoke barigoule',
  components: ['artichoke', 'carrot', 'snap pea', 'beurre blanc'],
};

// ---------------------------------------------------------------------------
// (c) A dish we could not read.
//
// STUB_OCR_UNREADABLE stands in for what a bad photo angle or handwriting
// hands back: not empty, just noise. The handler treats it as unreadable
// when nothing in it resolves to a known dish component, and offers a
// plain free-text fallback (STUB_MANUAL_FALLBACK is what the diner might
// type once asked in their own words).
// ---------------------------------------------------------------------------
export const STUB_OCR_UNREADABLE = 'Xql fr\x00tes ??? c0nf1_ [illegible]';
export const STUB_MANUAL_FALLBACK = {
  name: 'The one we could not read',
  components: ['hanger steak', 'truffle', 'shallot', 'watercress'],
};
export const STUB_WINE_LIST_FOR_UNREADABLE = [
  { label: 'Trapet, Gevrey-Chambertin', grape_head: 'pinot noir', region_head: 'gevrey chambertin', price: 234, glass: false },
  { label: 'Vincent Paris, Cornas', grape_head: 'syrah', region_head: 'cornas', price: 126, glass: false },
  { label: 'Corison, Napa Cabernet', grape_head: 'cabernet sauvignon', region_head: 'napa valley', price: 222, glass: false },
  { label: 'Foillard, Morgon', grape_head: 'gamay', region_head: 'beaujolais', price: 102, glass: true },
];

// ---------------------------------------------------------------------------
// (d) A diner who skipped every onboarding screen. Every preference field is
// null/empty on purpose - this is what a profile looks like after every
// onboarding "skip" has been tapped, per Q1-Q6's alt affordance in state.js.
// ---------------------------------------------------------------------------
export const STUB_BLANK_PROFILE = {
  somLevel: null,
  targetLevel: null,
  adventure: null,
  budget: null,
  likes: [],
  dislikes: [],
  notDrinking: false,
};
export const STUB_DISH_FOR_BLANK_PROFILE = {
  name: 'Steak frites Aquitaine',
  components: ['hanger steak', 'truffle', 'shallot', 'watercress'],
};
export const STUB_WINE_LIST_FOR_BLANK_PROFILE = [
  { label: 'Domaine Vacheron, Sancerre', grape_head: 'sauvignon blanc', region_head: 'sancerre', price: 102, glass: true },
  { label: 'Trapet, Gevrey-Chambertin', grape_head: 'pinot noir', region_head: 'gevrey chambertin', price: 234, glass: false },
  { label: 'Foillard, Morgon', grape_head: 'gamay', region_head: 'beaujolais', price: 102, glass: true },
  { label: 'Vincent Paris, Cornas', grape_head: 'syrah', region_head: 'cornas', price: 126, glass: false },
];

// ---------------------------------------------------------------------------
// (e) NO SIGNAL. Rows already loaded (as if the menu photo had already been
// parsed while the phone still had a signal) plus a dish already chosen.
// The point of this state is that neither of these needs to be fetched
// again, and neither does the pairing itself - see lib/offlinePairing.js.
// ---------------------------------------------------------------------------
export const STUB_ALREADY_LOADED_WINE_ROWS = [
  { label: 'Louis Michel, Chablis 1er Cru', grape_head: 'chardonnay', region_head: 'chablis', price: 124, glass: false },
  { label: 'Domaine Vacheron, Sancerre', grape_head: 'sauvignon blanc', region_head: 'sancerre', price: 102, glass: true },
  { label: 'Pepiere, Muscadet Clos des Briords', grape_head: 'melon de bourgogne', region_head: 'muscadet', price: 56, glass: true },
  { label: 'Foillard, Morgon', grape_head: 'gamay', region_head: 'beaujolais', price: 102, glass: true },
  { label: 'Joguet, Chinon', grape_head: 'cabernet franc', region_head: 'chinon', price: 108, glass: false },
  { label: 'Trapet, Gevrey-Chambertin', grape_head: 'pinot noir', region_head: 'gevrey chambertin', price: 234, glass: false },
  { label: 'Vincent Paris, Cornas', grape_head: 'syrah', region_head: 'cornas', price: 126, glass: false },
  { label: 'Corison, Napa Cabernet', grape_head: 'cabernet sauvignon', region_head: 'napa valley', price: 222, glass: false },
];
export const STUB_DISH_ALREADY_CHOSEN = {
  name: 'Steak frites Aquitaine',
  components: ['hanger steak', 'truffle', 'shallot', 'watercress'],
};
