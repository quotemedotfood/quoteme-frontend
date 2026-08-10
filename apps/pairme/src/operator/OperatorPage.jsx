import React from 'react';
import { parseMenu } from '../../../../packages/pairing/src/index.js';
import { SEEDED_WINE_LISTS, getSeededWines } from '../lib/seededLists.js';
import { getOfflineTables } from '../lib/offlinePairing.js';
import {
  buildResolvedDish,
  rankWinesForDish,
  eligibleWinesForDish,
  roleLabelForDish,
  wineMetaLine,
  parsePastedWineList,
  buildTableUrl,
} from './operatorEngine.js';

/**
 * OperatorPage: the restaurant OPERATOR side of PairMe, standalone route
 * (routes.jsx's "/operator"), same standalone-full-viewport pattern
 * EntryScreen.jsx uses for the diner side, NOT nested in App.jsx's phone
 * mockup frame. This belongs to the restaurant_admin role (no new role is
 * introduced by this file - see the auth note near the bottom of this
 * comment); today it is reachable unauthenticated, same as /entry, because
 * there is no BE-side operator auth contract yet to gate it against.
 *
 * Client-side only, on purpose: paste/upload the venue's own menu, pick or
 * paste the venue's own wine list, and the SAME client engine EntryScreen.jsx
 * runs for a diner (packages/pairing, via dishComponents.js / pairingAdapter.js
 * / offlinePairing.js - all read-only imports, see operatorEngine.js) ranks
 * up to 3 wines per dish. Confirm / swap / remove / push all live in this
 * file's own React state (useState below) - lib/state.js (the diner
 * onboarding view-model) is not touched, so this cannot collide with any
 * other work landing there.
 *
 * BE PERSISTENCE SEAM (TODO, follow-up, not this build): every "confirmed"
 * pairing and every "pushed" star below lives ONLY in this tab's memory.
 * When a real operator-facing contract exists (something like
 * POST /v1/venues/:code/pairings, keyed on the venue code entered in the QR
 * section), `persistPairings()` near the bottom of this file is where that
 * call goes - it currently only logs its intent, on purpose, so this is
 * never mistaken for already wired up. Until then, a diner hitting
 * /t/:code (routes.jsx's TableCodeRoute) does NOT receive anything
 * confirmed or pushed here; the "Diner preview" section is a preview, not a
 * publish.
 */

const COLORS = {
  page: '#FBFAF7',
  ink: '#1C1C1A',
  muted: '#6B6B66',
  card: '#fff',
  rule: '#E3E1DB',
  chrome: '#1F2A44',
  chromeSub: '#A5CFDD',
  sel: '#FFF4E4',
  selBd: '#EFB96B',
  accent: '#EFB96B',
  accentBd: '#E5A44F',
  warnBg: '#FEF3E7',
  warnBd: '#F2993D',
  warnInk: '#C4701A',
  removedBg: '#F1EFEA',
  pushBg: '#FFF4E4',
  pushBd: '#EFB96B',
};

const RANK_LABELS = ['Top pick', 'Second pick', 'Third pick'];

function makeSlot(ranked) {
  return {
    wine: ranked.wine,
    why: ranked.why,
    fired: ranked.fired,
    score: ranked.score,
    action: 'pending', // 'pending' | 'confirmed' | 'removed'
    pushed: false,
  };
}

function Chip({ children, tone }) {
  const bg = tone === 'warn' ? COLORS.warnBg : COLORS.page;
  const bd = tone === 'warn' ? COLORS.warnBd : COLORS.rule;
  const ink = tone === 'warn' ? COLORS.warnInk : COLORS.ink;
  return (
    <span style={{ font: '500 11px inherit', color: ink, background: bg, border: `1px solid ${bd}`, borderRadius: 999, padding: '4px 10px', display: 'inline-block' }}>
      {children}
    </span>
  );
}

