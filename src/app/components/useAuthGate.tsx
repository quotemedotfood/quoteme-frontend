import { useState } from 'react';
import { AuthDrawer } from './AuthDrawer';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';

interface UseAuthGateReturn {
  requireAuth: (onSuccess?: () => void) => boolean;
  AuthGateComponent: () => JSX.Element | null;
}

export function useAuthGate(): UseAuthGateReturn {
  const { isAuthenticated } = useAuth();
  const { profile } = useUser();
  const [showAuthDrawer, setShowAuthDrawer] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | undefined>();

  const requireAuth = (onSuccess?: () => void): boolean => {
    if (profile.isGuest || !isAuthenticated) {
      setOnSuccessCallback(() => onSuccess);
      setShowAuthDrawer(true);
      return false;
    }
    return true;
  };

  const handleAuthSuccess = () => {
    setShowAuthDrawer(false);
    if (onSuccessCallback) {
      onSuccessCallback();
      setOnSuccessCallback(undefined);
    }
  };

  const AuthGateComponent = () => {
    if (!showAuthDrawer) return null;

    return (
      <AuthDrawer
        isOpen={showAuthDrawer}
        onClose={() => setShowAuthDrawer(false)}
        defaultMode="signup"
        onSuccess={handleAuthSuccess}
      />
    );
  };

  return {
    requireAuth,
    AuthGateComponent,
  };
}
