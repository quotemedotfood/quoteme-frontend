import React from 'react';
import { Button, Input } from '../lib/ds';
import { getOfflineTables, pairOffline } from '../lib/offlinePairing.js';
import { dishProfile } from '../../../../packages/pairing/src/index.js';
import { STUB_OCR_UNREADABLE, STUB_MANUAL_FALLBACK, STUB_WINE_LIST_FOR_UNREADABLE } from './stubs.js';

/**
 * State (c) - a dish we could not read.
 *
 * A bad photo angle or handwriting does not usually hand back an empty
 * string, it hands back noise: STUB_OCR_UNREADABLE is what that looks like.
 * `readDish` treats a line as unreadable when NONE of its words resolve to
 * a known dish component (packages/pairing's own dishProfile already
 * separates known from unknown per component - this just checks whether
 * anything was known at all). Kept separate from rendering so it can be
 * tested without a DOM.
 *
 * @param {string} rawText
 */
export function readDish(rawText) {
  const T = getOfflineTables();
  const words = (rawText || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  const { known } = dishProfile(words, T);
  return { readable: known.length > 0, guessedComponents: known };
}

export default function UnreadableDishState({
  rawText = STUB_OCR_UNREADABLE,
  fallback = STUB_MANUAL_FALLBACK,
  wineList = STUB_WINE_LIST_FOR_UNREADABLE,
}) {
  const [manualText, setManualText] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const attempt = readDish(rawText);

  const components = submitted
    ? manualText.split(',').map((s) => s.trim()).filter(Boolean)
    : fallback.components;
  const result = submitted || !attempt.readable
    ? pairOffline(fallback.name, components, wineList, { n: 3 })
    : null;

  return (
    <div style={{ padding: 18 }}>
      {!attempt.readable ? (
        <>
          <div
            style={{
              background: 'var(--pm-warnBg)', border: '1px solid var(--pm-warnBd)', borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ font: '600 13.5px var(--font-body)', color: 'var(--pm-warnInk)' }}>
              We could not make that one out
            </div>
            <div style={{ font: '400 12.5px/1.6 var(--font-body)', color: 'var(--pm-ink)', marginTop: 6 }}>
              The photo caught this line at an angle we could not read clearly. Tell us what is in it, in your
              own words, and we will pair to that instead.
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Input
              label="What's in the dish"
              placeholder={fallback.components.join(', ')}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => setSubmitted(true)}
              style={{ width: '100%' }}
            >
              Pair it
            </Button>
          </div>
        </>
      ) : null}

      {result ? (
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
      ) : null}
    </div>
  );
}
