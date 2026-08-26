#!/usr/bin/env node
/**
 * Phased tsc typecheck gate.
 *
 * WHY THIS EXISTS
 * ---------------
 * This app was exported from Figma Make and never had a TypeScript toolchain
 * or CI. Two P0s shipped to prod because nothing caught undefined identifiers
 * at build time (Vite/esbuild strips types without checking them):
 *   - B-183: `backTo` referenced but never defined  (TS2304)
 *   - NF-25: `setLogoUrl` referenced but never defined (TS2304)
 *
 * PHASE (a) — THIS GATE (now):
 *   Run `tsc --noEmit` (strict:false) and FAIL only on errors that are NOT in
 *   the grandfathered baseline (scripts/typecheck-baseline.json). That means:
 *     * Any NEW error fails the build — critically the TS2304 "Cannot find name"
 *       class that caused both P0s, plus TS2300/TS2448/TS2687 (dup identifiers,
 *       use-before-declaration).
 *     * The ~60 pre-existing phase-(b) errors (mostly lucide-react icon
 *       prop-shape TS2322 + assorted TS2339/TS2551 shape mismatches) are
 *       tolerated so the gate is green TODAY.
 *
 * PHASE (b) — QUEUED TECH DEBT (later):
 *   Fix the lucide icon typings and remaining shape mismatches, shrink the
 *   baseline to empty, flip `strict` on incrementally, then replace this script
 *   with a plain `tsc --noEmit`. Regenerate the baseline anytime with:
 *       node scripts/typecheck.mjs --update-baseline
 *   (only do that intentionally — it grandfathers whatever errors exist now).
 *
 * The baseline is keyed on file + error-code + normalized-message (NOT line
 * number) so ordinary edits that shift line numbers don't spuriously trip the
 * gate, while a genuinely new error still fails it.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(__dirname, 'typecheck-baseline.json');
const UPDATE = process.argv.includes('--update-baseline');

// FAIL CLOSED. tsc exits non-zero when it finds errors, so a non-zero exit is
// expected and its stdout must still be captured. But there are two other ways
// to exit non-zero, and this function used to be blind to both:
//
//   * tsc never launched (no node_modules, no typescript, ENOENT on npx).
//   * tsc launched and died on something that is not a type error: a bad
//     tsconfig, an OOM kill, a crash. Exit 2, no `TSxxxx` lines to parse.
//
// In both cases the old code returned the stderr text, the TSxxxx parser found
// nothing in it, "0 errors" met an empty diff against the baseline, and the
// gate printed a PASS. A gate that reports success when it could not run is
// worse than no gate: it trains people to trust a green that means nothing.
// This is the same defect class as a test that re-declares the value it claims
// to be checking.
//
// Returns { output, status, launchError } so the caller can tell the three
// cases apart. `status` is null when the process never started.
function runTsc() {
  try {
    const out = execFileSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { output: out || '', status: 0, launchError: null };
  } catch (e) {
    // execFileSync sets `status` to the exit code when the child ran, and
    // leaves it null/undefined when spawn itself failed (then `code` holds
    // e.g. 'ENOENT').
    const status = typeof e.status === 'number' ? e.status : null;
    return {
      output: `${e.stdout || ''}${e.stderr || ''}`,
      status,
      launchError: status === null ? (e.code || e.message || 'spawn failed') : null,
    };
  }
}

// Hard stop, used for every "the gate could not do its job" path. Distinct
// wording from the FAILED-with-new-errors path so the two are never confused
// in a log.
function abortUnverifiable(reason, detail) {
  console.error(`\n✗ typecheck gate COULD NOT RUN — ${reason}\n`);
  if (detail) console.error(`${detail.trim()}\n`);
  console.error(
    'This is NOT a pass. tsc did not produce a parseable result, so nothing\n' +
      'was verified. Most often this is a missing toolchain in a fresh clone or\n' +
      'worktree; `node_modules` is no longer tracked (deliberately, it used to be\n' +
      'committed as an absolute-path symlink), so run:\n' +
      '  npm ci\n' +
      'A bad tsconfig or an OOM kill reaches here too.\n'
  );
  process.exit(1);
}

// Parse lines like:
//   src/app/foo.tsx(12,3): error TS2304: Cannot find name 'bar'.
const ERROR_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

function parse(output) {
  const errors = [];
  for (const line of output.split('\n')) {
    const m = ERROR_RE.exec(line.trim());
    if (!m) continue;
    const [, file, , , code, message] = m;
    errors.push({ file, code, message });
  }
  return errors;
}

// Stable key that ignores line/column so unrelated edits don't churn the
// baseline, but still distinguishes a genuinely new error.
function keyOf(err) {
  const normMsg = err.message
    .replace(/'[^']*'/g, "'…'") // collapse quoted identifiers/types
    .replace(/\s+/g, ' ')
    .trim();
  return `${err.file}::${err.code}::${normMsg}`;
}

const { output, status, launchError } = runTsc();

// Gate 1: tsc never started. Nothing was checked.
if (launchError) {
  abortUnverifiable(`tsc could not be launched (${launchError})`, output);
}

const errors = parse(output);

// Gate 2: tsc ran, exited non-zero, and produced nothing this script can read
// as a type error. tsc uses exit 1 for "type errors found" and exit 2 for a
// fatal problem (bad tsconfig, crash), so a non-zero exit with zero parsed
// errors means the run is unusable, not clean. Reporting a pass here is the bug
// this gate exists to prevent.
if (status !== 0 && errors.length === 0) {
  abortUnverifiable(
    `tsc exited ${status} but produced no parseable TSxxxx diagnostics`,
    output,
  );
}

// Gate 3: --update-baseline must never be able to write an EMPTY baseline off a
// broken run. That would silently grandfather the entire codebase.
if (UPDATE && errors.length === 0 && status !== 0) {
  abortUnverifiable('refusing to write a baseline from an unusable tsc run', output);
}

if (UPDATE) {
  const baseline = {};
  for (const err of errors) {
    const k = keyOf(err);
    baseline[k] = (baseline[k] || 0) + 1;
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`Wrote baseline with ${Object.keys(baseline).length} unique signatures (${errors.length} total errors).`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  : {};

// Count occurrences per signature so a NEW instance of an existing signature
// (e.g. one more bad icon in the same file) is still allowed, but a new
// signature anywhere fails.
const seen = {};
const newErrors = [];
for (const err of errors) {
  const k = keyOf(err);
  seen[k] = (seen[k] || 0) + 1;
  if (!(k in baseline)) newErrors.push(err);
}

if (newErrors.length > 0) {
  console.error('\n✗ typecheck gate FAILED — new TypeScript error(s) not in baseline:\n');
  for (const err of newErrors) {
    console.error(`  ${err.file}: ${err.code}: ${err.message}`);
  }
  console.error(
    '\nThese are NEW errors introduced by this change. Fix them.\n' +
      'The most dangerous class is TS2304 (Cannot find name) — an undefined\n' +
      'identifier that Vite would happily ship to prod (this is exactly how the\n' +
      'B-183 `backTo` and NF-25 `setLogoUrl` P0s reached users).\n' +
      '\nIf you genuinely intend to grandfather a new error (rare), run:\n' +
      '  node scripts/typecheck.mjs --update-baseline\n'
  );
  process.exit(1);
}

const grandfathered = errors.length;
console.log(
  `✓ typecheck gate passed — no new TypeScript errors.` +
    (grandfathered
      ? ` (${grandfathered} pre-existing phase-(b) errors grandfathered in baseline)`
      : '')
);
process.exit(0);
