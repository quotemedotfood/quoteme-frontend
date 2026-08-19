// The Product Pipeline page (/qm-admin/product-pipeline) is an iframe over the
// self-contained artifact at public/product-pipeline-artifact.html, so it has
// no React tree to render in a test. It is still shipped UI: the board renders
// one "Claim" button per unclaimed card and one "Add card" button per column
// plus one in the header, and every one of them used to carry the identical
// accessible name. A screen reader user hearing "Claim, Claim, Claim..." could
// not tell which card they were about to take.
//
// This guards the markup templates rather than a rendered DOM: the file is a
// hand-maintained artifact that gets regenerated, and the failure mode worth
// catching is a regeneration that drops the labels.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT = path.resolve(process.cwd(), 'public/product-pipeline-artifact.html');
const html = fs.readFileSync(ARTIFACT, 'utf8');

// Every <button ...>Label</button> in the file, as [openingTag, innerText].
function buttonsLabelled(text: string): string[] {
  const re = new RegExp(`<button([^>]*)>((?:(?!</button>).)*?)${text}</button>`, 'g');
  return Array.from(html.matchAll(re)).map((m) => m[1]);
}

describe('product pipeline artifact - claim/release accessible names', () => {
  it('names each Claim button after the card it claims', () => {
    const tags = buttonsLabelled('Claim');
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      // Interpolates the card title, so N buttons get N distinct names.
      expect(tag).toContain('aria-label="Claim ${attr(card.title)}"');
    }
  });

  it('names each Release button after the card it releases', () => {
    const tags = buttonsLabelled('Release');
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(tag).toContain('aria-label="Release ${attr(card.title)}"');
    }
  });
});

describe('product pipeline artifact - Add card accessible names', () => {
  it('disambiguates every board-level Add card button by what it adds to', () => {
    // Two source sites render the five buttons an operator sees: the header
    // one (adds to the backlog) and the per-column one (four columns).
    const tags = buttonsLabelled('Add card');

    const headerTag = tags.find((t) => t.includes("openNewCard(null,'backlog')"));
    expect(headerTag).toBeDefined();
    expect(headerTag).toContain('aria-label="Add card to backlog"');

    const columnTag = tags.find((t) => t.includes("openNewCard('${col.id}','board')"));
    expect(columnTag).toBeDefined();
    expect(columnTag).toContain('aria-label="Add card to ${attr(col.title)}"');
  });

  it('leaves the modal submit button alone, since only one modal is ever open', () => {
    const tags = buttonsLabelled('Add card');
    const submitTag = tags.find((t) => t.includes('saveNewCard('));
    expect(submitTag).toBeDefined();
    expect(submitTag).not.toContain('aria-label');
  });
});

describe('product pipeline artifact - attribute escaping', () => {
  it('escapes operator-typed titles before they land in an attribute', () => {
    // Card and column titles are free text. An unescaped double quote would
    // close the aria-label early and silently drop the accessible name.
    expect(html).toContain('function attr(s)');
    expect(html).toContain("replace(/\"/g, '&quot;')");
    // Ampersand first, or the other replacements get double-encoded.
    const attrBody = html.slice(html.indexOf('function attr(s)'));
    expect(attrBody.indexOf("/&/g")).toBeLessThan(attrBody.indexOf("/\"/g"));
  });
});
