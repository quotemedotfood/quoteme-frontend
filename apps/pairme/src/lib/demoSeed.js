/**
 * Seed data for the /t/demo happy path (LANE A). Backend is not deployed for
 * this build, so this is the fixture GET /v1/demo (mocked, see
 * ../mocks/handlers.js) serves.
 *
 * The wine rows are built on top of packages/pairing's own DEMO fixture
 * (read-only import: this file adds display-only fields — producer/wine_name
 * split, pronunciation, glass price, region/grape display strings — it does
 * not touch scoring-relevant fields (grape_head/region_head/price/glass),
 * which stay exactly what pairing_engine.py's own DEMO constant uses so a
 * fired rule here is the same fired rule `--selftest` would report).
 *
 * Dish components use the exact vocabulary of packages/pairing/data/dish_axes.csv
 * (component names, lowercase) so the scoring engine can resolve every dish
 * against a known row rather than falling into the neutral-weight-1 default.
 */

export const DEMO_VENUE = {
  id: 'venue-demo-aquitaine',
  name: 'Aquitaine',
  city: 'Boston',
  state: 'MA',
};

export const DEMO_CAPTURE_ID = 'capture-demo-0001';

/** Dish menu, section-grouped, each with an engine-ready `components` list. */
export const DEMO_DISHES = [
  { id: 'r1', sec: 'Raw bar', n: 'Oysters, half dozen', d: 'East coast, mignonette, lemon', p: 24, components: ['shellfish', 'lemon'] },
  { id: 'r2', sec: 'Raw bar', n: 'Tuna crudo', d: 'blood orange, fennel, olive oil', p: 23, components: ['tuna', 'blood orange', 'fennel'] },
  { id: 'r3', sec: 'Raw bar', n: 'Shrimp cocktail', d: 'horseradish, celery heart', p: 21, components: ['shellfish', 'horseradish'] },
  { id: 'a2', sec: 'Starters', n: 'Moules en cassoulette', d: 'mussels, shallots, creme fraiche, thyme', p: 22, components: ['mussel', 'shallot', 'creme fraiche', 'thyme'] },
  { id: 'a5', sec: 'Starters', n: 'Chicken and duck liver pate', d: 'confiture, pickled jardiniere, grain mustard', p: 20, components: ['chicken liver', 'confiture', 'mustard', 'dried grape'] },
  { id: 'a4', sec: 'Starters', n: 'Salade de chevre chaud', d: 'warm goat cheese, hazelnuts, Dijon vinaigrette', p: 17, components: ['goat cheese', 'hazelnut', 'dijon', 'vinaigrette'] },
  { id: 'a7', sec: 'Starters', n: 'Escargots de Bourgogne', d: 'garlic parsley butter, baguette', p: 19, components: ['snail', 'garlic', 'parsley', 'butter'] },
  { id: 'e6', sec: 'Mains', n: 'Chicken roti', d: 'pee wee potatoes, carrots, morel mushrooms, garlic jus', p: 35, components: ['chicken', 'morel', 'potato', 'carrot', 'jus'] },
  { id: 'e9', sec: 'Mains', n: 'Steak frites Aquitaine', d: 'hanger steak, shallot jus, black truffle vinaigrette', p: 48, components: ['hanger steak', 'truffle', 'vinaigrette', 'shallot'] },
  { id: 'e2', sec: 'Mains', n: 'Sole meuniere', d: 'snap peas, pommes puree, beurre citron', p: 38, components: ['sole', 'snap pea', 'potato', 'beurre blanc', 'lemon'] },
  { id: 'e4', sec: 'Mains', n: 'Cassoulet Toulousain', d: 'duck confit, garlic sausage, tarbais beans', p: 36, components: ['duck', 'bean', 'garlic'] },
  { id: 's2', sec: 'Sides', n: 'Truffle frites', d: 'parmesan, fines herbes, aioli', p: 13, components: ['potato', 'truffle', 'parmesan', 'aioli'] },
  { id: 'd4', sec: 'Dessert', n: 'Cheese, three', d: 'Comte, Epoisses, Roquefort, honeycomb', p: 18, components: ['roquefort', 'triple cream'] },
];

export const DEMO_SECTIONS = ['Raw bar', 'Starters', 'Mains', 'Sides', 'Dessert'];

/** Default picks so the walk has something selected the moment Menu loads. */
export const DEMO_DEFAULT_PICKED = ['a2', 'a5', 'e6', 'e9', 's2'];

