// Client-side menu file-type gate (Wednesday item 1, FE half).
// `accept` on <input> is only a picker hint and drag-drop bypasses it, so the
// programmatic guard in menuFileRejection is the real defense. Copy must match
// the backend gate verbatim.
import { describe, it, expect } from 'vitest';
import { menuFileRejection, extractionOutcome } from './StartNewQuotePage';

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

describe('extractionOutcome — C1 async status interpretation', () => {
  it('returns pending for null/undefined (transient poll error)', () => {
    expect(extractionOutcome(null).kind).toBe('pending');
    expect(extractionOutcome(undefined).kind).toBe('pending');
  });

  it('returns pending while still processing', () => {
    expect(extractionOutcome({ status: 'processing' }).kind).toBe('pending');
    expect(extractionOutcome({ status: 'pending' }).kind).toBe('pending');
  });

  it('accepts the existing "processed" spelling as done', () => {
    const o = extractionOutcome({ status: 'processed', extracted_text: 'TACOS $3' });
    expect(o).toEqual({ kind: 'done', text: 'TACOS $3' });
  });

  it('accepts a "complete"/"completed" spelling as done (defensive)', () => {
    expect(extractionOutcome({ status: 'complete', extracted_text: 'X' })).toEqual({ kind: 'done', text: 'X' });
    expect(extractionOutcome({ status: 'completed', extracted_text: 'Y' })).toEqual({ kind: 'done', text: 'Y' });
  });

  it('renders user_message verbatim on failed', () => {
    const o = extractionOutcome({
      status: 'failed',
      user_message: 'This PDF couldn\'t be read automatically. Try a clear photo of the menu, or a CSV/text version.',
    });
    expect(o).toEqual({
      kind: 'failed',
      message: 'This PDF couldn\'t be read automatically. Try a clear photo of the menu, or a CSV/text version.',
    });
  });

  it('falls back to plain copy when a failed status carries no user_message', () => {
    const o = extractionOutcome({ status: 'failed' });
    expect(o.kind).toBe('failed');
    expect((o as any).message).toMatch(/couldn't read that menu/i);
  });

  it('treats terminal-done with no extracted_text as empty (plain copy)', () => {
    const o = extractionOutcome({ status: 'processed', extracted_text: null });
    expect(o.kind).toBe('empty');
    expect((o as any).message).toMatch(/couldn't find any menu text/i);
  });
})