/** One diner-facing card: role label / producer+wine / meta+price / why /
 * covers chips / a "featured tonight" mark when pushed. Deliberately the
 * same visual shape TheWine.jsx's offering cards use (role label up top in
 * uppercase chrome-colored type, bold producer/wine line, muted meta line,
 * a why paragraph, "Covers" chips) so a diner sees a consistent card
 * whether it came from the app's own engine or a venue's confirmed pick. */
function DinerCard({ dishName, wine, why, pushed }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 14,
        border: `1.5px solid ${pushed ? COLORS.pushBd : COLORS.rule}`,
        background: pushed ? COLORS.pushBg : COLORS.card,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ font: '600 12px inherit', color: COLORS.chrome, textTransform: 'uppercase', letterSpacing: '.03em' }}>
          {roleLabelForDish(dishName)}
        </div>
        {pushed ? (
          <div style={{ font: '700 10.5px inherit', color: COLORS.chrome, background: COLORS.accent, borderRadius: 999, padding: '3px 9px', flex: 'none' }}>
            Featured tonight
          </div>
        ) : null}
      </div>
      <div style={{ font: '700 16px inherit', marginTop: 4 }}>
        {wine.producer || wine.label}
        {wine.wine_name ? `, ${wine.wine_name}` : ''}
      </div>
      <div style={{ font: '400 13px inherit', color: COLORS.muted, margin: '2px 0 8px' }}>
        {[wineMetaLine(wine), wine.price ? `$${wine.price}` : null].filter(Boolean).join(' . ')}
      </div>
      <div style={{ font: '400 13.5px/1.4 inherit' }}>{why}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, alignItems: 'center' }}>
        <span style={{ font: '400 11px inherit', color: COLORS.muted }}>Covers</span>
        <Chip>{dishName}</Chip>
      </div>
      {pushed ? (
        <div style={{ font: '400 12px/1.5 inherit', color: COLORS.muted, marginTop: 8, borderTop: `1px solid ${COLORS.rule}`, paddingTop: 8 }}>
          The venue chose to feature this wine tonight. Diners are told, always - never a hidden push.
        </div>
      ) : null}
    </div>
  );
}

