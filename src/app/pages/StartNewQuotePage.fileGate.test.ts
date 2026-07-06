// Client-side menu file-type gate (Wednesday item 1, FE half).
// `accept` on <input> is only a picker hint and drag-drop bypasses it, so the
// programmatic guard in menuFileRejection is the real defense. Copy must match
// the backend gate verbatim.
import { describe, it, expect } from 'vitest';
import { menuFileRejection } from './StartNewQuotePage';

const SUPPORTED = 'The menu reader takes a PDF, photo, CSV, or text file.';

describe('menuFileRejection — accepted types return null', () => {
  it('accepts a PDF', () => {
    expect(menuFileRejection({ name: 'menu.pdf', type: 'application/pdf' })).toBeNull();
  });
  it('accepts a PNG image', () => {
    expect(menuFileRejection({ name: 'menu.png', type: 'image/png' })).toBeNull();
  });
  it('accepts a JPEG photo with no extension but an image mime (camera capture)', () => {
    expect(menuFileRejection({ name: 'capture', type: 'image/jpeg' })).toBeNull();
  });
  it('accepts a CSV', () => {
    expect(menuFileRejection({ name: 'menu.csv', type: 'application/csv' })).toBeNull();
  });
  it('accepts a text file', () => {
    expect(menuFileRejection({ name: 'menu.txt', type: 'text/plain' })).toBeNull();
  });
  it('accepts by extension when the browser sends a generic mime', () => {
    expect(menuFileRejection({ name: 'menu.pdf', type: 'application/octet-stream' })).toBeNull();
  });
});

describe('menuFileRejection — rejected types return plain-language copy', () => {
  it('rejects .xlsx with spreadsheet copy', () => {
    expect(
      menuFileRejection({
        name: 'menu.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    ).toBe(`This looks like a spreadsheet. ${SUPPORTED}`);
  });
  it('rejects a legacy .xls by extension even with a generic mime', () => {
    expect(menuFileRejection({ name: 'prices.xls', type: 'application/octet-stream' }))
      .toBe(`This looks like a spreadsheet. ${SUPPORTED}`);
  });
  it('rejects .docx with Word-document copy', () => {
    expect(
      menuFileRejection({
        name: 'menu.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    ).toBe(`This looks like a Word document. ${SUPPORTED}`);
  });
  it('rejects an unknown binary type with generic copy', () => {
    expect(menuFileRejection({ name: 'menu.zip', type: 'application/zip' }))
      .toBe(`This file type isn't supported. ${SUPPORTED}`);
  });
  it('never leaks the raw mime or extension in the message', () => {
    const msg = menuFileRejection({ name: 'weird.bin', type: 'application/x-secret-internal' });
    expect(msg).not.toContain('application/x-secret-internal');
    expect(msg).not.toContain('.bin');
  });
});
