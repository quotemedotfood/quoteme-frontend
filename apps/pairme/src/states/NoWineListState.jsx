import React from 'react';
import { Button } from '../lib/ds';
import { STUB_VENUE_NO_LIST } from './stubs.js';

/**
 * State (a) - a venue we hold no wine list for.
 *
 * Standalone: takes a venue object shaped like whatever GET /v1/venues (or
 * a venue picked from search) eventually hands the app; STUB_VENUE_NO_LIST
 * stands in for that until Lane A wires the real venue lookup and a route
 * to this screen. `handleNoWineList` is the pure decision, kept separate
 * from rendering so Lane A (or a test) can call it without a DOM.
 */
export function handleNoWineList(venue) {
  if (venue && venue.hasWineList) {
    return { hasWineList: true };
  }
  return {
    hasWineList: false,
    title: "We don't have their list yet",
    body: "That's on us, not you. Point your camera at the list and we'll read it in about ten seconds, right here at the table. It will be ready for the next person who eats here too.",
    primaryLabel: 'Photograph the list',
    secondaryLabel: 'Tell us what to look for instead',
  };
}

export default function NoWineListState({ venue = STUB_VENUE_NO_LIST, onPhotograph, onManual }) {
  const decision = handleNoWineList(venue);

  return (
    <div style={{ padding: 18 }}>
      <div style={{ font: '600 14px var(--font-display)', color: 'var(--pm-ink)' }}>{venue.name}</div>
      <div style={{ font: '400 12px var(--font-body)', color: 'var(--pm-muted)', marginTop: 2 }}>
        {venue.city}, {venue.state}
      </div>

      {decision.hasWineList ? (
        <div style={{ font: '400 13px var(--font-body)', color: 'var(--pm-ink)', marginTop: 12 }}>
          We have their list. Carry on.
        </div>
      ) : (
        <div
          style={{
            background: 'var(--pm-blueBg)', border: '1px solid var(--pm-blue)', borderRadius: 10,
            padding: 14, marginTop: 12,
          }}
        >
          <div style={{ font: '600 13.5px var(--font-body)', color: 'var(--pm-ink)' }}>{decision.title}</div>
          <div style={{ font: '400 12.5px/1.6 var(--font-body)', color: 'var(--pm-ink)', marginTop: 6 }}>
            {decision.body}
          </div>
          <div style={{ marginTop: 12 }}>
            <Button variant="primary" size="md" onClick={onPhotograph} style={{ width: '100%' }}>
              {decision.primaryLabel}
            </Button>
          </div>
          <div style={{ marginTop: 9 }}>
            <Button variant="secondary" size="md" onClick={onManual} style={{ width: '100%' }}>
              {decision.secondaryLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
