import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { resetPassword } from '../services/api';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('reset_password_token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!confirmPassword) newErrors.confirm = 'Please confirm your password';
    else if (password !== confirmPassword) newErrors.confirm = 'Passwords do not match';
    if (!token) newErrors.form = 'Invalid or missing reset token';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    const res = await resetPassword({
      reset_password_token: token,
      password,
      password_confirmation: confirmPassword,
    });
    setIsSubmitting(false);

    if (res.error) {
      setErrors({ form: res.error });
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/auth'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FFF9F3' }}>
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        {/* Logo / Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
          <p className="text-sm text-gray-500 mt-1">Enter a new password for your account</p>
        </div>

        {/* No token state */}
        {!token && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-4 mb-4">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Invalid reset link</p>
              <p className="text-sm text-red-600 mt-1">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>
          </div>
        )}

        {/* Form-level error */}
        {errors.form && token && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-4 mb-4">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{errors.form}</p>
          </div>
        )}

        {/* Success state */}
        {success && (
          <div className="flex items-start gap-2 rounded-md bg-green-50 border border-green-200 p-4 mb-4">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">Password reset successfully</p>
              <p className="text-sm text-green-600 mt-1">Redirecting to sign in...</p>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && token && (
          <div className="space-y-4">
            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  className={errors.password ? 'border-red-400 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm password field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: '' }));
                  }}
                  className={errors.confirm ? 'border-red-400 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm && (
                <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>
              )}
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium"
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        )}

        {/* Footer link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
