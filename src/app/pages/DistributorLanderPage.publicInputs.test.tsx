// DistributorLanderPage.publicInputs.test.tsx
//
// Justin founder ruling 1 (2026-09-25), accepted by Moose: the public /d/:slug
// page takes PDF, JPG/JPEG, PNG, WEBP, a camera photo, and pasted text. CSV and
// TXT files are gone from the public picker. HEIC/HEIF is refused with
// recovery instructions. Client, server and page copy agree exactly.
//
// The strings are pinned as LITERALS here and in the backend request spec
// (spec/requests/api/v1/distributor_pages_public_inputs_spec.rb), so a change
// on one side that is not made on the other goes red.
//
// This project's vitest config does not set globals: true, so afterEach(cleanup)
// is registered explicitly.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const { extractMenuText } = vi.hoisted(() => ({ extractMenuText: vi.fn() }));
vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, extractMenuText };
});

import { DistributorLanderPage } from './DistributorLanderPage';
import * as gate from '../utils/fileGate';

const SUPPORTED = 'This page takes a PDF, a JPG, PNG or WEBP photo, or pasted text.';
const UNSUPPORTED = `This file type isn't supported. ${SUPPORTED}`;
const HEIC =
  "iPhone HEIC photos can't be read here. On iPhone, set Camera > Formats > " +
  'Most Compatible, or share the photo as JPEG, or upload a PDF.';

const CONFIG = {
  distributor: { id: 'd1', name: 'Harbor Fresh Co.', display_name: 'Harbor Fresh' },
  branding: {
    logo_url: null,
    primary_hex: '#3B82F6',
    secondary_hex: '#1E3A5F',
    custom_notes: null,
    quoteme_verbiage: null,
  },
  accepted_payload: 'chef_source',
  accepted_content_types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  accepts_paste: true,
};

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(CONFIG), { status: 200 })),
  );
  extractMenuText.mockResolvedValue({ data: { text: 'Mains\nSalmon, dill' } });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function renderInFileMode() {
  render(
    <MemoryRouter initialEntries={['/d/harbor-fresh']}>
      <Routes>
        <Route path="/d/:slug" element={<DistributorLanderPage />} />
      </Routes>
    </MemoryRouter>,
  );
  // The old label was "Upload PDF"; either label switches to file mode so the
  // gate assertions below can run against the unfixed page too.
  const toggle = await screen.findByRole('button', { name: /^(Upload PDF|Photo or file)$/ });
  fireEvent.click(toggle);
}

function chooseFileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
  expect(input).not.toBeNull();
  return input;
}

function pick(input: HTMLInputElement, name: string, type: string) {
  const f = new File(['x'], name, { type });
  Object.defineProperty(input, 'files', { value: [f], configurable: true });
  fireEvent.change(input);
}

describe('PUBLIC_MENU_SURFACE (fileGate)', () => {
  it('matches the server set exactly', () => {
    expect(gate.PUBLIC_MENU_SURFACE.exts).toEqual(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);
    expect(gate.PUBLIC_MENU_SURFACE.mimeExact).toEqual([
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    ]);
    expect(gate.PUBLIC_MENU_SURFACE.mimePrefixes).toEqual([]);
  });

  it('carries the same copy the server sends', () => {
    expect(gate.PUBLIC_SUPPORTED_SENTENCE).toBe(SUPPORTED);
    expect(gate.PUBLIC_HEIC_MESSAGE).toBe(HEIC);
  });

  it.each([
    ['menu.csv', 'text/csv', UNSUPPORTED],
    ['menu.txt', 'text/plain', UNSUPPORTED],
    ['menu.gif', 'image/gif', UNSUPPORTED],
    ['IMG_0001.HEIC', 'image/heic', HEIC],
    ['IMG_0002.heif', '', HEIC],
    ['IMG_0003.heic', 'image/jpeg', HEIC],
  ])('rejects %s (%s)', (name, type, message) => {
    expect(gate.fileRejection({ name, type }, gate.PUBLIC_MENU_SURFACE)).toBe(message);
  });

  it.each([
    ['menu.pdf', 'application/pdf'],
    ['menu.jpg', 'image/jpeg'],
    ['menu.jpeg', ''],
    ['menu.png', 'image/png'],
    ['menu.webp', 'image/webp'],
    ['image', 'image/jpeg'],
  ])('accepts %s (%s)', (name, type) => {
    expect(gate.fileRejection({ name, type }, gate.PUBLIC_MENU_SURFACE)).toBeNull();
  });

  it('leaves the authenticated menu reader surface alone', () => {
    expect(gate.MENU_SURFACE.exts).toEqual(['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.csv', '.txt']);
    expect(gate.fileRejection({ name: 'menu.csv', type: 'text/csv' }, gate.MENU_SURFACE)).toBeNull();
  });
});

