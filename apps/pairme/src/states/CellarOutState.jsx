import React from 'react';
import { pairOffline } from '../lib/offlinePairing.js';
import { STUB_WINE_LIST_WITH_86, STUB_DISH_FOR_86 } from './stubs.js';

/**
 * State (b) - a wine that is on the printed list but out in the cellar.
 *
 * The wine list row shape carries a `stock` field the scoring engine itself
 * never reads (packages/pairing is deliberately about the wine, the dish
 * and the rules only). Filtering a printed-but-86'd bottle out of the
 * candidate pool - and noticing when that bottle would otherwise have won
 * - is this app's job, not the engine's. `pairWithCellarCheck` is that
 * decision, kept separate from rendering so it can be tested without a DOM.
 *
 * @param {{name: string, components: string[]}} dish
 * @param {Array<Record<string, any>>} wineList - rows that may carry `stock`.
 * @param {object} [opts] - forwarded to pairOffline (n, budget, glassOnly).
 */
export function pairWithCellarCheck(dish, wineList, opts = {}) {
  const outOfStock = wineList.filter((w) => (w.stock ?? 1) <= 0);
  const available = wineList.filter((w) => (w.stock ?? 1) > 0);

  const result = pairOffline(dish.name, dish.components, available, opts);

  // Would the honest best pick, ignoring stock, have been one that's 86'd?
  // Only worth telling the diner about if it actually would have changed
  // their top pick - otherwise the 86'd bottle was never in the running.
  const unfiltered = pairOffline(dish.name, dish.components, wineList, opts);
  const topUnfiltered = unfiltered.picks[0];
  const replaced = !!(
    topUnfiltered && outOfStock.some((w) => w.label === topUnfiltered.wine.label)
  );

  return {
    ...result,
    outOfStock,
    replaced,
    replacedLabel: replaced ? topUnfiltered.wine.label : null,
  };
}

export default function CellarOutState({ dish = STUB_DISH_FOR_86, wineList = STUB_WINE_LIST_WITH_86 }) {
  const result = pairWithCellarCheck(dish, wineList, { n: 3 });

  return (
    <div style={{ padding: 18 }}>
      <div style={{ font: '600 14px var(--font-display)', color: 'var(--pm-ink)' }}>{dish.name}</div>

      {result.replaced ? (
        <div
          style={{
            background: 'var(--pm-warnBg)', border: '1px solid var(--pm-warnBd)', borderRadius: 10,
            padding: 12, marginTop: 10, font: '400 12.5px/1.6 var(--font-body)', color: 'var(--pm-warnInk)',
          }}
        >
          That one's on the list, not in the glass tonight. {result.replacedLabel} is printed but the cellar is
          out. Here is what we are pouring instead, and it still does the job.
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
