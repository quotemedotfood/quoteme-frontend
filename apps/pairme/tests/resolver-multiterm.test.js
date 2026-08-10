// @vitest-environment node
/**
 * The resolver must extract EVERY known term in a dish, not one. "lamb ragu" is
 * two components (lamb + ragu); a description carries several. This locks that
 * in against a vocabulary that contains the terms - so once corpus_categories.csv
 * (884 keys) is wired, the real dish resolves to its full component set. The
 * gap today is vocabulary (dish_axes has 119 keys), not extraction behaviour.
 */
import { describe, it, expect } from 'vitest';
import { resolveComponents } from '../../../packages/pairing/src/resolveComponents.js';

// Minimal synthetic vocab standing in for the corpus keys.
const T = { dish: { lamb: {}, ragu: {}, 'grana padano': {}, saffron: {}, pappardelle: {} } };

describe('resolver extracts every matching term (multi-component)', () => {
  it('returns all four+ components from the canonical test string', () => {
    const got = resolveComponents('braised lamb ragu, pappardelle, grana padano, saffron', '', T);
    for (const term of ['lamb', 'ragu', 'grana padano', 'saffron', 'pappardelle']) {
      expect(got).toContain(term);
    }
  });

  it('splits "lamb ragu" into both lamb and ragu', () => {
    const got = resolveComponents('lamb ragu', '', T);
    expect(got).toContain('lamb');
    expect(got).toContain('ragu');
  });
});
