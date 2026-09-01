// SettingsPage.honestWrites.test.tsx
//
// Three controls on this page reported success and persisted nothing. Each is
// now either a status line or a read-only field, and these tests pin the
// observable result of that for a specific role and a specific record.
//
//   Draft Limit  — was a toggle PATCHing unlimited_drafts on /users/me. The
//                  backend strips that param from every self-service caller
//                  regardless of role and still returns 200, so the toggle
//                  reported success and snapped back. Moose ruling 2026-09-01:
//                  the flag stays admin-only. It is now a status line, and it
//                  states the rule the backend actually enforces — including
//                  for quoteme_admin/distributor_admin, who are exempt at every
//                  enforcement point and were previously told they were
//                  "Limited to 2 draft quotes at a time".
//
//   Company Name — a rep's edit reached local React context only and was gone on
//                  reload. The only write path is PATCH distributor_admin/settings,
//                  gated to distributor_admin. Read-only for everyone else.
//
//   Company Logo — the rep control wrote a base64 data URL into
//                  rep_settings.company_logo_url: no backend reader, no renderer,
//                  and unrenderable in a document regardless (the PDF logo
//                  resolver requires URI::HTTP; a "data:" URL is not one). The
//                  writer is deleted; reps read distributors.logo_url.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';
import { AuthSyncProvider } from '../components/AuthSyncProvider';

const { getCurrentUser, updateCurrentUser } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  updateCurrentUser: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    getCurrentUser,
    updateCurrentUser,
    getBilling: vi.fn().mockResolvedValue({ data: null }),
    getDistributorAdminSettings: vi.fn().mockResolvedValue({ data: null }),
    getDistributorAdminBilling: vi.fn().mockResolvedValue({ data: null }),
    getLocations: vi.fn().mockResolvedValue({ data: [] }),
  };
});

import { SettingsPage } from './SettingsPage';

const DISTRIBUTOR_LOGO = 'https://cdn.example.com/fish-guys-logo.png';
const STALE_REP_DATA_URL = 'data:image/png;base64,STALEREPLOGO';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u-1',
    email: 'dana@fishguys.com',
    first_name: 'Dana',
    last_name: 'Ortiz',
    role: 'rep',
    status: 'active',
    unlimited_drafts: false,
    distributor: { id: 'd-1', name: 'Fish Guys', logo_url: DISTRIBUTOR_LOGO },
    rep_settings: {},
    ...overrides,
  } as any;
}

