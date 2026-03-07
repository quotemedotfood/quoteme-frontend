import { useEffect, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';

interface AuthSyncProviderProps {
  children: ReactNode;
}

export function AuthSyncProvider({ children }: AuthSyncProviderProps) {
  const { user } = useAuth();
  const { updateProfile } = useUser();

  useEffect(() => {
    if (user) {
      // Sync authenticated user data to profile
      updateProfile({
        fullName: `${user.first_name} ${user.last_name}`,
        email: user.email,
        distributorName: user.distributor?.name || 'Your Distributor',
        isGuest: false,
        plan: 'free', // Backend should provide this
        quotesUsed: 0, // Backend should provide this
        quotesLimit: 5, // Backend should provide this
        hasPaidSubscription: false, // Backend should provide this
      });
    }
  }, [user, updateProfile]);

  return <>{children}</>;
}
