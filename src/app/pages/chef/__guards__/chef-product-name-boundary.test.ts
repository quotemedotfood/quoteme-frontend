/**
 * Guard: chefProductName() (asterisk-wrapped warehouse-token stripping, see
 * src/app/utils/chefProductName.ts) must only be applied on chef-facing
 * receipt/order-guide surfaces. Rep-facing surfaces (quote builder, export,
 * ingredient mapping, match drawer, command-center pages, quotes list) must
 * keep showing the raw CJ product name; reps need to see the warehouse
 * token as-is.
 *
 * Governing constitution: VIII (chef sees a clean quote) + XVIII (no
 * technical/warehouse language to the chef).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const SRC_APP = path.join(REPO_ROOT, 'src/app');

// The only surfaces allowed to import/use chefProductName.
const ALLOWLIST = new Set([
  'ChefQuoteReceiptPage.tsx',
  'ChefPullReceiptPage.tsx',
  'ChefOrderGuidePage.tsx',
]);

// Rep-facing files that must never import chefProductName. The raw name
// must always render on these surfaces.
const REP_FACING_FILES = [
  'src/app/pages/QuoteBuilderPage.tsx',
  'src/app/pages/ExportFinalizePage.tsx',
  'src/app/pages/MapIngredientsPage.tsx',
  'src/app/pages/QuotesPage.tsx',
  'src/app/components/MatchDrawer.tsx',
  'src/app/pages/command-center/CCInboundPage.tsx',
  'src/app/pages/command-center/CCQuoteDetailPage.tsx',
  'src/app/pages/command-center/CCSoonPage.tsx',
  'src/app/pages/command-center/CCTodayPage.tsx',
  'src/app/pages/command-center/CCAssignPage.tsx',
  'src/app/pages/command-center/CCSearchPage.tsx',
  'src/app/pages/command-center/CCQuotesPage.tsx',
];

function walkTsx(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTsx(full));
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      results.push(full);
    }
  }
  return results;
}

const IMPORT_RE = /chefProductName/;

describe('chefProductName import boundary', () => {
  it('is only imported by the allowlisted chef receipt/order-guide surfaces', () => {
    const files = walkTsx(SRC_APP).filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));
    const violations: string[] = [];

    for (const filePath of files) {
      const basename = path.basename(filePath);
      if (basename === 'chefProductName.ts') continue; // the util itself
      if (!fs.readFileSync(filePath, 'utf-8').match(IMPORT_RE)) continue;
      if (!ALLOWLIST.has(basename)) {
        violations.push(filePath);
      }
    }

    expect(violations, [
      '',
      'chefProductName referenced outside the chef-receipt allowlist:',
      ...violations,
      '',
      'chefProductName strips CJ warehouse tokens for CHEF-facing surfaces only.',
      'Rep-facing surfaces must keep showing the raw product name.',
    ].join('\n')).toHaveLength(0);
  });

  it('is never imported by known rep-facing surfaces', () => {
    const violations: string[] = [];
    for (const rel of REP_FACING_FILES) {
      const full = path.join(REPO_ROOT, rel);
      if (!fs.existsSync(full)) continue; // tolerate future file moves
      if (IMPORT_RE.test(fs.readFileSync(full, 'utf-8'))) {
        violations.push(rel);
      }
    }
    expect(violations, [
      '',
      'chefProductName leaked into rep-facing surfaces (must show raw name):',
      ...violations,
    ].join('\n')).toHaveLength(0);
  });
});
