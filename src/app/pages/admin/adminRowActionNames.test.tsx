// @vitest-environment jsdom
//
// adminRowActionNames.test.tsx
//
// Batch 1 of the naming-only remainder of item 8: six surfaces, one row action
// each, every one of which acted on a specific record while announcing a bare
// verb. "Impersonate", "Revert", "Promote to Rule", "Subcategory Exclusions",
// "Manage Admin". None of them said which one.
//
// This is the non-destructive remainder. The two that fired destructively with
// no confirm at all (the brand-rule hard delete and the Signups archive) went
// first, in their own change.
//
// Rather than mount six heavy pages, these cases assert the source declares an
// aria-label carrying the row's own identifier. That is a weaker instrument
// than a render, and it is chosen deliberately: it is the check that stays
// true as these pages get restructured, and a render test per surface would
// need six sets of API mocks to prove one property. Where a page already has a
// render harness, the render assertion is the better tool and belongs there.
//
// Thirty is a floor, not a count. The scan behind this batch has two confirmed
// blind spots: an entity closed over rather than passed to the handler, and a
// call that opens on the next line.
//
// This project's vitest config does not set `globals: true`, so
// @testing-library/react's afterEach auto cleanup never registers. Nothing is
// rendered here, but the file declares its own afterEach so it stays correct
// if a future case does.

import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ADMIN = join(process.cwd(), 'src/app/pages/admin');
const read = (f: string) => readFileSync(join(ADMIN, f), 'utf8');

// Each entry: the file, the handler call that identifies the control, and the
// entity expression its name has to carry.
const NAMED_ROW_ACTIONS: Array<{ file: string; handler: string; carries: RegExp; what: string }> = [
  {
    file: 'QMAdminChefs.tsx',
    handler: 'setShowReasonFor(chef.id)',
    carries: /aria-label=\{`Impersonate \$\{chefLabel\(chef\)\}`\}/,
    what: 'impersonate names the chef',
  },
  {
    file: 'QMAdminClusterLabels.tsx',
    handler: 'onRevert(log)',
    carries: /aria-label=\{`Revert \$\{log\.field_name\}/,
    what: 'revert names the field it reverts',
  },
  {
    file: 'QMAdminDistributors.tsx',
    handler: 'loadExclusions(d.id)',
    carries: /aria-label=\{`Subcategory exclusions for \$\{d\.name\}`\}/,
    what: 'exclusions names the distributor',
  },
  {
    file: 'QMAdminMatchingEngine.tsx',
    handler: 'handlePromote(mc.id)',
    carries: /aria-label=\{`Promote the correction for \$\{mc\.ingredient_name/,
    what: 'promote names the ingredient',
  },
  {
    file: 'QMAdminOperationalMemoryLearnings.tsx',
    handler: 'handleRevert(row)',
    carries: /aria-label=\{`Revert the learning for \$\{row\.canonical_key\}`\}/,
    what: 'revert names the learning',
  },
  {
    file: 'QMAdminRestaurants.tsx',
    handler: 'setManageAdminTarget(r)',
    carries: /aria-label=\{r\.restaurant_admin_id \? `Manage the admin user for \$\{r\.name\}`/,
    what: 'manage admin names the restaurant',
  },
];

// Batch 2 covers the four user-row surfaces that waited on utils/userLabel.
// Three of them are asserted by RENDER, which is the stronger instrument and is
// where batch 1 said these belong once a harness exists:
//
//   QMAdminUsers               -> QMAdminUsers.inlineEdit.test.tsx
//   QMAdminDistributorDetail   -> QMAdminDistributorDetail.assignAdminGate.test.tsx
//   _manageAdminDrawer         -> _manageAdminDrawer.rowActionNames.test.tsx (new)
//
// QMAdminBrandDetail is the one left here. Its existing test file is pure-helper
// with no harness, and standing a page harness up -- route params, brand fetch,
// user list -- to prove one aria-label is out of proportion to the claim. So it
// keeps the source-level instrument, with the same caveat batch 1 recorded.
const BATCH_2_BRAND_DETAIL: Array<{ file: string; handler: string; carries: RegExp; what: string }> = [
  {
    file: 'QMAdminBrandDetail.tsx',
    handler: 'handleResend(u.id)',
    carries: /aria-label=\{`Resend invite to \$\{userLabel\(u\)\}`\}/,
    what: 'resend invite names the user',
  },
  {
    file: 'QMAdminBrandDetail.tsx',
    handler: 'handleImpersonate(',
    carries: /aria-label=\{`Sign in as \$\{userLabel\(u\)\}`\}/,
    what: 'impersonate names the user through userLabel, not a second inline copy',
  },
];

describe('admin row actions name the record they act on (batch 2: brand detail)', () => {
  afterEach(() => {
    cleanup();
  });

  for (const { file, handler, carries, what } of BATCH_2_BRAND_DETAIL) {
    it(`${file}: ${what}`, () => {
      const src = read(file);
      expect(src, `${file} no longer calls ${handler}; re-anchor this case`).toContain(handler);
      expect(src).toMatch(carries);
    });
  }

  it('the inline duplicate of userLabel is gone from this surface', () => {
    // userLabel exists so there is one copy. QMAdminBrandDetail had spelled the
    // same expression out inline, twice on one control.
    const src = read('QMAdminBrandDetail.tsx');
    expect(src).not.toContain("[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email");
  });
});

describe('admin row actions name the record they act on (batch 1)', () => {
  afterEach(() => {
    cleanup();
  });

  for (const { file, handler, carries, what } of NAMED_ROW_ACTIONS) {
    it(`${file}: ${what}`, () => {
      const src = read(file);
      // Guard against the anchor moving out from under the assertion: if the
      // handler call is gone, this test is checking nothing and should say so
      // rather than pass quietly.
      expect(src, `${file} no longer calls ${handler}; re-anchor this case`).toContain(handler);
      expect(src).toMatch(carries);
    });
  }

  it('every named control carries an entity expression, never a static string', () => {
    // A bare aria-label="Revert" would satisfy "has a name" and fail the
    // actual requirement, which is that the name says WHICH record.
    for (const { file, carries } of NAMED_ROW_ACTIONS) {
      const src = read(file);
      const match = src.match(carries);
      expect(match, `${file}: expected a template-literal name`).not.toBeNull();
      expect(match![0]).toContain('${');
    }
  });
});
