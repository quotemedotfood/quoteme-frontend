import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, signIn, signUp, getCurrentUser, convertGuestToUser, SignUpData, LoginData } from '../services/api';
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

  async function validateToken(context: string = 'unknown') {
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
    } else {
      console.warn(`[validateToken:${context}] /me failed — clearing token. Error: ${response.error}`);
      localStorage.removeItem('quoteme_token');
    }
    setIsLoading(false);
  }

  async function login(credentials: LoginData): Promise<{ success: boolean; error?: string; error_code?: string }> {
    const response = await signIn(credentials);
    console.log('[login] signIn response:', { error: response.error, hasToken: !!response.token, hasData: !!response.data });

    if (response.error) {
      return { success: false, error: response.error, error_code: response.error_code };
    }

    if (response.token) {
      localStorage.setItem('quoteme_token', response.token);
      console.log('[login] Token stored:', response.token.substring(0, 30) + '...');
      await validateToken('login');
      return { success: true };
    }

    console.warn('[login] No token in response — login will fail');
    return { success: false, error: 'No token received. Check browser console for details.' };
  }

  async function signup(
    data: SignUpData,
    guestToken?: string
  ): Promise<{ success: boolean; error?: string; error_code?: string }> {
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
  }

  function logout() {
    localStorage.removeItem('quoteme_token');
    setUser(null);
  }

  async function refreshUser() {
    await validateToken('refresh');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
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