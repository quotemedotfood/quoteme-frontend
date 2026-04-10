import { useEffect, useRef, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';

interface AuthSyncProviderProps {
  children: ReactNode;
}

export function AuthSyncProvider({ children }: AuthSyncProviderProps) {
  const { user } = useAuth();
  const { updateProfile } = useUser();
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (user && user.id !== lastSyncedUserId.current) {
      lastSyncedUserId.current = user.id;
      updateProfile({
        fullName: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phoneNumber: user.phone || '',
        distributorName: user.distributor?.name || user.distributor_name || '',
        distributorLogo: user.distributor?.logo_url || user.rep_settings?.company_logo_url || null,
        isGuest: false,
        plan: 'free',
        quotesUsed: user.quotes_used ?? 0,
        quotesLimit: user.quotes_limit ?? 5,
        hasPaidSubscription: user.has_paid_subscription || false,
      });
    } else if (!user) {
      lastSyncedUserId.current = null;
    }
  }, [user, updateProfile]);

  return <>{children}</>;
}
