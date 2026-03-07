import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Upload, Download, Trash2, Edit } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useUser } from '../contexts/UserContext';
import settingsImage from 'figma:asset/2a44d7cf18f7672c57e1e8cd07027ed5a2b4bf19.png';

export function SettingsPage() {
  const { profile, updateProfile } = useUser();
  
  // Local state for editing
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber);
  
  const [companyName, setCompanyName] = useState(profile.distributorName);
  const [companyLogo, setCompanyLogo] = useState<string | null>(profile.distributorLogo);
  const [companyEmail, setCompanyEmail] = useState('yourcompany@email.com');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [companyPhone, setCompanyPhone] = useState('+17888235-4967');

  const [deliveryDays, setDeliveryDays] = useState('Monday, Wednesday, Friday');
  const [minimumOrder, setMinimumOrder] = useState('1,250');
  const [paymentTerms, setPaymentTerms] = useState('');

  const location = useLocation();
  const billingRef = useRef<HTMLDivElement>(null);

  // Update local state when profile changes (e.g. initial load)
  useEffect(() => {
    setFullName(profile.fullName);
    setEmail(profile.email);
    setPhoneNumber(profile.phoneNumber);
    setCompanyName(profile.distributorName);
    setCompanyLogo(profile.distributorLogo);
  }, [profile]);

  const handleSaveProfile = () => {
    updateProfile({
      fullName,
      email,
      phoneNumber,
    });
  };

  const handleSaveCompany = () => {
    updateProfile({
      distributorName: companyName,
      distributorLogo: companyLogo,
    });
    // Add other company settings saving logic here if needed
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpgradePlan = () => {
    // Simulate successful payment/billing setup
    updateProfile({
      hasPaidSubscription: true,
      plan: 'premium'
    });
    alert('Congratulations! You\'ve upgraded to Premium. You now have unlimited quotes!');
  };

  useEffect(() => {
    if (location.pathname.includes('billing') && billingRef.current) {
      setTimeout(() => {
        billingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location.pathname]);

  return (
    <div className="p-4 md:p-8 bg-[#FFF9F3] min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Account Info Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg text-[#4F4F4F] mb-1">Account Info</h2>
          <p className="text-sm text-[#4F4F4F] mb-6">
            Manage your account information and preferences
          </p>

          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {/* Profile Photo */}
            <div className="flex-shrink-0 flex md:block flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-center mt-2 text-[#4F4F4F]">{fullName}</p>
              <p className="text-xs text-center text-[#4F4F4F]">{email}</p>
            </div>

            {/* Form Fields */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm text-[#4F4F4F] mb-1">Full Name</label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block text-sm text-[#4F4F4F] mb-1">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block text-sm text-[#4F4F4F] mb-1">Phone Number</label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  className="bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={handleSaveProfile}
                  className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
                >
                  Save Changes
                </Button>
                <Button variant="outline">Reset Password</Button>
              </div>
            </div>
          </div>

          {/* Log Out */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm text-[#4F4F4F] mb-1">Log Out</h3>
            <p className="text-sm text-[#4F4F4F] mb-3">Log out from current session</p>
            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              Log Out
            </Button>
          </div>
        </div>

        {/* Distributor Settings Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg text-[#4F4F4F] mb-1">Distributor Settings</h2>
          <p className="text-sm text-[#4F4F4F] mb-6">
            Configure your distributor-specific details and delivery options
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Company Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#4F4F4F] mb-2">Company Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Company Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#2A2A2A] flex items-center justify-center text-white text-2xl">
                        {companyName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer">
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg" 
                        className="hidden" 
                        onChange={handleLogoUpload}
                      />
                      <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 mb-1">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Logo
                      </div>
                    </label>
                    <p className="text-xs text-[#4F4F4F]">PNG, JPG (Max 2MB)</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#4F4F4F] mb-1">Company Details</label>
              </div>

              <div>
                <label className="block text-xs text-[#4F4F4F] mb-1">Company Name</label>
                <Input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block text-xs text-[#4F4F4F] mb-1">Email Address</label>
                <Input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block text-xs text-[#4F4F4F] mb-1">Website URL</label>
                <Input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://"
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block text-xs text-[#4F4F4F] mb-1">Phone Number</label>
                <Input
                  type="tel"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            {/* Right Column - Delivery Configuration */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#4F4F4F] mb-2">Delivery Configuration</label>
              </div>

              <div>
                <label className="block text-xs text-[#4F4F4F] mb-1">Delivery Days</label>
                <Input
                  type="text"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  placeholder="e.g., Monday, Wednesday, Friday"
                  className="bg-white"
                />
                <p className="text-xs text-[#4F4F4F] mt-1">
                  e.g., "Mon, Wed, Fri" or "Daily"
                </p>
              </div>

              <div>
                <label className="block text-xs text-[#4F4F4F] mb-1">Minimum Order Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4F4F4F]">
                    $
                  </span>
                  <Input
                    type="text"
                    value={minimumOrder}
                    onChange={(e) => setMinimumOrder(e.target.value)}
                    className="bg-white pl-7"
                  />
                </div>
                <p className="text-xs text-[#4F4F4F] mt-1">e.g., 250 for $250 minimum</p>
              </div>

              <div>
                <label className="block text-xs text-[#4F4F4F] mb-1">Payment Terms</label>
                <Input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Enter payment terms"
                  className="bg-white"
                />
                <p className="text-xs text-[#4F4F4F] mt-1">
                  e.g., "Net 30" or "COD" or "Credit Card"
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button 
              onClick={handleSaveCompany}
              className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
            >
              Save Settings
            </Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg text-[#4F4F4F] mb-1">Documents</h2>
              <p className="text-sm text-[#4F4F4F]">Upload and manage your onboarding documents</p>
            </div>
            <Button className="bg-[#F2993D] hover:bg-[#E08A2E] text-white">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Document 1 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="h-32 bg-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop"
                  alt="Document"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <p className="text-sm text-[#2A2A2A] mb-1">IG-Documents.pdf</p>
                <p className="text-xs text-[#4F4F4F] mb-3">Uploaded 4 days ago</p>
                <div className="flex gap-2">
                  <button className="text-xs text-[#F2993D] hover:underline flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                  <button className="text-xs text-red-600 hover:underline flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Document 2 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="h-32 bg-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop"
                  alt="Document"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <p className="text-sm text-[#2A2A2A] mb-1">Proof-of-Address.pdf</p>
                <p className="text-xs text-[#4F4F4F] mb-3">Uploaded 2 days ago</p>
                <div className="flex gap-2">
                  <button className="text-xs text-[#F2993D] hover:underline flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                  <button className="text-xs text-red-600 hover:underline flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Document 3 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="h-32 bg-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400&h=300&fit=crop"
                  alt="Document"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <p className="text-sm text-[#2A2A2A] mb-1">Tax-Return-2024.pdf</p>
                <p className="text-xs text-[#4F4F4F] mb-3">Uploaded 3 weeks ago</p>
                <div className="flex gap-2">
                  <button className="text-xs text-[#F2993D] hover:underline flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                  <button className="text-xs text-red-600 hover:underline flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Section */}
        <div 
          ref={billingRef}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h2 className="text-lg text-[#4F4F4F] mb-1">Billing</h2>
          <p className="text-sm text-[#4F4F4F] mb-6">
            Manage your subscription and payment details
          </p>

          {/* Trial Status Banner - Only show for non-paid users */}
          {!profile.hasPaidSubscription && (
            <div className="bg-[#FFF9F3] border border-[#F2993D] rounded-lg p-4 mb-6">
              <p className="text-sm text-[#2A2A2A] font-semibold mb-1">Free Trial Active</p>
              <p className="text-xs text-[#4F4F4F]">
                You've used {profile.quotesUsed} of {profile.quotesLimit} free quotes. Upgrade to get unlimited quotes and premium features!
              </p>
            </div>
          )}

          {/* Current Plan */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm text-[#4F4F4F]">Current Plan</h3>
                <p className="text-lg text-[#2A2A2A]">
                  {profile.hasPaidSubscription ? 'Premium Plan' : 'Free Trial'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl text-[#2A2A2A]">
                  {profile.hasPaidSubscription ? '$29' : '$0'}
                </p>
                <p className="text-sm text-[#4F4F4F]">/month</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!profile.hasPaidSubscription ? (
                <Button 
                  onClick={handleUpgradePlan}
                  className="bg-[#F2993D] hover:bg-[#E08A2E] text-white text-sm"
                >
                  Upgrade to Premium
                </Button>
              ) : (
                <>
                  <Button className="bg-[#F2993D] hover:bg-[#E08A2E] text-white text-sm">
                    Manage Plan
                  </Button>
                  <Button variant="outline" className="text-sm">
                    Cancel Subscription
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Payment Method - Only show for paid users */}
          {profile.hasPaidSubscription && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-sm text-[#4F4F4F] mb-1">Payment Method</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">
                      💳
                    </div>
                    <div>
                      <p className="text-sm text-[#2A2A2A]">Visa ending in 4242</p>
                      <p className="text-xs text-[#4F4F4F]">Expires 02/26</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}

          {/* Billing History - Only show for paid users */}
          {profile.hasPaidSubscription && (
            <div>
              <h3 className="text-sm text-[#4F4F4F] mb-4">Billing History</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <div>
                    <p className="text-sm text-[#2A2A2A]">January 2025</p>
                    <p className="text-xs text-[#4F4F4F]">Paid on Jan 1, 2025</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-[#2A2A2A]">$29.00</p>
                    <Button variant="outline" size="sm">
                      Receipt
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2">
                  <div>
                    <p className="text-sm text-[#2A2A2A]">December 2024</p>
                    <p className="text-xs text-[#4F4F4F]">Paid on Dec 1, 2024</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-[#2A2A2A]">$29.00</p>
                    <Button variant="outline" size="sm">
                      Receipt
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2">
                  <div>
                    <p className="text-sm text-[#2A2A2A]">November 2024</p>
                    <p className="text-xs text-[#4F4F4F]">Paid on Nov 1, 2024</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-[#2A2A2A]">$29.00</p>
                    <Button variant="outline" size="sm">
                      Receipt
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
