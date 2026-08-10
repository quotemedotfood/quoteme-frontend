// @vitest-environment node
/**
 * Plural resolution: a pasted menu writes "mussels", not "mussel". The resolver
 * singularises before lookup so those terms hit the singular corpus/dish_axes
 * keys, and leaves genuine -s ingredients (frites, fines herbes) alone.
 */
import { describe, it, expect } from 'vitest';
import { loadLocalBundle } from '../../../packages/pairing/src/loadLocalTables.js';
import { buildTables } from '../../../packages/pairing/src/tables.js';
import { resolveComponents, singularize } from '../../../packages/pairing/src/resolveComponents.js';

const T = buildTables(loadLocalBundle());

describe('resolver singularisation (plural fix)', () => {
  it('resolves plural menu terms to their singular keys', () => {
    expect(resolveComponents('mussels', '', T)).toContain('mussel');
    expect(resolveComponents('shallots', '', T)).toContain('shallot');
    expect(resolveComponents('carrots', '', T)).toContain('carrot');
    expect(resolveComponents('hazelnuts', '', T)).toContain('hazelnut');
    expect(resolveComponents('potatoes', '', T)).toContain('potato');
  });

  it('tries the multi-word head first: "snap peas" -> "snap pea"', () => {
    expect(resolveComponents('snap peas', '', T)).toContain('snap pea');
  });

  it('applies the ordered rules', () => {
    expect(singularize('berries')).toBe('berry'); // ies -> y
    expect(singularize('leaves')).toBe('leaf'); // ves -> f
    expect(singularize('potatoes')).toBe('potato'); // oes -> o
    expect(singularize('dishes')).toBe('dish'); // shes -> strip es
    expect(singularize('boxes')).toBe('box'); // xes -> strip es
    expect(singularize('mussels')).toBe('mussel'); // s -> strip
  });

  it('never singularises the exception words', () => {
    for (const w of ['frites', 'pommes', 'greens', 'asparagus', 'hummus', 'couscous', 'herbes']) {
      expect(singularize(w)).toBe(w);
    }
  });

  it('does not strip -ss or -us, or words under 4 chars', () => {
    expect(singularize('us')).toBe('us');
    expect(singularize('gas')).toBe('gas'); // 3 chars
    expect(singularize('bass')).toBe('bass'); // ss
  });
});
