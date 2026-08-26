import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Guard for the class of bug that let --font-body sit REFERENCED 324 times and
 * DEFINED zero times for the whole life of this app, silently.
 *
 * Why it was silent: every one of those references is inside the CSS `font:`
 * shorthand. A var() that resolves to nothing makes the declaration invalid at
 * computed-value time, and the spec then unsets EVERY longhand the shorthand
 * covers - font-family, font-size, font-weight, line-height. So the failure
 * mode was not "wrong typeface", it was "no typography, inherit everything",
 * which reads as a plain-looking screen rather than a broken one. Nothing threw
 * and nothing logged.
 *
 * This is the token-level equivalent of the gradient guard added in #391
 * (scripts/check-gradients.mjs, the QuoteMe app).
 */

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(jsx?|css)$/.test(e.name) && !/\.test\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const FILES = sourceFiles(SRC);

/** Every custom property this app defines, in CSS (`--x:`) or as a JS key (`'--x':`). */
function definedTokens() {
  const defined = new Set();
  for (const f of FILES) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]);
    for (const m of s.matchAll(/['"`](--[a-zA-Z0-9-]+)['"`]\s*:/g)) defined.add(m[1]);
  }
  return defined;
}

/** Every `var(--x)` used with NO fallback - the only form that can go silent. */
function usedWithoutFallback() {
  const used = new Map();
  for (const f of FILES) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*([,)])/g)) {
      if (m[2] === ',') continue; // has a fallback; degrades visibly, not silently
      const rel = path.relative(SRC, f);
      if (!used.has(m[1])) used.set(m[1], new Set());
      used.get(m[1]).add(rel);
    }
  }
  return used;
}

describe('CSS custom properties', () => {
  it('defines every token that is used without a var() fallback', () => {
    const defined = definedTokens();
    const undefinedTokens = [...usedWithoutFallback().entries()]
      .filter(([token]) => !defined.has(token))
      .map(([token, files]) => `${token} (used in ${[...files].sort().join(', ')})`)
      .sort();

    expect(undefinedTokens).toEqual([]);
  });

  it('names both type tokens, because the `font:` shorthand hides their absence', () => {
    const defined = definedTokens();
    expect(defined.has('--font-body')).toBe(true);
    expect(defined.has('--font-display')).toBe(true);
  });

  it('loads a webfont for each family the type tokens name first', () => {
    const html = fs.readFileSync(path.join(SRC, '..', 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(SRC, 'lib', 'theme.css'), 'utf8');

    for (const token of ['--font-body', '--font-display']) {
      const decl = new RegExp(`${token}\\s*:\\s*'([^']+)'`).exec(css);
      expect(decl, `${token} should name a quoted first family`).not.toBeNull();
      const family = decl[1].replace(/ /g, '+');
      expect(
        html.includes(`family=${family}:`) || html.includes('@font-face'),
        `${decl[1]} is the first family for ${token} but index.html never loads it`,
      ).toBe(true);
    }
  });

  it('loads every weight the app asks of each type token', () => {
    const html = fs.readFileSync(path.join(SRC, '..', 'index.html'), 'utf8');
    const asked = { '--font-body': new Set(), '--font-display': new Set() };

    for (const f of FILES) {
      const s = fs.readFileSync(f, 'utf8');
      // `font: <weight> <size>[/<lh>] var(--font-x)` - weight is optional.
      for (const m of s.matchAll(/font:\s*['"`]\s*(\d{3})\s[^'"`]*var\(\s*(--font-(?:body|display))\s*\)/g)) {
        asked[m[2]].add(m[1]);
      }
    }

    for (const [token, weights] of Object.entries(asked)) {
      const decl = new RegExp(`${token}\\s*:\\s*'([^']+)'`)
        .exec(fs.readFileSync(path.join(SRC, 'lib', 'theme.css'), 'utf8'));
      const family = decl[1].replace(/ /g, '+');
      const loaded = new RegExp(`family=${family}:wght@([\\d;]+)`).exec(html);
      expect(loaded, `no wght axis loaded for ${decl[1]}`).not.toBeNull();
      const have = new Set(loaded[1].split(';'));
      const missing = [...weights].filter((w) => !have.has(w)).sort();
      expect(missing, `${decl[1]} is used at weights index.html never loads`).toEqual([]);
    }
  });
});
