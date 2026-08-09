import React from 'react';
import { parseMenu } from '../../../../packages/pairing/src/index.js';
import { parseFreeText } from '../lib/parseFreeText.js';
import { resolveComponents } from '../lib/dishComponents.js';
import { SEEDED_WINE_LISTS, getSeededWines } from '../lib/seededLists.js';
import { getOfflineTables } from '../lib/offlinePairing.js';
import { computeOfferings } from '../lib/pairingAdapter.js';

/**
 * EntryScreen: the four diner entry points (paste-first) on ONE screen,
 * raw text -> dishes -> pick -> pair -> the 3 offerings. Deliberately its
 * own standalone route (routes.jsx's "/entry"), NOT nested inside App.jsx's
 * fixed-size Phone mockup frame (390x800, built for a desktop preview) -
 * this has to actually work full-width in a real phone browser tonight, so
 * it renders full-viewport instead of inside that card.
 *
 * Reads packages/pairing (parseMenu, and via pairingAdapter/offlinePairing,
 * the scoring engine + zero-network tables) READ ONLY - no file under
 * packages/pairing is edited by this screen.
 *
 * No BE call anywhere in this file. No vision call either (CAMERA is a
 * stub - see MODE_CAMERA below).
 */

const MODE_PASTE = 'paste';
const MODE_TYPE = 'type';
const MODE_HOME = 'athome';
const MODE_CAMERA = 'camera';

const TABS = [
  { id: MODE_PASTE, label: 'Paste the menu' },
  { id: MODE_TYPE, label: 'Type it' },
  { id: MODE_HOME, label: 'At home' },
  { id: MODE_CAMERA, label: 'Camera' },
];

// EntryScreen owns its own look (not the "Phone" chrome's --pm-* vars,
// which are only set on the mockup card) - a small, self-contained palette,
// no gradients, matching PairMe's warm/navy tone.
const COLORS = {
  page: '#FBFAF7',
  ink: '#1C1C1A',
  muted: '#6B6B66',
  card: '#fff',
  rule: '#E3E1DB',
  chrome: '#1F2A44',
  sel: '#FFF4E4',
  selBd: '#FFCC7D',
  accent: '#FFCC7D',
  accentBd: '#E5A44F',
  warnBg: '#FEF3E7',
  warnBd: '#F2993D',
  warnInk: '#C4701A',
};

/** @param {{name: string, description: string}} dish */
function dishKey(dish, i) {
  return `${i}:${dish.name}`;
}

