#!/usr/bin/env node
// Guards user-facing FE copy against the em dash (U+2014, "—") and en dash
// (U+2013, "–") per Justin's no-em-dash rule (Moose, 2026-07-15): no em
// dashes anywhere in copy a chef, rep, distributor admin, or buyer sees.
// FE mirror of the backend scripts/check_no_emdash.rb.
//
// Scope is deliberately narrow. The codebase uses em dashes constantly in
// developer-only code comments (the AST walk skips those) and in test
// descriptions (describe/it strings, excluded by path). Only strings and JSX
// text that actually render in the product UI are checked. Also catches the
// HTML-entity encodings (&mdash; / &#8212; / &#x2014; and the en-dash
// equivalents) that render to the same glyph without the literal byte.
//
// Run: node scripts/check-emdash.mjs   (npm run check:emdash)

import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || 'src';

// Raw glyphs + HTML entity encodings that render as em/en dash.
const RAW_RE = /[—–]/;
const ENTITY_RE = /&mdash;|&ndash;|&#8212;|&#8211;|&#x2014;|&#x2013;/i;
const ANY_RE = new RegExp(`${RAW_RE.source}|${ENTITY_RE.source}`, 'i');

// Out of scope, mirroring the backend guard's stated reach ("copy a chef,
// rep, distributor admin, or buyer actually sees"):
//   - test descriptions and mocks (developer-facing)
//   - storybook stories (developer-facing)
//   - src/app/pages/admin/** : the quoteme_admin internal tooling
//     (matching-engine diagnostics, cluster-label editors, health, etc.).
//     This is staff-only operator UI, not the product voice, exactly as the
//     BE guard omits quoteme_admin from its scope.
const EXCLUDE_PATH = [
  /\.test\.[cm]?[jt]sx?$/,
  /\.spec\.[cm]?[jt]sx?$/,
  /[\\/]__tests__[\\/]/,
  /[\\/]__mocks__[\\/]/,
  /\.stories\.[cm]?[jt]sx?$/,
  /[\\/]pages[\\/]admin[\\/]/,
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
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Only these node kinds carry copy that renders to a user. Comments are not
// part of the AST token stream we visit, so they are skipped for free.
const RELEVANT_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.JsxText,
]);

const files = walk(ROOT, []);
const offenders = [];

for (const file of files) {
  if (isExcluded(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (!ANY_RE.test(text)) continue;

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

if (offenders.length > 0) {
  console.log(`check:emdash: found ${offenders.length} em dash / en dash violation(s) in user-facing copy:`);
  for (const o of offenders) console.log(`  ${o.file}:${o.line}: ${o.text}`);
  console.log('');
  console.log('Replace U+2014 (—) / U+2013 (–) and their HTML entities with plain');
  console.log('punctuation (colon, comma, period, parenthetical, or hyphen) in');
  console.log('user-facing strings. See scripts/check-emdash.mjs for scope.');
  process.exit(1);
} else {
  console.log('check:emdash: no em dash / en dash found in user-facing copy. OK.');
  process.exit(0);
}
