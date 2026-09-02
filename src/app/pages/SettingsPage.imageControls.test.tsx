// SettingsPage.imageControls.test.tsx
//
// Moose's walk of distributor Settings, plus the sibling sweep it prompted.
//
// The reported defect -- "Replace Logo opens a picker and there is no way to
// save" -- was the rep logo control, which #423 already deleted. The same
// defect was still live on this page on a different control: THE PROFILE
// PHOTO. The avatar was clickable at all times, but the only thing that
// persists it is handleSaveProfile, and Save renders only while the account
// section is in edit mode. Click it on a settled page and you got a file
// dialog, a new image on screen, and nothing to save it with.
//
// Moose's rule, applied to both: the change lives inside Edit so a Save button
// exists, and a click outside Edit opens Edit rather than doing nothing.
//
// The sweep also found the inverse on the distributor logo: it POSTs on
// selection, so it is already saved, but Cancel restored the pre-upload URL to
// the screen because user.distributor.logo_url had not been refreshed. The page
// denied a save it had made.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';
import { AuthSyncProvider } from '../components/AuthSyncProvider';

const { getCurrentUser, uploadDistributorAdminLogo } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  uploadDistributorAdminLogo: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    getCurrentUser,
    uploadDistributorAdminLogo,
    updateCurrentUser: vi.fn().mockResolvedValue({ data: null }),
    getBilling: vi.fn().mockResolvedValue({ data: null }),
    getDistributorAdminSettings: vi.fn().mockResolvedValue({ data: null }),
    getDistributorAdminBilling: vi.fn().mockResolvedValue({ data: null }),
    getLocations: vi.fn().mockResolvedValue({ data: [] }),
  };
});

import { SettingsPage } from './SettingsPage';

const OLD_LOGO = 'https://cdn.example.com/old-logo.png';
const NEW_LOGO = 'https://cdn.example.com/new-logo.png';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u-1',
    email: 'dana@fishguys.com',
    first_name: 'Dana',
    last_name: 'Ortiz',
    role: 'rep',
    status: 'active',
    unlimited_drafts: false,
    distributor: { id: 'd-1', name: 'Fish Guys', logo_url: OLD_LOGO },
    rep_settings: {},
    ...overrides,
  } as any;
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches, media: '', onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList);
}

