import { describe, it, expect } from 'vitest';
import { PRONOUNCE, buildDemoRows } from './demoSeed.js';
import { DEMO as OFFLINE_DEMO_WINES } from '../../../../packages/pairing/src/demoFixtures.js';

const VALID_LANGS = new Set(['fr-FR', 'it-IT', 'de-DE', 'es-ES', 'en-US']);

describe('demoSeed.js PRONOUNCE - lang tags (R2, item b)', () => {
  const entries = Object.entries(PRONOUNCE);

  it('has all 20 hand-authored phonetics (sanity check the fixture has not shrunk)', () => {
    expect(entries).toHaveLength(20);
  });

  it.each(entries)('%s has a lang field from the allowed BCP-47 set', (label, entry) => {
    expect(entry.lang).toBeTruthy();
    expect(VALID_LANGS.has(entry.lang)).toBe(true);
  });

  it('every PRONOUNCE entry has a lang field (loop, no entry left untagged)', () => {
    const missing = entries.filter(([, entry]) => !entry.lang);
    expect(missing).toEqual([]);
  });

  it('keeps the hand-authored say/speak respelling text unchanged by adding lang (only ADDS the tag)', () => {
    // Spot-check one French and one English-tagged entry: the spoken string
    // itself is still the English respelling, not a translation.
    expect(PRONOUNCE['Louis Michel, Chablis 1er Cru'].speak).toBe('Louis Michel. Shah blee, premier cru.');
    expect(PRONOUNCE['Louis Michel, Chablis 1er Cru'].lang).toBe('fr-FR');
    expect(PRONOUNCE["Dow's, LBV Port"].speak).toBe("Dow's. L B V port.");
    expect(PRONOUNCE["Dow's, LBV Port"].lang).toBe('en-US');
  });
});

describe('demoSeed.js buildDemoRows - lang threaded onto rows', () => {
  const rows = buildDemoRows(OFFLINE_DEMO_WINES);

  it('every row built from a wine with a hand-authored phonetic carries that phonetic\'s lang', () => {
    rows.forEach((row) => {
      const pron = PRONOUNCE[row.label];
      if (pron) expect(row.lang).toBe(pron.lang);
    });
  });

  it('every row has a lang field, defaulting to en-US when there is no hand-authored phonetic', () => {
    rows.forEach((row) => {
      expect(row.lang).toBeTruthy();
      expect(VALID_LANGS.has(row.lang)).toBe(true);
    });
  });
});
