/**
 * CAMERA end-to-end (entry-points brief, gate A), the wiring this suite adds
 * coverage for: EntryScreen.jsx's MODE_CAMERA branch used to be a pure stub
 * (handleCameraFile just showed a note and switched to Paste, no BE call at
 * all - see git history). It now uploads to POST /v1/capture and, on
 * success, runs the extracted raw_text through the SAME parseMenu -> pick
 * -> pair pipeline the Paste tab exercises in entry-screen.test.jsx. A
 * failure (typed BE error, or no text found) still falls back to Paste with
 * a plain-language note, same as the old stub's spirit, just for real
 * reasons now.
 *
 * routes.jsx also renders its OWN two hidden file inputs (cameraInputRef/
 * galleryInputRef, for the separate screen-index-driven Camera screen at
 * /capture, see demo-walk.test.jsx) unconditionally, outside <Routes>. Both
 * carry accept="image/*", and the environment-facing one also carries
 * capture="environment" - the same attributes EntryScreen's own Camera-tab
 * input carries. Every query below is scoped to THIS screen's own "Camera"
 * section (aria-label) so it can never accidentally hit routes.jsx's inputs.
 */
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './msw/server.js';
import { BASE_URL } from '../../src/lib/api.js';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

function pickSection() {
  return screen.getByRole('heading', { name: 'Which of these?' }).closest('section');
}

function cameraFileInput() {
  return screen.getByRole('button', { name: /Take a photo of the menu|Reading the menu/ })
    .closest('section')
    .querySelector('input[type="file"]');
}

async function goToCameraTab(user) {
  await user.click(screen.getByRole('button', { name: /Aquitaine \(demo\)/ }));
  await user.click(screen.getByRole('button', { name: 'Camera' }));
}

describe('EntryScreen (/entry): CAMERA, end to end', () => {
  it('a photo that extracts real text runs through parseMenu -> pick -> pair, same as Paste', async () => {
    server.use(
      http.post(`${BASE_URL}/v1/capture`, async () => {
        return HttpResponse.json({
          capture_id: 'cap_camera_ok',
          source: 'extractor',
          raw_text: 'MAINS\n\nSole meuniere 38\nsole, snap pea, potato, lemon',
        });
      })
    );

    const user = userEvent.setup();
    renderPairMeApp('/entry');
    await goToCameraTab(user);

    const photo = new File(['fake menu photo bytes'], 'menu.jpg', { type: 'image/jpeg' });
    await user.upload(cameraFileInput(), photo);

    // parseMenu ran on the extracted text and the pick step appeared, with
    // no need to touch Paste at all.
    await screen.findByRole('heading', { name: 'Which of these?' });
    const pick = within(pickSection());
    expect(pick.getByText('Sole meuniere')).toBeInTheDocument();
    expect(screen.getByText('Got it. Pick what you are having below.')).toBeInTheDocument();

    // PICK + PAIR complete the same as the Paste walk does.
    await user.click(pick.getByText('Sole meuniere').closest('button'));
    await user.click(screen.getByRole('button', { name: 'Pair it' }));
    expect(await screen.findByRole('heading', { name: 'Your wine' })).toBeInTheDocument();
  });

  it('a typed BE extraction error falls back to Paste with the BE plain-language message verbatim, never the error_code', async () => {
    server.use(
      http.post(`${BASE_URL}/v1/capture`, async () => {
        return HttpResponse.json(
          {
            error_code: 'EXTRACTION_TRUNCATED',
            message: 'This menu is longer than we can read in one pass. Try splitting it into smaller files, or uploading one section at a time.',
          },
          { status: 422 }
        );
      })
    );

    const user = userEvent.setup();
    renderPairMeApp('/entry');
    await goToCameraTab(user);

    const photo = new File(['fake menu photo bytes'], 'menu.jpg', { type: 'image/jpeg' });
    await user.upload(cameraFileInput(), photo);

    await screen.findByLabelText('Paste the menu'); // fell back to Paste
    expect(
      screen.getByText('This menu is longer than we can read in one pass. Try splitting it into smaller files, or uploading one section at a time.')
    ).toBeInTheDocument();
    expect(screen.queryByText('EXTRACTION_TRUNCATED')).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it('a capture with no readable text (the default mock) falls back to Paste with a plain client-side message, no technical string', async () => {
    // Uses the suite-wide default /v1/capture handler (handlers.js), which
    // returns raw_text: "" - the same "nothing extracted" shape a real
    // blank/unreadable photo would produce.
    const user = userEvent.setup();
    renderPairMeApp('/entry');
    await goToCameraTab(user);

    const photo = new File(['fake menu photo bytes'], 'menu.jpg', { type: 'image/jpeg' });
    await user.upload(cameraFileInput(), photo);

    await screen.findByLabelText('Paste the menu');
    expect(
      screen.getByText('We could not find any text in that photo. Try a clearer photo, or paste the menu below.')
    ).toBeInTheDocument();
  });
});