export default function OperatorPage() {
  const [menuText, setMenuText] = React.useState('');
  const [wineSourceMode, setWineSourceMode] = React.useState('seeded'); // 'seeded' | 'paste'
  const [seededListId, setSeededListId] = React.useState('demo');
  const [pastedWineText, setPastedWineText] = React.useState('');
  const [dishes, setDishes] = React.useState(null); // array of resolvedDish, +eligible
  const [pairings, setPairings] = React.useState(null); // array (per dish) of arrays of up to 3 slots
  const [buildError, setBuildError] = React.useState('');
  const [venueCode, setVenueCode] = React.useState('');
  const fileInputRef = React.useRef(null);

  function handleFileChosen(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMenuText(String(reader.result || ''));
    reader.readAsText(file);
  }

  function buildPairings() {
    const parsed = parseMenu(menuText);
    if (!parsed.length) {
      setBuildError('We could not find any dishes in that text. Check the paste and try again.');
      setDishes(null);
      setPairings(null);
      return;
    }
    let wines;
    try {
      wines = wineSourceMode === 'seeded' ? getSeededWines(seededListId) : parsePastedWineList(pastedWineText);
    } catch (err) {
      setBuildError('We could not read that wine list. Check the paste and try again.');
      return;
    }
    if (!wines || !wines.length) {
      setBuildError('That wine list has no wines we can pair against yet.');
      return;
    }
    setBuildError('');
    const T = getOfflineTables();
    const resolved = parsed.map((d) => {
      const rd = buildResolvedDish(d, T);
      return { ...rd, eligible: eligibleWinesForDish(rd, wines, T) };
    });
    const nextPairings = resolved.map((rd) => rankWinesForDish(rd, wines, T).map(makeSlot));
    setDishes(resolved);
    setPairings(nextPairings);
  }

  function updateSlot(dishIdx, slotIdx, patch) {
    setPairings((prev) => {
      const next = prev.map((slots) => slots.slice());
      next[dishIdx][slotIdx] = { ...next[dishIdx][slotIdx], ...patch };
      return next;
    });
  }

  function confirmSlot(dishIdx, slotIdx) {
    updateSlot(dishIdx, slotIdx, { action: 'confirmed' });
    // BE PERSISTENCE SEAM: see the file-level comment above. This is the
    // exact moment a real build would fire
    // POST /v1/venues/:code/pairings { confirm: {...} } - it does not here.
    persistPairings('confirm', dishIdx, slotIdx);
  }

  function removeSlot(dishIdx, slotIdx) {
    updateSlot(dishIdx, slotIdx, { action: 'removed', pushed: false });
    persistPairings('remove', dishIdx, slotIdx);
  }

  function restoreSlot(dishIdx, slotIdx) {
    updateSlot(dishIdx, slotIdx, { action: 'pending' });
  }

  function togglePush(dishIdx, slotIdx) {
    setPairings((prev) => {
      const next = prev.map((slots) => slots.slice());
      const cur = next[dishIdx][slotIdx];
      next[dishIdx][slotIdx] = { ...cur, pushed: !cur.pushed };
      return next;
    });
    persistPairings('push', dishIdx, slotIdx);
  }

  function swapSlot(dishIdx, slotIdx, wineLabel) {
    const candidates = dishes[dishIdx].eligible;
    const found = candidates.find((c) => c.wine.label === wineLabel);
    if (!found) return;
    // A swap is a fresh pick: it has not been reviewed by the operator yet
    // under its new wine, so it resets to pending and un-pushes rather than
    // silently carrying a confirm/push over from the wine it replaced.
    updateSlot(dishIdx, slotIdx, { wine: found.wine, why: found.why, fired: found.fired, score: found.score, action: 'pending', pushed: false });
  }

  /**
   * BE PERSISTENCE SEAM. Intentionally a no-op besides a console note: no
   * operator-pairings endpoint exists yet. Wiring this to a real POST is a
   * follow-up, not this build - see the file-level comment above for the
   * shape it would need (venue code + confirm/remove/push per dish+wine).
   */
  function persistPairings(kind, dishIdx, slotIdx) {
    // eslint-disable-next-line no-console
    console.debug('[operator] local-only action, not persisted to BE yet:', kind, { dishIdx, slotIdx });
  }

  const tableUrl = buildTableUrl(venueCode);

  const confirmedCards = [];
  if (dishes && pairings) {
    pairings.forEach((slots, dishIdx) => {
      slots.forEach((slot) => {
        if (slot.action === 'confirmed') {
          confirmedCards.push({ dishName: dishes[dishIdx].name, wine: slot.wine, why: slot.why, pushed: slot.pushed });
        }
      });
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.page, color: COLORS.ink, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 64px' }}>
        <h1 style={{ font: '700 24px/1.3 inherit', margin: '0 0 4px' }}>Set up your wine pairings</h1>
        <p style={{ font: '400 14px/1.5 inherit', color: COLORS.muted, margin: '0 0 24px' }}>
          Paste your menu and your wine list, review what we suggest for each dish, then confirm, swap or remove any
          pairing before it goes out to a guest.
        </p>

        {/* --- Wine list source ------------------------------------------ */}
        <section aria-label="Wine list" style={{ marginBottom: 22 }}>
          <h2 style={{ font: '600 16px inherit', margin: '0 0 8px' }}>1. Your wine list</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setWineSourceMode('seeded')}
              aria-pressed={wineSourceMode === 'seeded'}
              style={tabStyle(wineSourceMode === 'seeded')}
            >
              Pick a sample list
            </button>
            <button
              type="button"
              onClick={() => setWineSourceMode('paste')}
              aria-pressed={wineSourceMode === 'paste'}
              style={tabStyle(wineSourceMode === 'paste')}
            >
              Paste our own list
            </button>
          </div>

          {wineSourceMode === 'seeded' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SEEDED_WINE_LISTS.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSeededListId(list.id)}
                  aria-pressed={seededListId === list.id}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1.5px solid ${seededListId === list.id ? COLORS.chrome : COLORS.rule}`,
                    background: seededListId === list.id ? COLORS.sel : COLORS.card,
                    cursor: 'pointer',
                    minHeight: 44,
                  }}
                >
                  <div style={{ font: '600 14px inherit' }}>{list.label}</div>
                  <div style={{ font: '400 12.5px inherit', color: COLORS.muted }}>{list.sublabel}</div>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <label htmlFor="op-wine-paste" style={{ display: 'block', font: '600 13px inherit', marginBottom: 6 }}>
                Paste your wine list
              </label>
              <textarea
                id="op-wine-paste"
                value={pastedWineText}
                onChange={(e) => setPastedWineText(e.target.value)}
                placeholder={'Domaine Example, Village Red 2021 65\nAnother Producer, Cuvee Blanc 2022 58'}
                rows={6}
                style={textareaStyle}
              />
            </div>
          )}
        </section>

        {/* --- Menu paste / upload ---------------------------------------- */}
        <section aria-label="Menu" style={{ marginBottom: 22 }}>
          <h2 style={{ font: '600 16px inherit', margin: '0 0 8px' }}>2. Your menu</h2>
          <label htmlFor="op-menu-paste" style={{ display: 'block', font: '600 13px inherit', marginBottom: 6 }}>
            Paste your menu
          </label>
          <textarea
            id="op-menu-paste"
            value={menuText}
            onChange={(e) => setMenuText(e.target.value)}
            placeholder={'MAINS\n\nRoast chicken 28\nroast garlic, potatoes, jus\n\nGrilled salmon 32\nlemon, capers, asparagus'}
            rows={8}
            style={textareaStyle}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              aria-label="Upload a menu file"
              onChange={handleFileChosen}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={secondaryButtonStyle}
            >
              Upload a .txt menu instead
            </button>
          </div>

          <button
            type="button"
            onClick={buildPairings}
            disabled={!menuText.trim()}
            style={{
              marginTop: 14,
              width: '100%',
              minHeight: 50,
              borderRadius: 999,
              border: `1px solid ${COLORS.accentBd}`,
              background: menuText.trim() ? COLORS.accent : COLORS.rule,
              color: COLORS.chrome,
              font: '700 15px inherit',
              cursor: menuText.trim() ? 'pointer' : 'default',
            }}
          >
            Build pairings
          </button>
          {buildError ? (
            <p style={{ font: '500 13px inherit', color: COLORS.warnInk, background: COLORS.warnBg, border: `1px solid ${COLORS.warnBd}`, borderRadius: 10, padding: '10px 12px', marginTop: 10 }}>
              {buildError}
            </p>
          ) : null}
        </section>

        {/* --- Per-dish pairings ------------------------------------------- */}
        {dishes && pairings ? (
          <section aria-label="Dishes and pairings" style={{ marginBottom: 26 }}>
            <h2 style={{ font: '600 16px inherit', margin: '0 0 8px' }}>3. Review each dish</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {dishes.map((dish, dishIdx) => (
                <div key={`${dishIdx}:${dish.name}`} style={{ border: `1.5px solid ${COLORS.rule}`, borderRadius: 14, padding: 14, background: COLORS.card }}>
                  {dish.section ? (
                    <div style={{ font: '600 11px inherit', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 }}>
                      {dish.section}
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ font: '700 16px inherit' }}>{dish.name}</span>
                    <span style={{ font: '600 14px inherit', color: COLORS.muted, flex: 'none' }}>
                      {dish.price != null ? `$${dish.price}` : ''}
                    </span>
                  </div>
                  {dish.description ? (
                    <div style={{ font: '400 12.5px inherit', color: COLORS.muted, marginTop: 2 }}>{dish.description}</div>
                  ) : null}

                  {/* Resolved components + unresolved note */}
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {dish.components.length ? (
                      dish.components.map((c, ci) => <Chip key={ci}>{c}</Chip>)
                    ) : (
                      <Chip tone="warn">We could not read any ingredients for this dish</Chip>
                    )}
                  </div>
                  {dish.unresolved ? (
                    <p style={{ font: '400 12px/1.5 inherit', color: COLORS.warnInk, marginTop: 6 }}>
                      Pairing falls back to a neutral profile for this dish. Consider adding a short description
                      (ingredients, comma separated) so we can read it next time.
                    </p>
                  ) : null}

                  {/* Ranked pairing rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    {pairings[dishIdx].map((slot, slotIdx) => (
                      <div
                        key={slotIdx}
                        style={{
                          border: `1.5px solid ${slot.pushed ? COLORS.pushBd : COLORS.rule}`,
                          background: slot.action === 'removed' ? COLORS.removedBg : slot.pushed ? COLORS.pushBg : COLORS.page,
                          borderRadius: 12,
                          padding: 12,
                          opacity: slot.action === 'removed' ? 0.7 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                          <span style={{ font: '700 11px inherit', color: COLORS.chrome, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                            {RANK_LABELS[slotIdx] || `Pick ${slotIdx + 1}`}
                          </span>
                          <StatusBadge action={slot.action} pushed={slot.pushed} />
                        </div>
                        <div style={{ font: '700 15px inherit' }}>
                          {slot.wine.producer || slot.wine.label}
                          {slot.wine.wine_name ? `, ${slot.wine.wine_name}` : ''}
                        </div>
                        <div style={{ font: '400 12.5px inherit', color: COLORS.muted, margin: '2px 0 6px' }}>
                          {[wineMetaLine(slot.wine), slot.wine.price ? `$${slot.wine.price}` : null].filter(Boolean).join(' . ')}
                        </div>
                        <div style={{ font: '400 13px/1.45 inherit' }}>{slot.why}</div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
                          {slot.action !== 'removed' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => confirmSlot(dishIdx, slotIdx)}
                                disabled={slot.action === 'confirmed'}
                                style={smallButtonStyle(slot.action === 'confirmed')}
                              >
                                {slot.action === 'confirmed' ? 'Confirmed' : 'Confirm'}
                              </button>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, font: '500 12px inherit', color: COLORS.ink }}>
                                <input type="checkbox" checked={slot.pushed} onChange={() => togglePush(dishIdx, slotIdx)} />
                                Push to guest (disclosed)
                              </label>
                              <select
                                aria-label={`Swap the ${RANK_LABELS[slotIdx] || 'pick'} for ${dish.name}`}
                                value={slot.wine.label}
                                onChange={(e) => swapSlot(dishIdx, slotIdx, e.target.value)}
                                style={{ font: '500 12px inherit', padding: '6px 8px', borderRadius: 8, border: `1px solid ${COLORS.rule}` }}
                              >
                                {dish.eligible.map((c) => (
                                  <option key={c.wine.label} value={c.wine.label}>
                                    {c.wine.producer || c.wine.label}
                                    {c.wine.wine_name ? `, ${c.wine.wine_name}` : ''}
                                  </option>
                                ))}
                              </select>
                              <button type="button" onClick={() => removeSlot(dishIdx, slotIdx)} style={secondaryButtonStyle}>
                                Remove
                              </button>
                            </>
                          ) : (
                            <button type="button" onClick={() => restoreSlot(dishIdx, slotIdx)} style={secondaryButtonStyle}>
                              Bring back
                            </button>
                          )}
                        </div>
                        {slot.pushed ? (
                          <p style={{ font: '400 11.5px/1.4 inherit', color: COLORS.warnInk, marginTop: 8 }}>
                            We disclose this to the guest. Pushing a wine is never hidden.
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* --- QR / venue link --------------------------------------------- */}
        <section aria-label="Your QR code" style={{ marginBottom: 26 }}>
          <h2 style={{ font: '600 16px inherit', margin: '0 0 8px' }}>4. Your table code</h2>
          <label htmlFor="op-venue-code" style={{ display: 'block', font: '600 13px inherit', marginBottom: 6 }}>
            Venue code
          </label>
          <input
            id="op-venue-code"
            type="text"
            value={venueCode}
            onChange={(e) => setVenueCode(e.target.value)}
            placeholder="aquitaine-01"
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 16, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${COLORS.rule}`, fontFamily: 'inherit' }}
          />
          {tableUrl ? (
            <>
              <div
                style={{
                  marginTop: 10,
                  border: `1.5px dashed ${COLORS.chrome}`,
                  borderRadius: 12,
                  padding: 14,
                  textAlign: 'center',
                  background: COLORS.card,
                }}
              >
                <div style={{ font: '600 12px inherit', color: COLORS.muted, marginBottom: 6 }}>
                  QR code renders here once a qr lib is added.
                </div>
                <div style={{ font: '700 13px inherit', color: COLORS.chrome, wordBreak: 'break-all' }}>{tableUrl}</div>
              </div>
              <p style={{ font: '400 12px/1.5 inherit', color: COLORS.muted, marginTop: 6 }}>
                A guest who scans a printed QR code with this URL lands on this table's menu and pairings once the
                BE side of table codes is live.
              </p>
            </>
          ) : (
            <p style={{ font: '400 12px/1.5 inherit', color: COLORS.muted, marginTop: 6 }}>
              Enter a venue code to see the link a guest's QR code would point at.
            </p>
          )}
        </section>

        {/* --- Diner preview ------------------------------------------------ */}
        <section aria-label="Guest preview" style={{ marginBottom: 12 }}>
          <h2 style={{ font: '700 18px inherit', margin: '0 0 4px' }}>What a guest would see</h2>
          <p style={{ font: '400 13px inherit', color: COLORS.muted, margin: '0 0 12px' }}>
            Only confirmed pairings show here. This is a preview, on this device only; nothing is sent to a guest
            yet (see the note in this file about the BE persistence seam).
          </p>
          {confirmedCards.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {confirmedCards.map((c, i) => (
                <DinerCard key={i} dishName={c.dishName} wine={c.wine} why={c.why} pushed={c.pushed} />
              ))}
            </div>
          ) : (
            <p style={{ font: '400 14px inherit', color: COLORS.muted }}>
              Confirm at least one pairing above to see how it would look to a guest.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ action, pushed }) {
  if (action === 'removed') {
    return <span style={{ font: '600 10.5px inherit', color: COLORS.muted, textTransform: 'uppercase' }}>Removed</span>;
  }
  if (action === 'confirmed') {
    return (
      <span style={{ font: '700 10.5px inherit', color: '#fff', background: COLORS.chrome, borderRadius: 999, padding: '3px 9px' }}>
        {pushed ? 'Confirmed . Pushed, disclosed' : 'Confirmed'}
      </span>
    );
  }
  return <span style={{ font: '600 10.5px inherit', color: COLORS.muted, textTransform: 'uppercase' }}>Not yet reviewed</span>;
}

