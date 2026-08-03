// logoutProfileWipe.test.tsx
//
// Justin, item 3 (2026-07-29 board): reps hand their phone to a chef across the
// counter. After sign out the token cleared but user_profile still held the
// rep's name, email and phone. A bare removeItem is not enough — logout is a
// soft navigation (no reload), so UserProvider stays mounted with the profile
// in memory and would re-persist it (a following guest session spreads `prev`).
//
// These tests drive the real AuthProvider + UserProvider together and prove
// both halves: the stored key is stripped of personal data AND the in-memory
// profile is reset to guest defaults so nothing can leak back.
//
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { UserProvider, useUser } from './UserContext';

let capturedLogout: () => void;
let capturedProfile: () => { fullName: string; email: string; phoneNumber: string };

function Harness() {
  const { logout } = useAuth();
  const { profile } = useUser();
  capturedLogout = logout;
  capturedProfile = () => ({
    fullName: profile.fullName,
    email: profile.email,
    phoneNumber: profile.phoneNumber,
  });
  return null;
}

function renderApp() {
  return render(
    <AuthProvider>
      <UserProvider>
        <Harness />
      </UserProvider>
    </AuthProvider>
  );
}

describe('logout wipes personal profile data', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('removes name, email and phone from stored user_profile on logout', () => {
    localStorage.setItem(
      'user_profile',
      JSON.stringify({
        fullName: 'Carla Jimenez',
        email: 'carla@bigfish.com',
        phoneNumber: '555-0142',
        isGuest: false,
      })
    );

    renderApp();
    act(() => capturedLogout());

    const raw = localStorage.getItem('user_profile');
    // The key may be absent or reset to defaults, but it must never hold the PII.
    const stored = raw ? JSON.parse(raw) : {};
    expect(stored.fullName ?? '').not.toBe('Carla Jimenez');
    expect(stored.email ?? '').toBe('');
    expect(stored.phoneNumber ?? '').toBe('');
  });

  it('resets the in-memory profile so a later session cannot re-leak it', () => {
    localStorage.setItem(
      'user_profile',
      JSON.stringify({
        fullName: 'Carla Jimenez',
        email: 'carla@bigfish.com',
        phoneNumber: '555-0142',
        isGuest: false,
      })
    );

    renderApp();
    // Precondition: the rep's data is loaded into memory.
    expect(capturedProfile().email).toBe('carla@bigfish.com');

    act(() => capturedLogout());

    const after = capturedProfile();
    expect(after.email).toBe('');
    expect(after.phoneNumber).toBe('');
    expect(after.fullName).not.toBe('Carla Jimenez');
  });
});
