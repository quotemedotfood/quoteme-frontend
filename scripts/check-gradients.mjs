#!/usr/bin/env node
// Guards the QuoteMe visual system against gradient fills, per the doctrine
// written at src/styles/newspaper.css:6:
//
//     DOCTRINE: No gradients. One Sacred Orange (#F2993D) per page.
//
// That rule existed in source and was restated in seventeen code comments, and
// still drifted four times, because nothing enforced it. This is the enforcer.
// Modelled on scripts/check-emdash.mjs.
//
// WHAT IS FLAGGED
//   - the Tailwind gradient utilities, matched on the `bg-gradient-to-` prefix
//   - raw CSS `linear-gradient(`, `radial-gradient(`, `conic-gradient(`
//
// WHAT IS ALLOWED
//   - `repeating-linear-gradient` (and the repeating- radial/conic forms).
//     These are structural pattern fills with hard stops, not color blends.
//     The one live use is the diagonal stripe placeholder in
//     src/app/components/stack/StackProductDrawer.tsx.
//   - anything inside a `//` or `/* */` comment. Nearly every occurrence of the
//     word "gradient" in this codebase is a comment restating the rule; those
//     are the rule being honored, not broken. For .ts/.tsx the TypeScript AST
//     walk gives this for free (comments are trivia, not tokens); for .css the
//     comments are stripped before matching.
//
// SCOPE NOTE, deliberate difference from check-emdash: this guard does NOT
// exclude src/app/pages/admin/**. check-emdash excludes it because the em dash
// is a copy-voice rule and admin is staff-only tooling with no product voice.
// No-gradients is a visual-system rule and applies to every surface we render,
// admin included. Three of the four violations this guard was written for were
// in pages/admin, so copying that exclusion would have missed 75% of the drift.
//
// Run: node scripts/check-gradients.mjs   (npm run check:gradients)

import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

// SCOPE. This used to be `process.argv[2] || 'src'`, a single root defaulting to
// src. Both the npm script (`check:gradients`) and the CI workflow invoke it
// bare, so `apps/` was NEVER scanned and the PairMe app was outside the guard
// entirely from the day the guard landed. It reported OK while holding a real
// violation.
//
// Now: every argument is a root, and with no arguments the defaults are src AND
// apps. A root that does not exist is skipped rather than fatal, so this works
// in a checkout without apps/.
const DEFAULT_ROOTS = ['src', 'apps'];
const ROOTS = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_ROOTS;

const missingRoots = ROOTS.filter((r) => !fs.existsSync(r));
const presentRoots = ROOTS.filter((r) => fs.existsSync(r));

if (presentRoots.length === 0) {
  console.error(`check:gradients: none of the requested roots exist: ${ROOTS.join(', ')}`);
  console.error('Refusing to report OK on an empty scan. Pass a real path, or run from the repo root.');
  process.exit(1);
}

// Tailwind gradient utilities: bg-gradient-to-r / -l / -t / -b / -br ...
const TW_RE = /\bbg-gradient-to-/;
// Raw CSS gradient functions. The lookbehind lets `repeating-linear-gradient`
// (and repeating-radial / repeating-conic) through as structural pattern fills.
const CSS_RE = /(?<!repeating-)\b(?:linear|radial|conic)-gradient\s*\(/;
const ANY_RE = new RegExp(`${TW_RE.source}|${CSS_RE.source}`);

// Out of scope: developer-facing files only. Note the absence of a
// pages/admin exclusion, see SCOPE NOTE above.
const EXCLUDE_PATH = [
  /\.test\.[cm]?[jt]sx?$/,
  /\.spec\.[cm]?[jt]sx?$/,
  /[\\/]__tests__[\\/]/,
  /[\\/]__mocks__[\\/]/,
  /\.stories\.[cm]?[jt]sx?$/,
];

function isExcluded(filePath) {
  return EXCLUDE_PATH.some((re) => re.test(filePath));
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Only these node kinds carry values that reach the rendered page. Comments are
// not part of the AST token stream we visit, so they are skipped for free.
const RELEVANT_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText,
]);

function scanScript(file, text, offenders) {
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const visit = (node) => {
    if (RELEVANT_KINDS.has(node.kind)) {
      const nodeText =
        node.kind === ts.SyntaxKind.JsxText
          ? node.getFullText(sourceFile)
          : node.getText(sourceFile);
      if (ANY_RE.test(nodeText)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        offenders.push({ file, line: line + 1, text: nodeText.trim().slice(0, 120) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

// Blank out comment bodies while preserving newlines, so reported line numbers
// stay accurate. Handles /* */ blocks and // line comments; string-literal
// contents are left alone (a URL's "//" is inside quotes, not a comment).
function stripCssComments(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (two === '/*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (two === '//') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? text.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
    } else if (text[i] === '"' || text[i] === "'") {
      const quote = text[i];
      let j = i + 1;
      while (j < text.length && text[j] !== quote && text[j] !== '\n') {
        if (text[j] === '\\') j++;
        j++;
      }
      const stop = Math.min(j + 1, text.length);
      out += text.slice(i, stop);
      i = stop;
    } else {
      out += text[i];
      i++;
    }
  }
  return out;
}

function scanCss(file, text, offenders) {
  const stripped = stripCssComments(text);
  const lines = stripped.split('\n');
  for (let n = 0; n < lines.length; n++) {
    if (ANY_RE.test(lines[n])) {
      offenders.push({ file, line: n + 1, text: lines[n].trim().slice(0, 120) });
    }
  }
}

const files = presentRoots.flatMap((r) => walk(r, []));
const offenders = [];

for (const file of files) {
  if (isExcluded(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  // Cheap pre-filter: no gradient token anywhere means nothing to parse.
  if (!/gradient/.test(text)) continue;

  if (file.endsWith('.css')) scanCss(file, text, offenders);
  else scanScript(file, text, offenders);
}

if (offenders.length > 0) {
  console.log(
    `check:gradients: found ${offenders.length} gradient violation(s) ` +
      `in ${presentRoots.join(', ')}:`,
  );
  for (const o of offenders) console.log(`  ${o.file}:${o.line}: ${o.text}`);
  console.log('');
  console.log('QuoteMe doctrine (src/styles/newspaper.css:6): No gradients. One');
  console.log('Sacred Orange (#F2993D) per page. Replace the gradient with a flat');
  console.log('fill, using a palette token where one fits, and reach for a shadow');
  console.log('token (--qm-shadow-sm / -md / -lg) if the surface needs prominence.');
  console.log('Structural pattern fills may use repeating-linear-gradient, which');
  console.log('this guard allows. See scripts/check-gradients.mjs for scope.');
  process.exit(1);
} else {
  console.log(
    `check:gradients: no gradient fills found in ${presentRoots.join(', ')} ` +
      `(${files.length} files). OK.`,
  );
  if (missingRoots.length > 0) {
    console.log(`  (skipped, not present: ${missingRoots.join(', ')})`);
  }
  process.exit(0);
}
