// TechLandingPage.render.test.tsx
//
// Real-render coverage for the two defects on the token-gated catalog upload
// page (/c/:token), the surface a distributor's catalog person reaches with no
// QuoteMe account at all:
//
//   (a) nothing was validated on either intake path. The `accept` attribute is
//       only a picker hint and drag-and-drop ignores it, so any file at all
//       could be staged and POSTed. The guard now sits in acceptFile, which is
//       the single funnel both paths run through.
//   (b) handleSend had no in-flight guard and the CTA's only disabled
//       condition was `!hasFile`, so two taps produced two real POSTs. The
//       lock is a ref, checked before the first await: `disabled` and the
//       `sending` state only take effect on the NEXT render, which is one
//       render too late to stop a second tap in the same tick.
//
// This project's vitest config does not set globals: true, so
// @testing-library/react's afterEach-based auto cleanup never registers --
// afterEach(cleanup) is required explicitly (see CatalogUploadDrawer.render.test.tsx).
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const { verifyCatalogUploadLink, uploadCatalogViaLink } = vi.hoisted(() => ({
  verifyCatalogUploadLink: vi.fn(),
  uploadCatalogViaLink: vi.fn(),
}));

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
  return { ...actual, verifyCatalogUploadLink, uploadCatalogViaLink };
});

import { TechLandingPage, TechLandingDesktop } from './TechLandingPage';

const CTX = {
  repFirst: 'Marcus',
  repFull: 'Marcus Rivera',
  repEmail: 'marcus@dlisius.co',
  distributor: "D'Lisius",
  distributorFull: "D'Lisius Distribution Co.",
};

