/**
 * PAIRING QUALITY HARNESS
 *
 * Measures whether the engine is reasoning or guessing, over a folder of real
 * menu texts, against the seeded Barolo Grill cellar. Run:
 *
 *   node packages/pairing/quality/pairing-quality.mjs
 *   node packages/pairing/quality/pairing-quality.mjs --menus /path/to/menus
 *
 * Drop more menus in packages/pairing/quality/menus/ (one .txt per menu) and
 * re-run. Output: a per-menu breakdown, the HEADLINE number (percentage of
 * dishes where MORE than the generic weight tie-breaker fired), and the
 * UNRESOLVED COMPONENT LIST sorted by frequency - the list of names to add to
 * corpus_categories.csv next. A markdown + csv report is written next to the
 * menus in ./reports/.
 *
 * corpus_categories.csv is not in the repo yet, so component resolution runs on
 * the documented dish_axes stopgap (packages/pairing/src/resolveComponents.js).
 * That is the point: the unresolved list is measured against what exists today,
 * which is exactly what the corpus needs to cover.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMenu } from '../src/parseMenu.js';
import { parseWineList } from '../src/parseWineList.js';
import { loadLocalBundle } from '../src/loadLocalTables.js';
import { buildTables } from '../src/tables.js';
import { dishProfile, scoreWine } from '../src/scoring.js';
import { resolveComponents } from '../src/resolveComponents.js';

// Rules that fire for almost any wine and carry no dish-specific reasoning.
// A dish whose ONLY fired rules are these is guessing, not reasoning.
const GENERIC_RULE_IDS = new Set(['match_weight', 'pen_neutral_dish']);

const HERE = path.dirname(fileURLToPath(import.meta.url));

function arg(flag, dflt) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

const MENUS_DIR = arg('--menus', path.join(HERE, 'menus'));
const BAROLO_TXT = path.join(HERE, '..', 'data', 'wine_list_fixtures', 'barolo.txt');

// --- load the cellar + tables (zero network) --------------------------------
const T = buildTables(loadLocalBundle());
const baroloWines = parseWineList(fs.readFileSync(BAROLO_TXT, 'utf-8')).map((r) => ({
  label: r.label || [r.producer, r.wine_name].filter(Boolean).join(', '),
  grape_head: (r.grape_head || r.grape || '').toLowerCase(),
  region_head: (r.region_head || r.region || '').toLowerCase(),
  price: r.price,
  glass: !!r.glass_price,
}));

// --- per-dish analysis ------------------------------------------------------
/** The comma-separated ingredient phrases under a dish are where components
 * live; a phrase that resolves to no dish_axes key is an unresolved component
 * (the corpus gap). Fall back to the dish name when there is no description. */
function candidatePhrases(dish) {
  const src = (dish.description && dish.description.trim()) ? dish.description : dish.name;
  return String(src || '')
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter(Boolean);
}

function analyzeDish(dish) {
  const resolved = resolveComponents(dish.name, dish.description, T);
  const unresolved = candidatePhrases(dish).filter((p) => resolveComponents(p, '', T).length === 0);

  const { profile } = dishProfile(resolved, T);
  let eligibleCount = 0;
  const firedRuleIds = new Set();
  for (const wine of baroloWines) {
    const s = scoreWine(wine, profile, resolved, T);
    if (!s.eligible) continue;
    eligibleCount += 1;
    for (const [ruleId] of s.fired) firedRuleIds.add(ruleId);
  }
  const specificFired = [...firedRuleIds].filter((id) => !GENERIC_RULE_IDS.has(id));
  return {
    name: dish.name,
    section: dish.section,
    price: dish.price,
    resolved,
    unresolved,
    eligibleCount,
    firedRuleIds: [...firedRuleIds],
    specificFired,
    reasoning: specificFired.length > 0,
  };
}

// --- run over the menu folder -----------------------------------------------
if (!fs.existsSync(MENUS_DIR)) {
  console.error(`No menus folder at ${MENUS_DIR}. Create it and drop .txt menus in.`);
  process.exit(1);
}
const menuFiles = fs.readdirSync(MENUS_DIR).filter((f) => f.toLowerCase().endsWith('.txt')).sort();
if (menuFiles.length === 0) {
  console.error(`No .txt menus in ${MENUS_DIR}.`);
  process.exit(1);
}

const perMenu = [];
const unresolvedFreq = new Map();
let totalDishes = 0;
let reasoningDishes = 0;

for (const file of menuFiles) {
  const raw = fs.readFileSync(path.join(MENUS_DIR, file), 'utf-8');
  const dishes = parseMenu(raw).map(analyzeDish);
  totalDishes += dishes.length;
  const menuReasoning = dishes.filter((d) => d.reasoning).length;
  reasoningDishes += menuReasoning;
  for (const d of dishes) for (const u of d.unresolved) unresolvedFreq.set(u, (unresolvedFreq.get(u) || 0) + 1);
  perMenu.push({ file, dishes, menuReasoning });
}

const unresolvedSorted = [...unresolvedFreq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const pct = (n, d) => (d === 0 ? 0 : Math.round((1000 * n) / d) / 10);
const HEADLINE = pct(reasoningDishes, totalDishes);

// --- render -----------------------------------------------------------------
const lines = [];
const L = (s = '') => lines.push(s);
L('# PairMe pairing quality');
L('');
L(`Cellar: Barolo Grill (${baroloWines.length} wines, ${baroloWines.filter((w) => w.glass).length} by the glass).`);
L(`Menus: ${menuFiles.length}. Dishes: ${totalDishes}.`);
L('');
L(`## HEADLINE: ${HEADLINE}% of dishes fired MORE than the generic weight rule (${reasoningDishes}/${totalDishes})`);
L('');
L('The rest fired only match_weight, meaning their components did not map to any');
L('rule trigger: the engine is guessing there, not reasoning.');
L('');
for (const m of perMenu) {
  L(`## ${m.file}  (${m.menuReasoning}/${m.dishes.length} reasoning)`);
  L('');
  L('| dish | resolved | eligible wines | specific rules | unresolved |');
  L('|---|---|---|---|---|');
  for (const d of m.dishes) {
    L(`| ${d.name} | ${d.resolved.join(', ') || '(none)'} | ${d.eligibleCount} | ${d.specificFired.join(', ') || '(only generic)'} | ${d.unresolved.join(', ') || ''} |`);
  }
  L('');
}
L('## Unresolved components, by frequency (the corpus_categories.csv worklist)');
L('');
L('| count | component |');
L('|---|---|');
for (const [name, count] of unresolvedSorted) L(`| ${count} | ${name} |`);
L('');
const md = lines.join('\n');

// csv of the worklist (Excel-openable)
const csv = ['count,component', ...unresolvedSorted.map(([n, c]) => `${c},"${n.replace(/"/g, '""')}"`)].join('\n');

const outDir = path.join(HERE, 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'pairing-quality.md'), md);
fs.writeFileSync(path.join(outDir, 'unresolved-components.csv'), csv);

// console: headline + worklist (the thing to send Moose)
console.log(md);
console.log(`\n[written] ${path.join(outDir, 'pairing-quality.md')}`);
console.log(`[written] ${path.join(outDir, 'unresolved-components.csv')}`);
