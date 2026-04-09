import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { searchDistributors } from '../services/api';
import { LogIn, UserPlus, AlertCircle, Building2 } from 'lucide-react';

const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com',
  'live.com', 'msn.com', 'protonmail.com', 'mail.com', 'ymail.com', 'googlemail.com',
  'yahoo.co.uk', 'hotmail.co.uk', 'outlook.co.uk', 'me.com', 'mac.com',
];

function isPersonalEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? PERSONAL_EMAIL_DOMAINS.includes(domain) : false;
}

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
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Distributor autocomplete
  const [distributorQuery, setDistributorQuery] = useState('');
  const [distributorResults, setDistributorResults] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<{ id: string; name: string } | null>(null);
  const [showDistributorDropdown, setShowDistributorDropdown] = useState(false);
  const distributorRef = useRef<HTMLDivElement>(null);

  // Work email validation
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  // Distributor search debounce
  useEffect(() => {
    if (distributorQuery.length < 2 || selectedDistributor) {
      setDistributorResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await searchDistributors(distributorQuery);
      if (res.data) {
        setDistributorResults(res.data);
        setShowDistributorDropdown(res.data.length > 0);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [distributorQuery, selectedDistributor]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (distributorRef.current && !distributorRef.current.contains(e.target as Node)) {
        setShowDistributorDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Email validation
  useEffect(() => {
    if (signupEmail && signupEmail.includes('@')) {
      setEmailWarning(isPersonalEmail(signupEmail) ? 'Please use a work email address' : null);
    } else {
      setEmailWarning(null);
    }
  }, [signupEmail]);

  const resetForms = () => {
    setLoginEmail('');
    setLoginPassword('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupFirstName('');
    setSignupLastName('');
    setAgreeToTerms(false);
    setDistributorQuery('');
    setSelectedDistributor(null);
    setDistributorResults([]);
    setEmailWarning(null);
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
      setErrorCode(result.error_code || null);
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
        distributor_name: selectedDistributor?.name || distributorQuery.trim() || undefined,
        claimed_distributor_id: selectedDistributor?.id || undefined,
      },
      guestToken || undefined
    );

    setIsLoading(false);

    if (result.success) {
      resetForms();
      onSuccess?.();
      onClose();
    } else {
      setErrorCode(result.error_code || null);
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {errorCode === 'email_not_found' ? (
                  <>No account found with this email. Check for typos or{' '}
                    <button type="button" onClick={() => { setMode('signup'); setError(null); setErrorCode(null); }} className="font-semibold hover:underline" style={{ color: '#7FAEC2' }}>create an account</button>.
                  </>
                ) : errorCode === 'wrong_password' ? (
                  <>Incorrect password. Try again or{' '}
                    <a href="/auth" className="font-semibold hover:underline" style={{ color: '#7FAEC2' }}>reset your password</a>.
                  </>
                ) : errorCode === 'email_taken' ? (
                  <>An account with this email already exists.{' '}
                    <button type="button" onClick={() => { setMode('login'); setError(null); setErrorCode(null); }} className="font-semibold hover:underline" style={{ color: '#7FAEC2' }}>Try signing in instead</button>.
                  </>
                ) : error}
              </span>
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
                <label className="block text-sm mb-2 text-gray-700">Work Email</label>
                <Input
                  type="email"
                  placeholder="you@yourcompany.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className={emailWarning ? 'border-amber-400 focus:ring-amber-400' : ''}
                />
                {emailWarning && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {emailWarning}
                  </p>
                )}
              </div>

              <div ref={distributorRef} className="relative">
                <label className="block text-sm mb-2 text-gray-700">Distributor</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search or type your distributor name"
                    value={selectedDistributor ? selectedDistributor.name : distributorQuery}
                    onChange={(e) => {
                      setDistributorQuery(e.target.value);
                      setSelectedDistributor(null);
                    }}
                    onFocus={() => { if (distributorResults.length > 0) setShowDistributorDropdown(true); }}
                    disabled={isLoading}
                    className="pl-9"
                  />
                </div>
                {showDistributorDropdown && distributorResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {distributorResults.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-[#2A2A2A]"
                        onClick={() => {
                          setSelectedDistributor(d);
                          setDistributorQuery(d.name);
                          setShowDistributorDropdown(false);
                        }}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {selectedDistributor ? 'Matched to existing distributor' : distributorQuery.length > 0 ? 'New distributor — will be created on signup' : ''}
                </p>
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
                  className="mt-0.5 shrink-0 rounded border-gray-300 text-[#F2993D] focus:ring-[#F2993D]"
                  style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px', maxWidth: '16px', maxHeight: '16px' }}
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