function renderSettings() {
  mockMatchMedia(false);
  return render(
    <MemoryRouter>
      <AuthProvider>
        <UserProvider>
          <AuthSyncProvider>
            <SettingsPage />
          </AuthSyncProvider>
        </UserProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

// The entry query in each case waits on getCurrentUser -> AuthContext ->
// AuthSyncProvider -> profile.isGuest -> accountFieldsReadOnly -> the control's
// accessible name. findBy's 1s default cleared that chain standalone but not
// always inside a loaded full-suite run, which showed up as a load-dependent
// failure rather than a real one. Widen the wait; the assertions are untouched.
const LOAD = { timeout: 5000 };

function file(name: string, type: string, bytes = 10) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('SettingsPage image controls: no picker without a save path', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('quoteme_token', 'test-token');
    uploadDistributorAdminLogo.mockReset();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ── Profile photo ───────────────────────────────────────────────────────
  it('avatar outside edit mode opens Edit instead of a file dialog', async () => {
    getCurrentUser.mockResolvedValue({ data: makeUser() });
    renderSettings();

    const avatar = await screen.findByRole('button', {
      name: 'Edit account info to change your profile photo',
    }, LOAD);

    // The hidden input must not be clicked: there would be no Save to persist it.
    const input = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    const clickSpy = vi.spyOn(input, 'click');

    fireEvent.click(avatar);

    expect(clickSpy).not.toHaveBeenCalled();
    // Edit opened, so a Save path now exists.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy());
    // And the control now advertises what it does.
    expect(screen.getByRole('button', { name: 'Change your profile photo' })).toBeTruthy();
  });

  it('avatar inside edit mode does open the file dialog', async () => {
    getCurrentUser.mockResolvedValue({ data: makeUser() });
    renderSettings();

    fireEvent.click(await screen.findByRole('button', {
      name: 'Edit account info to change your profile photo',
    }, LOAD));

    const avatar = await screen.findByRole('button', { name: 'Change your profile photo' });
    const input = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    fireEvent.click(avatar);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('avatar rejects an image type the copy never promised', async () => {
    getCurrentUser.mockResolvedValue({ data: makeUser() });
    renderSettings();

    fireEvent.click(await screen.findByRole('button', {
      name: 'Edit account info to change your profile photo',
    }, LOAD));
    await screen.findByRole('button', { name: 'Change your profile photo' });

    // accept="image/*" is wider than what the app takes, so a GIF now reaches
    // the input. The JS guard is what enforces the promise.
    const input = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file('x.gif', 'image/gif')] } });

    expect(await screen.findByText('Only JPEG, PNG, or WebP images are accepted.')).toBeTruthy();
  });

  // ── Distributor logo ────────────────────────────────────────────────────
  it('logo image outside edit mode opens Edit (admin), rather than doing nothing', async () => {
    getCurrentUser.mockResolvedValue({ data: makeUser({ role: 'distributor_admin' }) });
    renderSettings();

    const preview = await screen.findByRole('button', {
      name: 'Edit distributor settings to change the company logo',
    }, LOAD);
    fireEvent.click(preview);

    await waitFor(() => expect(screen.getByText('Upload Logo')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Change the company logo' })).toBeTruthy();
  });

  it('logo image is inert for a rep, who has no way to change it', async () => {
    getCurrentUser.mockResolvedValue({ data: makeUser() });
    renderSettings();

    await waitFor(() => expect(screen.getByDisplayValue('Fish Guys')).toBeTruthy(), LOAD);
    expect(screen.queryByRole('button', { name: /company logo/i })).toBeNull();
    expect(screen.getAllByText('Set by your distributor admin.').length).toBeGreaterThan(0);
  });

  it('after an upload the page says it saved, and Cancel does not put the old logo back', async () => {
    getCurrentUser
      .mockResolvedValueOnce({ data: makeUser({ role: 'distributor_admin' }) })
      // refreshUser() after the upload: the distributor now carries the new URL.
      .mockResolvedValue({
        data: makeUser({ role: 'distributor_admin', distributor: { id: 'd-1', name: 'Fish Guys', logo_url: NEW_LOGO } }),
      });
    uploadDistributorAdminLogo.mockResolvedValue({ data: { logo_url: NEW_LOGO } });
    renderSettings();

    fireEvent.click(await screen.findByRole('button', {
      name: 'Edit distributor settings to change the company logo',
    }, LOAD));
    await screen.findByText('Upload Logo');

    const logoInput = document.querySelector('#logo-input, input[type="file"][accept="image/*"]') as HTMLInputElement;
    const inputs = Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    // The distributor card's input is the second file input on the page.
    fireEvent.change(inputs[inputs.length - 1] ?? logoInput, {
      target: { files: [file('logo.png', 'image/png')] },
    });

    await waitFor(() => expect(uploadDistributorAdminLogo).toHaveBeenCalled());
    // It persisted on selection, and the page says so rather than implying Save
    // or Cancel still governs it.
    expect(
      await screen.findByText('Logo saved. This one applies immediately -- Cancel will not undo it.')
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Cancel used to restore the PRE-upload URL from a stale user object, so the
    // screen showed the old logo while the server held the new one.
    await waitFor(() =>
      expect((screen.getByAltText('Company Logo') as HTMLImageElement).getAttribute('src')).toBe(NEW_LOGO)
    );
  });

  // ── The accept attribute itself ─────────────────────────────────────────
  it('every image input declares exactly one accept group', async () => {
    getCurrentUser.mockResolvedValue({ data: makeUser({ role: 'distributor_admin' }) });
    const { container } = renderSettings();

    fireEvent.click(await screen.findByRole('button', {
      name: 'Edit distributor settings to change the company logo',
    }, LOAD));
    await screen.findByText('Upload Logo');

    const inputs = Array.from(container.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) {
      const accept = input.getAttribute('accept') || '';
      // A comma is a second group, and a second group is what made Chrome label
      // the first one "PJP File".
      expect(accept).not.toContain(',');
      expect(accept).toBe('image/*');
    }
  });
});
