import React from 'react';
import { buildWineListModel } from '../lib/wineListEngine.js';

const NAVY = '#1F2A44';
const PEAR = '#EFB96B';

function fmtPrice(n) {
  return n == null ? null : `$${n}`;
}

/** Same speech-synthesis call TheWine.jsx's own `say()` makes (state.js),
 * kept local so this screen never HAS to be wired through usePairMe to
 * render or be tested - a plain `say` prop overrides it when the caller
 * (routes.jsx) has the real one. */
function speakFallback(text) {
  try {
    const sp = window.speechSynthesis;
    if (!sp || !text) return;
    sp.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.82;
    u.pitch = 1;
    sp.speak(u);
  } catch {
    // Speech synthesis is a nice-to-have, never a hard requirement.
  }
}

function SpeakerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 L6 9 H3 v6 h3 l5 4 Z"></path>
      <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
      <path d="M18.5 5.5a9 9 0 0 1 0 13"></path>
    </svg>
  );
}

function WineRow({ wine, isBest, expanded, onToggle, onSpeak }) {
  const bottle = fmtPrice(wine.price);
  const glass = fmtPrice(wine.glassPrice);
  return (
    <div
      data-testid="wine-row"
      style={{
        border: `${isBest ? '2px' : '1px'} solid ${isBest ? NAVY : 'var(--pm-rule)'}`,
        background: isBest ? 'var(--pm-sel)' : 'var(--pm-card)',
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 8,
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
      >
        {isBest || wine.hasBadge ? (
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                font: '700 10px var(--font-body)',
                color: isBest ? NAVY : 'var(--pm-ink)',
                background: isBest ? PEAR : 'var(--pm-sunken)',
                border: isBest ? 'none' : '1px solid var(--pm-rule)',
                borderRadius: 999,
                padding: '3px 9px',
                letterSpacing: '.04em',
                textTransform: 'uppercase',
              }}
            >
              {isBest ? 'Best match' : `Pairs with ${wine.pairsWith[0].dish}`}
            </span>
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div style={{ font: '700 14px var(--font-body)', color: 'var(--pm-ink)' }}>{wine.producer}</div>
            <div style={{ font: '400 12.5px var(--font-body)', color: 'var(--pm-ink)', marginTop: 1 }}>
              {wine.wineName}
              {wine.vintage ? `, ${wine.vintage}` : ''}
            </div>
            <div style={{ font: '400 11.5px var(--font-body)', color: 'var(--pm-muted)', marginTop: 3 }}>{wine.region}</div>
          </div>
          <div style={{ textAlign: 'right', flex: 'none' }}>
            {bottle ? (
              <div style={{ font: '700 13.5px var(--font-body)', color: 'var(--pm-ink)', fontVariantNumeric: 'tabular-nums' }}>{bottle}</div>
            ) : null}
            {glass ? (
              <div style={{ font: '400 11.5px var(--font-body)', color: 'var(--pm-muted)', fontVariantNumeric: 'tabular-nums' }}>{glass} glass</div>
            ) : null}
          </div>
        </div>
      </button>

      {expanded ? (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--pm-rule)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <button
              onClick={onSpeak}
              aria-label="Say it out loud"
              style={{
                flex: 'none', width: 36, height: 36, borderRadius: 999, border: '1.5px solid var(--pm-accent2)',
                background: 'var(--pm-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <SpeakerIcon />
            </button>
            <div>
              <div style={{ font: '600 10.5px var(--font-body)', color: 'var(--pm-pearInk)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                Say it
              </div>
              <div style={{ font: '700 13.5px var(--font-body)', color: 'var(--pm-ink)' }}>{wine.pronunciation || wine.wineName}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ font: '600 10.5px var(--font-body)', color: 'var(--pm-muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Grape</div>
              <div style={{ font: '500 12.5px var(--font-body)', color: 'var(--pm-ink)' }}>{wine.grape || 'not listed'}</div>
            </div>
            <div>
              <div style={{ font: '600 10.5px var(--font-body)', color: 'var(--pm-muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                Appellation
              </div>
              <div style={{ font: '500 12.5px var(--font-body)', color: 'var(--pm-ink)' }}>{wine.region || 'not listed'}</div>
            </div>
            <div>
              <div style={{ font: '600 10.5px var(--font-body)', color: 'var(--pm-muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Bottle</div>
              <div style={{ font: '500 12.5px var(--font-body)', color: 'var(--pm-ink)' }}>{bottle || 'not listed'}</div>
            </div>
            <div>
              <div style={{ font: '600 10.5px var(--font-body)', color: 'var(--pm-muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Glass</div>
              <div style={{ font: '500 12.5px var(--font-body)', color: 'var(--pm-ink)' }}>{glass || 'bottle only'}</div>
            </div>
          </div>

          {wine.pairsWith.length ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ font: '600 10.5px var(--font-body)', color: 'var(--pm-muted)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 4 }}>
                Pairs with what you ordered
              </div>
              {wine.pairsWith.map((p, i) => (
                <div key={i} style={{ font: '400 12.5px/1.6 var(--font-body)', color: 'var(--pm-ink)', marginBottom: 4 }}>
                  <strong>{p.dish}:</strong> {p.why}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Screen: the full wine list, browsable by color then country then region.
 * Reachable from TheWine's "Browse the full list" button and directly at
 * /wines/list (see routes.jsx). Standalone full-page route, like Login and
 * EntryScreen - a wine list wants the whole width of the screen, not the
 * 390x800 Phone mockup every onboarding step renders into.
 *
 * @param {Array<Record<string, any>>} wines - raw wine rows.
 * @param {Array<{name: string, components: string[]}>} pickedDishes - []
 *   when nothing has been picked yet: no badges are computed or shown.
 * @param {ReturnType<import('../../../../packages/pairing/src/tables.js').buildTables>} tables
 * @param {(text: string) => void} [say] - defaults to a local speechSynthesis
 *   call identical to TheWine's own `say()`.
 * @param {() => void} [onBack]
 */
export default function WineList({ wines, pickedDishes, tables, say, onBack }) {
  const speak = say || speakFallback;
  const model = React.useMemo(
    () => buildWineListModel(wines || [], pickedDishes || [], tables),
    [wines, pickedDishes, tables]
  );
  const [activeColor, setActiveColor] = React.useState(null);
  const [expandedKey, setExpandedKey] = React.useState(null);

  const color = activeColor && model.colors.includes(activeColor) ? activeColor : model.colors[0];
  const section = color ? model.byColor[color] : null;

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: 'var(--pm-page)', color: 'var(--pm-ink)' }}>
      <div style={{ background: NAVY, padding: '18px 18px 14px', position: 'sticky', top: 0, zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="Back to your wine"
              style={{ border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: '#fff', borderRadius: 999, padding: '7px 12px', font: '600 12px var(--font-body)', cursor: 'pointer' }}
            >
              Back
            </button>
          ) : null}
          <div style={{ font: '600 20px var(--font-display)', color: '#fff' }}>The full list</div>
        </div>
        <div style={{ font: '400 12.5px/1.5 var(--font-body)', color: 'var(--pm-chromeSub)', marginTop: 8 }}>
          {model.hasPicks
            ? 'Everything on the list tonight. The wines that pair with what you ordered are marked.'
            : 'Everything on the list tonight, by color and country.'}
        </div>
      </div>

      {model.colors.length === 0 ? (
        <div style={{ padding: 24, font: '400 13px/1.6 var(--font-body)', color: 'var(--pm-muted)' }}>
          Nothing to show yet. Once a list is loaded, it will sort itself by color and country here.
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Wine color" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '14px 16px 8px' }}>
            {model.colors.map((c) => {
              const on = c === color;
              return (
                <button
                  key={c}
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setActiveColor(c);
                    setExpandedKey(null);
                  }}
                  style={{
                    flex: 'none', border: 'none', cursor: 'pointer', borderRadius: 999, padding: '9px 16px', minHeight: 38,
                    font: `${on ? '700' : '500'} 13px var(--font-body)`, color: on ? NAVY : 'var(--pm-ink)', background: on ? PEAR : 'var(--pm-sunken)',
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '4px 16px 32px' }}>
            {(section ? section.countries : []).map((cg) => (
              <div key={cg.country} data-testid="wine-country-group">
                <div style={{ font: '700 12px var(--font-body)', color: 'var(--pm-muted)', letterSpacing: '.06em', textTransform: 'uppercase', margin: '14px 0 8px' }}>
                  {cg.country}
                </div>
                {cg.topPick ? (
                  <WineRow
                    wine={cg.topPick}
                    isBest
                    expanded={expandedKey === cg.topPick.key}
                    onToggle={() => setExpandedKey(expandedKey === cg.topPick.key ? null : cg.topPick.key)}
                    onSpeak={() => speak(cg.topPick.speak)}
                  />
                ) : null}
                {cg.regions.map((rg) => (
                  <div key={rg.region}>
                    <div style={{ font: '600 11px var(--font-body)', color: 'var(--pm-muted)', margin: '10px 0 6px' }}>{rg.region}</div>
                    {rg.wines.map((w) => (
                      <WineRow
                        key={w.key}
                        wine={w}
                        expanded={expandedKey === w.key}
                        onToggle={() => setExpandedKey(expandedKey === w.key ? null : w.key)}
                        onSpeak={() => speak(w.speak)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