function mockMatchMedia(matches: boolean) {
  const mql = {
    matches,
    media: '(min-width: 768px)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
  window.matchMedia = vi.fn().mockReturnValue(mql);
}

function renderSettings() {
  mockMatchMedia(false);
  // Same nesting as production: RootLayout mounts AuthSyncProvider inside the
  // auth/user providers, and it is what clears profile.isGuest. Without it the
  // page renders its guest variant and neither the Quote Preferences section nor
  // the Account Info "Edit" button exists.
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

// Distributor Settings is the second editable section on the page, after
// Account Info. Assert the count first so a structural change fails loudly here
// rather than silently clicking the wrong section.
async function openDistributorEditor() {
  const editButtons = await screen.findAllByRole('button', { name: /^Edit$/ });
  expect(editButtons).toHaveLength(2);
  editButtons[1].click();
}

describe('SettingsPage — controls that used to report success and persist nothing', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('quoteme_token', 'test-token');
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ── Draft Limit ──────────────────────────────────────────────────────────
  describe('Draft Limit is a status, not a control', () => {
    it('rep without the flag: states the 2-draft rule and offers no toggle', async () => {
      getCurrentUser.mockResolvedValue({ data: makeUser() });
      renderSettings();

      await waitFor(() => expect(screen.getByText('Draft Limit')).toBeTruthy());
      expect(screen.getByText('Limited to 2 draft quotes at a time.')).toBeTruthy();
      expect(screen.getByText('2 drafts')).toBeTruthy();
      expect(screen.getByText('Set by QuoteMe on your account.')).toBeTruthy();
    });

    it('distributor_admin: is told they are exempt, never "limited to 2"', async () => {
      getCurrentUser.mockResolvedValue({
        data: makeUser({ role: 'distributor_admin', email: 'cj@fishguys.com' }),
      });
      renderSettings();

      await waitFor(() => expect(screen.getByText('Draft Limit')).toBeTruthy());
      expect(screen.getByText('Your role is exempt from the draft limit.')).toBeTruthy();
      expect(screen.getByText('Exempt')).toBeTruthy();
      expect(screen.getByText('Determined by your role.')).toBeTruthy();
      // The old copy is the defect: it asserted a limit that has never applied
      // to this role at any enforcement point.
      expect(screen.queryByText('Limited to 2 draft quotes at a time.')).toBeNull();
    });

    it('user granted the flag by a quoteme_admin: states unlimited', async () => {
      getCurrentUser.mockResolvedValue({ data: makeUser({ unlimited_drafts: true }) });
      renderSettings();

      await waitFor(() => expect(screen.getByText('Draft Limit')).toBeTruthy());
      expect(screen.getByText('You can have unlimited draft quotes at once.')).toBeTruthy();
      expect(screen.getByText('Unlimited drafts')).toBeTruthy();
    });

    it('the Quote Preferences section has no interactive control left to lie', async () => {
      getCurrentUser.mockResolvedValue({ data: makeUser() });
      renderSettings();

      await waitFor(() => expect(screen.getByText('Draft Limit')).toBeTruthy());
      // Scope to the Quote Preferences card and assert it contains no control at
      // all. Pre-fix this card held exactly one <button>: the toggle whose PATCH
      // the backend strips. A status line has nothing to click.
      const card = screen.getByText('Quote Preferences').closest('div.bg-white');
      expect(card).not.toBeNull();
      expect(card!.querySelectorAll('button, input, select, textarea')).toHaveLength(0);

      const patched = updateCurrentUser.mock.calls.some(
        ([arg]) => arg && Object.prototype.hasOwnProperty.call(arg, 'unlimited_drafts')
      );
      expect(patched).toBe(false);
    });
  });

  // ── Company Name ─────────────────────────────────────────────────────────
  describe('Company Name', () => {
    it('rep: stays read-only inside the distributor editor and names its owner', async () => {
      getCurrentUser.mockResolvedValue({ data: makeUser() });
      renderSettings();

      await waitFor(() => expect(screen.getByDisplayValue('Fish Guys')).toBeTruthy());
      await openDistributorEditor();

      await waitFor(() =>
        expect(screen.getByDisplayValue('Fish Guys').hasAttribute('readonly')).toBe(true)
      );
      expect(screen.getAllByText('Set by your distributor admin.').length).toBeGreaterThan(0);
    });

    it('distributor_admin: is editable inside the distributor editor', async () => {
      getCurrentUser.mockResolvedValue({
        data: makeUser({ role: 'distributor_admin', email: 'cj@fishguys.com' }),
      });
      renderSettings();

      await waitFor(() => expect(screen.getByDisplayValue('Fish Guys')).toBeTruthy());
      await openDistributorEditor();

      await waitFor(() =>
        expect(screen.getByDisplayValue('Fish Guys').hasAttribute('readonly')).toBe(false)
      );
      expect(screen.queryByText('Set by your distributor admin.')).toBeNull();
    });
  });

  // ── Company Logo ─────────────────────────────────────────────────────────
  describe('Company Logo', () => {
    it('rep: renders distributors.logo_url and ignores a stale rep_settings data URL', async () => {
      // NOTE: this assertion also held pre-fix, but only by accident — two
      // effects both set companyLogo and the profile-sync one happened to land
      // last. The fix makes distributors.logo_url the single source rather than
      // the winner of a race, so the assertion is kept as the invariant and the
      // deterministic proof lives in the save-payload test below.
      getCurrentUser.mockResolvedValue({
        data: makeUser({ rep_settings: { company_logo_url: STALE_REP_DATA_URL } }),
      });
      renderSettings();

      const img = await screen.findByAltText('Company Logo');
      expect(img.getAttribute('src')).toBe(DISTRIBUTOR_LOGO);
      expect(img.getAttribute('src')).not.toContain('data:');
    });

    it('rep: saving distributor settings no longer writes a logo into rep_settings', async () => {
      const repUser = makeUser({ rep_settings: { company_logo_url: STALE_REP_DATA_URL } });
      getCurrentUser.mockResolvedValue({ data: repUser });
      updateCurrentUser.mockResolvedValue({ data: repUser });
      renderSettings();

      await waitFor(() => expect(screen.getByDisplayValue('Fish Guys')).toBeTruthy());
      await openDistributorEditor();
      const save = await screen.findByRole('button', { name: /Save Settings/ });
      save.click();

      await waitFor(() => expect(updateCurrentUser).toHaveBeenCalled());
      const payloads = updateCurrentUser.mock.calls
        .map(([arg]) => arg)
        .filter((arg) => arg && arg.rep_settings);
      expect(payloads.length).toBeGreaterThan(0);
      for (const payload of payloads) {
        // Pre-fix this key was present on every save, carrying a base64 data URL
        // into a column no backend reader ever reads.
        expect(Object.prototype.hasOwnProperty.call(payload.rep_settings, 'company_logo_url')).toBe(false);
      }
    });

    it('rep: has no upload control at all, in or out of the distributor editor', async () => {
      getCurrentUser.mockResolvedValue({ data: makeUser() });
      const { container } = renderSettings();

      await waitFor(() => expect(screen.getByDisplayValue('Fish Guys')).toBeTruthy());
      expect(screen.queryByText('Upload Logo')).toBeNull();
      expect(screen.queryByText('Replace Logo')).toBeNull();

      await openDistributorEditor();
      await waitFor(() =>
        expect(screen.getByDisplayValue('Fish Guys').hasAttribute('readonly')).toBe(true)
      );
      expect(screen.queryByText('Upload Logo')).toBeNull();
      expect(screen.queryByText('Replace Logo')).toBeNull();
      // The deleted writer's only entry point was a file input in this section.
      // Scoped to the distributor card, and matched on the input rather than on
      // its accept value: the accept attribute is now "image/*" (one group, so
      // the file dialog stops offering "PJP File"), and an [accept*="webp"]
      // selector would match nothing whether or not the control existed.
      const distributorCard = screen.getByText('Your Company Info').closest('div.bg-white');
      expect(distributorCard).not.toBeNull();
      expect(distributorCard!.querySelectorAll('input[type="file"]')).toHaveLength(0);
      // The avatar's file input is elsewhere on the page and is not this control.
      expect(container.querySelectorAll('input[type="file"]').length).toBeGreaterThan(0);
    });

    it('distributor_admin: keeps the upload control inside the distributor editor', async () => {
      getCurrentUser.mockResolvedValue({
        data: makeUser({ role: 'distributor_admin', email: 'cj@fishguys.com' }),
      });
      renderSettings();

      await waitFor(() => expect(screen.getByDisplayValue('Fish Guys')).toBeTruthy());
      expect(screen.queryByText('Upload Logo')).toBeNull();

      await openDistributorEditor();
      await waitFor(() => expect(screen.getByText('Upload Logo')).toBeTruthy());
    });
  });
});
