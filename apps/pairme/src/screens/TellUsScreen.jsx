import React from 'react';
import { useLocation } from 'react-router-dom';
import { parseFreeText } from '../lib/parseFreeText.js';
import { parseWineList } from '../../../../packages/pairing/src/index.js';
import { resolveComponents } from '../lib/dishComponents.js';
import { getOfflineTables } from '../lib/offlinePairing.js';
import { computeOfferings, rowToEngineWine } from '../lib/pairingAdapter.js';
import { GENERIC_STYLE_WINES } from '../lib/seededLists.js';

/**
 * "Just tell us here" (WhereTo's fourth path, items 6/7/8): the at-home /
 * no-menu case. A diner typed or spoke what they are eating on WhereTo (no
 * venue, no menu photo) and landed here with that text carried over via
 * router state.
 *
 * Standalone full-viewport route, same category as EntryScreen.jsx and
 * OperatorPage.jsx (see routes.jsx) - NOT one of the Phone-mockup SCREENS
 * (that 390x800 card is a desktop-preview frame for Desi's onboarding walk).
 * This screen's own job - extract, let the diner correct, then one of three
 * paths to a pairing - does not fit that frame any better than EntryScreen's
 * paste/pick/pair walk did.
 *
 * Reads packages/pairing (parseWineList, and via pairingAdapter/
 * offlinePairing, the scoring engine + zero-network tables) READ ONLY - no
 * file under packages/pairing is edited by this screen.
 *
 * Step 1, EXTRACTION (item 7): parseFreeText the text once on mount (the
 * same free-text splitter EntryScreen's TYPE/AT HOME tabs use - short
 * fragments, no sections, no prices). What comes back is never pairing
 * input directly - it is always shown back to the diner as editable rows
 * first (add/remove/edit), so a mis-heard word or a merged dish never
 * reaches the engine uncorrected. Correction before pairing, always.
 *
 * Step 2, THREE CHOICES (item 8), each its own button under the corrected
 * list:
 *   - "Guide me": no venue wine list exists for the at-home case, so this
 *     pairs against GENERIC_STYLE_WINES (seededLists.js) - six broad styles
 *     built from wine_axes.csv's own vocabulary, not a real bottle. Same
 *     computeOfferings() call as every other pairing seam in this app.
 *   - "I have a wine list": a diner at home may still have an actual list
 *     (their own cellar, a delivery menu) to pair against. Reuses the
 *     paste-then-parse mechanic EntryScreen's Paste tab established (a
 *     textarea + a find button), pointed at parseWineList instead of
 *     parseMenu because what is being pasted here is a WINE list, not a
 *     food menu - parseWineList does not care whether its raw text came
 *     from a camera capture or was typed directly (state.js's own
 *     handleCaptureFile calls it the same way on OCR output).
 *   - "Local options": NOT BUILT. Per BUTTON_AUDIT.md's rule (a control
 *     ships with both columns done, or ships visibly disabled - never a
 *     third state that looks live but does nothing), this renders a
 *     disabled button with "Coming soon" and an honest sub-note. It is
 *     never wired to anything; retail delivery referral touches a parked
 *     legal question, not an engineering gap.
 */

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
};

function blankDish(name) {
  return { name, description: '', price: null, section: null };
}

/** Same window.speechSynthesis pattern state.js's own `say()` uses for
 * TheWine's "Say it" button - kept local here (rather than exported from
 * state.js, which this branch does not touch) since it is a two-line
 * wrapper, not shared logic. */
function speakText(text) {
  try {
    const sp = window.speechSynthesis;
    if (!sp || !text) return;
    sp.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.82;
    u.pitch = 1;
    sp.speak(u);
  } catch {
    /* no speech synthesis available; the printed "say" text is the fallback */
  }
}

