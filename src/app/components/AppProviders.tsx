import { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';
import { LocationProvider } from '../contexts/LocationContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <UserProvider>
        <LocationProvider>
          {children}
        </LocationProvider>
      </UserProvider>
    </AuthProvider>
  );
}
