/**
 * Guard: chef-facing surfaces must not use "customer" / "customers" language.
 * The chef-side of QuoteMe is restaurant-owner-facing ("chef", "restaurant",
 * "you"); rep/distributor-flavored copy ("customer", "your customer") must
 * never leak in.
 *
 * ALLOWLIST:
 *   - TechLandingPage.tsx  — distributor catalog-tech landing at /c/:token,
 *     not chef-restaurant-facing; "customer" is correct rep-perspective copy.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');

const SCAN_DIRS = [
  path.join(REPO_ROOT, 'src/app/pages/chef'),
  path.join(REPO_ROOT, 'src/app/components/chef'),
];

const SCAN_EXTRA_FILES = [
  path.join(REPO_ROOT, 'src/app/components/ChefTopbar.tsx'),
];

// Basename only — path-independent so it works in any directory layout.
const ALLOWLIST = new Set(['TechLandingPage.tsx']);

const CUSTOMER_RE = /customers?/i;

function walkTsx(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTsx(full));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

function findViolations(): string[] {
  const files: string[] = [
    ...SCAN_DIRS.flatMap(walkTsx),
    ...SCAN_EXTRA_FILES.filter(f => fs.existsSync(f)),
  ];

  const violations: string[] = [];

  for (const filePath of files) {
    const basename = path.basename(filePath);
    if (ALLOWLIST.has(basename)) continue;

    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (CUSTOMER_RE.test(lines[i])) {
        violations.push(`${filePath}:${i + 1}  →  ${lines[i].trim()}`);
      }
    }
  }

  return violations;
}

describe('chef surfaces must not contain "customer(s)" copy', () => {
  it('finds no customer/customers references outside the allowlist', () => {
    const violations = findViolations();
    expect(violations, [
      '',
      'Found "customer(s)" in chef-facing files (not in allowlist):',
      ...violations,
      '',
      'Fix: replace with chef-side vocabulary ("restaurant", "you", "chef"),',
      'or add the file to ALLOWLIST with a justification comment.',
    ].join('\n')).toHaveLength(0);
  });
});
