import React from 'react';
import {
  ensureSession,
  getProfile,
  putProfile,
  capture as apiCapture,
  postCaptureRows,
  patchCorrection,
  getVenues,
  pair as apiPair,
  rate as apiRate,
  fetchRulesBundle,
  getDemo,
  getTableCode,
  getVenuePairings,
  postPairing,
  deleteAccount as apiDeleteAccount,
  getStoredAuthToken,
  setAuthSession as apiSetAuthSession,
} from './api.js';
import { parseWineList, loadRulesBundle } from '../../../../packages/pairing/src/index.js';
import { DEMO as OFFLINE_DEMO_WINES } from '../../../../packages/pairing/src/demoFixtures.js';
import { errorCopy } from './errors.js';
import { track } from './track.js';
import { buildTables, rowToEngineWine, dishToEngineDish, computeOfferings, DIRECTION_FOR_FORMAT } from './pairingAdapter.js';
import { getOfflineTables } from './offlinePairing.js';
import { DEMO_DISHES, DEMO_SECTIONS, DEMO_DEFAULT_PICKED, buildDemoRows } from './demoSeed.js';
import { getBaroloTableData } from './baroloSeed.js';

// ---------------------------------------------------------------------------
// PART 1: UI-level no-signal / offline fallback for TheWine.
//
// If POST /v1/pair fails (most commonly ApiError NETWORK_ERROR - no signal -
// but any failure gets the same treatment) or the app is already known to
// be offline, TheWine still needs to show three real offerings, not an
// error and not a hardcoded demo array. packages/pairing's scoring engine
// needs nothing from the network to do this: it is a pure function over the
// dishes already chosen, whatever wine rows are already loaded, and the
// rules tables - see lib/offlinePairing.js's own doc comment ("Lane B"),
// whose getOfflineTables() this reuses verbatim (cached server bundle if
// this tab ever had signal, else the same CSVs shipped in the JS bundle at
// build time, zero network either way).
//
// "Already-loaded wine rows": preference order is (1) st.demoWineRows, the
// real wine list this session already parsed (the /t/demo path, or a real
// camera capture once that pipeline lands rows), (2) OFFLINE_WINE_ROWS
// below - the same packages/pairing DEMO fixture the /t/demo mock is built
// from (see demoSeed.js's own header), converted with the same
// buildDemoRows() helper. That fixture ships inside this app's JS bundle
// exactly like offlinePairing.js's LOCAL_TABLES CSVs do, so it is "already
// loaded" the moment the tab opens, never fetched.
const OFFLINE_WINE_ROWS = buildDemoRows(OFFLINE_DEMO_WINES);

// Desi's static DISHES (used off the /t/demo path) have no `components`
// field for the scoring engine to read. DEMO_DISHES shares most of the same
// ids with `components` filled in (see demoSeed.js), so it doubles as a
// components lookup for the offline fallback rather than duplicating that
// data a third time.
const OFFLINE_COMPONENTS_BY_ID = new Map(DEMO_DISHES.map((d) => [d.id, d.components]));

function withOfflineComponents(dish) {
  if (dish.components) return dish;
  const components = OFFLINE_COMPONENTS_BY_ID.get(dish.id);
  return components ? Object.assign({}, dish, { components }) : dish;
}

/**
 * The offline/no-signal counterpart to the /t/demo engine call above: same
 * computeOfferings() call, same role-labelled offerings/compromise shape,
 * sourced entirely from what is already in memory or already in the bundle.
 * @param {'course_it_out'|'one_bottle'|'several'} direction
 * @param {Array} chosenDishes - the table's already-picked dishes.
 * @param {Array} alreadyLoadedWineRows - st.demoWineRows, may be empty.
 */
/** The budget as a {min,max} range for the engine: min is a soft floor
 * (penalises cheaper bottles, does not exclude), max is the ceiling. */
function budgetOf(st) {
  return { min: Math.min(st.bMin, st.bMax), max: Math.max(st.bMin, st.bMax) };
}

function computeOfflineOfferings(direction, chosenDishes, alreadyLoadedWineRows, opts = {}) {
  const T = getOfflineTables();
  const rows = alreadyLoadedWineRows && alreadyLoadedWineRows.length ? alreadyLoadedWineRows : OFFLINE_WINE_ROWS;
  const wines = rows.map(rowToEngineWine);
  const dishes = chosenDishes.map(withOfflineComponents);
  return computeOfferings(direction, dishes, wines, T, opts);
}

const NAVY="#1F2A44",PEAR="#EFB96B",ORANGE="#F2993D",BLUED="#5C8A9C";

const THEME={
 light:{page:"#FBFAF7",card:"#fff",ink:"#1C1C1A",muted:"#6B6B66",rule:"#E3E1DB",chrome:"#1F2A44",chromeSub:"#A5CFDD",sel:"#FCF1E1",selBd:"#EFB96B",sunken:"#F1EFEA",warnBg:"#FEF3E7",warnBd:"#F2993D",warnInk:"#C4701A",blueBg:"#F4F8F9",blue:"#5C8A9C",pearInk:"#8A5A18",accent2:"#1F2A44",hover2:"#F4F2EC"},
 dark:{page:"#151A29",card:"#1E2438",ink:"#F3F1EB",muted:"#9EA2AE",rule:"#303A55",chrome:"#0E1320",chromeSub:"#8FB6C4",sel:"#2E2618",selBd:"#8A6A2A",sunken:"#222941",warnBg:"#3A2A18",warnBd:"#F2993D",warnInk:"#F2993D",blueBg:"#1A2731",blue:"#7FAFC0",pearInk:"#F2C889",accent2:"#EFB96B",hover2:"#2A3350"}};
const HC={
 light:{ink:"#000",muted:"#33332F",rule:"#8C8C86",sel:"#FCF1E1",selBd:"#8A5A18",pearInk:"#6E4610",warnInk:"#8A3E00",accent2:"#0F1729"},
 dark:{ink:"#FFFFFF",muted:"#DEDED8",rule:"#8E9AB5",sel:"#3D3220",selBd:"#F2C889",pearInk:"#FFDDAE",accent2:"#FFE0AE"}};

const DISHES=[
 {id:"r1",sec:"Raw bar",n:"Oysters, half dozen",d:"East coast, mignonette, lemon",p:24},
 {id:"r2",sec:"Raw bar",n:"Tuna crudo",d:"blood orange, fennel, Espelette, olive oil",p:23},
 {id:"r3",sec:"Raw bar",n:"Shrimp cocktail",d:"horseradish, celery heart",p:21},
 {id:"a2",sec:"Starters",n:"Moules en cassoulette",d:"mussels, Sancerre, shallots, creme fraiche, thyme",p:22},
 {id:"a5",sec:"Starters",n:"Chicken & duck liver pate",d:"confiture, pickled jardiniere, grain mustard",p:20},
 {id:"a4",sec:"Starters",n:"Salade de chevre chaud",d:"warm Boucheron, hazelnuts, Dijon vinaigrette",p:17},
 {id:"a8",sec:"Starters",n:"Local burrata",d:"pickled rhubarb, radicchio, blood orange, pistachio dukkah",p:23},
 {id:"a3",sec:"Starters",n:"Soupe a l'oignon",d:"veal stock, Gruyere, sourdough croute",p:16},
 {id:"a7",sec:"Starters",n:"Escargots de Bourgogne",d:"garlic parsley butter, baguette",p:19},
 {id:"e6",sec:"Mains",n:"Chicken roti",d:"pee wee potatoes, carrots, morel mushrooms, garlic jus",p:35},
 {id:"e9",sec:"Mains",n:"Steak frites Aquitaine",d:"hanger steak, shallot jus, Perigord black truffle vinaigrette",p:48},
 {id:"e2",sec:"Mains",n:"Sole meuniere",d:"artichoke barigoule, snap peas, pommes Robuchon, beurre citron",p:38},
 {id:"e7",sec:"Mains",n:"Seared duck breast",d:"maitake, minted pea puree, madeira reduction",p:39},
 {id:"e4",sec:"Mains",n:"Cassoulet Toulousain",d:"duck confit, garlic sausage, tarbais beans",p:36},
 {id:"e5",sec:"Mains",n:"Pork chop Normande",d:"apple, calvados cream, savoy cabbage",p:37},
 {id:"e8",sec:"Mains",n:"Ratatouille en cocotte",d:"summer squash, basil, chevre, olive crumb",p:29},
 {id:"e3",sec:"Mains",n:"Bouillabaisse",d:"rouille, saffron, gruyere toasts",p:44},
 {id:"s2",sec:"Sides",n:"Truffle frites",d:"parmesan, fines herbes, aioli",p:13},
 {id:"s6",sec:"Sides",n:"Roasted mushrooms",d:"thyme, sea salt",p:null},
 {id:"s3",sec:"Sides",n:"Haricots verts",d:"almond, brown butter",p:11},
 {id:"s4",sec:"Sides",n:"Pommes puree",d:"a great deal of butter",p:12},
 {id:"d1",sec:"Dessert",n:"Tarte tatin",d:"creme fraiche glacee",p:14},
 {id:"d2",sec:"Dessert",n:"Profiteroles",d:"vanilla ice cream, warm chocolate",p:13},
 {id:"d3",sec:"Dessert",n:"Ile flottante",d:"creme anglaise, spun sugar",p:12},
 {id:"d4",sec:"Dessert",n:"Cheese, three",d:"Comte, Epoisses, Roquefort, honeycomb",p:18}];
const SECS=["Raw bar","Starters","Mains","Sides","Dessert"];

