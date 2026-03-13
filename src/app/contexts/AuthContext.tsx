import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, signIn, signUp, getCurrentUser, convertGuestToUser, SignUpData, LoginData } from '../services/api';
import { isDemoMode } from '../utils/demoMode';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginData) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignUpData, guestToken?: string) => Promise<{ success: boolean; error?: string }>;
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
      validateToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function validateToken() {
    const response = await getCurrentUser();
    if (response.data) {
      setUser(response.data);
    } else {
      // Token invalid, clear it
      localStorage.removeItem('quoteme_token');
    }
    setIsLoading(false);
  }

  async function login(credentials: LoginData): Promise<{ success: boolean; error?: string }> {
    const response = await signIn(credentials);
    
    if (response.error) {
      return { success: false, error: response.error };
    }

    if (response.token) {
      localStorage.setItem('quoteme_token', response.token);
      await validateToken();
      return { success: true };
    }

    return { success: false, error: 'No token received' };
  }

  async function signup(
    data: SignUpData,
    guestToken?: string
  ): Promise<{ success: boolean; error?: string }> {
    // If guest token exists, convert guest to user
    if (guestToken) {
      const response = await convertGuestToUser({
        guest_token: guestToken,
        user: data,
      });

      if (response.error) {
        return { success: false, error: response.error };
      }

      if (response.token) {
        localStorage.setItem('quoteme_token', response.token);
        localStorage.removeItem('quoteme_guest_token'); // Clear guest token
        await validateToken();
        return { success: true };
      }

      return { success: false, error: 'No token received' };
    }

    // Regular signup without guest conversion
    const response = await signUp(data);

    if (response.error) {
      return { success: false, error: response.error };
    }

    if (response.token) {
      localStorage.setItem('quoteme_token', response.token);
      await validateToken();
      return { success: true };
    }

    return { success: false, error: 'No token received' };
  }

  function logout() {
    localStorage.removeItem('quoteme_token');
    setUser(null);
  }

  async function refreshUser() {
    await validateToken();
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