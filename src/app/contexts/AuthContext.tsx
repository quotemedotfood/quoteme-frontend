import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { User, signIn, signUp, getCurrentUser, convertGuestToUser, SignUpData, LoginData, getGuestToken } from '../services/api';
import { isDemoMode } from '../utils/demoMode';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginData) => Promise<{ success: boolean; error?: string; error_code?: string }>;
  signup: (data: SignUpData, guestToken?: string) => Promise<{ success: boolean; error?: string; error_code?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check for existing token on mount (skip in demo mode)
  useEffect(() => {
    if (isDemoMode()) {
      setIsLoading(false);
      return;
    }
    const token = localStorage.getItem('quoteme_token');
    if (token) {
      validateToken('mount');
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = useCallback(async (context: string = 'unknown') => {
    const storedToken = localStorage.getItem('quoteme_token');
    console.log(`[validateToken:${context}] Token in localStorage:`, storedToken ? `${storedToken.substring(0, 20)}...` : 'MISSING');

    const response = await getCurrentUser();
    console.log(`[validateToken:${context}] /me response:`, {
      hasData: !!response.data,
      error: response.error,
      userId: response.data?.id,
    });

    if (response.data) {
      setUser(response.data);
      // Tag Sentry events with authenticated user identity.
      Sentry.setUser({
        id: response.data.id,
        email: response.data.email,
        role: response.data.role,
      });
    } else {
      console.warn(`[validateToken:${context}] /me failed, clearing token. Error: ${response.error}`);
      localStorage.removeItem('quoteme_token');
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (credentials: LoginData): Promise<{ success: boolean; error?: string; error_code?: string }> => {
    // Include guest token if available so backend can link guest quotes
    const guestToken = getGuestToken();
    const loginData = guestToken ? { ...credentials, guest_token: guestToken } : credentials;
    const response = await signIn(loginData);
    console.log('[login] signIn response:', { error: response.error, hasToken: !!response.token, hasData: !!response.data });

    if (response.error) {
      return { success: false, error: response.error, error_code: response.error_code };
    }

    if (response.token) {
      localStorage.setItem('quoteme_token', response.token);
      if (guestToken) localStorage.removeItem('quoteme_guest_token');
      console.log('[login] Token stored:', response.token.substring(0, 30) + '...');
      await validateToken('login');
      return { success: true };
    }

    console.warn('[login] No token in response, login will fail');
    return { success: false, error: 'No token received. Check browser console for details.' };
  }, [validateToken]);

  const signup = useCallback(async (
    data: SignUpData,
    guestToken?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string }> => {
    // If guest token exists, convert guest to user
    if (guestToken) {
      const response = await convertGuestToUser({
        guest_token: guestToken,
        user: data,
      });

      if (response.error) {
        return { success: false, error: response.error, error_code: response.error_code };
      }

      if (response.token) {
        localStorage.setItem('quoteme_token', response.token);
        localStorage.removeItem('quoteme_guest_token'); // Clear guest token
        await validateToken('guest-convert');
        return { success: true };
      }

      return { success: false, error: 'No token received' };
    }

    // Regular signup without guest conversion
    const response = await signUp(data);

    if (response.error) {
      return { success: false, error: response.error, error_code: response.error_code };
    }

    if (response.token) {
      localStorage.setItem('quoteme_token', response.token);
      await validateToken('signup');
      return { success: true };
    }

    return { success: false, error: 'No token received' };
  }, [validateToken]);

  const logout = useCallback(() => {
    localStorage.removeItem('quoteme_token');
    // Reps hand phones to chefs across the counter. After the token clears, the
    // user_profile key still held the rep's name, email and phone. Drop it here,
    // and fire quoteme:logout so UserContext also clears its in-memory copy —
    // logout is a soft navigation (no reload), so the provider stays mounted and
    // would otherwise re-persist the old profile into a following guest session.
    localStorage.removeItem('user_profile');
    window.dispatchEvent(new Event('quoteme:logout'));
    setUser(null);
    // Clear Sentry user context on logout.
    Sentry.setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await validateToken('refresh');
  }, [validateToken]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    refreshUser,
  }), [user, isAuthenticated, isLoading, login, signup, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Like useAuth, but tolerant of a missing provider (returns null instead of
 * throwing). Used by quote-flow pages that read the viewer role for
 * read-only gating (P0 route/shell guard) while remaining renderable in unit
 * tests that mount them without the full provider stack.
 */
export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext) ?? null;
}