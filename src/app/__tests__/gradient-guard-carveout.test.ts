// gradient-guard-carveout.test.ts
//
// The no-gradients guard was widened (ruled 2026-09-01) to allow a gradient
// whose ADJACENT COLOUR STOPS SHARE A POSITION -- a hard-stop shape, not a
// blend. That widening clears the standing red from the PairMe slider thumb at
// apps/pairme/src/screens/Q3Budget.jsx:60.
//
// A widening with no counter-case is unfalsifiable: it could allow everything
// and still report OK. So the cases below are half admission, half rejection,
// and the rejections are the point. Brand drift lives in blends.
//
// These run the REAL script as a subprocess against temp fixtures, rather than
// importing its internals. The script already takes roots as argv, so this
// exercises the shipped binary end to end -- and the fixtures live in the OS
// temp dir, never under src/ or apps/, so `npm run check:gradients` on the repo
// itself never sees them.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCRIPT = path.join(process.cwd(), 'scripts', 'check-gradients.mjs');

let fixtureDir: string;

/** Runs the guard against the fixture dir. Returns its exit code and output. */
function runGuard(): { code: number; out: string } {
  try {
    const out = execFileSync('node', [SCRIPT, fixtureDir], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    return { code: 0, out };
  } catch (e: any) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function write(name: string, contents: string) {
  fs.writeFileSync(path.join(fixtureDir, name), contents, 'utf8');
}

describe('check-gradients: hard-stop carve-out', () => {
  beforeEach(() => {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grad-guard-'));
  });
  afterEach(() => {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  // ── Admitted: shapes ────────────────────────────────────────────────────
  it('admits the PairMe slider thumb, the shape this was widened for', () => {
    write(
      'thumb.jsx',
      `export const thumb = { background: 'radial-gradient(circle at center, var(--pm-card) 0 9px, var(--pm-accent2) 9px 11.5px, transparent 12px)' };`,
    );
    const { code, out } = runGuard();
    expect(out).toContain('OK');
    expect(code).toBe(0);
  });

  it('admits a two-colour hard stop with no feather at all', () => {
    write('ring.css', `.ring { background: linear-gradient(to right, #F2993D 50%, #2A2A2A 50%); }`);
    expect(runGuard().code).toBe(0);
  });

  it('still admits repeating-linear-gradient, unchanged', () => {
    write('stripe.css', `.s { background: repeating-linear-gradient(45deg, #eee 0 4px, #fff 4px 8px); }`);
    expect(runGuard().code).toBe(0);
  });

  // ── Rejected: blends. These are what the guard is for. ──────────────────
  it('REJECTS a real blend between two positioned stops', () => {
    write('blend.css', `.b { background: linear-gradient(to right, #F2993D 0%, #7FAEC2 100%); }`);
    const { code, out } = runGuard();
    expect(code).toBe(1);
    expect(out).toContain('blend.css');
    expect(out).toContain('1 gradient violation');
  });

  it('REJECTS a blend with no stop positions at all', () => {
    write('bare.css', `.b { background: linear-gradient(#F2993D, #7FAEC2); }`);
    expect(runGuard().code).toBe(1);
  });

  it('REJECTS a Tailwind gradient utility, which has no stops to share', () => {
    write('tw.tsx', `export const C = () => <div className="bg-gradient-to-r from-orange-400 to-blue-300" />;`);
    expect(runGuard().code).toBe(1);
  });

  it('REJECTS a three-stop blend even though its endpoints look deliberate', () => {
    write('three.css', `.b { background: linear-gradient(90deg, #fff 0%, #F2993D 50%, #000 100%); }`);
    expect(runGuard().code).toBe(1);
  });

  it('REJECTS a blend that shares a file with a legitimate hard-stop shape', () => {
    write(
      'mixed.css',
      [
        '.shape { background: linear-gradient(to right, #F2993D 50%, #2A2A2A 50%); }',
        '.drift { background: linear-gradient(to right, #F2993D 0%, #7FAEC2 100%); }',
      ].join('\n'),
    );
    const { code, out } = runGuard();
    expect(code).toBe(1);
    // The blend is named and the shape is not.
    expect(out).toContain('mixed.css:2');
    expect(out).not.toContain('mixed.css:1');
  });

  it('REJECTS a gradient it cannot parse, rather than assuming it is a shape', () => {
    // Assembled by concatenation: the guard sees an unclosed call and must not
    // give it the benefit of the doubt.
    write('dynamic.ts', `export const bg = (c: string) => 'linear-gradient(to right, ' + c + ' 0%, #fff 100%)';`);
    expect(runGuard().code).toBe(1);
  });

  // ── Reporting ───────────────────────────────────────────────────────────
  it('reports the right line for a blend written across several lines', () => {
    write(
      'multiline.css',
      [
        '.a { color: red; }',
        '.b {',
        '  background: linear-gradient(',
        '    to right,',
        '    #F2993D 0%,',
        '    #7FAEC2 100%',
        '  );',
        '}',
      ].join('\n'),
    );
    const { code, out } = runGuard();
    expect(code).toBe(1);
    // Line 3 is where the gradient call opens. Before this change the CSS scan
    // matched line by line, so a multi-line gradient had unbalanced parens on
    // every one of its lines and could not be parsed at all.
    expect(out).toContain('multiline.css:3');
  });

  it('does not flag a gradient named only inside a comment', () => {
    write('doc.css', `/* DOCTRINE: no linear-gradient( blends anywhere */\n.a { color: red; }`);
    expect(runGuard().code).toBe(0);
  });
});
