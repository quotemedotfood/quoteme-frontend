/**
 * DEMO wine list and SELFTEST dish set, copied verbatim from
 * pairing_engine.py's `DEMO` and `SELFTEST` constants. This is the fixture
 * both `python3 pairing_engine.py --selftest` and scoring.test.js run
 * against, so the two never drift onto different data.
 */

export const DEMO = [
  { label: 'Louis Michel, Chablis 1er Cru', grape_head: 'chardonnay', region_head: 'chablis', price: 124, glass: false },
  { label: 'Domaine Vacheron, Sancerre', grape_head: 'sauvignon blanc', region_head: 'sancerre', price: 102, glass: true },
  { label: 'Pepiere, Muscadet Clos des Briords', grape_head: 'melon de bourgogne', region_head: 'muscadet', price: 56, glass: true },
  { label: 'Felines Jourdan, Picpoul', grape_head: 'picpoul', region_head: 'languedoc', price: 44, glass: true },
  { label: 'Pataille, Bourgogne Aligote', grape_head: 'aligote', region_head: 'marsannay', price: 96, glass: false },
  { label: 'Huet, Vouvray Demi-Sec', grape_head: 'chenin blanc', region_head: 'vouvray', price: 100, glass: false },
  { label: 'Berthet-Bondet, Jura Savagnin', grape_head: 'savagnin', region_head: 'jura', price: 118, glass: false },
  { label: 'Gimonnet, Blanc de Blancs Champagne', grape_head: 'chardonnay', region_head: 'champagne', price: 138, glass: true },
  { label: 'Foillard, Morgon', grape_head: 'gamay', region_head: 'beaujolais', price: 102, glass: true },
  { label: 'Joguet, Chinon', grape_head: 'cabernet franc', region_head: 'chinon', price: 108, glass: false },
  { label: 'Bouvier, Marsannay', grape_head: 'pinot noir', region_head: 'marsannay', price: 115, glass: true },
  { label: 'Trapet, Gevrey-Chambertin', grape_head: 'pinot noir', region_head: 'gevrey chambertin', price: 234, glass: false },
  { label: 'Vincent Paris, Cornas', grape_head: 'syrah', region_head: 'cornas', price: 126, glass: false },
  { label: 'Graillot, Crozes-Hermitage', grape_head: 'syrah', region_head: 'crozes hermitage', price: 120, glass: true },
  { label: 'Corison, Napa Cabernet', grape_head: 'cabernet sauvignon', region_head: 'napa valley', price: 222, glass: false },
  { label: 'Pichon Comtesse Reserve, Pauillac', grape_head: 'cabernet sauvignon', region_head: 'pauillac', price: 340, glass: false },
  { label: 'Tournelle, Arbois Poulsard', grape_head: 'poulsard', region_head: 'jura', price: 106, glass: false },
  { label: 'Tempier, Bandol Rose', grape_head: 'mourvedre', region_head: 'bandol', price: 108, glass: true },
  { label: 'Red Tail Ridge, Blaufrankisch', grape_head: 'blaufrankisch', region_head: 'finger lakes', price: 72, glass: true },
  { label: "Dow's, LBV Port", grape_head: 'touriga nacional', region_head: 'porto', price: 68, glass: true },
];

export const SELFTEST = [
  ['Artichoke barigoule', ['artichoke', 'carrot', 'snap pea', 'beurre blanc']],
  ['Steak frites Parisienne', ['ny strip', 'garlic', 'butter', 'potato']],
  ['Steak frites Aquitaine', ['hanger steak', 'truffle', 'shallot', 'watercress']],
  ['Chicken roti', ['chicken', 'morel', 'potato', 'carrot', 'jus']],
  ['Belgian endive salade', ['endive', 'apple', 'walnut', 'roquefort', 'vinaigrette']],
  ['Moules en cassoulette', ['mussel', 'sauvignon blanc', 'shallot', 'creme fraiche', 'thyme']],
  ['French onion soup', ['onion', 'bone broth', 'sherry', 'raclette', 'gruyere']],
  ['Roasted mushrooms', ['mushroom', 'thyme']],
  ['Au poivre burger', ['beef', 'peppercorn', 'triple cream', 'cornichon', 'potato']],
  ['Tuna crudo', ['tuna', 'avocado', 'soy', 'yuzu']],
  ['Truffle frites', ['potato', 'truffle', 'parmesan', 'aioli']],
  ['Chicken liver pate', ['chicken liver', 'confiture', 'mustard', 'dried grape', 'bread']],
];