/**
 * Pronunciation + display metadata keyed by the exact `label` in
 * packages/pairing/src/demoFixtures.js's DEMO array. `say` is the short
 * phonetic spelling (shown as text), `speak` is the full sentence handed to
 * speech synthesis, `tip` is the one-line coaching note, matching the three
 * fields Desi's static W object already used elsewhere in this app.
 */
const PRONOUNCE = {
  'Louis Michel, Chablis 1er Cru': { say: 'shah-BLEE', speak: 'Louis Michel. Shah blee, premier cru.', tip: 'Two syllables. The h is silent.' },
  'Domaine Vacheron, Sancerre': { say: 'vash-ROHN, sahn-SEHR', speak: 'Vash rohn. Sahn sehr.', tip: 'Sancerre is two beats, both short.' },
  'Pepiere, Muscadet Clos des Briords': { say: 'pay-PYAIR, muss-kah-DAY', speak: 'Pay pyair. Muss kah day.', tip: 'The final T in Muscadet is silent.' },
  'Felines Jourdan, Picpoul': { say: 'feh-LEEN zhoor-DAHN, peek-POOL', speak: 'Feh leen zhoor dahn. Peek pool.', tip: 'Picpoul rhymes with cool.' },
  'Pataille, Bourgogne Aligote': { say: 'pah-TIE, ah-lee-goh-TAY', speak: 'Pah tie. Bourgogne, ah lee goh tay.', tip: 'Aligote gets a hard T at the end.' },
  'Huet, Vouvray Demi-Sec': { say: 'oo-AY, voo-VRAY', speak: 'Oo ay. Voo vray, deh mee sek.', tip: 'The H in Huet is silent. Start with the oo.' },
  'Berthet-Bondet, Jura Savagnin': { say: 'ber-TAY bon-DAY, sah-vahn-YAN', speak: 'Ber tay bon day. Sah vahn yan.', tip: 'Savagnin, not sauvignon. Different grape entirely.' },
  'Gimonnet, Blanc de Blancs Champagne': { say: 'zhee-moh-NAY', speak: 'Zhee moh nay. Blanc de Blancs.', tip: 'Two syllables that matter: moh-NAY.' },
  'Foillard, Morgon': { say: 'fwah-YAR, mor-GOHN', speak: 'Fwah yar. Mor gohn.', tip: 'Foillard rhymes with the back half of boulevard.' },
  'Joguet, Chinon': { say: 'zho-GAY, shee-NOHN', speak: 'Zho gay. Shee nohn.', tip: 'Chinon lands on the second syllable.' },
  'Bouvier, Marsannay': { say: 'boo-vee-AY, mar-sah-NAY', speak: 'Boo vee ay. Mar sah nay.', tip: 'Marsannay, three even beats.' },
  'Trapet, Gevrey-Chambertin': { say: 'zhev-RAY shom-ber-TAN', speak: 'Trah pay. Zhev ray shom ber tan.', tip: 'Land on TAN and stop.' },
  'Vincent Paris, Cornas': { say: 'kor-NAHSS', speak: 'Vincent Paris. Kor nahss.', tip: 'The S at the end is pronounced, unusually for French.' },
  'Graillot, Crozes-Hermitage': { say: 'gray-YOH, krohz-air-mee-TAHZH', speak: 'Gray yoh. Krohz air mee tahzh.', tip: 'Hermitage keeps its H silent, like most French H.' },
  'Corison, Napa Cabernet': { say: 'kor-ih-SUN', speak: 'Corison. Napa cabernet.', tip: 'No French rules here, just say it plainly.' },
  "Pichon Comtesse Reserve, Pauillac": { say: 'pee-SHOHN kohn-TESS, poh-YACK', speak: 'Pee shohn kohn tess. Poh yack.', tip: 'Pauillac rhymes with cognac.' },
  'Tournelle, Arbois Poulsard': { say: 'toor-NELL, ar-BWAH pool-SAR', speak: 'Toor nell. Ar bwah, pool sar.', tip: 'Poulsard, the S is silent.' },
  'Tempier, Bandol Rose': { say: 'tahm-pee-AY, bahn-DOLE', speak: 'Tahm pee ay. Bahn dole rose.', tip: 'Bandol takes the stress on the second syllable.' },
  'Red Tail Ridge, Blaufrankisch': { say: 'BLOW-frahn-kish', speak: 'Red Tail Ridge. Blow frahn kish.', tip: 'Blau like the color blue, then frankish.' },
  "Dow's, LBV Port": { say: 'LBV, late bottled vintage', speak: "Dow's. L B V port.", tip: 'Just say the three letters.' },
};

