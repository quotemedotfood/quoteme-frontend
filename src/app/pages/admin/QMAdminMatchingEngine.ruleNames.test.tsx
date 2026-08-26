// @vitest-environment jsdom
//
// The four rule-section trash buttons are icon-only with no accessible name,
// one per rule, so a section rendered a column of identical unnamed buttons.
// Each fires DELETE /matching-engine/rules/:type/:id with a persisted id the
// front end already holds, so there is a real record to name.
//
// On the verb: matching_engine#delete_rule does record.update!(is_active:
// false) and logs "Deactivated". Nothing is destroyed, so Deactivate is the
// word that matches the behaviour, and it is the single verb used across both
// the accessible name and the confirm.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { deleteMatchingEngineRule } = vi.hoisted(() => ({
  deleteMatchingEngineRule: vi.fn(async () => ({ data: { status: 'ok' } })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, deleteMatchingEngineRule };
});

import { RulesTab } from './QMAdminMatchingEngine';

// No global afterEach in this vitest config, so unmount explicitly.
afterEach(() => cleanup());
beforeEach(() => deleteMatchingEngineRule.mockClear());

const stamps = { created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' };

const rules = {
  sauce_expansions: [
    { id: 'se-1', sauce_name: 'beurre blanc', components: ['butter', 'shallot'],
      default_behavior: 'expand', prepared_sku_blocked: false, ...stamps },
  ],
  protein_families: [],
  cocktail_locks: [],
  wine_protected: { class_a: [], class_b: [], class_c: [] },
  chef_beverage: [],
  format_gates: [
    { id: 'fg-1', ingredient_pattern: 'diced tomato', format_tag: 'diced',
      blocked_in_roles: [], prep_compatibility: [], ...stamps },
  ],
  synonym_families: [
    { id: 'sf-1', canonical_name: 'scallion', category: 'produce',
      synonyms: ['green onion'], ...stamps },
  ],
  identity_locks: [
    { id: 'il-1', ingredient_pattern: 'lamb rack', dish_name: 'Rack of Lamb',
      sensitivity: 'locked', notes: null, ...stamps },
  ],
  match_corrections: [],
} as unknown as Parameters<typeof RulesTab>[0]['rules'];

function open() {
  render(<RulesTab rules={rules} onRefresh={() => {}} />);
  // Every RuleSection is collapsed by default; expand them all.
  screen.getAllByRole('button')
    .filter((b) => /Sauce Expansions|Format Gates|Synonym Families|Identity Locks/.test(b.textContent || ''))
    .forEach((b) => fireEvent.click(b));
}

describe('Matching Engine rule trash buttons', () => {
  it('names each one with the rule it acts on, using the truthful verb', () => {
    open();
    expect(screen.getByRole('button', { name: 'Deactivate Beurre Blanc' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate diced tomato' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate scallion' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate lamb rack' })).toBeInTheDocument();
  });

  it('names the rule in the confirm, and sends the right type and id', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate scallion' }));

    expect(confirmSpy).toHaveBeenCalledWith('Deactivate "scallion"? It can be re-enabled later.');
    await waitFor(() => {
      expect(deleteMatchingEngineRule).toHaveBeenCalledWith('synonym', 'sf-1');
    });
    confirmSpy.mockRestore();
  });

  it('does nothing when the confirm is dismissed', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    open();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate lamb rack' }));

    expect(deleteMatchingEngineRule).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
