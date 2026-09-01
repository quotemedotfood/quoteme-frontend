// no-self-service-unlimited-drafts.test.ts
//
// unlimited_drafts is a billing-bypass flag. Only quoteme_admin may set it, via
// Api::V1::Admin::UsersController. PATCH /api/v1/users/me strips it from EVERY
// self-service caller regardless of role ("Param hardening", users_controller)
// and still returns 200 with a full user body — so any frontend that PATCHes it
// gets a success response, believes it worked, and is wrong.
//
// Moose ruling 2026-09-01: the flag stays admin-only. Enforcement stays where it
// is, and the frontend's job is to state the rule, never to offer the write.
//
// Two sites were doing it when this guard was written:
//
//   SettingsPage      — a toggle that snapped back on refreshUser().
//   StartNewQuotePage — worse. A rep at the 2-draft wall was offered "or allow
//                       unlimited drafts". Clicking it PATCHed the flag, got 200,
//                       took the success branch, rendered a green "Unlimited
//                       drafts enabled" banner and unlocked the upload zone —
//                       and then menus#create re-checked the same flag and
//                       returned 422 on that exact limit one action later.
//
// The first sweep found one. The guard is repo-wide because the second site is
// the reason this file exists: a count of two is a floor, not a total.
//
// Reads (`user?.unlimited_drafts`) and the type declarations
// (`unlimited_drafts?: boolean`) are untouched — only object-literal writes
// (`unlimited_drafts:`) are flagged.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC_ROOT = path.resolve(__dirname, '../../..');

// An object-literal write. `unlimited_drafts?: boolean` in a type does not match
// (the `?` sits between the name and the colon), and neither does a read.
const WRITE_RE = /unlimited_drafts\s*:/;

// Comments are prose, not behaviour. The fix for this very defect left comments
// in both pages explaining what the deleted control did — quoting the old copy
// verbatim — and an un-stripped guard flags its own explanation. Strip block and
// whole-line comments before matching so the guard tests code only.
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__snapshots__') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('no self-service write of unlimited_drafts', () => {
  it('no non-test source file writes unlimited_drafts in an object literal', () => {
    const violations: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      const lines = stripComments(fs.readFileSync(file, 'utf-8')).split('\n');
      lines.forEach((line, i) => {
        if (WRITE_RE.test(line)) {
          violations.push(`${path.relative(SRC_ROOT, file)}:${i + 1}  →  ${line.trim()}`);
        }
      });
    }
    expect(violations, `Self-service writes of unlimited_drafts found:\n${violations.join('\n')}`).toEqual([]);
  });

  it('the sweep actually inspected the two files that had the defect', () => {
    // A guard that silently walks zero files passes for the wrong reason.
    const files = walk(SRC_ROOT).map((f) => path.relative(SRC_ROOT, f));
    expect(files).toContain(path.join('app', 'pages', 'SettingsPage.tsx'));
    expect(files).toContain(path.join('app', 'pages', 'StartNewQuotePage.tsx'));
    expect(files.length).toBeGreaterThan(100);
  });
});

describe('StartNewQuotePage draft-limit block offers only the action that works', () => {
  const page = stripComments(
    fs.readFileSync(path.join(SRC_ROOT, 'app', 'pages', 'StartNewQuotePage.tsx'), 'utf-8')
  );

  it('no longer offers "allow unlimited drafts"', () => {
    expect(page).not.toContain('allow unlimited drafts');
  });

  it('no longer claims "Unlimited drafts enabled"', () => {
    expect(page).not.toContain('Unlimited drafts enabled');
  });

  it('keeps the link that does clear the wall', () => {
    expect(page).toContain('Go to your quotes');
    expect(page).toContain('to finish or delete one before starting a new one.');
  });
});