beforeEach(() => {
  // The page's responsive effect calls matchMedia; jsdom's implementation is
  // not reliable across layouts, and both layouts render the same drop zone.
  const mql = {
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function dropZone() {
  return screen.getByRole('button', { name: /drop catalog file or click to browse/i });
}

function fileInput() {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

function selectFile(file: File) {
  const input = fileInput();
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

function catalogFile(name = 'Spring_2026_Master.pdf', type = 'application/pdf') {
  return new File(['%PDF-1.4 prices'], name, { type });
}

// ─── (a) the file gate ────────────────────────────────────────────────────────

describe('TechLandingPage drop zone rejects what the surface does not take', () => {
  it('a dropped .docx renders the rejection copy and never reaches onSend', () => {
    const onSend = vi.fn();
    render(<TechLandingDesktop state="idle" onSend={onSend} ctx={CTX} />);

    const docx = new File(['not a catalog'], 'Spring catalog.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    fireEvent.drop(dropZone(), { dataTransfer: { files: [docx] } });

    expect(
      screen.getByText(
        'This looks like a Word document. This takes a PDF, a spreadsheet, or photos of a printed price list.',
      ),
    ).toBeInTheDocument();

    // The file was never staged, so there is nothing to send.
    expect(screen.queryByText('Spring catalog.docx')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /send it to marcus/i }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('rejection copy never names the mime type or the extension', () => {
    render(<TechLandingDesktop state="idle" onSend={vi.fn()} ctx={CTX} />);

    const junk = new File(['x'], 'weird.bin', { type: 'application/x-secret-internal' });
    fireEvent.drop(dropZone(), { dataTransfer: { files: [junk] } });

    const msg = screen.getByText(/isn't supported/);
    expect(msg.textContent).not.toContain('application/x-secret-internal');
    expect(msg.textContent).not.toContain('.bin');
  });

  it('the same guard covers the picker path, which the accept attribute alone cannot', () => {
    render(<TechLandingDesktop state="idle" onSend={vi.fn()} ctx={CTX} />);

    const docx = new File(['x'], 'catalog.docx', { type: '' });
    selectFile(docx);

    expect(screen.getByText(/This looks like a Word document\./)).toBeInTheDocument();
  });

  it('a spreadsheet is a perfectly good catalog and is accepted', () => {
    render(<TechLandingDesktop state="idle" onSend={vi.fn()} ctx={CTX} />);

    const xlsx = new File(['x'], 'Spring_2026.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.drop(dropZone(), { dataTransfer: { files: [xlsx] } });

    expect(screen.getByText('Spring_2026.xlsx')).toBeInTheDocument();
    expect(screen.queryByText(/This looks like/)).not.toBeInTheDocument();
  });

  it('the picker accept attribute is derived from the same list the guard uses', () => {
    render(<TechLandingDesktop state="idle" onSend={vi.fn()} ctx={CTX} />);
    expect(fileInput().getAttribute('accept')).toBe('.pdf,.csv,.xlsx,.jpg,.jpeg,.png,.webp');
  });
});

// ─── (b) the in-flight guard ──────────────────────────────────────────────────

/** Never resolves, so the upload stays in flight for the whole test. */
function pendingUpload() {
  uploadCatalogViaLink.mockImplementation(() => new Promise(() => {}));
}

async function renderPageWithFile() {
  verifyCatalogUploadLink.mockResolvedValue({
    status: 200,
    data: { distributor_name: "D'Lisius", rep_name: 'Marcus Rivera', expires_at: '2026-09-01T00:00:00Z' },
  });

  render(
    <MemoryRouter initialEntries={['/c/8FK2-QX9D']}>
      <Routes>
        <Route path="/c/:token" element={<TechLandingPage />} />
      </Routes>
    </MemoryRouter>,
  );

  await waitFor(() => expect(dropZone()).toBeInTheDocument());
  selectFile(catalogFile());
  await waitFor(() => expect(screen.getByText('Spring_2026_Master.pdf')).toBeInTheDocument());

  return screen.getByRole('button', { name: /send it to marcus/i });
}

describe('TechLandingPage in-flight guard', () => {
  it('two taps in the same tick fire exactly one upload', async () => {
    pendingUpload();
    const cta = await renderPageWithFile();

    // Both clicks are dispatched inside ONE act() so React has no chance to
    // re-render between them. That is the real double-tap: a guard built only
    // on `sending` state or the `disabled` attribute would let the second
    // click through, because neither has been committed yet.
    await act(async () => {
      cta.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      cta.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(uploadCatalogViaLink).toHaveBeenCalledTimes(1);
  });

  it('stays at one upload when the second tap lands after a re-render', async () => {
    pendingUpload();
    const cta = await renderPageWithFile();

    fireEvent.click(cta);
    await waitFor(() => expect(cta).toBeDisabled());
    fireEvent.click(cta);

    expect(uploadCatalogViaLink).toHaveBeenCalledTimes(1);
  });

  it('tells the uploader something is happening, which is what stops the second tap', async () => {
    pendingUpload();
    const cta = await renderPageWithFile();

    fireEvent.click(cta);

    await waitFor(() => expect(screen.getByRole('button', { name: /sending to marcus/i })).toBeDisabled());
    expect(screen.getByText('Sending now. A big catalog takes a moment.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send it to marcus/i })).not.toBeInTheDocument();
    // The staged file cannot be swapped out from under the upload.
    expect(screen.getByRole('button', { name: 'Use a different file' })).toBeDisabled();
  });

  it('releases the guard after a failed upload so the uploader can retry', async () => {
    uploadCatalogViaLink.mockResolvedValue({ status: 500, error: 'ingest_failed' });
    const cta = await renderPageWithFile();

    fireEvent.click(cta);
    await waitFor(() => expect(screen.getByText(/Something went wrong on our end/)).toBeInTheDocument());
    expect(cta).toBeEnabled();

    fireEvent.click(cta);
    await waitFor(() => expect(uploadCatalogViaLink).toHaveBeenCalledTimes(2));
  });

  it('a 410 during upload still reaches the expired screen, not the error path', async () => {
    uploadCatalogViaLink.mockResolvedValue({ status: 410, error: 'expired' });
    const cta = await renderPageWithFile();

    fireEvent.click(cta);
    await waitFor(() => expect(screen.getByText('This link has expired.')).toBeInTheDocument());
  });
});
