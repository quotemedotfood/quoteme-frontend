import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';
import { getGuestSession } from '../services/api';
import { isDemoMode } from '../utils/demoMode';

interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  distributorName: string;
  distributorLogo: string | null;
  plan: 'free' | 'premium';
  quotesUsed: number;
  quotesLimit: number;
  hasPaidSubscription: boolean;
  isGuest: boolean;
}

interface UserContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  incrementQuoteCount: () => void;
  hasQuotesRemaining: () => boolean;
  quotesRemaining: number;
  initGuestSession: () => Promise<void>;
  getGuestToken: () => string | null;
  syncWithAuthUser: (user: any) => void;
}

const defaultProfile: UserProfile = {
  fullName: 'Guest User',
  email: '',
  phoneNumber: '',
  distributorName: 'Guest Distributor',
  distributorLogo: null,
  plan: 'free',
  quotesUsed: 0,
  quotesLimit: 5,
  hasPaidSubscription: false,
  isGuest: true,
};

// Create a default context value
const defaultContextValue: UserContextType = {
  profile: defaultProfile,
  updateProfile: () => {},
  incrementQuoteCount: () => {},
  hasQuotesRemaining: () => true,
  quotesRemaining: 5,
  initGuestSession: async () => {},
  getGuestToken: () => null,
  syncWithAuthUser: () => {},
};

const UserContext = createContext<UserContextType>(defaultContextValue);

/**
 * SECURITY: Sentry's user id for an anonymous guest used to be the first 12
 * characters of the guest token, which put credential material into telemetry.
 * The guest token is the actual bearer for X-Guest-Token, so no substring of
 * it may leave the browser as a label. This returns a random, throwaway id
 * that is stable for the browser (so Sentry can still group a guest's events)
 * but has no relationship to any credential.
 */
const GUEST_TRACE_ID_KEY = 'quoteme_guest_trace_id';

function guestTraceId(): string {
  try {
    const existing = localStorage.getItem(GUEST_TRACE_ID_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `guest-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(GUEST_TRACE_ID_KEY, fresh);
    return fresh;
  } catch {
    // Storage unavailable (private mode, quota). An unlabelled guest is fine.
    return 'guest';
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => {
    // Try to load from localStorage to persist across refreshes
    try {
      const saved = localStorage.getItem('user_profile');
      if (saved) {
        const parsedProfile = JSON.parse(saved);
        // Merge with defaults to ensure all new fields exist
        return {
          ...defaultProfile,
          ...parsedProfile,
          // Ensure new fields have defaults if not present
          quotesUsed: parsedProfile.quotesUsed ?? 0,
          quotesLimit: parsedProfile.quotesLimit ?? 5,
          hasPaidSubscription: parsedProfile.hasPaidSubscription ?? false
        };
      }
    } catch (e) {
      console.error('Failed to parse saved profile, using defaults', e);
      // Clear corrupted data
      localStorage.removeItem('user_profile');
    }
    return defaultProfile;
  });

  useEffect(() => {
    localStorage.setItem('user_profile', JSON.stringify(profile));
  }, [profile]);

  // On logout (fired by AuthContext), drop the in-memory profile back to the
  // guest defaults. AuthContext already removed the user_profile key; resetting
  // here stops the persist effect above from writing the signed-out rep's name,
  // email and phone back to storage — the profile that lands is defaults only,
  // never personal data. Matters because logout is a soft navigation, so this
  // provider is never unmounted to clear its state on its own.
  useEffect(() => {
    const onLogout = () => setProfile(defaultProfile);
    window.addEventListener('quoteme:logout', onLogout);
    return () => window.removeEventListener('quoteme:logout', onLogout);
  }, []);

  const initGuestSessionInternal = useCallback(async () => {
    // B-182: never initialize a guest session for an authenticated user. A real
    // bearer token (rep/admin/chef) must not be shadowed by a guest session —
    // doing so bled the rep's identity into "Guest User"/"Guest Distributor".
    if (localStorage.getItem('quoteme_token')) return;
    const existingToken = localStorage.getItem('quoteme_guest_token');
    if (existingToken) {
      const response = await getGuestSession(existingToken);
      if (response.data) {
        setProfile(prev => ({
          ...prev,
          quotesUsed: response.data!.quote_count || 0,
          quotesLimit: 5,
          isGuest: true,
        }));
        // Tag Sentry with an anonymous, non-credential guest id.
        Sentry.setUser({ id: guestTraceId(), role: 'guest_chef' });
      }
      return;
    }
    const { createGuestSession } = await import('../services/api');
    const response = await createGuestSession();
    if (response.data?.token) {
      localStorage.setItem('quoteme_guest_token', response.data.token);
      setProfile(prev => ({
        ...prev,
        quotesUsed: 0,
        quotesLimit: 5,
        isGuest: true,
      }));
      // Tag Sentry with an anonymous, non-credential guest id.
      Sentry.setUser({ id: guestTraceId(), role: 'guest_chef' });
    }
  }, []);

  // Auto-init guest session in demo mode
  const demoInitRef = useRef(false);
  useEffect(() => {
    if (isDemoMode() && !demoInitRef.current) {
      demoInitRef.current = true;
      initGuestSessionInternal();
    }
  }, [initGuestSessionInternal]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      // Bail out if nothing actually changed to prevent unnecessary re-renders
      const hasChange = Object.entries(updates).some(
        ([key, value]) => prev[key as keyof UserProfile] !== value
      );
      if (!hasChange) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  const incrementQuoteCount = useCallback(() => {
    setProfile(prev => ({
      ...prev,
      quotesUsed: prev.quotesUsed + 1
    }));
  }, []);

  const hasQuotesRemaining = useCallback(() => {
    return profile.hasPaidSubscription || profile.quotesUsed < profile.quotesLimit;
  }, [profile.hasPaidSubscription, profile.quotesUsed, profile.quotesLimit]);

  const quotesRemaining = profile.hasPaidSubscription
    ? Infinity
    : Math.max(0, profile.quotesLimit - profile.quotesUsed);

  const initGuestSession = useCallback(async () => {
    await initGuestSessionInternal();
  }, [initGuestSessionInternal]);

  const getGuestToken = useCallback(() => {
    return localStorage.getItem('quoteme_guest_token');
  }, []);

  const syncWithAuthUser = useCallback((user: any) => {
    if (user) {
      updateProfile({
        fullName: user.fullName || defaultProfile.fullName,
        email: user.email || defaultProfile.email,
        phoneNumber: user.phoneNumber || defaultProfile.phoneNumber,
        distributorName: user.distributorName || defaultProfile.distributorName,
        distributorLogo: user.distributorLogo || defaultProfile.distributorLogo,
        plan: user.plan || defaultProfile.plan,
        quotesUsed: user.quotesUsed || defaultProfile.quotesUsed,
        quotesLimit: user.quotesLimit || defaultProfile.quotesLimit,
        hasPaidSubscription: user.hasPaidSubscription || defaultProfile.hasPaidSubscription,
        isGuest: false,
      });
    } else {
      updateProfile(defaultProfile);
    }
  }, [updateProfile]);

  const value = useMemo<UserContextType>(() => ({
    profile,
    updateProfile,
    incrementQuoteCount,
    hasQuotesRemaining,
    quotesRemaining,
    initGuestSession,
    getGuestToken,
    syncWithAuthUser,
  }), [
    profile,
    updateProfile,
    incrementQuoteCount,
    hasQuotesRemaining,
    quotesRemaining,
    initGuestSession,
    getGuestToken,
    syncWithAuthUser,
  ]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  return context;
}