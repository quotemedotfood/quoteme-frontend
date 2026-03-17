import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface AuthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
  onSuccess?: () => void;
}

export function AuthDrawer({ isOpen, onClose, defaultMode = 'login', onSuccess }: AuthDrawerProps) {
  const { login, signup } = useAuth();
  const { getGuestToken } = useUser();
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const resetForms = () => {
    setLoginEmail('');
    setLoginPassword('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupFirstName('');
    setSignupLastName('');
    setAgreeToTerms(false);
    setError(null);
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login({ email: loginEmail, password: loginPassword });

    setIsLoading(false);

    if (result.success) {
      resetForms();
      onSuccess?.();
      onClose();
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    setError(null);
    setIsLoading(true);

    // Get guest token if it exists for conversion
    const guestToken = getGuestToken();

    const result = await signup(
      {
        email: signupEmail,
        password: signupPassword,
        first_name: signupFirstName,
        last_name: signupLastName,
      },
      guestToken || undefined
    );

    setIsLoading(false);

    if (result.success) {
      resetForms();
      onSuccess?.();
      onClose();
    } else {
      setError(result.error || 'Signup failed. Please try again.');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === 'login' ? 'Log In' : 'Create Account'}</SheetTitle>
          <SheetDescription>
            {mode === 'login'
              ? 'Log in to access your quotes and continue building'
              : 'Sign up to save your quotes and send them to customers'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700">Password</label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white"
                disabled={isLoading}
              >
                <LogIn className="w-4 h-4 mr-2" />
                {isLoading ? 'Logging in...' : 'Log In'}
              </Button>

              <div className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="text-[#F2993D] hover:underline font-medium"
                >
                  Sign up
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-2 text-gray-700">First Name</label>
                  <Input
                    type="text"
                    placeholder="John"
                    value={signupFirstName}
                    onChange={(e) => setSignupFirstName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700">Last Name</label>
                  <Input
                    type="text"
                    placeholder="Doe"
                    value={signupLastName}
                    onChange={(e) => setSignupLastName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700">Password</label>
                <Input
                  type="password"
                  placeholder="Create a password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-[#F2993D] focus:ring-[#F2993D]"
                />
                <span className="text-sm text-gray-600" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{ color: '#7FAEC2' }}>
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80" style={{ color: '#7FAEC2' }}>
                    Privacy Policy
                  </a>
                </span>
              </label>

              <Button
                type="submit"
                className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white"
                disabled={isLoading || !agreeToTerms}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>

              <div className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-[#F2993D] hover:underline font-medium"
                >
                  Log in
                </button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
