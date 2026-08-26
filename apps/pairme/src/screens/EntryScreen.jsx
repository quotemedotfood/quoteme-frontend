import React from 'react';
import { parseMenu } from '../../../../packages/pairing/src/index.js';
import { parseFreeText } from '../lib/parseFreeText.js';
import { resolveComponents } from '../lib/dishComponents.js';
import { SEEDED_WINE_LISTS, getSeededWines } from '../lib/seededLists.js';
import { getOfflineTables } from '../lib/offlinePairing.js';
import { computeOfferings, DIRECTION_FOR_FORMAT } from '../lib/pairingAdapter.js';
import { useSpeech } from '../lib/useSpeech.js';
import { capture as apiCapture } from '../lib/api.js';
import { speak as speakText } from '../lib/speak.js';

/**
 * EntryScreen: the four diner entry points (paste-first) on ONE screen,
 * raw text -> dishes -> pick -> pair -> the 3 offerings. Its own standalone
 * route (routes.jsx's "/entry"), mounted inside App.jsx's DeviceFrame - the
 * same 390x800 phone shell every other route uses - so it no longer breaks
 * the phone-frame illusion on desktop. This root div still sets its own
 * minHeight/background (see below); DeviceFrame's internal scroll container
 * is what keeps it fully scrollable inside the shell either way.
 *
 * Reads packages/pairing (parseMenu, and via pairingAdapter/offlinePairing,
 * the scoring engine + zero-network tables) READ ONLY - no file under
 * packages/pairing is edited by this screen.
 *
 * CAMERA (MODE_CAMERA below) is the one BE call in this file: it uploads
 * the shot to POST /v1/capture (lib/api.js's capture()) and, on success,
 * runs the returned raw_text through the SAME parseMenu -> pick -> pair
 * pipeline PASTE uses (this screen has no venue_id from the BE's
 * PairmeVenue table, only a local fixture id from seededLists.js, so it
 * never sends venue_id and always takes the extractor path). A failure
 * (network, typed extraction error, or no text found) falls back to Paste
 * with a plain-language note - it never surfaces an error code or a raw
 * exception message.
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
  sel: '#FCF1E1',
  selBd: '#EFB96B',
  accent: '#EFB96B',
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
  // pairInputs holds the resolved dishes + chosen cellar; offerings is DERIVED
  // from it plus the format, so the glass/bottle toggle re-ranks over the right
  // pool with the right strategy (item: separate pools, not a filter) with no
  // re-parse. `format` defaults to bottle-and-glass shortlist.
  const [pairInputs, setPairInputs] = React.useState(null);
  const [format, setFormat] = React.useState('both');
  const [cameraNote, setCameraNote] = React.useState('');
  // Shown inside the Camera tab itself (busy state + success note), distinct
  // from cameraNote above (which is the fallback-to-Paste banner rendered in
  // the Paste section once a photo could not be read).
  const [cameraBusy, setCameraBusy] = React.useState(false);
  const [cameraStatus, setCameraStatus] = React.useState('');
  const cameraInputRef = React.useRef(null);
  // Item 3: voice input for the free-text modes. interimResults is on, so
  // freeText fills in as the diner talks; speechBaseRef snapshots whatever
  // was already typed when listening starts so a spoken answer composes
  // with it instead of clobbering it (each interim/final result replaces
  // base + " " + heard-so-far, it does not append fragment after fragment).
  // Unsupported browsers keep the plain text input (speech.supported false
  // hides the mic entirely, R4).
  const speechBaseRef = React.useRef('');
  const speech = useSpeech({
    onResult: (t) => {
      const base = speechBaseRef.current.trim();
      setFreeText(base ? `${base} ${t}` : t);
    },
  });
  const startListening = () => {
    speechBaseRef.current = freeText;
    speech.start();
  };
  // Web Speech firing `no-speech` (or any other error) IS the "returns
  // nothing" case. There is no synchronous Whisper endpoint to fall back to
  // (the BE one is async upload+poll, admin-scoped), so the honest fallback
  // is the text field already on screen, plus one plain-language sentence
  // from the hook itself (speech.message) - never a raw code like `no-speech`.
  const micButton = (
    speech.supported ? (
      <button
        type="button"
        onClick={() => (speech.listening ? speech.stop() : startListening())}
        aria-label={speech.listening ? 'Stop listening' : 'Tell us what you are having'}
        aria-pressed={speech.listening}
        style={{
          flex: 'none', width: 44, height: 44, borderRadius: 999, cursor: 'pointer',
          border: `1.5px solid ${speech.state === 'error' ? COLORS.warnBd : speech.listening ? COLORS.chrome : COLORS.accentBd}`,
          background: speech.state === 'error' ? COLORS.warnBg : speech.listening ? COLORS.chrome : COLORS.card,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={speech.listening ? '#fff' : speech.state === 'error' ? COLORS.warnInk : COLORS.ink} strokeWidth="1.8" strokeLinecap="round">
          <rect x="9" y="2" width="6" height="11" rx="3"></rect>
          <path d="M5 11a7 7 0 0 0 14 0"></path>
          <line x1="12" y1="18" x2="12" y2="22"></line>
        </svg>
      </button>
    ) : null
  );

  // "At home" has no restaurant venue by construction, so it always shows
  // the picker, even if a venue list was already chosen on another tab -
  // the whole point of this mode is "pair against a list I choose, not a
  // table's".
  const needsListPicker = venueListId === null || mode === MODE_HOME;

  function resetOfferings() {
    if (pairInputs) setPairInputs(null);
  }

  // Offerings are derived: switching format re-runs the client engine with the
  // strategy + pool that format implies (DIRECTION_FOR_FORMAT), never a filter
  // over one ranked list. Barolo is bottle-only, so `glass` here can legitimately
  // come back empty; the render says so rather than faking a pour.
  const offerings = React.useMemo(() => {
    if (!pairInputs) return null;
    const T = getOfflineTables();
    return computeOfferings(
      DIRECTION_FOR_FORMAT[format] || 'several',
      pairInputs.engineDishes,
      pairInputs.wines,
      T,
      { format },
    );
  }, [pairInputs, format]);

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

  // Uploads the shot to POST /v1/capture (image-hash cache and venue
  // short-circuit both live server-side, untouched here) and, on success,
  // runs the extracted text through the exact same parseMenu -> pick -> pair
  // pipeline the Paste tab uses. No BE venue concept exists on this screen
  // (venueListId is a local seededLists.js fixture id, not a PairmeVenue
  // uuid), so this never sends venue_id - every capture from here takes the
  // extractor path unless the same photo was already captured (image_cache).
  async function handleCameraFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setCameraStatus('');
    setCameraBusy(true);
    try {
      const result = await apiCapture(file);
      const rawText = (result && result.raw_text) || '';
      if (!rawText.trim()) {
        throw new Error('We could not find any text in that photo. Try a clearer photo, or paste the menu below.');
      }
      setPasteText(rawText);
      const parsed = parseMenu(rawText);
      setDishes(parsed);
      setSelected(new Set());
      resetOfferings();
      setCameraStatus('Got it. Pick what you are having below.');
    } catch (err) {
      // Every failure here (network, a typed extraction error off the BE, or
      // the empty-text case above) already carries a plain-language message
      // per lib/api.js's ApiError contract - render it as-is and fall back
      // to Paste so the walk never gets stuck on a photo we could not read.
      const message = (err && err.message) || 'We could not read that photo. Please try again.';
      setCameraNote(message);
      setMode(MODE_PASTE);
    } finally {
      setCameraBusy(false);
    }
  }

  const canPair = dishes.length > 0 && selected.size > 0 && !!venueListId;

  function pairIt() {
    const chosen = dishes.filter((d, i) => selected.has(dishKey(d, i)));
    if (!chosen.length || !venueListId) return;
    // Keep section on each dish so coverage can speak in course terms (mains vs
    // starters) and the glass pool can pour per course.
    const engineDishes = chosen.map((d) => ({
      n: d.name,
      sec: d.section || null,
      components: resolveComponents(d.name, d.description),
    }));
    const wines = getSeededWines(venueListId);
    // Offerings are derived from these inputs + the format toggle (see the
    // useMemo above); default to the neutral shortlist until they toggle.
    setFormat('both');
    setPairInputs({ engineDishes, wines });
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
              {speech.supported ? 'Start typing, or tell us' : 'What are you having?'}
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                id="pm-type-input"
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder={speech.listening ? 'Listening...' : 'roast chicken, potatoes, green beans'}
                style={{
                  flex: 1,
                  minWidth: 0,
                  boxSizing: 'border-box',
                  fontSize: 16,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: `1.5px solid ${COLORS.rule}`,
                  fontFamily: 'inherit',
                }}
              />
              {speech.supported ? (
                <span aria-hidden="true" style={{ flex: 'none', font: '600 18px inherit', color: COLORS.muted, transform: speech.listening ? 'none' : 'translateX(2px)' }}>&rarr;</span>
              ) : null}
              {micButton}
            </div>
            {speech.state === 'error' && speech.message ? (
              <div style={{ font: '500 12px inherit', color: COLORS.warnInk, marginTop: 6 }}>{speech.message}</div>
            ) : null}
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
              {speech.supported ? 'Start typing, or tell us what you are cooking' : 'What are you cooking, or ordering in?'}
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                id="pm-home-input"
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder={speech.listening ? 'Listening...' : 'roast chicken, potatoes, green beans'}
                style={{
                  flex: 1,
                  minWidth: 0,
                  boxSizing: 'border-box',
                  fontSize: 16,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: `1.5px solid ${COLORS.rule}`,
                  fontFamily: 'inherit',
                }}
              />
              {speech.supported ? (
                <span aria-hidden="true" style={{ flex: 'none', font: '600 18px inherit', color: COLORS.muted }}>&rarr;</span>
              ) : null}
              {micButton}
            </div>
            {speech.state === 'error' && speech.message ? (
              <div style={{ font: '500 12px inherit', color: COLORS.warnInk, marginTop: 6 }}>{speech.message}</div>
            ) : null}
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

        {/* A: CAMERA. Native file picker, not a live stream, so the phone's
            own flash/focus/HDR still work in a dark room. Wired to POST
            /v1/capture; a failure falls back to Paste (see cameraNote in
            the Paste section above). */}
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
              disabled={cameraBusy}
              style={{ width: '100%', minHeight: 48, borderRadius: 999, border: `1px solid ${COLORS.accentBd}`, background: COLORS.accent, color: COLORS.chrome, font: '700 15px inherit', cursor: cameraBusy ? 'default' : 'pointer', opacity: cameraBusy ? 0.7 : 1 }}
            >
              {cameraBusy ? 'Reading the menu' : 'Take a photo of the menu'}
            </button>
            <p style={{ font: '400 12px inherit', color: COLORS.muted, marginTop: 8 }}>
              {cameraBusy
                ? 'Give us a moment to read the list.'
                : cameraStatus
                  ? cameraStatus
                  : 'Corner to corner works best. We will read the menu and you can pick your dishes below.'}
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

        {/* --- Offerings: two pools, keyed on format --------------------- */}
        {offerings ? (
          <section aria-label="Your wine" style={{ marginTop: 26 }}>
            <h2 style={{ font: '700 18px inherit', margin: '0 0 4px' }}>Your wine</h2>
            <p style={{ font: '400 13px inherit', color: COLORS.muted, margin: '0 0 12px' }}>
              From {SEEDED_WINE_LISTS.find((l) => l.id === venueListId)?.label}.
            </p>

            {/* Format toggle: switches POOL + ranking strategy, not a filter. */}
            <div role="tablist" aria-label="Glass or bottle" style={{ display: 'flex', gap: 4, background: COLORS.rule, borderRadius: 999, padding: 4, marginBottom: 6 }}>
              {[['glass', 'By the glass'], ['bottle', 'Single bottle'], ['both', 'Both']].map(([k, label]) => (
                <button key={k} role="tab" aria-selected={format === k} onClick={() => setFormat(k)}
                  style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 999, padding: '8px 6px', minHeight: 38, font: `${format === k ? '700' : '500'} 12px inherit`, color: format === k ? '#fff' : COLORS.ink, background: format === k ? COLORS.chrome : 'transparent' }}>
                  {label}
                </button>
              ))}
            </div>
            <p style={{ font: '400 12px/1.4 inherit', color: COLORS.muted, margin: '0 0 12px' }}>
              {format === 'glass' ? 'A pour for each course, ranked per dish.'
                : format === 'bottle' ? 'One bottle across everything, and where it gives ground.'
                : 'A table-wide shortlist to choose from together.'}
            </p>

            {offerings.offerings.length === 0 ? (
              <p style={{ font: '400 14px inherit', color: COLORS.muted }}>
                {format === 'glass'
                  ? 'This cellar has no by-the-glass list. Try Single bottle or Both.'
                  : 'Nothing on this list cleared every hard rule for what you picked. Try picking fewer dishes, or a different list.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {offerings.offerings.map((o, i) => (
                  // key must be unique per offering: a per-course glass pour
                  // repeats the same wine across courses, so o.wine.label alone
                  // duplicates. o.key IS (dish, wine) - see
                  // lib/offeringSelection.js - so it is unique AND stable, where
                  // the index it replaces silently rebound every card whenever
                  // the list re-ranked (a budget change re-sorts in place). The
                  // format prefix stays: switching pool is a different ranking,
                  // and remounting there is deliberate.
                  <div key={`${format}-${o.key || i}`} style={{ padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${COLORS.rule}`, background: COLORS.card }}>
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
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, alignItems: 'center' }}>
                        <span style={{ font: '400 11px inherit', color: COLORS.muted }}>Covers</span>
                        {o.covers.map((c, ci) => (
                          <span key={ci} style={{ font: '500 10.5px inherit', color: COLORS.ink, background: COLORS.page, border: `1px solid ${COLORS.rule}`, borderRadius: 999, padding: '3px 9px' }}>{c}</span>
                        ))}
                      </div>
                    ) : null}
                    {/* ITEM 4: pronunciation ("say it") and, when the wine list carried
                        one, its cellar bin number - two different fixes for the same
                        anxiety (a long name you're not sure how to say out loud). Bin
                        only renders when the parsed row actually had one. */}
                    {o.wine.say || o.wine.binNo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, paddingTop: 9, borderTop: `1px solid ${COLORS.rule}` }}>
                        {o.wine.say ? (
                          <>
                            <button
                              type="button"
                              onClick={() => speakText(o.wine.speak || o.wine.say || o.wine.label)}
                              aria-label="Say it out loud"
                              style={{ flex: 'none', width: 32, height: 32, borderRadius: 999, border: `1.5px solid ${COLORS.accentBd}`, background: COLORS.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.chrome} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 L6 9 H3 v6 h3 l5 4 Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></svg>
                            </button>
                            <span style={{ font: '600 12px inherit', color: COLORS.ink }}>{o.wine.say}</span>
                          </>
                        ) : null}
                        {o.wine.binNo ? (
                          <span style={{ font: '700 10.5px inherit', color: COLORS.chrome, background: COLORS.sel, border: `1px solid ${COLORS.selBd}`, borderRadius: 999, padding: '3px 9px', marginLeft: o.wine.say ? 'auto' : 0 }}>
                            Bin {o.wine.binNo}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* Single-bottle compromise: never silently omit where it gives ground. */}
            {offerings.compromise ? (
              <div style={{ marginTop: 12, border: `1px solid ${COLORS.warnBd}`, background: COLORS.warnBg, borderRadius: 12, padding: 13 }}>
                <div style={{ font: '700 11px inherit', color: COLORS.warnInk, letterSpacing: '.06em', textTransform: 'uppercase' }}>Where this bottle gives ground</div>
                <div style={{ font: '400 12.5px/1.5 inherit', color: COLORS.ink, marginTop: 5 }}>
                  On the {offerings.compromise.dish}: {typeof offerings.compromise.reason === 'string' ? offerings.compromise.reason : `${offerings.compromise.reason.note} (fit score ${offerings.compromise.reason.score}).`}
                </div>
              </div>
            ) : null}

            {/* Coverage: every ordered dish, paired or SAID unpaired. */}
            {offerings.coverage && offerings.coverage.length ? (
              <div style={{ marginTop: 12, border: `1px solid ${COLORS.rule}`, background: COLORS.card, borderRadius: 12, padding: 13 }}>
                <div style={{ font: '700 11px inherit', color: COLORS.muted, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>What we paired</div>
                {offerings.coverage.map((c, i) => {
                  const paired = c.status === 'paired';
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', padding: '3px 0' }}>
                      <span style={{ font: '500 12.5px inherit', color: COLORS.ink }}>{c.dish}</span>
                      <span style={{ font: `${paired ? '500' : '400'} 11.5px inherit`, color: paired ? COLORS.ink : COLORS.muted, textAlign: 'right' }}>
                        {paired ? (c.note ? c.note : (c.wine ? `with ${c.wine.split(',')[0]}` : 'paired')) : 'goes unpaired, and that is fine'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