function tabStyle(active) {
  return {
    padding: '10px 14px',
    borderRadius: 999,
    border: `1.5px solid ${active ? COLORS.chrome : COLORS.rule}`,
    background: active ? COLORS.chrome : COLORS.card,
    color: active ? '#fff' : COLORS.ink,
    font: '600 13px inherit',
    cursor: 'pointer',
    minHeight: 40,
  };
}

function smallButtonStyle(done) {
  return {
    padding: '8px 12px',
    minHeight: 36,
    borderRadius: 999,
    border: `1px solid ${done ? COLORS.chrome : COLORS.accentBd}`,
    background: done ? COLORS.chrome : COLORS.accent,
    color: done ? '#fff' : COLORS.chrome,
    font: '700 12px inherit',
    cursor: done ? 'default' : 'pointer',
  };
}

const secondaryButtonStyle = {
  padding: '8px 12px',
  minHeight: 36,
  borderRadius: 999,
  border: `1px solid ${COLORS.rule}`,
  background: 'transparent',
  color: COLORS.ink,
  font: '600 12px inherit',
  cursor: 'pointer',
};

const textareaStyle = {
  width: '100%',
  boxSizing: 'border-box',
  fontSize: 16,
  lineHeight: 1.4,
  padding: 12,
  borderRadius: 10,
  border: `1.5px solid ${COLORS.rule}`,
  fontFamily: 'inherit',
  resize: 'vertical',
};
