import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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

  // Auto-init guest session in demo mode
  const demoInitRef = useRef(false);
  useEffect(() => {
    if (isDemoMode() && !demoInitRef.current) {
      demoInitRef.current = true;
      initGuestSessionInternal();
    }
  }, []);

  async function initGuestSessionInternal() {
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
    }
  }

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

  const incrementQuoteCount = () => {
    setProfile(prev => ({
      ...prev,
      quotesUsed: prev.quotesUsed + 1
    }));
  };

  const hasQuotesRemaining = () => {
    return profile.hasPaidSubscription || profile.quotesUsed < profile.quotesLimit;
  };

  const quotesRemaining = profile.hasPaidSubscription 
    ? Infinity 
    : Math.max(0, profile.quotesLimit - profile.quotesUsed);

  const initGuestSession = async () => {
    await initGuestSessionInternal();
  };

  const getGuestToken = () => {
    return localStorage.getItem('quoteme_guest_token');
  };

  const syncWithAuthUser = (user: any) => {
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
  };

  return (
    <UserContext.Provider value={{ 
      profile, 
      updateProfile, 
      incrementQuoteCount,
      hasQuotesRemaining,
      quotesRemaining,
      initGuestSession,
      getGuestToken,
      syncWithAuthUser,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  return context;
}