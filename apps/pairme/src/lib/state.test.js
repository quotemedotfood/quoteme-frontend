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
      diet: ['shellfish'],
      levelOwn: '',
      advOwn: '',
      budgetOwn: '',
      loveOwn: '',
      notOwn: '',
      dietOwn: '',
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
        dietOwn: 'severe sesame allergy',
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
      must_know: 'severe sesame allergy',
    });
  });

  it('omits free_text entirely when no screen has a free-text answer', () => {
    const payload = buildProfilePayload(baseState());
    expect(payload.preferences.free_text).toBeUndefined();
  });

  it('includes only the screens that were actually filled in', () => {
    const payload = buildProfilePayload(baseState({ dietOwn: 'severe sesame allergy' }));
    expect(payload.preferences.free_text).toEqual({ must_know: 'severe sesame allergy' });
  });

  it('still nests the flat likes/dislikes/allergies free-text slots the contract documents', () => {
    const payload = buildProfilePayload(baseState({ loveOwn: 'x', notOwn: 'y', dietOwn: 'z' }));
    expect(payload.preferences.likes_free_text).toBe('x');
    expect(payload.preferences.dislikes_free_text).toBe('y');
    expect(payload.safety.allergies_free_text).toBe('z');
  });

  it('sends preferences/safety nested, never flat top-level fields (contract G5)', () => {
    const payload = buildProfilePayload(baseState({ bMax: 140 }));
    expect(payload.budget).toBeUndefined();
    expect(payload.free_text).toBeUndefined();
    expect(payload.preferences).toBeTruthy();
    expect(payload.safety).toBeTruthy();
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
