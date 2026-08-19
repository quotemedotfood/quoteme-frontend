// fileGate.test.ts
//
// The shared file-type gate is parameterised by surface because the menu
// reader and the token-gated catalog intake genuinely accept different
// formats, while having to speak ONE vocabulary of rejection copy.
//
// These tests pin the asymmetry that motivated the split (a spreadsheet is a
// perfectly good catalog and a useless menu) and the trap that comes with it:
// a diagnosis clause must be suppressed when the surface accepts that whole
// family, otherwise the rejection contradicts itself.
//
// StartNewQuotePage.fileGate.test.ts still covers the menu surface through the
// menuFileRejection wrapper and is deliberately untouched by this change.
import { describe, it, expect } from 'vitest';
import { fileRejection, MENU_SURFACE, CATALOG_SURFACE } from './fileGate';

const MENU_SUPPORTED = 'The menu reader takes a PDF, photo, CSV, or text file.';
const CATALOG_SUPPORTED = 'This takes a PDF, a spreadsheet, or photos of a printed price list.';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('fileRejection - the same file, two answers, by surface', () => {
  it('accepts .xlsx on the catalog surface', () => {
    expect(fileRejection({ name: 'Spring_2026_Master.xlsx', type: XLSX_MIME }, CATALOG_SURFACE)).toBeNull();
  });

  it('rejects the same .xlsx on the menu surface with the spreadsheet clause', () => {
    expect(fileRejection({ name: 'Spring_2026_Master.xlsx', type: XLSX_MIME }, MENU_SURFACE)).toBe(
      `This looks like a spreadsheet. ${MENU_SUPPORTED}`,
    );
  });

  it('accepts .txt on the menu surface but not on the catalog surface', () => {
    expect(fileRejection({ name: 'menu.txt', type: 'text/plain' }, MENU_SURFACE)).toBeNull();
    expect(fileRejection({ name: 'menu.txt', type: 'text/plain' }, CATALOG_SURFACE)).toBe(
      `This file type isn't supported. ${CATALOG_SUPPORTED}`,
    );
  });
});

describe('fileRejection - a diagnosis clause is suppressed when the surface accepts that family', () => {
  // The catalog surface takes .xlsx. If the spreadsheet clause still fired for
  // a .tsv, the message would read "This looks like a spreadsheet. This takes
  // a PDF, a spreadsheet, ..." and contradict itself in one breath.
  it('gives a .tsv the generic clause on the catalog surface, not the spreadsheet clause', () => {
    const msg = fileRejection({ name: 'prices.tsv', type: 'application/octet-stream' }, CATALOG_SURFACE);
    expect(msg).toBe(`This file type isn't supported. ${CATALOG_SUPPORTED}`);
    expect(msg).not.toContain('This looks like a spreadsheet.');
  });

  // Same file, generic mime, so the extension is all either surface has to go
  // on. (With a text/* mime the menu surface accepts a .tsv outright, since it
  // reads plain text; that behaviour is unchanged from the original gate.)
  it('still gives a .tsv the spreadsheet clause on the menu surface, which takes no spreadsheets', () => {
    expect(fileRejection({ name: 'prices.tsv', type: 'application/octet-stream' }, MENU_SURFACE)).toBe(
      `This looks like a spreadsheet. ${MENU_SUPPORTED}`,
    );
  });

  it('suppresses by mime as well as by extension: a legacy .xls is not diagnosed as a spreadsheet on the catalog surface', () => {
    expect(fileRejection({ name: 'prices.xls', type: 'application/octet-stream' }, CATALOG_SURFACE)).toBe(
      `This file type isn't supported. ${CATALOG_SUPPORTED}`,
    );
  });
});

describe('fileRejection - the Word clause survives on both surfaces, each with its own sentence', () => {
  it('diagnoses .docx as a Word document on the menu surface', () => {
    expect(fileRejection({ name: 'menu.docx', type: DOCX_MIME }, MENU_SURFACE)).toBe(
      `This looks like a Word document. ${MENU_SUPPORTED}`,
    );
  });

  it('diagnoses .docx as a Word document on the catalog surface', () => {
    expect(fileRejection({ name: 'catalog.docx', type: DOCX_MIME }, CATALOG_SURFACE)).toBe(
      `This looks like a Word document. ${CATALOG_SUPPORTED}`,
    );
  });
});

describe('fileRejection - the catalog surface accepts what the page advertises', () => {
  it('accepts every extension in the accept attribute', () => {
    for (const ext of CATALOG_SURFACE.exts) {
      expect(fileRejection({ name: `catalog${ext}`, type: '' }, CATALOG_SURFACE)).toBeNull();
    }
  });

  it('accepts a phone photo with no extension but an image mime', () => {
    expect(fileRejection({ name: 'IMG_0042', type: 'image/heic' }, CATALOG_SURFACE)).toBeNull();
  });
});

describe('fileRejection - never leaks the raw mime or extension', () => {
  it('says nothing about the file type it saw, on the catalog surface', () => {
    const msg = fileRejection({ name: 'weird.bin', type: 'application/x-secret-internal' }, CATALOG_SURFACE);
    expect(msg).not.toContain('application/x-secret-internal');
    expect(msg).not.toContain('.bin');
    expect(msg).toBe(`This file type isn't supported. ${CATALOG_SUPPORTED}`);
  });
});
