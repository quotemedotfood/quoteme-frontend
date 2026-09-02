import { describe, it, expect } from 'vitest';
import { buildProfilePayload, W } from './state.js';

// Minimal fake of usePairMe's internal state shape, only the fields
// buildProfilePayload reads. Mirrors the initial state in usePairMe.
function baseState(overrides = {}) {
  return Object.assign(
    {
      level: '2. I know what I like',
      want: 'I want to learn more',
      adv: 3,
      bMin: 60,
      bMax: 140,
      bump: null,
      likes: ['Burgundy'],
      dislikes: ['heavy oak'],
      notDrinking: false,
      levelOwn: '',
      advOwn: '',
      budgetOwn: '',
      loveOwn: '',
      notOwn: '',
    },
    overrides
  );
}

describe('buildProfilePayload - budget ceiling', () => {
  it('sends the ceiling (bMax), not the floor, as preferences.budget', () => {
    const payload = buildProfilePayload(baseState({ bMin: 60, bMax: 140 }));
    expect(payload.preferences.budget).toBe(140);
  });

  it('sends the higher of the two values even if bMin/bMax are stored reversed', () => {
    const payload = buildProfilePayload(baseState({ bMin: 200, bMax: 90 }));
    expect(payload.preferences.budget).toBe(200);
  });

  it('omits budget when both bounds are falsy', () => {
    const payload = buildProfilePayload(baseState({ bMin: 0, bMax: 0 }));
    expect(payload.preferences.budget).toBeUndefined();
  });
});

describe('buildProfilePayload - free_text', () => {
  it('nests every taste screen free-text answer under preferences.free_text, keyed by screen', () => {
    const payload = buildProfilePayload(
      baseState({
        levelOwn: 'I know beer, not wine',
        advOwn: 'adventurous on white, boring on red',
        budgetOwn: 'under $60 on a Tuesday',
        loveOwn: 'Chablis, and anything from the Jura',
        notOwn: 'anything that tastes like vanilla',
      })
    );
    expect(payload.preferences.free_text).toEqual({
      knowledge: 'I know beer, not wine',
      adventure: 'adventurous on white, boring on red',
      budget: 'under $60 on a Tuesday',
      taste: {
        love: 'Chablis, and anything from the Jura',
        not: 'anything that tastes like vanilla',
      },
    });
  });

  it('omits free_text entirely when no screen has a free-text answer', () => {
    const payload = buildProfilePayload(baseState());
    expect(payload.preferences.free_text).toBeUndefined();
  });

  it('still nests the flat likes/dislikes free-text slots the contract documents', () => {
    const payload = buildProfilePayload(baseState({ loveOwn: 'x', notOwn: 'y' }));
    expect(payload.preferences.likes_free_text).toBe('x');
    expect(payload.preferences.dislikes_free_text).toBe('y');
  });

  it('never sends safety fields or the removed must_know key', () => {
    const payload = buildProfilePayload(baseState({ bMax: 140 }));
    expect(payload.safety).toBeUndefined();
    expect(payload.preferences.free_text?.must_know).toBeUndefined();
  });

  it('posts only the neutral not-drinking boolean', () => {
    expect(buildProfilePayload(baseState({ notDrinking: true })).preferences.not_drinking).toBe(true);
    expect(buildProfilePayload(baseState({ notDrinking: false })).preferences.not_drinking).toBe(false);
  });
});

describe('W - lang tags (R2, item b)', () => {
  const entries = Object.entries(W);
  const VALID_LANGS = new Set(['fr-FR', 'it-IT', 'de-DE', 'es-ES', 'en-US']);

  it('has all 5 hand-authored phonetics (sanity check the fixture has not shrunk)', () => {
    expect(entries).toHaveLength(5);
  });

  it.each(entries)('%s has a lang field from the allowed BCP-47 set', (key, w) => {
    expect(w.lang).toBeTruthy();
    expect(VALID_LANGS.has(w.lang)).toBe(true);
  });

  it('every W entry has a lang field (loop, no entry left untagged)', () => {
    const missing = entries.filter(([, w]) => !w.lang);
    expect(missing).toEqual([]);
  });

  it('all five are tagged fr-FR (Champagne/Burgundy/Beaujolais/Loire producers)', () => {
    entries.forEach(([, w]) => expect(w.lang).toBe('fr-FR'));
  });
});