const W={
 gim:{prod:"Pierre Gimonnet & Fils",wine:"Blanc de Blancs 1er Cru Brut",meta:"chardonnay . Champagne, France",say:"zhee-moh-NAY",speak:"Zhee moh nay. Blanc de Blancs.",tip:"Two syllables that matter: moh-NAY. The rest can mumble.",glass:26,btl:138,stock:6},
 trapet:{prod:"Domaine Trapet",wine:"Gevrey-Chambertin",meta:"pinot noir . Burgundy, France",say:"zhev-RAY shom-ber-TAN",speak:"Trah pay. Zhev ray shom ber tan.",tip:"Land on TAN and stop.",glass:null,btl:234,stock:3},
 foil:{prod:"Jean Foillard",wine:"Morgon Cote du Py",meta:"gamay . Beaujolais, France",say:"fwah-YAR, mor-GOHN",speak:"Fwah yar. Mor gohn, coat due pee.",tip:"Foillard rhymes with the back half of boulevard.",glass:21,btl:102,stock:11},
 vach:{prod:"Domaine Vacheron",wine:"Sancerre",meta:"sauvignon blanc . Loire, France",say:"vash-ROHN, sahn-SEHR",speak:"Vash rohn. Sahn sehr.",tip:"Sancerre is two beats, both short.",glass:23,btl:102,stock:14},
 huet:{prod:"Domaine Huet",wine:"Vouvray Sec Le Mont",meta:"chenin blanc . Loire, France",say:"oo-AY, voo-VRAY",speak:"Oo ay. Voo vray sec, luh mohn.",tip:"The H is silent. Start with the oo.",glass:22,btl:100,stock:9}};

const BRIEF={
 gim:{means:"Blanc de Blancs means white from whites, so this is Champagne made only from chardonnay, no red grapes in it at all. 1er Cru is the second best vineyard rank in the region. Gimonnet is a grower, which means they farm what they bottle rather than buying grapes in.",
  notes:["green apple","lemon peel","fine bubbles","chalk","brioche"],
  why:"Mussels in cream and a liver pate want opposite things. Acid cuts the creme fraiche, bubbles scrub the fat off the pate, and Champagne is one of the few wines that does both without picking a side.",
  bridge:"You would like a good Cremant de Bourgogne. Same method, half the price, and nobody at the table can tell in a dark room.",
  yours:"You rated a Gimonnet five stars at Le Coucou in May, with the oysters."},
 trapet:{means:"Gevrey-Chambertin is a village in Burgundy, and in Burgundy the village is the label. The grape is pinot noir, always. Trapet farms biodynamically, which mostly means old vines and very little intervention.",
  notes:["red cherry","forest floor","dried rose","soft tannin","earth"],
  why:"The roti has morels and the steak has a black truffle vinaigrette. Both are earthy, and pinot noir from Gevrey is the most earthy red that still stays light. One bottle, two mains, nothing given up.",
  bridge:"Look for a Morey-Saint-Denis next time. Neighbouring village, same grape, usually forty dollars less.",
  yours:"First time. If it lands, we will know something new about you."},
 foil:{means:"Morgon is one of the ten crus of Beaujolais, and Cote du Py is its best hill. The grape is gamay. Foillard is one of the four growers who dragged the region back from cheap Nouveau, so this is a serious wine with a silly reputation.",
  notes:["black cherry","violet","granite","light tannin","bright acid"],
  why:"Light enough for the chicken, structured enough for the steak. Gamay is the one red that rarely gets in anyone's way, which is why it wins tables where nobody agrees.",
  bridge:"Try a Fleurie if you want the same wine with the volume turned down.",
  yours:"You had a Foillard at Bistro Vendome in June and gave it four stars."},
 vach:{means:"Sancerre is a town in the Loire, and the grape is sauvignon blanc. Vacheron are the family who farm the good slopes and have done for generations.",
  notes:["grapefruit","wet stone","cut grass","high acid","dry finish"],
  why:"It is the wine that disappoints the fewest people at a table with mussels and a steak on it. That is faint praise and it is also exactly what you want when nobody has told us anything.",
  bridge:"A Pouilly-Fume from across the river is the same idea with a little smoke on it.",
  yours:"Not yet. Sarah rates this producer five stars."},
 huet:{means:"Vouvray is Loire chenin blanc. Sec means dry, which matters here because Vouvray is also made sweet. Le Mont is Huet's middle vineyard, and Huet is the reference producer for the whole appellation.",
  notes:["quince","honey","chamomile","wool","bracing acid"],
  why:"Chenin sits between a Sancerre and a white Burgundy. Richer than the first, no oak like the second, and enough acid to handle butter without going flabby.",
  bridge:"If this lands, a dry Savennieres is the next step up the same road.",
  yours:"Your highest rated bottle. Five stars, twice, at Aquitaine and once at home."}};

// None of these connect yet: there is no built integration. CellarTracker has a
// real (password-based) path so it reads "not yet connected"; the others have no
// usable public API today (Vivino's shut down ~2020, Wine.com's deprecated 2017,
// Delectable has none) so they are "coming soon". No fake "connected" state, and
// nothing is default-linked - an App Store reviewer tapping a fiction is a reject.
const ACCOUNTS=[
 {k:"CellarTracker",status:"available",sub:"Read your cellar and tasting notes"},
 {k:"Vivino",status:"coming_soon",sub:"Read your ratings"},
 {k:"Wine.com",status:"coming_soon",sub:"Read your order history"},
 {k:"Delectable",status:"coming_soon",sub:"Read your saved bottles"}];

const RAIL=["Welcome","Sign in","1 . Knowledge","2 . Adventure","3 . Budget","4 . Taste","5 . Must know","6 . That's it","Where to","The menu","How to drink","The wine","Present","How was it","Your profile","Sarah's profile","Bottle brief","Settings","Camera"];
const CTA=["Get going","Set my taste","Next","Next","Next","Next","Next","Find table","Continue","Pair it","Show wine","Present","Rate it","Save it","Her list","New table","Back to wine","Done","Use this"];

const MY_HISTORY=[
 ["Domaine Huet, Vouvray Sec","Aquitaine . 12 Jul","with the sole meuniere",5],
 ["Jean Foillard, Morgon","Bistro Vendome . 28 Jun","with the duck confit",4],
 ["Hermann J. Wiemer, Dry Riesling","at home . 14 Jun","with takeaway Thai",5],
 ["Chateau Cap de Faugeres","Aquitaine . 2 Jun","with the steak frites",3],
 ["Pierre Gimonnet, Blanc de Blancs","Le Coucou . 18 May","with the oysters",5]];
const SARAH_HISTORY=[
 ["Domaine Huet, Vouvray Sec","Aquitaine . 12 Jul",5],
 ["Sancerre, Vacheron","Bistro Vendome . 28 Jun",5],
 ["Barbaresco, Produttori","Rezdora . 3 Jun",4],
 ["Muscadet, Pepiere","Neptune . 21 May",4]];

export const RAIL_LABELS = RAIL;
export { W, BRIEF, DISHES, SECS, ACCOUNTS };
// Exported for unit testing the PUT /v1/profile payload shape in isolation
// (no React render needed): see lib/state.test.js.
export { buildProfilePayload };

// ---------------------------------------------------------------------------
// Routing bridge. Index = screen number (matches SCREENS in App.jsx), value
// = the canonical URL for that screen. Screens without a dedicated route in
// the required 14 (SignIn, FriendProfile, BottleBrief, Settings) still get a
// sensible nested path so they are deep-linkable; go() below just navigates
// there when the in-app UI moves to that screen index.
// ---------------------------------------------------------------------------
const PATH_FOR_SCREEN = [
  '/',                   // 0  Welcome
  '/signin',             // 1  SignIn
  '/setup/1',            // 2  Q1Knowledge
  '/setup/2',            // 3  Q2Adventure
  '/setup/3',            // 4  Q3Budget
  '/setup/4',            // 5  Q4Taste
  '/setup/5',            // 6  Q5MustKnow
  '/setup/6',            // 7  Q6Summary
  '/venue',              // 8  WhereTo
  '/menu',               // 9  Menu
  '/direction',          // 10 HowToDrink
  '/wines',              // 11 TheWine
  '/server',             // 12 Present
  '/rate',               // 13 RateIt
  '/profile',            // 14 YourProfile
  '/profile/friend',     // 15 FriendProfile
  '/wines/brief',        // 16 BottleBrief
  '/profile/settings',   // 17 Settings
  '/capture',            // 18 Camera
];

// ---------------------------------------------------------------------------
// PUT /v1/profile mapping. This is a lossy seam: Desi's onboarding UI has no
// slot for several of the API's fields (or vice versa). See the mapping
// notes inline; the seam is also called out in the handoff report.
// ---------------------------------------------------------------------------
const LEVEL_OPTIONS = ["1 . Just point at something","2 . I know what I like","3 . I read the list","4 . I could write the list"];
const WANT_OPTIONS = ["Happy where I am","I want to learn more","Take me all the way"];
const ALLERGY_LABELS = new Set(['shellfish','nuts','dairy','gluten','egg','sulfite sensitive']);
const DIETARY_LABELS = new Set(['vegetarian','vegan','pescatarian']);
const NOT_DRINKING_LABELS = new Set(['no alcohol for me','pregnant']);
const PARSER_VERSION = 'pairme-web-stub/0.0.0';

// Every onboarding screen's free-text box, keyed by screen, so an answer
// with no dedicated flat slot (levelOwn/advOwn/budgetOwn) is not silently
// dropped. Additive to the flat likes_free_text/dislikes_free_text/
// allergies_free_text slots the contract documents, not a replacement for
// them (see buildProfilePayload below). BE CATCH-UP: preferences.free_text
// as a nested jsonb blob is not yet in the documented PairMe API Contract
// v1; FE wires it ahead of the BE per the demo spec.
function buildFreeText(st) {
  const ft = {};
  if (st.levelOwn) ft.knowledge = st.levelOwn;
  if (st.advOwn) ft.adventure = st.advOwn;
  if (st.budgetOwn) ft.budget = st.budgetOwn;
  if (st.loveOwn || st.notOwn) ft.taste = { love: st.loveOwn || null, not: st.notOwn || null };
  if (st.dietOwn) ft.must_know = st.dietOwn;
  return ft;
}