describe('DistributorLanderPage public inputs', () => {
  it('offers a Take Photo control that opens the rear camera', async () => {
    await renderInFileMode();
    expect(screen.getByRole('button', { name: 'Take Photo' })).toBeTruthy();
    const camera = document.querySelector('input[type="file"][capture]') as HTMLInputElement;
    expect(camera).not.toBeNull();
    expect(camera.getAttribute('capture')).toBe('environment');
    expect(camera.getAttribute('accept')).toBe('image/*');
  });

  it('offers a Choose File control whose accept is exactly the public set', async () => {
    await renderInFileMode();
    expect(screen.getByRole('button', { name: 'Choose File' })).toBeTruthy();
    expect(chooseFileInput().getAttribute('accept')).toBe(
      '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp',
    );
  });

  it.each([
    ['menu.csv', 'text/csv', UNSUPPORTED],
    ['menu.txt', 'text/plain', UNSUPPORTED],
    ['IMG_0001.heic', 'image/heic', HEIC],
  ])('rejects %s client-side with the recovery text and sends nothing', async (name, type, message) => {
    await renderInFileMode();
    pick(chooseFileInput(), name, type);
    expect((await screen.findByRole('alert')).textContent).toBe(message);
    expect(extractMenuText).not.toHaveBeenCalled();
    expect(screen.queryByText(name)).toBeNull();
  });

  it('rejects a HEIC that arrives through the camera input too', async () => {
    await renderInFileMode();
    const camera = document.querySelector('input[type="file"][capture]') as HTMLInputElement;
    pick(camera, 'IMG_0004.HEIC', 'image/heic');
    expect((await screen.findByRole('alert')).textContent).toBe(HEIC);
    expect(extractMenuText).not.toHaveBeenCalled();
  });

  it('accepts a .jpg and reads it', async () => {
    await renderInFileMode();
    pick(chooseFileInput(), 'menu.jpg', 'image/jpeg');
    await waitFor(() => expect(extractMenuText).toHaveBeenCalledTimes(1));
    expect(screen.getByText('menu.jpg')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('states on the page exactly what is accepted, in the shared words', async () => {
    await renderInFileMode();
    const line = screen.getByTestId('lander-accepts-copy');
    expect(line.textContent).toBe(SUPPORTED);
    expect(line.textContent).toBe(gate.PUBLIC_SUPPORTED_SENTENCE);
  });

  it('never calls the upload a PDF', async () => {
    await renderInFileMode();
    expect(screen.queryByRole('button', { name: 'Upload PDF' })).toBeNull();
    expect(screen.queryByText('Drop your PDF here')).toBeNull();
    expect(screen.queryByText('PDF file')).toBeNull();
  });

  it('reads accepts_paste: false from GET and drops the paste path', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ ...CONFIG, accepts_paste: false }), { status: 200 }),
    );
    render(
      <MemoryRouter initialEntries={['/d/harbor-fresh']}>
        <Routes>
          <Route path="/d/:slug" element={<DistributorLanderPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('button', { name: 'Take Photo' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Paste text' })).toBeNull();
    expect(screen.queryByPlaceholderText(/Paste your full menu/)).toBeNull();
  });

  it('shows the server recovery detail when the upload is refused', async () => {
    await renderInFileMode();
    pick(chooseFileInput(), 'menu.png', 'image/png');
    await waitFor(() => expect(extractMenuText).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText('e.g. The Holloway Grill'), { target: { value: 'Harbor Grill' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Alex Rivera'), { target: { value: 'Mario' } });
    fireEvent.change(screen.getByPlaceholderText('you@restaurant.com'), { target: { value: 'chef@bistro.com' } });

    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'unsupported_file_type', detail: UNSUPPORTED }), { status: 422 }),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Send to / }));
    expect(await screen.findByText(UNSUPPORTED)).toBeTruthy();
  });
});
