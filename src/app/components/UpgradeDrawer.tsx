import { X, CreditCard, Zap, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router';
import { isDemoMode, PROD_SIGNUP_URL } from '../utils/demoMode';

interface UpgradeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeDrawer({ isOpen, onClose }: UpgradeDrawerProps) {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    if (isDemoMode()) {
      window.location.href = PROD_SIGNUP_URL;
      return;
    }
    onClose();
    navigate('/upgrade');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-[#FFF9F3]">
          <div>
            <h2 className="text-xl text-[#2A2A2A] font-semibold">Trial Limit Reached</h2>
            <p className="text-sm text-[#4F4F4F] mt-1">Upgrade to continue creating quotes</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#4F4F4F]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Trial Status */}
          <div className="bg-gradient-to-br from-[#F2993D] to-[#E08A2E] rounded-lg p-6 text-white mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-8 h-8" />
              <div>
                <h3 className="text-lg font-semibold">You've used all 5 free quotes!</h3>
                <p className="text-sm text-white/90 mt-1">
                  Upgrade now to unlock unlimited quotes and premium features
                </p>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-4 mb-6">
            <h3 className="text-base text-[#2A2A2A] font-semibold">Premium Features Include:</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#F2993D] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-[#2A2A2A] font-medium">Unlimited Quotes</p>
                  <p className="text-xs text-[#4F4F4F]">Create as many quotes as you need without restrictions</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#F2993D] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-[#2A2A2A] font-medium">Advanced Analytics</p>
                  <p className="text-xs text-[#4F4F4F]">Track quote performance and customer insights</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#F2993D] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-[#2A2A2A] font-medium">Priority Support</p>
                  <p className="text-xs text-[#4F4F4F]">Get help faster with dedicated support team</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#F2993D] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-[#2A2A2A] font-medium">Custom Branding</p>
                  <p className="text-xs text-[#4F4F4F]">Add your logo and branding to all quotes</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#F2993D] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-[#2A2A2A] font-medium">Export Options</p>
                  <p className="text-xs text-[#4F4F4F]">Export quotes in multiple formats (PDF, Excel, CSV)</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#F2993D] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-[#2A2A2A] font-medium">Team Collaboration</p>
                  <p className="text-xs text-[#4F4F4F]">Add team members and manage permissions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-[#FFF9F3] border-2 border-[#7FAEC2] rounded-lg p-6 mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <p className="text-sm text-[#4F4F4F]">Solo Rep Plan</p>
                <p className="text-3xl text-[#2A2A2A] font-bold">$50<span className="text-lg text-[#4F4F4F] font-normal">/month</span></p>
              </div>
            </div>
            <p className="text-xs text-[#4F4F4F]">Cancel anytime. No hidden fees.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <Button
            onClick={handleUpgradeClick}
            className="w-full bg-[#F2993D] hover:bg-[#E08A2E] text-white py-6 text-base font-semibold"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            {isDemoMode() ? 'Sign Up to Continue' : 'Upgrade to Premium'}
          </Button>
          <p className="text-xs text-center text-[#4F4F4F] mt-3">
            {isDemoMode()
              ? 'Create a free account to unlock unlimited quotes'
              : "You'll be redirected to billing settings to complete your upgrade"}
          </p>
        </div>
      </div>
    </>
  );
}