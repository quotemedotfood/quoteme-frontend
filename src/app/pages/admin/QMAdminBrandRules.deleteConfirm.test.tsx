// @vitest-environment jsdom
//
// QMAdminBrandRules.deleteConfirm.test.tsx
//
// The destructive subset of the target-ambiguous work, and this one is worse
// than the Team page control that caught the founder.
//
// The Team page "Disable" ran PATCH .../disable, which sets is_active: false
// and destroys nothing. This trash icon runs DELETE /admin/brand-rules/:id,
// which is `rule.destroy!` (brand_rules_controller.rb:30), on a model with no
// soft-delete of any kind. The row is gone. It fired straight off the click
// with no confirm, and its accessible name was a bare "Delete rule" that never
// said which rule.
//
// It also has a consequence beyond its own row: BrandRule
// `has_many :child_brands, dependent: :nullify`, so deleting a parent leaves
// the variants underneath it in place but silently detached. The confirm has
// to say that, because nothing else on the page will.
//
// This project's vitest config does not set `globals: true`, so
// @testing-library/react's afterEach auto cleanup never registers.
// afterEach(cleanup) is declared explicitly: without it renders accumulate and
// a later query can pass against an earlier case's DOM.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

function rule(over: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    brand_name: 'Tillamook',
    rule_type: 'lock',
    category: 'Dairy',
    is_active: true,
    notes: null,
    product_count: 12,
    category_distribution: {},
    last_audited_at: null,
    parent_brand_id: null,
    parent_brand_name: null,
    child_brands: [],
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

const { getAdminBrandRules, deleteAdminBrandRule } = vi.hoisted(() => ({
  getAdminBrandRules: vi.fn(),
  deleteAdminBrandRule: vi.fn(async () => ({ data: { id: 'rule-1', deleted: true } })),
}));

vi.mock('../../services/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/adminApi')>();
  return { ...actual, getAdminBrandRules, deleteAdminBrandRule };
});

import { QMAdminBrandRules } from './QMAdminBrandRules';

async function renderRules(rules: unknown[]) {
  getAdminBrandRules.mockResolvedValue({ data: rules });
  render(
    <MemoryRouter>
      <QMAdminBrandRules />
    </MemoryRouter>,
  );
  await waitFor(() => expect(getAdminBrandRules).toHaveBeenCalled());
  await screen.findByText('Tillamook');
}

describe('QMAdminBrandRules -- the trash icon names its rule and confirms a hard delete', () => {
  afterEach(() => {
    cleanup();
    getAdminBrandRules.mockReset();
    deleteAdminBrandRule.mockReset();
  });

  it('names the rule in the accessible name, not a bare verb', async () => {
    await renderRules([rule()]);

    expect(screen.getByRole('button', { name: 'Delete the brand rule for Tillamook' }))
      .toBeInTheDocument();
  });

  it('does not delete on the click', async () => {
    await renderRules([rule()]);

    fireEvent.click(screen.getByRole('button', { name: 'Delete the brand rule for Tillamook' }));

    await screen.findByText('Delete the brand rule for Tillamook?');
    expect(deleteAdminBrandRule).not.toHaveBeenCalled();
  });

  it('says the rule is gone, because destroy! means it is', async () => {
    await renderRules([rule()]);

    fireEvent.click(screen.getByRole('button', { name: 'Delete the brand rule for Tillamook' }));
    const body = await screen.findByText(/deleted permanently/i);

    expect(body).toHaveTextContent(/cannot be restored from this page/i);
  });

  it('names the variants that get detached, and how many', async () => {
    await renderRules([
      rule({
        child_brands: [
          { id: 'c1', brand_name: 'Tillamook Farms' },
          { id: 'c2', brand_name: 'Tillamook Creamery' },
        ],
      }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Delete the brand rule for Tillamook' }));
    const body = await screen.findByText(/deleted permanently/i);

    // dependent: :nullify keeps the rows and drops the link, so the copy has
    // to say kept-but-detached rather than implying they are deleted too.
    expect(body).toHaveTextContent(/2 variants/);
    expect(body).toHaveTextContent(/Tillamook Farms, Tillamook Creamery/);
    expect(body).toHaveTextContent(/are kept/);
  });

  it('says nothing about variants when the rule has none', async () => {
    await renderRules([rule()]);

    fireEvent.click(screen.getByRole('button', { name: 'Delete the brand rule for Tillamook' }));
    const body = await screen.findByText(/deleted permanently/i);

    expect(body.textContent ?? '').not.toMatch(/variant/i);
  });

  it('deletes only after explicit confirmation, and only that rule', async () => {
    await renderRules([rule()]);

    fireEvent.click(screen.getByRole('button', { name: 'Delete the brand rule for Tillamook' }));
    await screen.findByText('Delete the brand rule for Tillamook?');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteAdminBrandRule).toHaveBeenCalledTimes(1));
    expect(deleteAdminBrandRule).toHaveBeenCalledWith('rule-1');
  });

  it('backs out without deleting when the operator keeps the rule', async () => {
    await renderRules([rule()]);

    fireEvent.click(screen.getByRole('button', { name: 'Delete the brand rule for Tillamook' }));
    await screen.findByText('Delete the brand rule for Tillamook?');

    fireEvent.click(screen.getByRole('button', { name: 'Keep the rule' }));

    await waitFor(() =>
      expect(screen.queryByText('Delete the brand rule for Tillamook?')).not.toBeInTheDocument(),
    );
    expect(deleteAdminBrandRule).not.toHaveBeenCalled();
  });
});
