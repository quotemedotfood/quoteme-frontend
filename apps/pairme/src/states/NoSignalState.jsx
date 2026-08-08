import React from 'react';
import { pairOffline } from '../lib/offlinePairing.js';
import { STUB_ALREADY_LOADED_WINE_ROWS, STUB_DISH_ALREADY_CHOSEN } from './stubs.js';

/**
 * State (e) - NO SIGNAL.
 *
 * By the time a diner is choosing wine, the menu has already been read
 * (rows already loaded) and the dish is already chosen. Finishing the pair
 * from there needs nothing else from the network - see
 * apps/pairme/src/lib/offlinePairing.js for why, and offlinePairing.noSignal.test.js
 * for the proof: it blocks every fetch/XHR the test process could make and
 * still gets 3 offerings back.
 *
 * `pairWithNoSignal` is just `pairOffline` under a name that says what this
 * state is demonstrating; kept separate from rendering on purpose.
 *
 * @param {Array<Record<string, any>>} loadedWineRows - rows already parsed
 *   from the photographed menu, held in memory, never re-fetched here.
 * @param {{name: string, components: string[]}} dish - already chosen.
 */
export function pairWithNoSignal(loadedWineRows, dish) {
  return pairOffline(dish.name, dish.components, loadedWineRows, { n: 3 });
}

export default function NoSignalState({
  loadedWineRows = STUB_ALREADY_LOADED_WINE_ROWS,
  dish = STUB_DISH_ALREADY_CHOSEN,
}) {
  const result = pairWithNoSignal(loadedWineRows, dish);

  return (
    <div style={{ padding: 18 }}>
      <div
        style={{
          background: 'var(--pm-chrome)', borderRadius: 10, padding: 14,
        }}
      >
        <div style={{ font: '600 13.5px var(--font-body)', color: '#fff' }}>No signal. Doesn't change anything.</div>
        <div style={{ font: '400 12.5px/1.6 var(--font-body)', color: 'var(--pm-chromeSub)', marginTop: 6 }}>
          Your table's wine list and {dish.name} are already on this phone. We did not need a signal to finish
          this, we only needed one to get started.
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {result.picks.map((p, i) => (
          <div
            key={i}
            style={{ border: '1px solid var(--pm-rule)', background: 'var(--pm-card)', borderRadius: 10, padding: 12 }}
          >
            <div style={{ font: '600 11px var(--font-body)', color: 'var(--pm-blue)', letterSpacing: '.03em', textTransform: 'uppercase' }}>
              {p.label}
            </div>
            <div style={{ font: '600 13.5px var(--font-body)', color: 'var(--pm-ink)', marginTop: 3 }}>
              {p.wine.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