function buildProfilePayload(st) {
  const allergies = st.diet.filter((d) => ALLERGY_LABELS.has(d));
  const dietary = st.diet.filter((d) => DIETARY_LABELS.has(d));
  const notDrinking = st.diet.some((d) => NOT_DRINKING_LABELS.has(d));
  const hi = Math.max(st.bMin, st.bMax);
  const lo = Math.min(st.bMin, st.bMax);
  const somLevel = LEVEL_OPTIONS.indexOf(st.level) + 1;
  const targetLevel = WANT_OPTIONS.indexOf(st.want) + 1;
  const freeText = buildFreeText(st);
  return {
    preferences: {
      som_level: somLevel > 0 ? somLevel : undefined,
      target_level: targetLevel > 0 ? targetLevel : undefined,
      adventure: st.adv || undefined,
      // Desi's UI collects a floor and a ceiling and BOTH are real signal: the
      // ceiling protects "we never show you what you didn't ask to see", and the
      // floor says the diner does not want the cheapest bottle on the list. Send
      // the range; the client engine treats the floor as a soft penalty, not an
      // exclusion. `budget` stays the ceiling for backward compatibility.
      budget: hi || undefined,
      budget_min: lo || undefined,
      budget_max: hi || undefined,
      celebration_flag: !!st.bump,
      likes: st.likes,
      likes_free_text: st.loveOwn || null,
      dislikes: st.dislikes,
      dislikes_free_text: st.notOwn || null,
      not_drinking: notDrinking,
      free_text: Object.keys(freeText).length ? freeText : undefined,
    },
    safety: {
      allergies,
      dietary,
      // dietOwn is one free text box under a combined "allergies and
      // dietary" header in Q5MustKnow; there is no separate dietary free
      // text slot in the contract, so it lands on allergies_free_text.
      allergies_free_text: st.dietOwn || null,
    },
  };
}

function hydrateFromProfile(profile) {
  if (!profile) return {};
  const p = profile.preferences || {};
  const s = profile.safety || {};
  const patch = {};
  if (p.som_level && LEVEL_OPTIONS[p.som_level - 1]) patch.level = LEVEL_OPTIONS[p.som_level - 1];
  if (p.target_level && WANT_OPTIONS[p.target_level - 1]) patch.want = WANT_OPTIONS[p.target_level - 1];
  if (p.adventure) patch.adv = p.adventure;
  if (p.budget) patch.bMax = p.budget;
  if (Array.isArray(p.likes) && p.likes.length) patch.likes = p.likes;
  if (p.likes_free_text) patch.loveOwn = p.likes_free_text;
  if (Array.isArray(p.dislikes) && p.dislikes.length) patch.dislikes = p.dislikes;
  if (p.dislikes_free_text) patch.notOwn = p.dislikes_free_text;
  const diet = [].concat(s.allergies || [], s.dietary || []);
  if (diet.length) patch.diet = diet;
  return patch;
}

function mapDirection(st) {
  // Maps HowToDrink's glass-vs-bottle + sub choice onto the engine's four
  // framings. The three the demo walks (item 7):
  //   glass  + coursed -> course_it_out  (a pour per course, in course order)
  //   glass  + mains   -> mains_only     (one pour for the mains; starters SAID unpaired)
  //   bottle + single  -> one_bottle     (one wine across everything, compromise shown)
  // bottle + coursed is also course_it_out (a bottle per course). No sub yet
  // chosen falls back to `several`, a flat table-wide shortlist.
  if (st.sub === 'single') return 'one_bottle';
  if (st.sub === 'mains') return 'mains_only';
  if (st.sub === 'coursed') return 'course_it_out';
  return 'several';
}

/**
 * Single source of truth for the whole app. Every screen is a pure function
 * of the object this returns (Desi's contract, unchanged). This version
 * additionally:
 *   - bootstraps identity (POST /v1/session) and hydrates the profile
 *     (GET /v1/profile) on mount,
 *   - writes the onboarding answers back with PUT /v1/profile,
 *   - drives the real venue search (GET /v1/venues),
 *   - runs the capture -> parse (stub) -> POST rows pipeline,
 *   - calls POST /v1/pair and POST /v1/rating at the right seams,
 *   - bridges screen navigation to react-router paths via `go`/`syncFromRoute`.
 *
 * @param {object} [opts]
 * @param {(path: string) => void} [opts.navigate] - react-router navigate.
 * @param {() => void} [opts.openCamera] - opens the capture=environment file input.
 * @param {() => void} [opts.openGallery] - opens the plain file input.
 */