export default function TellUsScreen() {
  const location = useLocation();
  const initialText = (location.state && location.state.text) || '';
  const [dishes, setDishes] = React.useState(() => parseFreeText(initialText));
  const [newDishName, setNewDishName] = React.useState('');
  const [showWineListEntry, setShowWineListEntry] = React.useState(false);
  const [wineListText, setWineListText] = React.useState('');
  const [wineListNote, setWineListNote] = React.useState('');
  const [offerings, setOfferings] = React.useState(null);
  const [offeringsSource, setOfferingsSource] = React.useState('');

  const hasDishes = dishes.some((d) => d.name.trim());

  function updateDishName(i, name) {
    setDishes((ds) => ds.map((d, idx) => (idx === i ? { ...d, name } : d)));
    setOfferings(null);
  }

  function removeDish(i) {
    setDishes((ds) => ds.filter((_, idx) => idx !== i));
    setOfferings(null);
  }

  function addDish() {
    const name = newDishName.trim();
    if (!name) return;
    setDishes((ds) => [...ds, blankDish(name)]);
    setNewDishName('');
    setOfferings(null);
  }

  // Same shape EntryScreen.pairIt() builds: {n, sec, components} is what
  // computeOfferings' `dishes` argument expects (dishToEngineDish reads
  // dish.n, not dish.name). Blank/whitespace-only corrections are dropped
  // rather than sent to the engine as an empty dish.
  function buildEngineDishes() {
    return dishes
      .filter((d) => d.name.trim())
      .map((d) => ({ n: d.name, sec: d.section || null, components: resolveComponents(d.name, d.description) }));
  }

  function guideMe() {
    const engineDishes = buildEngineDishes();
    if (!engineDishes.length) return;
    const T = getOfflineTables();
    const result = computeOfferings('several', engineDishes, GENERIC_STYLE_WINES, T, { format: 'both' });
    setOfferings(result);
    setOfferingsSource('our general wine styles. No venue list, so these are styles, not bottles.');
    setShowWineListEntry(false);
  }

  function findWines() {
    const text = wineListText.trim();
    if (!text) return;
    const rows = parseWineList(text);
    if (!rows.length) {
      setWineListNote('We could not find any wines in that. Try pasting more of the list, or use Guide me instead.');
      return;
    }
    setWineListNote('');
    const wines = rows.map(rowToEngineWine);
    const engineDishes = buildEngineDishes();
    if (!engineDishes.length) return;
    const T = getOfflineTables();
    const result = computeOfferings('several', engineDishes, wines, T, { format: 'both' });
    setOfferings(result);
    setOfferingsSource('the wine list you gave us.');
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.page, color: COLORS.ink, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 48px' }}>
        <h1 style={{ font: '700 22px/1.3 inherit', margin: '0 0 4px' }}>What we heard</h1>
        <p style={{ font: '400 14px/1.5 inherit', color: COLORS.muted, margin: '0 0 20px' }}>
          Fix anything that is wrong before we pair it. Add a dish we missed, or take one out.
        </p>

        {/* --- EXTRACTION + CORRECTION (item 7) --------------------------- */}
        <section aria-label="What we heard">
          {dishes.length === 0 ? (
            <p style={{ font: '400 13.5px inherit', color: COLORS.muted, margin: '0 0 10px' }}>
              We did not catch anything to pair. Add a dish below.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {dishes.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    aria-label={`Dish ${i + 1}`}
                    type="text"
                    value={d.name}
                    onChange={(e) => updateDishName(i, e.target.value)}
                    style={{
                      flex: 1, minWidth: 0, boxSizing: 'border-box', fontSize: 16, padding: '11px 12px',
                      borderRadius: 10, border: `1.5px solid ${COLORS.rule}`, fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeDish(i)}
                    aria-label={`Remove ${d.name || 'this dish'}`}
                    style={{
                      flex: 'none', width: 40, height: 40, borderRadius: 999, cursor: 'pointer',
                      border: `1.5px solid ${COLORS.rule}`, background: COLORS.card, color: COLORS.muted, font: '600 16px inherit',
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              aria-label="Add a dish"
              type="text"
              value={newDishName}
              onChange={(e) => setNewDishName(e.target.value)}
              placeholder="Add a dish we missed"
              style={{
                flex: 1, minWidth: 0, boxSizing: 'border-box', fontSize: 16, padding: '11px 12px',
                borderRadius: 10, border: `1.5px dashed ${COLORS.rule}`, fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={addDish}
              disabled={!newDishName.trim()}
              style={{
                flex: 'none', minHeight: 42, padding: '0 16px', borderRadius: 999, cursor: newDishName.trim() ? 'pointer' : 'default',
                border: `1px solid ${COLORS.rule}`, background: COLORS.card, color: COLORS.ink, font: '600 13.5px inherit',
                opacity: newDishName.trim() ? 1 : 0.55,
              }}
            >
              Add
            </button>
          </div>
        </section>

        {/* --- THREE CHOICES (item 8) -------------------------------------- */}
        <section aria-label="Now what" style={{ marginTop: 26 }}>
          <h2 style={{ font: '600 15px inherit', margin: '0 0 10px' }}>Now what?</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              onClick={guideMe}
              disabled={!hasDishes}
              style={{
                width: '100%', minHeight: 52, borderRadius: 999, border: `1px solid ${COLORS.accentBd}`,
                background: hasDishes ? COLORS.accent : COLORS.rule, color: COLORS.chrome, font: '700 15px inherit',
                cursor: hasDishes ? 'pointer' : 'default',
              }}
            >
              Guide me
            </button>
            <button
              type="button"
              onClick={() => setShowWineListEntry((v) => !v)}
              disabled={!hasDishes}
              style={{
                width: '100%', minHeight: 52, borderRadius: 999, border: `1.5px solid ${COLORS.chrome}`,
                background: COLORS.card, color: COLORS.chrome, font: '700 15px inherit',
                cursor: hasDishes ? 'pointer' : 'default', opacity: hasDishes ? 1 : 0.55,
              }}
            >
              I have a wine list
            </button>
            {/*
              LOCAL OPTIONS - NOT WIRED, on purpose. BUTTON_AUDIT.md: a
              control ships with both columns done, or visibly disabled -
              never a third state that looks live but does nothing. This
              stays a real disabled <button> (never removes the disabled
              attribute, never gets an onClick) until retail delivery
              referral is actually built and the parked legal question is
              settled.
            */}
            <button
              type="button"
              disabled
              aria-disabled="true"
              style={{
                width: '100%', minHeight: 52, borderRadius: 999, border: `1px dashed ${COLORS.rule}`,
                background: '#F1EFEA', color: COLORS.muted, font: '700 15px inherit', cursor: 'default',
              }}
            >
              Local options
            </button>
            <div style={{ font: '400 12px/1.5 inherit', color: COLORS.muted, marginTop: -4 }}>
              Coming soon. Finding wine for sale near you is not built yet, and it touches a legal
              question about retail delivery referrals that has not been settled, so we are not
              turning it on until that is resolved.
            </div>
          </div>
        </section>

        {/* --- "I have a wine list": paste + parse (item 8) --------------- */}
        {showWineListEntry ? (
          <section aria-label="Bring your own wine list" style={{ marginTop: 20 }}>
            <label htmlFor="pm-tellus-winelist" style={{ display: 'block', font: '600 13.5px inherit', marginBottom: 6 }}>
              Paste your wine list
            </label>
            <textarea
              id="pm-tellus-winelist"
              value={wineListText}
              onChange={(e) => setWineListText(e.target.value)}
              placeholder={'Domaine Ostertag, Riesling Alsace, France 2022   45\nJean Foillard, Morgon Cote du Py 2021   62'}
              rows={6}
              style={{
                width: '100%', boxSizing: 'border-box', fontSize: 16, lineHeight: 1.4, padding: 12,
                borderRadius: 10, border: `1.5px solid ${COLORS.rule}`, fontFamily: 'inherit', resize: 'vertical',
              }}
            />
            {wineListNote ? (
              <p style={{ font: '400 12.5px inherit', color: COLORS.muted, marginTop: 6 }}>{wineListNote}</p>
            ) : null}
            <button
              type="button"
              onClick={findWines}
              disabled={!wineListText.trim()}
              style={{
                marginTop: 10, width: '100%', minHeight: 48, borderRadius: 999, border: `1px solid ${COLORS.accentBd}`,
                background: wineListText.trim() ? COLORS.accent : COLORS.rule, color: COLORS.chrome, font: '700 15px inherit',
                cursor: wineListText.trim() ? 'pointer' : 'default',
              }}
            >
              Find the wines
            </button>
          </section>
        ) : null}

        {/* --- Offerings: item 8a lands here, no navigation --------------- */}
        {offerings ? (
          <section aria-label="The wine" style={{ marginTop: 26 }}>
            <h2 style={{ font: '700 18px inherit', margin: '0 0 4px' }}>The wine</h2>
            <p style={{ font: '400 13px inherit', color: COLORS.muted, margin: '0 0 12px' }}>From {offeringsSource}</p>

            {offerings.offerings.length === 0 ? (
              <p style={{ font: '400 14px inherit', color: COLORS.muted }}>
                Nothing cleared every hard rule for what you told us. Try correcting a dish above, or
                add another one.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {offerings.offerings.map((o, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${COLORS.rule}`, background: COLORS.card }}>
                    <div style={{ font: '600 12px inherit', color: COLORS.chrome, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 }}>
                      {o.label || 'Offering'}
                    </div>
                    <div style={{ font: '700 16px inherit' }}>
                      {o.wine.producer || o.wine.label}
                      {o.wine.wine_name ? `, ${o.wine.wine_name}` : ''}
                    </div>
                    <div style={{ font: '400 13px inherit', color: COLORS.muted, margin: '2px 0 8px' }}>
                      {[o.wine.meta, o.wine.price ? `$${o.wine.price}` : null].filter(Boolean).join(' . ')}
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
                        only renders when the parsed row actually had one - a pasted
                        cellar list sometimes carries it, the demo styles never do. */}
                    {o.wine.say || o.wine.binNo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, paddingTop: 9, borderTop: `1px solid ${COLORS.rule}` }}>
                        {o.wine.say ? (
                          <>
                            <button
                              type="button"
                              onClick={() => speakText(o.wine.speak || o.wine.say)}
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
          </section>
        ) : null}
      </div>
    </div>
  );
}