/** Region/grape display strings, "grape . Region, Country" like Desi's meta field. */
const META = {
  'Louis Michel, Chablis 1er Cru': 'chardonnay . Chablis, France',
  'Domaine Vacheron, Sancerre': 'sauvignon blanc . Loire, France',
  'Pepiere, Muscadet Clos des Briords': 'melon de bourgogne . Loire, France',
  'Felines Jourdan, Picpoul': 'picpoul . Languedoc, France',
  'Pataille, Bourgogne Aligote': 'aligote . Burgundy, France',
  'Huet, Vouvray Demi-Sec': 'chenin blanc . Loire, France',
  'Berthet-Bondet, Jura Savagnin': 'savagnin . Jura, France',
  'Gimonnet, Blanc de Blancs Champagne': 'chardonnay . Champagne, France',
  'Foillard, Morgon': 'gamay . Beaujolais, France',
  'Joguet, Chinon': 'cabernet franc . Loire, France',
  'Bouvier, Marsannay': 'pinot noir . Burgundy, France',
  'Trapet, Gevrey-Chambertin': 'pinot noir . Burgundy, France',
  'Vincent Paris, Cornas': 'syrah . Rhone, France',
  'Graillot, Crozes-Hermitage': 'syrah . Rhone, France',
  'Corison, Napa Cabernet': 'cabernet sauvignon . Napa, USA',
  "Pichon Comtesse Reserve, Pauillac": 'cabernet sauvignon . Bordeaux, France',
  'Tournelle, Arbois Poulsard': 'poulsard . Jura, France',
  'Tempier, Bandol Rose': 'mourvedre . Provence, France',
  'Red Tail Ridge, Blaufrankisch': 'blaufrankisch . Finger Lakes, USA',
  "Dow's, LBV Port": 'touriga nacional . Douro, Portugal',
};

/** Glass prices for the wines DEMO marks glass:true, roughly a fifth of the bottle. */
const GLASS_PRICE = {
  'Domaine Vacheron, Sancerre': 23,
  'Pepiere, Muscadet Clos des Briords': 15,
  'Felines Jourdan, Picpoul': 12,
  'Gimonnet, Blanc de Blancs Champagne': 26,
  'Foillard, Morgon': 21,
  'Bouvier, Marsannay': 24,
  'Graillot, Crozes-Hermitage': 25,
  'Tempier, Bandol Rose': 22,
  'Red Tail Ridge, Blaufrankisch': 16,
  "Dow's, LBV Port": 14,
};

/**
 * Build GET /v1/demo's `rows[]` from packages/pairing's DEMO fixture. Each
 * row keeps the contract's capture-row shape (producer/wine_name/region/
 * grape/price/glass_price/client_row_id) AND the engine-ready
 * grape_head/region_head the scoring core actually reads, so
 * pairingAdapter.js's rowToEngineWine can hand these straight to
 * packages/pairing without re-deriving anything.
 *
 * @param {Array} demoWines - packages/pairing/src/demoFixtures.js DEMO
 */
export function buildDemoRows(demoWines) {
  return demoWines.map((w, i) => {
    const [producer, ...rest] = w.label.split(', ');
    const wineName = rest.join(', ') || w.label;
    const pron = PRONOUNCE[w.label] || {};
    const meta = META[w.label] || `${w.grape_head} . ${w.region_head}`;
    return {
      client_row_id: `row-${i + 1}`,
      producer,
      wine_name: wineName,
      label: w.label,
      vintage: null,
      region: w.region_head,
      region_head: w.region_head,
      grape: w.grape_head,
      grape_head: w.grape_head,
      grape_source: 'parsed',
      color: null,
      format: 'bottle',
      price: w.price,
      glass: !!w.glass,
      glass_price: w.glass ? GLASS_PRICE[w.label] || Math.round(w.price / 5) : null,
      raw_line: `${w.label} - $${w.price}`,
      parse_confidence: 'high',
      meta,
      say: pron.say || '',
      speak: pron.speak || w.label,
      tip: pron.tip || '',
    };
  });
}

/** Plain-text rendition of the wine list, as if it were the raw_text a photo
 * of the list would have produced (flavor only; the mocked GET /v1/demo
 * hands back structured `rows` directly rather than relying on the
 * still-stubbed client parser). */
export function buildDemoRawText(rows) {
  return rows.map((r) => `${r.producer}, ${r.wine_name} - $${r.price}`).join('\n');
}