export function usePairMe(opts = {}){
  const { navigate, openCamera, openGallery } = opts;
  const [st, set] = React.useState({s:0,dark:false,hc:false,
    level:"2 . I know what I like",want:"I want to learn more",adv:3,
    bMin:60,bMax:140,bump:null,
    likes:["Burgundy","Loire whites","Beaujolais"],dislikes:["heavy oak"],diet:["shellfish"],
    levelOwn:"",advOwn:"",budgetOwn:"",loveOwn:"",notOwn:"",dietOwn:"",unreadable:"",why:"",
    guestName:"",rel:null,added:[],
    venueQ:"",eatText:"",noList:false,blank:false,picked:["a2","a5","e6","e9","s2"],
    mode:null,sub:null,scope:null,present:["gim","trapet"],wineFormat:"both",
    guest:"me",guestDrawerOpen:false,guestShareNote:null,resolution:null,rate:{dish:4,wine:5,pair:4},fb:"",share:true,listening:null,skipped:0,
    linked:[],connectionsOpen:false,account:null,bottle:"trapet",back:11,saved:false,shared:null,
    // Integration state (not part of Desi's original demo model).
    apiError:null,apiLoading:false,
    anonId:null,
    // AUTH CONTRACT (locked, feat/pairme-accounts-be): read once at mount
    // from the same localStorage key api.js's setAuthSession()/isLoggedIn()
    // use, so a page reload keeps a diner logged in. Login is ALWAYS
    // optional (see goLogin/setAuthenticated below and screens/Login.jsx) -
    // nothing in the /t/:code walk reads or waits on this.
    authToken:getStoredAuthToken(),
    captureId:null,rawText:"",captureRows:[],correctionsCount:0,
    pairOfferings:null,pairCompromise:null,
    venueResults:[],venueMessage:null,selectedVenueId:null,
    tableCode:null,
    // ITEM 8b: the "Demo state" toggles (blank profile, no-wine-list) are debug
    // controls that were sitting in the live diner flow. Gate them behind a
    // ?debug query param so a real diner never sees them; a demo driver adds
    // ?debug to the URL to get them back.
    debug:(typeof window!=="undefined"&&window.location&&window.location.search)?new URLSearchParams(window.location.search).has("debug"):false,
    // LANE A (/t/demo): seeded venue/menu/wine-list + the client-side
    // scoring engine's output. demoDishes stays null off the /t/demo path,
    // so every other entry point keeps using Desi's static DISHES/offerSet
    // exactly as before.
    venueName:null,venueCity:null,
    demoLoading:false,demoDishes:null,demoWineRows:[],venuePushed:[],
    rulesTables:null,rulesVersion:null,
    pairingDirection:null,pairingOfferings:null,pairingCompromise:null,pairingCoverage:null,
    pairingId:null,presentLabels:[],
    deleteConfirming:false,deleteDone:false});
  const patch = (p) => set(s => Object.assign({}, s, typeof p === 'function' ? p(s) : p));
  const bodyEl = React.useRef(null);
  const secs = React.useRef({});
  // Guards onboard_start firing once per app boot, not on every revisit of
  // screen 2 (rail nav, in-screen back, browser back/forward all call go(2)).
  const onboardStartFired = React.useRef(false);

  // --- Bootstrap: identity + profile hydrate + rules bundle warm up -------
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const anonId = await ensureSession();
        if (cancelled) return;
        patch({ anonId });
        track('launch');
        const profile = await getProfile();
        if (cancelled) return;
        patch(hydrateFromProfile(profile));
      } catch (err) {
        if (!cancelled) patch({ apiError: err.message || 'Could not load your saved taste. Starting fresh.' });
      }
      // The rules bundle IS the pairing API (POST /v1/pair was removed by
      // design; see PairMe API Contract v1). buildTables() indexes it into
      // the shape packages/pairing's scoring core reads; computeOfferings
      // (pairingAdapter.js) is what actually calls the engine, at the
      // HowToDrink -> TheWine seam below.
      try {
        const bundle = await loadRulesBundle((sinceVersion) => fetchRulesBundle(sinceVersion));
        if (!cancelled && bundle && bundle.tables) {
          patch({ rulesTables: buildTables(bundle.tables), rulesVersion: bundle.version });
        }
      } catch (e) {
        // Non-fatal: HowToDrink's cta guards on rulesTables being present.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- LANE A / PART 2: /t/:code loads a seeded venue + wine list + food
  // menu ---------------------------------------------------------------
  // Runs for ANY table code (TableCodeRoute sets tableCode from the :code
  // param); every route with no tableCode at all leaves demoDishes null so
  // the rest of the app keeps using Desi's static DISHES/offerSet, unchanged.
  //
  // `/t/demo` keeps calling GET /v1/demo exactly as before (untouched
  // behaviour, still mocked - the real backend for THAT path exists per the
  // LANE A brief). Every other code calls GET /v1/t/:code, the generic
  // resolver PART 2 wires against. That endpoint is NOT built server side
  // yet - it rides superset #340 - so this is coded against the contract
  // this FE expects (see lib/api.js's getTableCode doc comment) and mocked
  // in tests until the BE catches up. Both calls return the same shape
  // ({venue, capture_id, raw_text, rows}), so one success handler covers
  // both; a resolver 404 (VENUE_NOT_FOUND) or any other failure is shown as
  // plain language via errorCopy() - never a raw error code - and the walk
  // stays on Menu with Desi's static DISHES rather than a broken screen.
  //
  // LOOSE END, fixed (carried over from the /t/demo-only version of this
  // effect): `st.demoLoading` used to be in this effect's own dependency
  // array. patch({demoLoading:true}) below re-renders with demoLoading now
  // true, which - because it was a dependency - re-ran this very effect.
  // React runs the PREVIOUS invocation's cleanup first, setting that
  // invocation's own `cancelled` to true; the in-flight `await
  // ensureSession()` above then resumed to find its own closure's
  // `cancelled` already true and returned before ever calling the resolver.
  // Net effect: the fetch self-cancelled on every load and this path
  // silently fell back to Desi's static DISHES/offerSet. demoLoading is
  // still read (not written) inside the effect body as a guard against a
  // stray re-run from the two deps that remain, it just cannot also be a
  // dependency of the same effect that sets it.
  React.useEffect(() => {
    if (!st.tableCode || st.demoDishes || st.demoLoading) return;
    let cancelled = false;
    (async () => {
      patch({ demoLoading: true });
      try {
        const anonId = await ensureSession();
        if (cancelled) return;
        // /t/barolo: the entry-points brief's seeded second venue - a real
        // committed wine-list fixture (packages/pairing/data/wine_list_
        // fixtures/barolo.txt, ~1832 rows via parseWineList, see
        // baroloSeed.js), parsed client-side with zero network, fed into
        // this SAME data path /t/demo's GET /v1/demo response already
        // feeds. No BE call for this code, unlike the generic GET
        // /v1/t/:code resolver below (superset #340, not built yet).
        const data = st.tableCode === 'demo' ? await getDemo()
          : st.tableCode === 'barolo' ? await getBaroloTableData()
          : await getTableCode(st.tableCode);
        if (cancelled) return;
        patch({
          anonId,
          venueName: (data.venue && data.venue.name) || 'Aquitaine',
          venueCity: data.venue && data.venue.city && data.venue.state ? `${data.venue.city}, ${data.venue.state}` : '',
          selectedVenueId: (data.venue && data.venue.id) || null,
          captureId: data.capture_id || null,
          rawText: data.raw_text || '',
          demoWineRows: data.rows || [],
          demoDishes: DEMO_DISHES,
          picked: DEMO_DEFAULT_PICKED,
          demoLoading: false,
        });
        // Close the operator loop: the diner reads what this venue pushed, so an
        // operator's featured picks reach the person they were for. Best-effort
        // and always DISCLOSED downstream (a pushed wine is never hidden and
        // never costs the diner more). Never blocks the walk if it fails.
        try {
          const vp = await getVenuePairings(st.tableCode);
          if (!cancelled) patch({ venuePushed: Array.isArray(vp.pushed) ? vp.pushed : [] });
        } catch (e) { /* no featured section if this venue has none / fetch fails */ }
      } catch (err) {
        // errorCopy() renders the server's own plain-language 404 message
        // for VENUE_NOT_FOUND verbatim, and a client-safe sentence (never a
        // raw error_code/status) for anything else (a dead network, a
        // malformed response, an unmocked/undeployed resolver).
        if (!cancelled) patch({ demoLoading: false, apiError: errorCopy(err) });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.tableCode, st.demoDishes]);

  // --- Real venue search (GET /v1/venues), replacing the hardcoded demo ---
  React.useEffect(() => {
    const q = st.venueQ;
    if (!q || q.trim().length < 2) {
      if (st.venueResults.length || st.venueMessage) patch({ venueResults: [], venueMessage: null });
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await getVenues(q);
        if (cancelled) return;
        if (res.covered === false) {
          patch({ venueResults: [], venueMessage: res.message });
        } else {
          patch({ venueResults: res.venues || [], venueMessage: null });
        }
      } catch (err) {
        if (!cancelled) patch({ venueResults: [], venueMessage: err.message });
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.venueQ]);

  const go=(n)=>{
    // Onboarding screens are indices 2..7 (Q1Knowledge..Q6Summary); the
    // event set numbers them screen_1..screen_6 (n-1).
    if (n===2 && !onboardStartFired.current) {
      onboardStartFired.current = true;
      track('onboard_start');
    }
    if (n>=2 && n<=7) track('screen_'+(n-1));
    if (n===12) track('show_server'); // Present: the wine is about to be shown to the table.
    patch({s:n});
    if(bodyEl.current)bodyEl.current.scrollTop=0;
    const path = PATH_FOR_SCREEN[n];
    if (path && navigate) navigate(path);
  };
  // Called by the route layer when the URL changes (deep link, browser
  // back/forward, or a direct visit) so `s` stays in sync with the path.
  const syncFromRoute=(n,extra)=>{
    patch((s2)=>Object.assign({},s2,{s:n},extra||{}));
  };
  const jumpTo=(name)=>{const el=secs.current[name];if(el&&bodyEl.current)bodyEl.current.scrollTop=el.offsetTop-52;};
  const say=(text)=>{try{const sp=window.speechSynthesis;if(!sp)return;sp.cancel();
      const u=new SpeechSynthesisUtterance(text);u.rate=.82;u.pitch=1;sp.speak(u);}catch(e){}};
  const field=(key)=>{const on=st.listening===key;return {
      v:st[key],set:e=>patch({[key]:e.target.value}),
      mic:()=>patch({listening:on?null:key}),
      bd:on?PEAR:"var(--pm-rule)",bg:on?"var(--pm-sel)":"var(--pm-card)",
      hint:on?"Listening. Say it however you'd say it out loud.":""};};
  const pills=(opts,key,multi)=>opts.map(label=>{
      const cur=st[key],on=multi?(cur||[]).includes(label):cur===label;
      return {label,on,bd:on?"var(--pm-chrome)":"var(--pm-rule)",bg:on?"var(--pm-sel)":"var(--pm-card)",
        pick:()=>patch(st=>({[key]:multi?(st[key].includes(label)?st[key].filter(x=>x!==label):[...st[key],label]):label}))};
    });
  const stars=(n)=>[1,2,3,4,5].map(i=>({n:i,fill:i<=n?PEAR:"transparent",stroke:i<=n?"#E5A44F":"var(--pm-rule)"}));

  // Capture pipeline: POST /v1/capture -> parseWineList (stub, always [])
  // -> POST /v1/capture/:id/rows (404 expected until BE catches up, G1).
  const handleCaptureFile = async (file) => {
    // correctionsCount resets per capture: corrections_per_capture is a
    // quality prop scoped to the capture it corrects, not a lifetime total.
    patch({ camShot: true, apiError: null, correctionsCount: 0 });
    track('capture_start');
    try {
      const captureRes = await apiCapture(file, st.selectedVenueId || undefined);
      track('capture_ok', { extraction_source: captureRes.source });
      const rawText = captureRes.raw_text || captureRes.extraction || '';
      const rows = parseWineList(rawText);
      track('parse_ok', { wines_found: rows.length, extraction_source: captureRes.source });
      await postCaptureRows(captureRes.capture_id, PARSER_VERSION, rows).catch(() => {});
      patch({ camShot: false, captureId: captureRes.capture_id, rawText, captureRows: rows });
      go(9); // -> Menu, same destination as Desi's original demo timeout.
    } catch (err) {
      patch({ camShot: false, apiError: err.message || 'We could not read that photo. Please try again.' });
    }
  };

  // PATCH /v1/capture/:id/corrections. Not called by any screen yet (no
  // correction UI exists, see TheWine/Menu TODOs); exposed on the hook so
  // Lane A/B screens can wire it once that UI lands. corrections_per_capture
  // counts corrections against the currently open capture only.
  const submitCorrection = async (correction) => {
    if (!st.captureId) return;
    try {
      await patchCorrection(st.captureId, correction);
      const count = (st.correctionsCount || 0) + 1;
      patch({ correctionsCount: count });
      track('correction_made', { corrections_per_capture: count });
    } catch (err) {
      patch({ apiError: err.message || 'Could not save that correction.' });
    }
  };

      const s=st.s,dark=st.dark;
      const base=dark?THEME.dark:THEME.light;
      const t=st.hc?Object.assign({},base,dark?HC.dark:HC.light):base;
      const themeVars="--pm-page:"+t.page+";--pm-card:"+t.card+";--pm-ink:"+t.ink+";--pm-muted:"+t.muted+
        ";--pm-rule:"+t.rule+";--pm-chrome:"+t.chrome+";--pm-chromeSub:"+t.chromeSub+";--pm-sel:"+t.sel+
        ";--pm-selBd:"+t.selBd+";--pm-sunken:"+t.sunken+";--pm-warnBg:"+t.warnBg+";--pm-warnBd:"+t.warnBd+
        ";--pm-warnInk:"+t.warnInk+";--pm-blueBg:"+t.blueBg+";--pm-blue:"+t.blue+";--pm-pearInk:"+t.pearInk+
        (st.hc?";--pm-dish:16.5px;--pm-desc:13.5px;--pm-sec:12.5px;--pm-weight:600":"")+
        ";--accent-secondary:"+t.accent2+";--text-primary:"+t.ink+";--text-secondary:"+t.muted+
        ";--surface-card:"+t.card+";--surface-page:"+t.page+";--surface-sunken:"+t.sunken+
        ";--border-default:"+t.rule+";--border-strong:"+t.muted+
        ";--color-navy-50:"+t.hover2+";--color-cream-100:"+t.hover2+";--pm-accent2:"+t.accent2+";color:"+t.ink+";";

      // /t/demo swaps in the seeded menu (with engine-ready `components`);
      // every other route keeps Desi's static DISHES/SECS exactly as before.
      const dishSource=st.demoDishes||DISHES;
      const secSource=st.demoDishes?DEMO_SECTIONS:SECS;
      const chosen=st.picked.map(id=>dishSource.find(d=>d.id===id)).filter(Boolean);
      // BROWSE THE FULL LIST (Moose's demo screen, screens/WineList.jsx via
      // /wines/list - see routes.jsx): same "already-loaded wine rows"
      // preference OFFLINE_WINE_ROWS/computeOfflineOfferings use above, so a
      // direct visit before any pairing has run is never blank.
      const wineListWines=(st.demoWineRows&&st.demoWineRows.length)?st.demoWineRows:OFFLINE_WINE_ROWS;
      const wineListPickedDishes=chosen.map(dishToEngineDish);
      const blank=st.blank,conflict=st.guest==="sarah";
      const lo=Math.min(st.bMin,st.bMax),hi=Math.max(st.bMin,st.bMax);
      const ob=[null,
        {t:"How well do you know wine?",s:"Be honest. This changes what we say, not what we pour."},
        {t:"How adventurous are you feeling?",s:"You can change this at any table, any night."},
        {t:"What's comfortable tonight?",s:"A floor and a ceiling. We never show you what you didn't ask to see."},
        {t:"What do you already love?",s:"Regions, grapes, styles. Whatever comes to mind."},
        {t:"Anything we must know?",s:"This one isn't about taste. We take it seriously."},
        {t:"That's everything.",s:"Six questions, done. Have a full glass."}][s];
      const glassH=34*Math.min(1,(s>=1&&s<=6?s:0)/6);

      const offerSet=blank?[
        {k:"vach",role:"Safe, and we mean that kindly",roleColor:t.muted,why:"You've told us nothing, so we won't pretend we know you. Sancerre disappoints the fewest people at a table with mussels and a steak on it.",covers:"Moules, the pate, most of the table"},
        {k:"foil",role:"If you want a red",roleColor:t.muted,why:"Light enough for the chicken, structured enough for the steak. Gamay is the one red that rarely gets in anyone's way.",covers:"Chicken roti and the steak frites"},
        {k:"huet",role:"House suggestion",roleColor:t.blue,why:"Aquitaine features this one. Chenin sits between the two above, a little richer than the Sancerre, no tannin at all.",covers:"Everything except the steak"}
      ]:[
        {k:"gim",role:"House suggestion",roleColor:t.blue,why:"Mussels in cream and a liver pate don't usually want the same wine. Champagne is the one thing that serves both: the acid cuts the creme fraiche, the bubbles handle the fat.",covers:"Moules and the pate"},
        {k:"trapet",role:"Suited to you",roleColor:t.pearInk,why:"You said you love Burgundy. Lucky night: the roti has morels, the steak has a black truffle vinaigrette, and both point at the same bottle.",covers:"Chicken roti, steak frites and the truffle frites"},
        {k:"foil",role:"Simpler, cheaper, still good",roleColor:t.muted,why:"If two bottles feels like a lot, Foillard's Morgon is the one wine here nobody at the table will argue with, and it's a third of the Gevrey.",covers:"Everything, if you'd rather keep it easy"}
      ];
      const presentKeys=st.present.filter(k=>offerSet.some(o=>o.k===k));
      const shownKeys=presentKeys.length?presentKeys:[offerSet[0].k];

      // /t/demo: real offerings from packages/pairing's scoring engine
      // (computed at the HowToDrink -> TheWine seam above), role-labelled
      // house/suited/crowd, each with a reason pulled from its own fired
      // rule and a pronunciation. Every other entry point has no
      // pairingOfferings and falls straight back to offerSet/W above,
      // unchanged.
      const usingEngine=Array.isArray(st.pairingOfferings)&&st.pairingOfferings.length>0;
      const pairingDirection=st.pairingDirection;
      const roleColorFor=(slot)=>slot==="house"?t.blue:slot==="suited"?t.pearInk:t.muted;
      const presentSet=new Set(st.presentLabels||[]);
      const engineOffers=usingEngine?st.pairingOfferings.map(o=>{
        const w=o.wine,on=presentSet.has(w.label);
        return {
          role:o.label||"Offering",roleColor:roleColorFor(o.slot),
          prod:w.producer,wine:w.wine_name,meta:w.meta,say:w.say,btl:w.price,
          glass:w.glass?"$"+w.glass_price+" glass":"bottle only",
          why:o.why,covers:(o.covers&&o.covers.length)?o.covers.join(", "):"Everything you picked",
          // ITEM 5: covers as one chip per dish this wine pairs with, so the
          // difference between the two wines is visible at a glance.
          coversChips:(o.covers&&o.covers.length)?o.covers:[],
          bd:on?"var(--pm-chrome)":"var(--pm-rule)",bw:on?"2px":"1px",bg:on?"var(--pm-sel)":"var(--pm-card)",
          chip:on?"presenting":"tap to add",chipBg:on?"#F9E4C7":"var(--pm-sunken)",
          pick:()=>patch(x=>({presentLabels:(x.presentLabels||[]).includes(w.label)?(x.presentLabels||[]).filter(y=>y!==w.label):[...(x.presentLabels||[]),w.label]})),
          speak:()=>say(w.speak),
          open:null, // no BottleBrief data for engine wines yet; TheWine.jsx only renders the Brief link when `open` is set
          stockColor:"var(--pm-muted)",stockNote:"On the list tonight."};
      }):null;
      const engineShownLabels=presentSet.size?Array.from(presentSet):(usingEngine?[st.pairingOfferings[0].wine.label]:[]);
      // ITEM 6: glass / bottle / both toggle on TheWine. Re-ranks in place
      // (no navigation) by re-running the SAME client engine over the pool the
      // format implies - 'glass' drops bottle-only wines so we never name a
      // glass pour you cannot actually get by the glass. Recording (postPairing)
      // is deliberately not re-fired here: this is the diner re-shaping the same
      // question, not a new decision.
      const runFormat=(fmt)=>{
        // Format picks the ranking STRATEGY + pool, not a filter: glass ranks
        // per dish over the by-the-glass pool, bottle ranks one wine across all
        // dishes, both is the neutral shortlist. See DIRECTION_FOR_FORMAT.
        const dir=DIRECTION_FOR_FORMAT[fmt]||'several';
        if(st.rulesTables&&st.demoWineRows.length&&chosen.length){
          const result=computeOfferings(dir,chosen,st.demoWineRows.map(rowToEngineWine),st.rulesTables,{format:fmt,budget:budgetOf(st)});
          patch({wineFormat:fmt,pairingDirection:result.direction,pairingOfferings:result.offerings,pairingCompromise:result.compromise,pairingCoverage:result.coverage,presentLabels:[]});
        }else if(st.demoWineRows&&st.demoWineRows.length){
          const offline=computeOfflineOfferings(dir,chosen,st.demoWineRows,{format:fmt,budget:budgetOf(st)});
          patch({wineFormat:fmt,pairingDirection:offline.direction,pairingOfferings:offline.offerings,pairingCompromise:offline.compromise,pairingCoverage:offline.coverage,presentLabels:[]});
        }else{
          patch({wineFormat:fmt});
        }
      };
      const formatTabs=[["glass","By the glass"],["bottle","Bottles"],["both","Both"]].map(([k,label])=>({
        k,label,active:st.wineFormat===k,pick:()=>runFormat(k)}));
      // ITEM 7: coverage strip. Every ordered dish is listed with what it is
      // paired with, or SAID to go unpaired. No dish is ever silently omitted,
      // which is the whole point of the three directions.
      const coverageRows=(usingEngine&&Array.isArray(st.pairingCoverage))?st.pairingCoverage.map(c=>{
        const paired=c.status==="paired";
        const shortWine=c.wine?c.wine.split(",")[0]:"";
        return {
          dish:c.dish,sec:c.sec||"",paired,
          text:paired?(c.note?c.note:(shortWine?"with "+shortWine:"paired")):"goes unpaired, and that's fine",
          color:paired?"var(--pm-ink)":"var(--pm-muted)"};
      }):null;
      const coverageTitle=pairingDirection==="mains_only"?"One pour for the mains"
        :pairingDirection==="course_it_out"?"A pour for each course"
        :pairingDirection==="one_bottle"?"One bottle, across everything":null;
      // ONE-BOTTLE MODE: the single bottle almost never fits every dish
      // equally, so this MUST surface where it gives ground (directions.js's
      // oneBottle() computes exactly this; here it is just shaped for
      // display, never re-derived).
      const compromiseNote=st.pairingCompromise?{
        dish:st.pairingCompromise.dish,
        text:typeof st.pairingCompromise.reason==="string"
          ?st.pairingCompromise.reason
          :st.pairingCompromise.reason.note+" (fit score "+st.pairingCompromise.reason.score+").",
      }:null;

      return {
        themeVars,
        toggleDark:()=>patch({dark:!dark}),
        darkLabel:dark?"Light":"Dark",
        darkIcon:dark?"M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8":"M20 14.5A8.5 8.5 0 0 1 9.5 4 7 7 0 1 0 20 14.5",
        darkBd:dark?PEAR:"rgba(255,255,255,.35)",darkBg:dark?PEAR:"transparent",darkFg:dark?NAVY:"#fff",
        toggleHC:()=>patch({hc:!st.hc}),
        hcBd:st.hc?PEAR:"rgba(255,255,255,.35)",hcBg:st.hc?PEAR:"transparent",hcFg:st.hc?NAVY:"#fff",

        venueName:st.venueName||"Aquitaine",

        rail:RAIL.map((label,i)=>({label,num:i+1,go:()=>go(i),bg:i===s?"#FCF1E1":"#fff",border:i===s?NAVY:"#E3E1DB"})),
        screenNo:s+1,screenName:RAIL[s],
        back:()=>go(Math.max(0,s-1)),fwd:()=>go(Math.min(17,s+1)),
        bodyRef:el=>{bodyEl.current=el;},
        ctaLabel:CTA[s],
        cta:
          s===7 ? async()=>{
            patch({apiLoading:true});
            try{ await putProfile(buildProfilePayload(st)); }
            catch(err){ patch({apiError:err.message||'Could not save your answers. Continuing anyway.'}); }
            patch({apiLoading:false});
            go(8);
          }
          : s===10 ? async()=>{
            track('pair_request');
            // Pairing is CLIENT-SIDE (POST /v1/pair was removed by design;
            // GET /v1/rules/bundle IS the pairing API). Runs only when a
            // wine list + rules bundle are actually loaded (the /t/demo
            // path); every other entry point has no demoWineRows, so this
            // falls through to the legacy apiPair() best-effort call below
            // and TheWine screen keeps rendering Desi's static offerSet
            // exactly as before.
            const direction = mapDirection(st);
            if (st.rulesTables && st.demoWineRows.length && chosen.length) {
              try {
                const wines = st.demoWineRows.map(rowToEngineWine);
                const result = computeOfferings(direction, chosen, wines, st.rulesTables, {format:st.wineFormat,budget:budgetOf(st)});
                patch({
                  pairingDirection: result.direction,
                  pairingOfferings: result.offerings,
                  pairingCompromise: result.compromise,
                  pairingCoverage: result.coverage,
                  presentLabels: [],
                });
                try {
                  // RECORDS the decision already made client-side (does not
                  // compute one). Best-effort: a failure here should not
                  // block the walk from reaching TheWine.
                  const rec = await postPairing({
                    capture_id: st.captureId,
                    dish_ids: st.picked,
                    direction: result.direction,
                    rules_version: st.rulesVersion,
                    parser_version: PARSER_VERSION,
                    offerings: result.offerings.map(o=>({
                      slot: o.slot,
                      wine_row_id: o.wine.client_row_id,
                      fired_rule_ids: (o.fired||[]).map(f=>f[0]),
                    })),
                  });
                  if (rec && !rec.notBuilt && rec.pairing_id) patch({pairingId:rec.pairing_id});
                } catch(err){ patch({apiError:err.message||'Could not record this pairing. Continuing anyway.'}); }
              } catch(err){ patch({apiError:err.message||'Could not run the wine list against what you ordered.'}); }
            } else {
              // Non-demo entry points have no rules bundle / wine-list rows
              // yet, so fall back to the legacy POST /v1/pair call (item 5,
              // not built server-side; pair() swallows the expected 404).
              //
              // PART 1 (no-signal / offline fallback): a website structurally
              // cannot pair offline unless it tries the client engine, so a
              // dead network here must not just leave TheWine on Desi's
              // hardcoded offerSet. `!navigator.onLine` skips the doomed
              // fetch outright when the app already knows it has no signal;
              // the catch below covers the other case (signal drops mid
              // request, or POST /v1/pair fails for any other reason).
              // Either way this computes REAL offerings with
              // packages/pairing over whatever wine rows are already loaded
              // (or the bundled demo fixture if none are), same tables
              // lib/offlinePairing.js falls back to - see
              // computeOfflineOfferings above.
              const runOffline = () => {
                const offline = computeOfflineOfferings(direction, chosen, st.demoWineRows, {format:st.wineFormat,budget:budgetOf(st)});
                patch({
                  pairingDirection: offline.direction,
                  pairingOfferings: offline.offerings,
                  pairingCompromise: offline.compromise,
                  pairingCoverage: offline.coverage,
                  presentLabels: [],
                });
              };
              if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                runOffline();
              } else {
                try{
                  const res = await apiPair({
                    dish_ids: st.picked,
                    wine_list_id: st.captureId || null,
                    profile_id: null,
                    direction,
                  });
                  if (res && !res.notBuilt && Array.isArray(res.offerings)) {
                    patch({pairOfferings:res.offerings,pairCompromise:res.compromise||null});
                  }
                  // else: /v1/pair is not built yet (item 5). offerSet above,
                  // Desi's static demo data, stays the fallback the TheWine
                  // screen renders. See TODO in the handoff report.
                }catch(err){
                  try { runOffline(); }
                  catch(offlineErr){ patch({apiError:err.message||'Could not reach the wine list. Showing our best guess.'}); }
                }
              }
            }
            go(11);
          }
          : s===13 ? async()=>{
            track('rate_submit', { dish: st.rate.dish, wine: st.rate.wine, pairing: st.rate.pair });
            if (st.captureId) {
              try{
                await apiRate({
                  capture_id: st.captureId,
                  pairing_id: st.pairingId || null,
                  dish: st.rate.dish, wine: st.rate.wine, pairing: st.rate.pair,
                  free_text: st.fb || null, share_with_venue: st.share,
                });
              }catch(err){ patch({apiError:err.message||'Could not save your rating.'}); }
            }
            go(14);
          }
          : s===15?()=>go(8):(s===16||s===17)?()=>go(st.back):s===18?()=>patch({s:9,camShot:false}):()=>go(Math.min(15,s+1)),
        hasAlt:s===0||s===1||s===11,
        altLabel:s===0?"Skip setup":s===1?"Not now":"Something else",
        // FIX 3: "Skip setup" was a raw patch({s:8,...}) - the URL stayed on
        // '/' even though the screen moved to WhereTo. Split into the extra
        // fields (still patch()) + go(8) so the route follows the screen.
        alt:s===0?()=>{patch({blank:true,skipped:6,likes:[],dislikes:[],diet:[]});go(8);}
          :s===1?()=>go(2):()=>go(10),
        skip:()=>{
          track('skip_screen_'+(s-1)); // s is 2..7 (Q1..Q6) whenever skip is reachable.
          patch(x=>({s:Math.min(15,x.s+1),skipped:x.skipped+1}));
        },
        goMenu:()=>go(9),
        // BROWSE THE FULL LIST: a standalone route (not one of the Phone
        // screen-index SCREENS - see routes.jsx), so this navigates
        // directly rather than through go()/PATH_FOR_SCREEN, same pattern
        // goLogin already uses below for the other standalone route.
        goWineList:()=>{ if(navigate) navigate('/wines/list'); },
        // "Just tell us here" (WhereTo's fourth path, item 6/7): the at-home
        // / no-menu case. Extraction + correction + the three offerings
        // choices need their own full-viewport flow (parsed dishes to edit,
        // a paste-your-wine-list step, an offerings screen), which is a
        // different shape from every other Phone-frame screen here, so this
        // is a standalone route too - same navigate-direct pattern as
        // goWineList/goLogin above, not go()/PATH_FOR_SCREEN. The typed/
        // spoken text travels via router state; TellUsScreen.jsx parses it
        // on mount with the same parseFreeText EntryScreen's TYPE/AT HOME
        // tabs use.
        goTellUs:()=>{ if(navigate) navigate('/tell-us',{state:{text:st.eatText}}); },
        wineListWines,wineListPickedDishes,
        wineListTables:st.rulesTables||getOfflineTables(),
        wineListSay:say,
        // FIX 3: was a raw patch({s:17,...}) - the URL never updated when
        // the chrome Settings gear was tapped. Now goes through go() like
        // every other screen transition.
        goSettings:()=>{patch({back:s===17?st.back:s});go(17);},
        goSignIn:()=>patch({s:1,back:17}),
        s0:s===0,s1:s===1,s2:s===2,s3:s===3,s4:s===4,s5:s===5,s6:s===6,s7:s===7,s8:s===8,s9:s===9,s10:s===10,s11:s===11,s12:s===12,s13:s===13,s14:s===14,s15:s===15,s16:s===16,s17:s===17,s18:s===18,
        goCamera:()=>go(18),
        camTitle:st.camShot?"Hold steady":"Fit the list in the frame",
        camSub:st.camShot?"Reading the list.":"Corner to corner. A little glare is fine, we have seen worse.",
        camLines:["72%","58%","81%","49%","77%","63%","85%","54%","70%"].map(w=>({w})),
        camShot:st.camShot,
        // Wired to a real <input type=file accept=image/* capture=environment>
        // in App.jsx (chrome layer, not this screen). No getUserMedia/video:
        // iOS Safari cannot control flash, and this is a dark dining room.
        camFire:()=>{ if(openCamera) openCamera(); },
        camUpload:()=>{ if(openGallery) openGallery(); },
        camPages:()=>patch({camPage:(st.camPage||1)+1}),
        camPageNo:st.camPage||1,
        camNote:(st.camPage||1)>1?"Page "+(st.camPage||1)+". Keep going, we stitch them together.":"Long list? Shoot one page, tap plus, shoot the next.",
        onboarding:s>=2&&s<=7,step:s-1,obTitle:ob?ob.t:"",obSub:ob?ob.s:"",

        signIns:[
          {k:"Apple",label:"Continue with Apple",icon:"",fg:"#fff",bg:"#000",bd:"#000"},
          {k:"Google",label:"Continue with Google",icon:"G",fg:"var(--pm-ink)",bg:"var(--pm-card)",bd:"var(--pm-rule)"},
          {k:"Email",label:"Continue with email",icon:"@",fg:"var(--pm-ink)",bg:"var(--pm-card)",bd:"var(--pm-rule)"}
        ].map(o=>Object.assign({},o,{pick:()=>patch({account:o.k,s:st.back===17?17:2})})),
        // No auth endpoint exists in the API contract v1 (identity is
        // anon_id only, "no login, no merge"). These sign-in affordances
        // stay local-only demo state until the backend adds one.
        signInVivino:()=>patch({account:"Vivino",linked:st.linked.includes("Vivino")?st.linked:[...st.linked,"Vivino"],s:st.back===17?17:2}),
        signInNote:st.account?"Signed in with "+st.account+". Your taste travels with you now."
          :"No password, ever. We ask for a name and an email and nothing else. Skip it and you can still use every part of this, we just forget you when you close the app.",
        glassH:glassH,glassY:38-glassH,

        levelPills:pills(["1 . Just point at something","2 . I know what I like","3 . I read the list","4 . I could write the list"],"level"),
        wantPills:pills(["Happy where I am","I want to learn more","Take me all the way"],"want"),
        advRows:["Stick to a colour I know","Stick to grapes I know","Open to anything","I'd love a grape I've never heard of","Surprise me completely"].map((label,i)=>({
          label,n:i+1,pick:()=>patch({adv:i+1}),
          bd:st.adv===i+1?"var(--pm-chrome)":"var(--pm-rule)",bg:st.adv===i+1?"var(--pm-sel)":"var(--pm-card)",
          dot:st.adv===i+1?PEAR:"var(--pm-sunken)"})),
        lovePills:pills(["Burgundy","Loire whites","Beaujolais","Champagne","Rhone syrah","Barolo","Rioja","German riesling","Napa cabernet","orange wine","rose all year","sherry"],"likes",true),
        notPills:pills(["heavy oak","very tannic","sweet","high alcohol","funky or natural","big California reds","bubbles"],"dislikes",true),
        dietPills:pills(["shellfish","nuts","dairy","gluten","egg","vegetarian","vegan","pescatarian","sulfite sensitive"],"diet",true),
        abstainPills:pills(["driving, one glass","no alcohol for me","pregnant"],"diet",true),
        relPills:pills(["partner","friend","parent","sibling","colleague","the boss"],"rel"),

        fLevel:field("levelOwn"),fAdv:field("advOwn"),fBudget:field("budgetOwn"),
        fLove:field("loveOwn"),fNot:field("notOwn"),fDiet:field("dietOwn"),
        fUnread:field("unreadable"),fVenue:field("venueQ"),fWhy:field("why"),fEatText:field("eatText"),
        fFb:field("fb"),fGuestName:field("guestName"),
        // Speech bridge for the field mics: the app-level useSpeech (App.jsx)
        // drives these off st.listening. A spoken result appends to whatever the
        // active field already holds, then clears listening (single-shot capture,
        // matching useSpeech's interimResults:false). stopListening() is the
        // error/cancel path. This is what turns the field mics from a "Listening"
        // hint that captured nothing into a real control.
        listening:st.listening,
        appendToListening:(text)=>patch(x=>{const k=x.listening;if(!k)return{listening:null};const cur=x[k]||"";return {[k]:cur.trim()?cur.trim()+" "+text:text,listening:null};}),
        stopListening:()=>patch({listening:null}),

        // The two dots ARE the control now (a real two-handle range slider);
        // setBMin/setBMax take a dollar value, snap to the step, and clamp so
        // the low handle cannot cross the high handle.
        bMin:lo,bMax:hi,bMaxLabel:hi>=400?"400+":hi,bFloor:20,bCeil:400,bStep:10,
        setBMin:v=>patch({bMin:Math.min(Math.max(20,Math.round(v/10)*10),st.bMax)}),
        setBMax:v=>patch({bMax:Math.max(Math.min(400,Math.round(v/10)*10),st.bMin)}),
        bumps:[10,20,30].map(p=>({pct:"+"+p+"%",to:Math.round(hi*(1+p/100)),
          pick:()=>patch({bump:st.bump===p?null:p}),
          bd:st.bump===p?"var(--pm-chrome)":"var(--pm-rule)",bg:st.bump===p?"var(--pm-sel)":"var(--pm-card)"})),
        bumpNote:st.bump?"Celebrating. We'll put one bottle up to $"+Math.round(hi*(1+st.bump/100))+" in front of you, and nothing above it.":"Only if you want it. The ceiling stays at $"+hi+" otherwise.",

        summary:[{k:"Knowledge",v:st.level},{k:"Aiming for",v:st.want},{k:"Adventure",v:st.adv+" of 5"},
          {k:"Comfortable at",v:"$"+lo+" to $"+hi+(st.bump?", +"+st.bump+"% tonight":"")},
          {k:"Loves",v:st.likes.length?st.likes.join(", "):"not said, and that's allowed"},
          {k:"Rather not",v:st.dislikes.length?st.dislikes.join(", "):"not said"},
          {k:"Must know",v:st.diet.length?st.diet.join(", "):"nothing"},
          {k:"Diners",v:st.added.length?st.added.join(", "):"Sarah"}],
        addDiner:()=>{const nm=(st.guestName||"").trim();if(!nm)return;
          patch({added:[...st.added,nm+(st.rel?" ("+st.rel+")":"")],guestName:"",rel:null,s:1});
          if(bodyEl.current)bodyEl.current.scrollTop=0;},
        addDinerNote:st.guestName?"We'll start them at question one. You can answer for them, or send it over.":"Name them first. Then we'll run them through the same six.",

        // Real search: GET /v1/venues?q=. covered:false surfaces the
        // plain-language message in the same slot a hit would occupy since
        // WhereTo.jsx only ever renders vm.venueHits as a flat list.
        venueHits: st.venueMessage
          ? [{label:st.venueMessage,go:()=>{},weight:400,color:"var(--pm-muted)"}]
          : (st.venueResults||[]).map((v,i)=>({
              label:v.name+" . "+v.city+", "+v.state,
              go:()=>{patch({selectedVenueId:v.id});go(9);},
              weight:i===0?600:400,color:i===0?"var(--pm-ink)":"var(--pm-muted)"})),
        noList:st.noList,hasList:!st.noList,
        noListLabel:st.noList?"a venue with no wine list, on":"a venue with no wine list, off",
        toggleNoList:()=>patch({noList:!st.noList}),
        showNoListToggle:st.debug,

        jumps:secSource.map(name=>({name,go:()=>jumpTo(name)})),
        menu:secSource.map(name=>({name,ref:el=>{secs.current[name]=el;},dishes:dishSource.filter(d=>d.sec===name).map(d=>{
          const on=st.picked.includes(d.id);
          return {n:d.n,d:d.d,price:d.p?"$"+d.p:"mp",
            bd:on?"var(--pm-chrome)":"var(--pm-rule)",bg:on?"var(--pm-sel)":"var(--pm-card)",
            toggle:()=>patch(x=>({picked:x.picked.includes(d.id)?x.picked.filter(y=>y!==d.id):[...x.picked,d.id]}))};
        })})),

        chosen:chosen.map(d=>({n:d.n,sec:d.sec})),dishCount:chosen.length,
        modes:[["glass","By the glass","Pours, not bottles. Easiest way to drink well with a mixed table."],
          ["bottle","By the bottle","Better value, and the good stuff often only comes this way."]].map(([k,h,b])=>({
          h,b,pick:()=>patch({mode:k,sub:null,scope:null}),
          bd:st.mode===k?"var(--pm-chrome)":"var(--pm-rule)",bg:st.mode===k?"var(--pm-sel)":"var(--pm-card)"})),
        showSub:!!st.mode,subLabel:st.mode==="glass"?"How many glasses":"How many bottles",
        subs:(st.mode==="glass"
          ? [["coursed","Coursed, one glass per item","A pour matched to every plate. "+chosen.length+" glasses.","Best drinking, most spend"],
             ["mains","Mains only","One good glass each with the main. Starters go unpaired, and that's fine.","Cheapest way in"]]
          : st.mode==="bottle"
          ? [["coursed","Coursed, more than one bottle","One for the starters, one for the mains.","Where most tables land"],
             ["single","Single, just the one","One wine, chosen to stretch.","Simplest. Always a compromise, and we tell you where"]]
          : []).map(([k,h,b,tt])=>({h,b,t:tt,pick:()=>patch({sub:k}),
          bd:st.sub===k?"var(--pm-chrome)":"var(--pm-rule)",bg:st.sub===k?"var(--pm-sel)":"var(--pm-card)"})),
        showScope:st.mode==="bottle"&&st.sub==="single",
        scopes:[["dinner","The whole dinner","One bottle that has to work from the oysters to the cheese."],
          ["entrees","Just the entrees","We pair to the mains and leave the starters alone."]].map(([k,h,b])=>({
          h,b,pick:()=>patch({scope:k}),
          bd:st.scope===k?"var(--pm-chrome)":"var(--pm-rule)",bg:st.scope===k?"var(--pm-sel)":"var(--pm-card)"})),
        dirSummary:!st.mode?"Pick one to keep going. You can change it at the table."
          :st.mode==="glass"?(st.sub?"Glasses it is. We'll name a pour and a price for each one.":"Glass it is. Now, how many.")
          :st.sub==="coursed"?"Two bottles, one to start and one for the mains."
          :st.sub==="single"?(st.scope?"One bottle, "+(st.scope==="dinner"?"across the whole dinner.":"pointed at the mains.")+" We'll tell you what it gives up.":"One bottle. For what, though.")
          :"Bottle it is. Now, how many.",
        // ITEM 4: "+ Guest" opens a bottom drawer instead of silently setting a
        // state; the other pills stay simple picks.
        guests:[["me","Just me"],["sarah","+ Sarah"],["add","+ Guest"]].map(([k,label])=>({
          label,pick:k==="add"?()=>patch({guestDrawerOpen:true}):()=>patch({guest:k}),
          bd:st.guest===k?"var(--pm-chrome)":"var(--pm-rule)",bg:st.guest===k?"var(--pm-sel)":"var(--pm-card)"})),
        // The drawer. "Fill us in later" is the primary, one-tap fast path.
        guestDrawer:{
          open:st.guestDrawerOpen,
          note:st.guestShareNote,
          close:()=>patch({guestDrawerOpen:false}),
          choices:[
            {k:"later",primary:true,h:"Fill us in later",b:"Start now with your taste. Add them any time at the table.",
              pick:()=>patch({guest:"later",guestDrawerOpen:false,guestShareNote:null})},
            {k:"share",primary:false,h:"Share a link",b:"Send it over so they tell us their own taste.",
              pick:()=>{
                const url=(typeof window!=="undefined"&&window.location)?window.location.origin+"/entry":"pairme.wine";
                if(typeof navigator!=="undefined"&&navigator.share){navigator.share({title:"PairMe",text:"Tell PairMe what you like",url}).catch(()=>{});patch({guest:"add",guestDrawerOpen:false});}
                else if(typeof navigator!=="undefined"&&navigator.clipboard){navigator.clipboard.writeText(url).catch(()=>{});patch({guest:"add",guestDrawerOpen:false,guestShareNote:"Link copied. Send it to them."});}
                else{patch({guest:"add",guestDrawerOpen:false,guestShareNote:url});}
              }},
            {k:"tell",primary:false,h:"Tell us about them",b:"Answer the six for them yourself, right now.",
              pick:()=>{patch({guest:"add",guestDrawerOpen:false});go(14);}},
          ],
        },
        conflict,
        resolutions:[["hers","Sarah gets her way tonight, skip the bubbles"],
          ["glass","Champagne by the glass for me, a bottle we both like for the table"],
          ["split","Split it: her wine with the starters, mine with the mains"]].map(([k,label])=>({
          label,pick:()=>patch({resolution:k}),
          bd:st.resolution===k?"var(--pm-chrome)":"var(--pm-rule)",bg:st.resolution===k?"var(--pm-sel)":"var(--pm-card)"})),

        // /t/demo: usingEngine is true once HowToDrink's cta has run the
        // scoring engine (see the s===10 branch above); otherwise this
        // stays Desi's static offerSet/W demo data, unchanged.
        usingEngine,
        // ITEM 4: wines the venue pushed (from GET /v1/venues/:code/pairings),
        // surfaced to the diner FIRST and always DISCLOSED as featured - a
        // pushed wine is never hidden and never costs the diner more. Matched to
        // the loaded wine rows for full display (producer, price, pronunciation).
        showFeatured:(st.venuePushed||[]).length>0,
        featured:(()=>{const byLabel=new Map();(st.venuePushed||[]).forEach(p=>{if(!p||!p.wine)return;const cur=byLabel.get(p.wine)||{dishes:[]};if(p.dish&&!cur.dishes.includes(p.dish))cur.dishes.push(p.dish);byLabel.set(p.wine,cur);});
          return Array.from(byLabel.keys()).map(label=>{const r=(st.demoWineRows||[]).find(x=>x.label===label)||{};return {
            label,prod:r.producer||label,wine:r.wine_name||"",meta:r.meta||"",btl:r.price,
            glass:r.glass_price?"$"+r.glass_price+" glass":"bottle only",say:r.say||"",
            dishes:byLabel.get(label).dishes,speak:()=>say(r.speak||label)};});})(),
        showFormatTabs:usingEngine,formatTabs,
        showCoverage:!!(coverageRows&&coverageRows.length),coverageTitle,coverage:coverageRows,
        offerTitle:usingEngine?(pairingDirection==="one_bottle"?"One bottle for the table":"Your wine"):(blank?"Three wines, no assumptions":"Your wine"),
        offerSub:usingEngine?(pairingDirection==="one_bottle"?"One bottle, chosen to work across everything ordered.":"Ranked for the table. Tap the ones you want to present."):(blank?"You skipped every question, so this is the honest version.":"Tap the ones you want to present. Everything here is on their list tonight."),
        showBlankToggle:!usingEngine&&st.debug,
        blankLabel:blank?"we know nothing about you, on":"we know nothing about you, off",
        toggleBlank:()=>patch({blank:!blank}),
        presentCount:usingEngine
          ?(presentSet.size?presentSet.size+" ready to present":"None chosen yet, we'll present the first one")
          :(presentKeys.length?presentKeys.length+" ready to present":"None chosen yet, we'll present the first one"),
        offers:engineOffers||offerSet.map(o=>{const w=W[o.k],on=presentKeys.includes(o.k);return {
          role:o.role,roleColor:o.roleColor,prod:w.prod,wine:w.wine,meta:w.meta,say:w.say,btl:w.btl,
          glass:w.glass?"$"+w.glass+" glass":"bottle only",why:o.why,covers:o.covers,
          bd:on?"var(--pm-chrome)":"var(--pm-rule)",bw:on?"2px":"1px",bg:on?"var(--pm-sel)":"var(--pm-card)",
          chip:on?"presenting":"tap to add",chipBg:on?"#F9E4C7":"var(--pm-sunken)",
          pick:()=>patch(x=>({present:x.present.includes(o.k)?x.present.filter(y=>y!==o.k):[...x.present,o.k]})),
          speak:()=>say(w.speak),
          open:()=>patch({s:16,bottle:o.k,back:11}),
          stockColor:w.stock<4?ORANGE:"var(--pm-muted)",
          stockNote:w.stock<4?"Only "+w.stock+" left tonight":"Plenty in the cellar"};}),
        // ONE-BOTTLE MODE compromise: rendered on TheWine screen right under
        // the single offering (see TheWine.jsx). null on every other
        // direction and off the /t/demo path.
        compromiseNote,

        foodRows:chosen.map(d=>({n:d.n,sec:d.sec})),
        handoff:usingEngine
          ?engineShownLabels.map((label,i)=>{
            const offering=st.pairingOfferings.find(o=>o.wine.label===label)||st.pairingOfferings[0];
            const w=offering.wine;
            return {
              label:engineShownLabels.length>1?(i===0?"Bottle one":"Bottle two"):"One bottle",
              prod:w.producer,wine:w.wine_name,meta:w.meta+" . $"+w.price,say:w.say,tip:w.tip,
              speak:()=>say(w.speak),
              compromise:(pairingDirection==="one_bottle"&&compromiseNote)?compromiseNote.text:null,
            };
          })
          :shownKeys.map((k,i)=>{const w=W[k];return {
            label:shownKeys.length>1?(i===0?"Bottle one":"Bottle two"):"One bottle",
            prod:w.prod,wine:w.wine,meta:w.meta+" . $"+w.btl,say:w.say,tip:w.tip,speak:()=>say(w.speak),compromise:null};}),
        hasDiet:st.diet.length>0,dietLine:st.diet.length?st.diet.join(" . "):"none",

        rateRows:[["dish","The food"],["wine","The wine"],["pair","How they went together"]].map(([k,label])=>({
          label,stars:stars(st.rate[k]).map(x=>Object.assign({},x,{
            pick:()=>patch({rate:Object.assign({},st.rate,{[k]:x.n})})}))})),
        fb:st.fb,setFb:e=>patch({fb:e.target.value}),
        shareBd:st.share?"var(--pm-chrome)":"var(--pm-rule)",shareBg:st.share?"var(--pm-sel)":"var(--pm-card)",
        toggleShare:()=>patch({share:!st.share}),

        // Visibly disabled, honestly labelled: none connect yet, so no pill is a
        // tappable fiction (see BUTTON_AUDIT.md: looks interactive must BE
        // interactive, or ship disabled). The only interactive control here is
        // the escape hatch below.
        // Connections now live in Settings under an expandable section, not in
        // onboarding - nobody at a table wants to link a cellar app first. All
        // four read the same "Coming soon"; none connect yet (one label, no
        // special case). Visibly disabled, so no looks-but-isn't control.
        connections:ACCOUNTS.map(a=>({
          label:a.k, sub:a.sub, disabled:true, status:"Coming soon"})),
        connectionsOpen:!!st.connectionsOpen,
        toggleConnections:()=>patch({connectionsOpen:!st.connectionsOpen}),
        shareTable:()=>patch({shared:"table"}),
        shareNote:st.shared==="table"?"Sharing sheet open. Text it, and whoever taps it joins your table with their own taste, not a copy of yours."
          :"Send your table to someone. They answer the six themselves, and then we can pair for both of you.",

        bb:(function(self,key){const w=W[key],b=BRIEF[key];return {
          prod:w.prod,wine:w.wine,meta:w.meta+" . $"+w.btl+(w.glass?" . $"+w.glass+" glass":" . bottle only"),
          say:w.say,tip:w.tip,speak:()=>say(w.speak),
          means:b.means,notes:b.notes,why:b.why,bridge:b.bridge,yours:b.yours,
          save:()=>patch({saved:!st.saved}),
          savedLabel:st.saved?"Saved":"Save it",savedBg:st.saved?"var(--pm-sel)":"transparent",
          share:()=>patch({shared:"bottle"}),
          shareNote:st.shared==="bottle"?"Sharing sheet open. They get the name, the pronunciation and one line on why it worked, not a link to nowhere.":"Share sends the brief, not a link. Producer, pronunciation, and one line on why it worked."};})(null,st.bottle),

        settingRows:[
          {k:"dark",label:"Dark mode",sub:"For a dim room, or a table where nobody wants your screen in their eyes.",on:dark,pick:()=>patch({dark:!dark})},
          {k:"hc",label:"High contrast",sub:"Heavier type, stronger edges, bigger dish names on the menu.",on:st.hc,pick:()=>patch({hc:!st.hc})}
        ].map(r=>({label:r.label,sub:r.sub,pick:r.pick,
          bd:r.on?"var(--pm-selBd)":"var(--pm-rule)",bg:r.on?"var(--pm-sel)":"var(--pm-card)",
          trackBg:r.on?"#EFB96B":"var(--pm-sunken)",trackBd:r.on?"#E5A44F":"var(--pm-rule)",
          knobX:r.on?"22px":"2px",knobBg:r.on?"#1F2A44":"var(--pm-muted)"})),
        demoSpeak:()=>say("Zhev ray shom ber tan. You said that perfectly."),
        acctTitle:st.account?"Signed in with "+st.account:"Not signed in",
        acctSub:st.account?"Your taste, your history and your table are saved.":"Everything works without it. Signing in is only so your taste survives closing the app.",
        acctAction:st.account?"Switch account":"Sign in",

        myLikes:st.likes.length?st.likes:["nothing on file yet"],
        myNots:st.dislikes.length?st.dislikes:["nothing on file"],
        historyCount:MY_HISTORY.length+" bottles",
        history:MY_HISTORY.map(([w,where,dish,r],i)=>({w,where,dish,stars:stars(r),
          // FIX 3: was a raw patch({s:16,...}) - opening a history row never
          // updated the URL away from '/profile'. go(16) now does.
          open:()=>{patch({bottle:["huet","foil","huet","trapet","gim"][i],back:14});go(16);}})),
        friends:[{name:"Sarah",sub:"partner . loves Loire whites, never bubbles",initial:"S",go:()=>go(14)},
          {name:"Dan",sub:"friend . Barolo, and nothing under 13%",initial:"D",go:()=>go(14)},
          {name:"Priya",sub:"colleague . riesling, no red at lunch",initial:"P",go:()=>go(14)}],

        sarahLikes:["Loire whites","Sancerre","Barbaresco","a cold glass in the sun"],
        sarahNots:["bubbles","heavy oak","anything over $60"],
        sarahHistory:SARAH_HISTORY.map(([w,where,r])=>({w,where,stars:stars(r)})),

        // DELETE /v1/account - genuine hard delete, no undo. Two-tap
        // confirm, no modal: tap once to arm it, tap again to actually
        // delete, or cancel to stand down.
        deleteConfirming:st.deleteConfirming,deleteDone:st.deleteDone,
        deleteAccountLabel:st.deleteDone?"Account deleted":(st.deleteConfirming?"Yes, delete everything":"Delete account"),
        deleteAccountSub:st.deleteDone
          ?"Your account and everything we stored about you have been permanently deleted."
          :st.deleteConfirming
            ?"This removes your taste profile, your history and every photo you have taken. There is no undo."
            :"Removes your taste profile, your history and every capture. This cannot be undone.",
        deleteAccount:st.deleteDone?()=>{}:st.deleteConfirming
          ?async()=>{
            try{ await apiDeleteAccount(); patch({deleteConfirming:false,deleteDone:true}); }
            catch(err){ patch({apiError:err.message||'Could not delete your account. Please try again.'}); }
          }
          :()=>patch({deleteConfirming:true}),
        cancelDelete:()=>patch({deleteConfirming:false}),
        showCancelDelete:st.deleteConfirming&&!st.deleteDone,

        // Chrome-level (App.jsx), not consumed by any screen.
        apiError:st.apiError,apiLoading:st.apiLoading,
        dismissApiError:()=>patch({apiError:null}),
        syncFromRoute,
        tableCode:st.tableCode,
        handleCaptureFile,

        // AUTH CONTRACT (locked, feat/pairme-accounts-be). goLogin is the
        // chrome-level top-right "Log in" entry point (App.jsx); it is
        // reachable from every screen and never fires on its own - nothing
        // in this file calls it, no wall. setAuthenticated is called by
        // screens/Login.jsx after a successful POST /v1/auth/signup or
        // POST /v1/auth/login: it persists {token,anon_id} (api.js's
        // setAuthSession) and mirrors both into vm state so the chrome
        // button and anonId-dependent calls update immediately, without a
        // reload.
        isLoggedIn:!!st.authToken,
        goLogin:()=>{ if(navigate) navigate('/login',{state:{from:PATH_FOR_SCREEN[s]}}); },
        setAuthenticated:({token,anon_id})=>{
          apiSetAuthSession({token,anon_id});
          patch(x=>({authToken:token||null,anonId:anon_id||x.anonId}));
        },
        // Instrumentation: exposed so any screen can fire a custom event,
        // e.g. a future correction UI calling submitCorrection (below) or
        // vm.track('correction_made', {...}) directly.
        track,
        submitCorrection,
      };

}
