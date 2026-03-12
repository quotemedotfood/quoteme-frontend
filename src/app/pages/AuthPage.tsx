import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  searchDistributors,
  sendPasswordReset,
  DistributorSearchResult,
} from '../services/api';
import {
  Users,
  ChefHat,
  Building2,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
} from 'lucide-react';

const BLOCKED_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'live.com',
  'msn.com',
  'protonmail.com',
  'mail.com',
];

type AuthView = 'role-select' | 'signup' | 'signin' | 'forgot-password';

export function AuthPage() {
  const navigate = useNavigate();
  const { signup, login, isAuthenticated, user } = useAuth();

  const routeByRole = (role?: string) => {
    switch (role) {
      case 'quoteme_admin': return '/qm-admin/';
      case 'distributor_admin': return '/distributor-admin/';
      default: return '/dashboard';
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) navigate(routeByRole(user.role));
  }, [isAuthenticated, user, navigate]);

  const [view, setView] = useState<AuthView>('role-select');

  // Sign Up state
  const [distributorName, setDistributorName] = useState('');
  const [distributorResults, setDistributorResults] = useState<
    DistributorSearchResult[]
  >([]);
  const [selectedDistributor, setSelectedDistributor] =
    useState<DistributorSearchResult | null>(null);
  const [showDistributorDropdown, setShowDistributorDropdown] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Forgot Password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Shared state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Distributor autocomplete - debounced search
  useEffect(() => {
    if (distributorName.length < 2 || selectedDistributor) {
      setDistributorResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await searchDistributors(distributorName);
      if (res.data) {
        setDistributorResults(res.data);
        setShowDistributorDropdown(true);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [distributorName, selectedDistributor]);

  const validateWorkEmail = (email: string): string | null => {
    if (!email) return 'Email is required';
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return 'Please enter a valid email';
    if (BLOCKED_DOMAINS.includes(domain)) return 'Please use your work email';
    return null;
  };

  const handleSignUp = async () => {
    const newErrors: Record<string, string> = {};

    if (!distributorName.trim())
      newErrors.distributor = 'Distributor name is required';
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';

    const emailError = validateWorkEmail(signupEmail);
    if (emailError) newErrors.email = emailError;

    if (!signupPassword) newErrors.password = 'Password is required';
    else if (signupPassword.length < 8)
      newErrors.password = 'Password must be at least 8 characters';

    if (!verifyPassword)
      newErrors.verifyPassword = 'Please verify your password';
    else if (signupPassword !== verifyPassword)
      newErrors.verifyPassword = 'Passwords do not match';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    const result = await signup({
      first_name: firstName,
      last_name: lastName,
      email: signupEmail,
      password: signupPassword,
      phone: phone || undefined,
      distributor_name: selectedDistributor ? undefined : distributorName,
      claimed_distributor_id: selectedDistributor?.id,
    });
    setIsSubmitting(false);

    if (result.success) {
      // Role-based routing handled by useEffect when user state updates
    } else {
      setErrors({ form: result.error || 'Registration failed' });
    }
  };

  const handleSignIn = async () => {
    const newErrors: Record<string, string> = {};
    if (!loginEmail) newErrors.email = 'Email is required';
    if (!loginPassword) newErrors.password = 'Password is required';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    const result = await login({ email: loginEmail, password: loginPassword });
    setIsSubmitting(false);

    if (result.success) {
      // Role-based routing handled by useEffect when user state updates
    } else {
      setErrors({ form: 'Invalid email or password' });
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setErrors({ email: 'Email is required' });
      return;
    }
    setIsSubmitting(true);
    await sendPasswordReset(resetEmail);
    setIsSubmitting(false);
    setResetSent(true);
  };

  const switchView = (newView: AuthView) => {
    setErrors({});
    setView(newView);
  };

  const renderFieldError = (field: string) => {
    if (!errors[field]) return null;
    return (
      <p className="mt-1 flex items-center gap-1 text-sm text-red-600">
        <AlertCircle className="size-3.5 shrink-0" />
        {errors[field]}
      </p>
    );
  };

  const renderFormError = () => {
    if (!errors.form) return null;
    return (
      <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        <AlertCircle className="size-4 shrink-0" />
        {errors.form}
      </div>
    );
  };

  // ─── Role Selection View ───────────────────────────────────────────
  const renderRoleSelect = () => (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: '#2A2A2A' }}
        >
          QuoteMe
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#4F4F4F' }}>
          Choose your role to get started
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {/* Rep - active */}
        <button
          onClick={() => switchView('signup')}
          className="group flex items-center gap-4 rounded-lg border-2 bg-white px-5 py-4 text-left transition-all hover:shadow-md"
          style={{ borderColor: '#7FAEC2' }}
        >
          <div
            className="flex size-11 items-center justify-center rounded-full"
            style={{ backgroundColor: '#E8F2F7' }}
          >
            <Users className="size-5" style={{ color: '#7FAEC2' }} />
          </div>
          <div className="flex-1">
            <p
              className="font-semibold"
              style={{ color: '#2A2A2A' }}
            >
              I'm a Rep
            </p>
            <p className="text-sm" style={{ color: '#4F4F4F' }}>
              Create and manage quotes for your customers
            </p>
          </div>
        </button>

        {/* Chef - coming soon */}
        <div className="flex cursor-not-allowed items-center gap-4 rounded-lg border-2 border-gray-200 bg-gray-50 px-5 py-4 opacity-60">
          <div className="flex size-11 items-center justify-center rounded-full bg-gray-100">
            <ChefHat className="size-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-400">I'm a Chef</p>
              <span
                className="text-xs font-medium"
                style={{ color: '#7FAEC2' }}
              >
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Request and compare quotes from distributors
            </p>
          </div>
        </div>

        {/* Brand - coming soon */}
        <div className="flex cursor-not-allowed items-center gap-4 rounded-lg border-2 border-gray-200 bg-gray-50 px-5 py-4 opacity-60">
          <div className="flex size-11 items-center justify-center rounded-full bg-gray-100">
            <Building2 className="size-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-400">I'm a Brand</p>
              <span
                className="text-xs font-medium"
                style={{ color: '#7FAEC2' }}
              >
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Promote your products to distributors and chefs
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm" style={{ color: '#4F4F4F' }}>
        Already have an account?{' '}
        <button
          onClick={() => switchView('signin')}
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: '#7FAEC2' }}
        >
          Sign In
        </button>
      </p>
    </div>
  );

  // ─── Sign Up View ──────────────────────────────────────────────────
  const renderSignUp = () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => switchView('role-select')}
          className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="size-4" style={{ color: '#2A2A2A' }} />
        </button>
        <h2
          className="text-xl font-bold"
          style={{ color: '#2A2A2A' }}
        >
          Create your account
        </h2>
      </div>

      {renderFormError()}

      <div className="flex flex-col gap-4">
        {/* Distributor name with autocomplete */}
        <div className="relative">
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#2A2A2A' }}
          >
            Distributor Name
          </label>
          <Input
            value={distributorName}
            onChange={(e) => {
              setDistributorName(e.target.value);
              setSelectedDistributor(null);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.distributor;
                return next;
              });
            }}
            onFocus={() => {
              if (distributorResults.length > 0)
                setShowDistributorDropdown(true);
            }}
            onBlur={() => {
              // Delay to allow click on dropdown item
              setTimeout(() => setShowDistributorDropdown(false), 200);
            }}
            placeholder="Start typing your distributor name..."
          />
          {selectedDistributor && (
            <p className="mt-1 flex items-center gap-1 text-sm text-green-600">
              <Check className="size-3.5" />
              Matched: {selectedDistributor.name}
            </p>
          )}
          {showDistributorDropdown && distributorResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {distributorResults.map((d) => (
                <button
                  key={d.id}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelectedDistributor(d);
                    setDistributorName(d.name);
                    setShowDistributorDropdown(false);
                    setDistributorResults([]);
                  }}
                >
                  {d.logo_url ? (
                    <img
                      src={d.logo_url}
                      alt=""
                      className="size-6 rounded object-contain"
                    />
                  ) : (
                    <div className="flex size-6 items-center justify-center rounded bg-gray-100">
                      <Building2 className="size-3.5 text-gray-400" />
                    </div>
                  )}
                  <span style={{ color: '#2A2A2A' }}>{d.name}</span>
                </button>
              ))}
            </div>
          )}
          {!selectedDistributor &&
            distributorName.length >= 2 &&
            distributorResults.length === 0 && (
              <p className="mt-1 text-xs" style={{ color: '#4F4F4F' }}>
                Don't see your distributor? Just type the name and we'll get you
                set up.
              </p>
            )}
          {renderFieldError('distributor')}
        </div>

        {/* First / Last name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: '#2A2A2A' }}
            >
              First Name
            </label>
            <Input
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.firstName;
                  return next;
                });
              }}
              placeholder="Jane"
            />
            {renderFieldError('firstName')}
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: '#2A2A2A' }}
            >
              Last Name
            </label>
            <Input
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.lastName;
                  return next;
                });
              }}
              placeholder="Smith"
            />
            {renderFieldError('lastName')}
          </div>
        </div>

        {/* Work email */}
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#2A2A2A' }}
          >
            Work Email
          </label>
          <Input
            type="email"
            value={signupEmail}
            onChange={(e) => {
              setSignupEmail(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.email;
                return next;
              });
            }}
            placeholder="jane@yourdistributor.com"
          />
          {renderFieldError('email')}
        </div>

        {/* Phone (optional) */}
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#2A2A2A' }}
          >
            Phone{' '}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Password */}
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#2A2A2A' }}
          >
            Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={signupPassword}
              onChange={(e) => {
                setSignupPassword(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.password;
                  return next;
                });
              }}
              placeholder="At least 8 characters"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {renderFieldError('password')}
        </div>

        {/* Verify password */}
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#2A2A2A' }}
          >
            Verify Password
          </label>
          <div className="relative">
            <Input
              type={showVerifyPassword ? 'text' : 'password'}
              value={verifyPassword}
              onChange={(e) => {
                setVerifyPassword(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.verifyPassword;
                  return next;
                });
              }}
              placeholder="Re-enter your password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowVerifyPassword(!showVerifyPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showVerifyPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {renderFieldError('verifyPassword')}
        </div>
      </div>

      <Button
        onClick={handleSignUp}
        disabled={isSubmitting}
        className="w-full text-white"
        style={{ backgroundColor: '#7FAEC2' }}
        size="lg"
      >
        {isSubmitting ? 'Creating Account...' : 'Create Account'}
      </Button>

      <p className="text-center text-sm" style={{ color: '#4F4F4F' }}>
        Already have an account?{' '}
        <button
          onClick={() => switchView('signin')}
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: '#7FAEC2' }}
        >
          Sign In
        </button>
      </p>
    </div>
  );

  // ─── Sign In View ──────────────────────────────────────────────────
  const renderSignIn = () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => switchView('role-select')}
          className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="size-4" style={{ color: '#2A2A2A' }} />
        </button>
        <h2
          className="text-xl font-bold"
          style={{ color: '#2A2A2A' }}
        >
          Welcome back
        </h2>
      </div>

      {renderFormError()}

      <div className="flex flex-col gap-4">
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#2A2A2A' }}
          >
            Email
          </label>
          <Input
            type="email"
            value={loginEmail}
            onChange={(e) => {
              setLoginEmail(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.email;
                return next;
              });
            }}
            placeholder="jane@yourdistributor.com"
          />
          {renderFieldError('email')}
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#2A2A2A' }}
          >
            Password
          </label>
          <div className="relative">
            <Input
              type={showLoginPassword ? 'text' : 'password'}
              value={loginPassword}
              onChange={(e) => {
                setLoginPassword(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.password;
                  return next;
                });
              }}
              placeholder="Enter your password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowLoginPassword(!showLoginPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showLoginPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {renderFieldError('password')}
        </div>
      </div>

      <Button
        onClick={handleSignIn}
        disabled={isSubmitting}
        className="w-full text-white"
        style={{ backgroundColor: '#7FAEC2' }}
        size="lg"
      >
        {isSubmitting ? 'Signing In...' : 'Sign In'}
      </Button>

      <div className="flex flex-col items-center gap-2 text-sm">
        <p style={{ color: '#4F4F4F' }}>
          Don't have an account?{' '}
          <button
            onClick={() => switchView('signup')}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: '#7FAEC2' }}
          >
            Sign Up
          </button>
        </p>
        <button
          onClick={() => switchView('forgot-password')}
          className="text-sm underline-offset-2 hover:underline"
          style={{ color: '#4F4F4F' }}
        >
          Forgot your password?
        </button>
      </div>
    </div>
  );

  // ─── Forgot Password View ─────────────────────────────────────────
  const renderForgotPassword = () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => switchView('signin')}
          className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
        >
          <ArrowLeft className="size-4" style={{ color: '#2A2A2A' }} />
        </button>
        <h2
          className="text-xl font-bold"
          style={{ color: '#2A2A2A' }}
        >
          Reset your password
        </h2>
      </div>

      {resetSent ? (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check className="mt-0.5 size-4 shrink-0" />
          <span>
            If an account exists with this email, you'll receive a password
            reset link shortly.
          </span>
        </div>
      ) : (
        <>
          <p className="text-sm" style={{ color: '#4F4F4F' }}>
            Enter your email and we'll send you a link to reset your password.
          </p>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: '#2A2A2A' }}
            >
              Email
            </label>
            <Input
              type="email"
              value={resetEmail}
              onChange={(e) => {
                setResetEmail(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.email;
                  return next;
                });
              }}
              placeholder="jane@yourdistributor.com"
            />
            {renderFieldError('email')}
          </div>

          <Button
            onClick={handleForgotPassword}
            disabled={isSubmitting}
            className="w-full text-white"
            style={{ backgroundColor: '#7FAEC2' }}
            size="lg"
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </>
      )}

      <p className="text-center text-sm" style={{ color: '#4F4F4F' }}>
        <button
          onClick={() => switchView('signin')}
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: '#7FAEC2' }}
        >
          Back to Sign In
        </button>
      </p>
    </div>
  );

  // ─── View Router ───────────────────────────────────────────────────
  const renderView = () => {
    switch (view) {
      case 'role-select':
        return renderRoleSelect();
      case 'signup':
        return renderSignUp();
      case 'signin':
        return renderSignIn();
      case 'forgot-password':
        return renderForgotPassword();
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{ backgroundColor: '#FFF9F3' }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        {renderView()}
      </div>
    </div>
  );
}
