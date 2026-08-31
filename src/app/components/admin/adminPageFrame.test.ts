// adminPageFrame.test.ts
//
// Every QM Admin page used to hand-write its own outer frame, and they
// disagreed: p-6 md:p-10 paired with max-w-4xl, 5xl, 6xl or 7xl depending on
// which page you were looking at. That is why the gutters were inconsistent
// and why Justin saw tables stopping short at different widths.
//
// Fixing the pages without fixing the cause would have let the drift back in
// with the next page written. So the frame has one definition and these cases
// hold the line: the first asserts the default is genuinely uncapped, and the
// second is a guard that fails if any admin page reintroduces a private frame.
//
// This project's vitest config does not set `globals: true`, so
// @testing-library's afterEach auto cleanup never registers. Nothing renders
// here, but the file declares its own afterEach so it stays correct if a
// future case does.

import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ADMIN_PAGE_FRAME,
  ADMIN_PAGE_FRAME_STYLE,
  ADMIN_PAGE_MAX_WIDTH,
} from './adminPageFrame';

const ADMIN_PAGES_DIR = join(process.cwd(), 'src/app/pages/admin');

function adminPageSources(): Array<{ name: string; source: string }> {
  return readdirSync(ADMIN_PAGES_DIR)
    .filter((f) => f.startsWith('QMAdmin') && f.endsWith('.tsx') && !f.includes('.test.'))
    .map((name) => ({ name, source: readFileSync(join(ADMIN_PAGES_DIR, name), 'utf8') }));
}

describe('the admin page frame', () => {
  afterEach(() => {
    cleanup();
  });

  it('applies a consistent buffer and, by default, no width cap at all', () => {
    // Justin's ask: full width with a consistent border buffer.
    expect(ADMIN_PAGE_FRAME).toContain('p-6');
    expect(ADMIN_PAGE_FRAME).toContain('md:p-10');
    expect(ADMIN_PAGE_FRAME).not.toMatch(/max-w-/);

    // The cap is one value in one place, and it is currently off. When Moose
    // rules on ultrawide, this constant is the only thing that changes.
    expect(ADMIN_PAGE_MAX_WIDTH).toBeNull();
    expect(ADMIN_PAGE_FRAME_STYLE).toBeUndefined();
  });

  it('is the only frame: no admin page hand-writes a padding-plus-max-width shell', () => {
    // Deliberately narrow: this matches the FRAME shape only, a className that
    // is padding followed by a max width and nothing else. Inner elements have
    // every right to a max width (a modal at max-w-md, a search box at
    // max-w-sm), and this guard must not chase those.
    const FRAME_SHAPED = /className="p-\d+(?: md:p-\d+)? max-w-[0-9a-z]+(?: mx-auto)?"/;

    const offenders = adminPageSources()
      .filter(({ source }) => FRAME_SHAPED.test(source))
      .map(({ name, source }) => `${name}: ${source.match(FRAME_SHAPED)?.[0]}`);

    // If this fails, a page has gone back to hand-writing its frame. Point it
    // at ADMIN_PAGE_FRAME rather than widening this test.
    expect(offenders).toEqual([]);
  });

  it('covers every admin page, so none is left on the old inconsistent frame', () => {
    const pages = adminPageSources();
    // Guards against the sweep silently missing files as pages are added.
    expect(pages.length).toBeGreaterThanOrEqual(18);

    const unframed = pages
      .filter(({ source }) => !source.includes('ADMIN_PAGE_FRAME'))
      .map(({ name }) => name);

    // The permitted exceptions, each a full-bleed shell that never carried a
    // frame and would break if given one: NotFound and ProductPipeline render
    // their own layouts, and ConferenceCommand is a flex-1 / min-h-0 /
    // overflow-auto dashboard pane.
    expect(unframed.sort()).toEqual([
      'QMAdminConferenceCommand.tsx',
      'QMAdminNotFound.tsx',
      'QMAdminProductPipeline.tsx',
    ]);
  });
});
