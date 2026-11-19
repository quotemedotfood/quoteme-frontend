#!/usr/bin/env node
/**
 * THE PINNED COPY OF PAIRIT'S ENGINE (Moose's ruling Q265, 2026-11-18).
 *
 * The QM admin Corpus lookup shows which kinds and bottles PairIt would pick
 * for a food. That choice is made by the pairing engine, which lives in the
 * pairme repo (packages/pairing and apps/pairme/src/lib/pairItSlips.js).
 * This app keeps an exact copy, pinned to one pairme commit, in
 * src/vendor/pairitEngine/. Nothing in that folder is edited by hand.
 *
 *   node scripts/sync-pairit-engine.mjs <pairme checkout> [ref]
 *       copies every file below from <ref> (default origin/main) of the
 *       pairme checkout and writes PIN.json (commit and sha256 of each file).
 *   node scripts/sync-pairit-engine.mjs --check <pairme checkout> [ref]
 *       copies nothing; exits 1 and names each file that differs between the
 *       pin and <ref>. Run it before trusting the lookup after an engine
 *       change.
 *
 * The one change made in copying: pairItSlips.js's two imports point at the
 * copies beside it instead of ../../../../packages/pairing/src/.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'vendor', 'pairitEngine');
const FILES = [
  ...['csv', 'tables', 'corpus', 'scoring', 'pairIt', 'pairItKinds', 'resolveComponents', 'dietary']
    .map((n) => ({ from: `packages/pairing/src/${n}.js`, to: `${n}.js` })),
  ...['wine_axes', 'dish_axes', 'pairing_rules', 'corpus_categories', 'corpus_alias_verdicts']
    .map((n) => ({ from: `packages/pairing/data/${n}.csv`, to: `data/${n}.csv` })),
  { from: 'apps/pairme/src/lib/pairItSlips.js', to: 'pairItSlips.js', rewrite: (s) => s.split('../../../../packages/pairing/src/').join('./') },
];

const args = process.argv.slice(2);
const check = args[0] === '--check';
if (check) args.shift();
const [repo, ref = 'origin/main'] = args;
if (!repo) {
  console.error('usage: node scripts/sync-pairit-engine.mjs [--check] <pairme checkout> [ref]');
  process.exit(2);
}

const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const sha = (s) => createHash('sha256').update(s).digest('hex');
const commit = git('rev-parse', ref).trim();
const copies = FILES.map((f) => {
  const raw = git('show', `${commit}:${f.from}`);
  return { ...f, text: f.rewrite ? f.rewrite(raw) : raw };
});

if (check) {
  const pin = JSON.parse(readFileSync(join(OUT, 'PIN.json'), 'utf8'));
  const changed = copies.filter((c) => pin.files[c.to] !== sha(c.text)).map((c) => c.from);
  if (changed.length) {
    console.error(`pairit engine pin ${pin.commit.slice(0, 7)} differs from ${ref} (${commit.slice(0, 7)}) in:\n  ${changed.join('\n  ')}`);
    console.error('Re-run without --check to copy, then check the Corpus lookup still reads right.');
    process.exit(1);
  }
  console.log(`pairit engine pin ${pin.commit.slice(0, 7)} matches ${ref} (${commit.slice(0, 7)}) for all ${copies.length} files`);
  process.exit(0);
}

const files = {};
for (const c of copies) {
  const path = join(OUT, c.to);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, c.text);
  files[c.to] = sha(c.text);
}
const pin = { repo: 'quotemedotfood/pairme', commit, copied_at: new Date().toISOString().slice(0, 10), files };
writeFileSync(join(OUT, 'PIN.json'), `${JSON.stringify(pin, null, 2)}\n`);
console.log(`copied ${copies.length} files from pairme ${commit.slice(0, 7)} into src/vendor/pairitEngine${existsSync(OUT) ? '' : ' (new)'}`);