export default function EntryScreen() {
  const [mode, setMode] = React.useState(MODE_PASTE);
  const [venueListId, setVenueListId] = React.useState(null);
  const [pasteText, setPasteText] = React.useState('');
  const [freeText, setFreeText] = React.useState('');
  const [dishes, setDishes] = React.useState([]);
  const [selected, setSelected] = React.useState(() => new Set());
  const [offerings, setOfferings] = React.useState(null);
  const [cameraNote, setCameraNote] = React.useState('');
  const cameraInputRef = React.useRef(null);

  // "At home" has no restaurant venue by construction, so it always shows
  // the picker, even if a venue list was already chosen on another tab -
  // the whole point of this mode is "pair against a list I choose, not a
  // table's".
  const needsListPicker = venueListId === null || mode === MODE_HOME;

  function resetOfferings() {
    if (offerings) setOfferings(null);
  }

  function pickVenueList(id) {
    setVenueListId(id);
    resetOfferings();
  }

  function runParseMenu() {
    const parsed = parseMenu(pasteText);
    setDishes(parsed);
    setSelected(new Set());
    resetOfferings();
  }

  function runParseFreeText() {
    const parsed = parseFreeText(freeText);
    setDishes(parsed);
    setSelected(new Set());
    resetOfferings();
  }

  function toggleDish(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    resetOfferings();
  }

  function handleCameraFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    // STUB, on purpose (no vision call in this build): there is no OCR
    // here, so this cannot fill the textarea with the photo's actual text.
    // What it CAN do honestly: hand off to the same paste -> parse -> pair
    // pipeline PASTE already uses, so the walk still finishes tonight.
    setCameraNote('Photo captured. We cannot read photos yet - paste or type what is on the plate below and we will take it from there.');
    setMode(MODE_PASTE);
  }

  const canPair = dishes.length > 0 && selected.size > 0 && !!venueListId;

  function pairIt() {
    const chosen = dishes.filter((d, i) => selected.has(dishKey(d, i)));
    if (!chosen.length || !venueListId) return;
    const engineDishes = chosen.map((d) => ({
      n: d.name,
      components: resolveComponents(d.name, d.description),
    }));
    const wines = getSeededWines(venueListId);
    const T = getOfflineTables();
    const result = computeOfferings('course_it_out', engineDishes, wines, T);
    setOfferings(result);
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.page, color: COLORS.ink, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 48px' }}>
        <h1 style={{ font: '700 22px/1.3 inherit', margin: '0 0 4px' }}>Eating out or eating in?</h1>
        <p style={{ font: '400 14px/1.5 inherit', color: COLORS.muted, margin: '0 0 20px' }}>
          Either way, tell us what you are having and we will pair it.
        </p>

        {/* --- Which wine list? picker --------------------------------- */}
        {needsListPicker ? (
          <section aria-label="Which wine list?" style={{ marginBottom: 20 }}>
            <h2 style={{ font: '600 15px inherit', margin: '0 0 8px' }}>Which wine list?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SEEDED_WINE_LISTS.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => pickVenueList(list.id)}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: `1.5px solid ${venueListId === list.id ? COLORS.chrome : COLORS.rule}`,
                    background: venueListId === list.id ? COLORS.sel : COLORS.card,
                    cursor: 'pointer',
                    minHeight: 44,
                  }}
                >
                  <div style={{ font: '600 15px inherit' }}>{list.label}</div>
                  <div style={{ font: '400 13px inherit', color: COLORS.muted }}>{list.sublabel}</div>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div style={{ marginBottom: 16, font: '500 13px inherit', color: COLORS.muted }}>
            Wine list: <strong style={{ color: COLORS.ink }}>{SEEDED_WINE_LISTS.find((l) => l.id === venueListId)?.label}</strong>
            {' '}
            <button
              type="button"
              onClick={() => setVenueListId(null)}
              style={{ border: 'none', background: 'transparent', color: COLORS.chrome, textDecoration: 'underline', cursor: 'pointer', font: 'inherit', padding: 0 }}
            >
              change
            </button>
          </div>
        )}

        {/* --- Four entry points, one destination ---------------------- */}
        <nav aria-label="How are you telling us" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              aria-pressed={mode === tab.id}
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                border: `1.5px solid ${mode === tab.id ? COLORS.chrome : COLORS.rule}`,
                background: mode === tab.id ? COLORS.chrome : COLORS.card,
                color: mode === tab.id ? '#fff' : COLORS.ink,
                font: '600 13.5px inherit',
                cursor: 'pointer',
                minHeight: 40,
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* B: PASTE */}
        {mode === MODE_PASTE ? (
          <section aria-label="Paste entry">
            {cameraNote ? (
              <p style={{ font: '400 13px inherit', color: COLORS.warnInk, background: COLORS.warnBg, border: `1px solid ${COLORS.warnBd}`, borderRadius: 10, padding: '10px 12px', margin: '0 0 10px' }}>
                {cameraNote}
              </p>
            ) : null}
            <label htmlFor="pm-paste-textarea" style={{ display: 'block', font: '600 13.5px inherit', marginBottom: 6 }}>
              Paste the menu
            </label>
            <textarea
              id="pm-paste-textarea"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'APPETIZERS\n\nRoast chicken 18\nroast garlic, potatoes, jus\n\nMAINS\n\nGrilled salmon 28\nlemon, capers, asparagus'}
              rows={8}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontSize: 16, // >=16px so iOS Safari does not zoom on focus
                lineHeight: 1.4,
                padding: 12,
                borderRadius: 10,
                border: `1.5px solid ${COLORS.rule}`,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            <button
              type="button"
              onClick={runParseMenu}
              disabled={!pasteText.trim()}
              style={{ marginTop: 10, width: '100%', minHeight: 48, borderRadius: 999, border: `1px solid ${COLORS.accentBd}`, background: pasteText.trim() ? COLORS.accent : COLORS.rule, color: COLORS.chrome, font: '700 15px inherit', cursor: pasteText.trim() ? 'pointer' : 'default' }}
            >
              Find the dishes
            </button>
          </section>
        ) : null}

        {/* C: TYPE */}
        {mode === MODE_TYPE ? (
          <section aria-label="Type what you are having">
            <label htmlFor="pm-type-input" style={{ display: 'block', font: '600 13.5px inherit', marginBottom: 6 }}>
              What are you having?
            </label>
            <input
              id="pm-type-input"
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="roast chicken, potatoes, green beans"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontSize: 16,
                padding: '12px 14px',
                borderRadius: 10,
                border: `1.5px solid ${COLORS.rule}`,
                fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={runParseFreeText}
              disabled={!freeText.trim()}
              style={{ marginTop: 10, width: '100%', minHeight: 48, borderRadius: 999, border: `1px solid ${COLORS.accentBd}`, background: freeText.trim() ? COLORS.accent : COLORS.rule, color: COLORS.chrome, font: '700 15px inherit', cursor: freeText.trim() ? 'pointer' : 'default' }}
            >
              Find the dishes
            </button>
          </section>
        ) : null}

        {/* D: AT HOME - same box as TYPE, always with the list picker above */}
        {mode === MODE_HOME ? (
          <section aria-label="At home">
            <label htmlFor="pm-home-input" style={{ display: 'block', font: '600 13.5px inherit', marginBottom: 6 }}>
              What are you cooking, or ordering in?
            </label>
            <input
              id="pm-home-input"
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="roast chicken, potatoes, green beans"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontSize: 16,
                padding: '12px 14px',
                borderRadius: 10,
                border: `1.5px solid ${COLORS.rule}`,
                fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={runParseFreeText}
              disabled={!freeText.trim() || !venueListId}
              style={{ marginTop: 10, width: '100%', minHeight: 48, borderRadius: 999, border: `1px solid ${COLORS.accentBd}`, background: freeText.trim() && venueListId ? COLORS.accent : COLORS.rule, color: COLORS.chrome, font: '700 15px inherit', cursor: freeText.trim() && venueListId ? 'pointer' : 'default' }}
            >
              Find the dishes
            </button>
          </section>
        ) : null}

        {/* A: CAMERA - stub. Native file picker, not a live stream, so the
            phone's own flash/focus/HDR still work in a dark room. */}
        {mode === MODE_CAMERA ? (
          <section aria-label="Camera">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraFile}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current && cameraInputRef.current.click()}
              style={{ width: '100%', minHeight: 48, borderRadius: 999, border: `1px solid ${COLORS.accentBd}`, background: COLORS.accent, color: COLORS.chrome, font: '700 15px inherit', cursor: 'pointer' }}
            >
              Take a photo of the menu
            </button>
            <p style={{ font: '400 12px inherit', color: COLORS.muted, marginTop: 8 }}>
              We do not read photos yet in this build. After you shoot one we will send you to Paste or Type so nothing gets stuck.
            </p>
          </section>
        ) : null}

        {/* --- Pick step: multi-select the parsed dishes ---------------- */}
        {dishes.length > 0 ? (
          <section aria-label="Pick what you are having" style={{ marginTop: 22 }}>
            <h2 style={{ font: '600 15px inherit', margin: '0 0 8px' }}>Which of these?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dishes.map((d, i) => {
                const key = dishKey(d, i);
                const on = selected.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDish(key)}
                    aria-pressed={on}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1.5px solid ${on ? COLORS.chrome : COLORS.rule}`,
                      background: on ? COLORS.sel : COLORS.card,
                      cursor: 'pointer',
                      minHeight: 44,
                    }}
                  >
                    {d.section ? (
                      <div style={{ font: '600 11px inherit', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 }}>
                        {d.section}
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ font: '600 14.5px inherit' }}>{d.name}</span>
                      <span style={{ font: '600 14.5px inherit', color: COLORS.muted, flex: 'none' }}>
                        {d.price != null ? `$${d.price}` : ''}
                      </span>
                    </div>
                    {d.description ? (
                      <div style={{ font: '400 12.5px inherit', color: COLORS.muted, marginTop: 2 }}>{d.description}</div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={pairIt}
              disabled={!canPair}
              style={{
                marginTop: 14,
                width: '100%',
                minHeight: 52,
                borderRadius: 999,
                border: `1px solid ${COLORS.accentBd}`,
                background: canPair ? COLORS.accent : COLORS.rule,
                color: COLORS.chrome,
                font: '700 16px inherit',
                cursor: canPair ? 'pointer' : 'default',
                boxShadow: canPair ? '0 8px 20px -6px rgba(31,42,68,.35)' : 'none',
              }}
            >
              Pair it
            </button>
            {!venueListId ? (
              <p style={{ font: '400 12.5px inherit', color: COLORS.muted, marginTop: 6 }}>Pick a wine list above first.</p>
            ) : selected.size === 0 ? (
              <p style={{ font: '400 12.5px inherit', color: COLORS.muted, marginTop: 6 }}>Tap at least one dish above.</p>
            ) : null}
          </section>
        ) : null}

        {/* --- The 3 offerings screen ------------------------------------ */}
        {offerings ? (
          <section aria-label="Your wine" style={{ marginTop: 26 }}>
            <h2 style={{ font: '700 18px inherit', margin: '0 0 4px' }}>Your wine</h2>
            <p style={{ font: '400 13px inherit', color: COLORS.muted, margin: '0 0 12px' }}>
              Ranked for the table, from {SEEDED_WINE_LISTS.find((l) => l.id === venueListId)?.label}.
            </p>
            {offerings.offerings.length === 0 ? (
              <p style={{ font: '400 14px inherit', color: COLORS.muted }}>
                Nothing on this list cleared every hard rule for what you picked. Try picking fewer dishes, or a different list.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {offerings.offerings.map((o, i) => (
                  <div key={o.wine.label || i} style={{ padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${COLORS.rule}`, background: COLORS.card }}>
                    <div style={{ font: '600 12px inherit', color: COLORS.chrome, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 }}>
                      {o.label || 'Offering'}
                    </div>
                    <div style={{ font: '700 16px inherit' }}>
                      {o.wine.producer || o.wine.label}
                      {o.wine.wine_name ? `, ${o.wine.wine_name}` : ''}
                    </div>
                    <div style={{ font: '400 13px inherit', color: COLORS.muted, margin: '2px 0 8px' }}>
                      {[o.wine.meta, o.wine.price ? `$${o.wine.price}` : null].filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ font: '400 13.5px/1.4 inherit' }}>{o.why}</div>
                    {o.covers && o.covers.length ? (
                      <div style={{ font: '500 12px inherit', color: COLORS.muted, marginTop: 6 }}>
                        Covers: {o.covers.join(', ')}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
