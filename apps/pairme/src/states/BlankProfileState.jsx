import React from 'react';
import { pairOffline } from '../lib/offlinePairing.js';
import { STUB_BLANK_PROFILE, STUB_DISH_FOR_BLANK_PROFILE, STUB_WINE_LIST_FOR_BLANK_PROFILE } from './stubs.js';

/**
 * State (d) - a diner who skipped every onboarding screen. Every field on
 * STUB_BLANK_PROFILE is null/empty, the same shape Q1-Q6's "Skip setup"
 * affordance leaves behind (state.js's `alt` for screen 0 sets
 * likes/dislikes/diet to [] and never sets level/want/budget at all).
 *
 * The scoring engine (packages/pairing) never reads taste preferences in
 * the first place - only a dish's components, a wine list, and an optional
 * budget/glassOnly filter. So a blank profile pairs exactly the same way a
 * full one does; this handler exists to make that explicit and to prove it
 * does not throw on null fields, not because the engine needs special
 * handling for them.
 *
 * @param {{budget?: number|null}} profile
 * @param {{name: string, components: string[]}} dish
 * @param {Array<Record<string, any>>} wineList
 */
export function pairForBlankProfile(profile, dish, wineList) {
  const opts = { n: 3, budget: (profile && profile.budget) || null, glassOnly: false };
  return pairOffline(dish.name, dish.components, wineList, opts);
}

export default function BlankProfileState({
  profile = STUB_BLANK_PROFILE,
  dish = STUB_DISH_FOR_BLANK_PROFILE,
  wineList = STUB_WINE_LIST_FOR_BLANK_PROFILE,
}) {
  const result = pairForBlankProfile(profile, dish, wineList);

  return (
    <div style={{ padding: 18 }}>
      <div
        style={{
          background: 'var(--pm-sunken)', border: '1px solid var(--pm-rule)', borderRadius: 10,
          padding: 14,
        }}
      >
        <div style={{ font: '600 13.5px var(--font-body)', color: 'var(--pm-ink)' }}>
          You skipped every question, and that's completely fine
        </div>
        <div style={{ font: '400 12.5px/1.6 var(--font-body)', color: 'var(--pm-muted)', marginTop: 6 }}>
          We do not know your taste yet, so here is the honest version: three wines that work for the table in
          front of you, not a guess about you specifically.
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
