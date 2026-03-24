import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Upload, Edit, Camera, X, Plus, MapPin } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { updateCurrentUser, getBilling, createCheckoutSession, createPortalSession, sendPasswordReset, getLocations, addLocationToGroup, getLocationGroupBilling, createLocationGroupPortalSession, type LocationItem } from '../services/api';
import { AuthDrawer } from '../components/AuthDrawer';

export function SettingsPage() {
  const { profile, updateProfile } = useUser();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Edit mode states
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isEditingDistributor, setIsEditingDistributor] = useState(false);

  // Auth drawer state
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);

  // Profile photo state
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  // Local state for editing
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber);

  const [companyName, setCompanyName] = useState(profile.distributorName);
  const [companyLogo, setCompanyLogo] = useState<string | null>(profile.distributorLogo);
  const [companyEmail, setCompanyEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  const [deliveryDays, setDeliveryDays] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  // Billing state
  const [billingData, setBillingData] = useState<any>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Location state
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [groupBilling, setGroupBilling] = useState<any>(null);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationCity, setNewLocationCity] = useState('');
  const [newLocationState, setNewLocationState] = useState('');
  const [newLocationConcept, setNewLocationConcept] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Track unsaved changes for guest warning
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const location = useLocation();
  const billingRef = useRef<HTMLDivElement>(null);

  // Snapshot of original values for change detection
  const originalValues = useRef({
    fullName: profile.fullName,
    email: profile.email,
    phoneNumber: profile.phoneNumber,
    companyName: profile.distributorName,
  });

  // Check for unsaved changes
  useEffect(() => {
    const changed =
      fullName !== originalValues.current.fullName ||
      email !== originalValues.current.email ||
      phoneNumber !== originalValues.current.phoneNumber ||
      companyName !== originalValues.current.companyName;
    setHasUnsavedChanges(changed);
  }, [fullName, email, phoneNumber, companyName]);

  // beforeunload warning for guests with unsaved changes
  useEffect(() => {
    if (!profile.isGuest || !hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [profile.isGuest, hasUnsavedChanges]);

  // Update local state when profile changes (e.g. initial load)
  useEffect(() => {
    setFullName(profile.fullName);
    setEmail(profile.email);
    setPhoneNumber(profile.phoneNumber);
    setCompanyName(profile.distributorName);
    setCompanyLogo(profile.distributorLogo);
    originalValues.current = {
      fullName: profile.fullName,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      companyName: profile.distributorName,
    };
  }, [profile]);

  // Load rep_settings and avatar from authenticated user
  useEffect(() => {
    if (user) {
      const s = user.rep_settings || {};
      if (s.company_email) setCompanyEmail(s.company_email);
      if (s.company_phone) setCompanyPhone(s.company_phone);
      if (s.website_url) setWebsiteUrl(s.website_url);
      if (s.delivery_days) setDeliveryDays(s.delivery_days);
      if (s.minimum_order) setMinimumOrder(s.minimum_order);
      if (s.payment_terms) setPaymentTerms(s.payment_terms);
      if (s.company_logo_url) setCompanyLogo(s.company_logo_url);
      if (user.avatar_url) setProfilePhoto(user.avatar_url);
    }
  }, [user]);

  // Fetch billing data for logged-in users
  useEffect(() => {
    if (!profile.isGuest) {
      setBillingLoading(true);
      getBilling().then((res) => {
        if (res.data) {
          setBillingData(res.data);
        }
        setBillingLoading(false);
      });
    }
  }, [profile.isGuest]);

  const handleSaveProfile = async () => {
    if (profile.isGuest) {
      setAuthDrawerOpen(true);
      return;
    }
    setIsSaving(true);
    setError(null);
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const response = await updateCurrentUser({
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phoneNumber,
      avatar_url: profilePhoto || undefined,
    });

    if (response.data) {
      updateProfile({
        fullName: `${response.data.first_name} ${response.data.last_name}`.trim(),
        email: response.data.email,
        phoneNumber: response.data.phone || phoneNumber,
      });
      setIsEditingAccount(false);
    } else {
      setError(response.error || 'Failed to save profile');
    }
    setIsSaving(false);
  };

  const handleCancelAccountEdit = () => {
    setFullName(profile.fullName);
    setEmail(profile.email);
    setPhoneNumber(profile.phoneNumber);
    setIsEditingAccount(false);
  };

  const handleSaveCompany = async () => {
    if (profile.isGuest) {
      setAuthDrawerOpen(true);
      return;
    }
    setIsSavingCompany(true);
    const response = await updateCurrentUser({
      rep_settings: {
        company_email: companyEmail,
        company_phone: companyPhone,
        website_url: websiteUrl,
        delivery_days: deliveryDays,
        minimum_order: minimumOrder,
        payment_terms: paymentTerms,
        company_logo_url: companyLogo || undefined,
      },
    });
    setIsSavingCompany(false);

    if (response.data) {
      updateProfile({
        distributorName: companyName,
        distributorLogo: companyLogo,
      });
      setIsEditingDistributor(false);
    } else {
      setError(response.error || 'Failed to save distributor settings');
    }
  };

  const handleCancelDistributorEdit = () => {
    setCompanyName(profile.distributorName);
    setCompanyLogo(profile.distributorLogo);
    // Reset to saved values from user
    const s = user?.rep_settings || {};
    setCompanyEmail(s.company_email || '');
    setCompanyPhone(s.company_phone || '');
    setWebsiteUrl(s.website_url || '');
    setDeliveryDays(s.delivery_days || '');
    setMinimumOrder(s.minimum_order || '');
    setPaymentTerms(s.payment_terms || '');
    setIsEditingDistributor(false);
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

  const handleProfilePhotoClick = () => {
    profilePhotoInputRef.current?.click();
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpgradePlan = () => {
    if (profile.isGuest) {
      setAuthDrawerOpen(true);
      return;
    }
    navigate('/upgrade');
  };

  const handleManagePlan = async () => {
    setBillingActionLoading(true);
    const res = await createPortalSession();
    setBillingActionLoading(false);
    if (res.data?.portal_url) {
      window.location.href = res.data.portal_url;
    } else {
      setError(res.error || 'Failed to open billing portal');
    }
  };

  useEffect(() => {
    if (location.pathname.includes('billing') && billingRef.current) {
      setTimeout(() => {
        billingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location.pathname]);

  const isGuest = profile.isGuest;
  const isBuyer = user?.role === 'buyer';
  const accountFieldsReadOnly = !isGuest && !isEditingAccount;
  const distributorFieldsReadOnly = !isEditingDistributor;

  const isGroupAdmin = locations.some((l) => l.membership_role === 'group_admin');

  // Fetch locations for buyer users
  useEffect(() => {
    if (isBuyer && !isGuest) {
      getLocations().then((res) => {
        if (res.data) {
          setLocations(res.data);
          // Fetch group billing if user is group_admin
          const groupId = res.data[0]?.location_group?.id;
          const hasAdmin = res.data.some((l) => l.membership_role === 'group_admin');
          if (groupId && hasAdmin) {
            getLocationGroupBilling(groupId).then((bRes) => {
              if (bRes.data) setGroupBilling(bRes.data);
            });
          }
        }
      });
    }
  }, [isBuyer, isGuest]);

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return;
    setAddingLocation(true);
    setLocationError(null);

    const groupId = locations[0]?.location_group?.id;
    if (!groupId) {
      setLocationError('No location group found. Please contact support.');
      setAddingLocation(false);
      return;
    }

    const res = await addLocationToGroup(groupId, {
      name: newLocationName.trim(),
      city: newLocationCity.trim() || undefined,
      state: newLocationState.trim() || undefined,
      concept_type: newLocationConcept.trim() || undefined,
    });

    if (res.error) {
      setLocationError(res.error);
    } else {
      // Refresh locations and billing
      const locRes = await getLocations();
      if (locRes.data) {
        setLocations(locRes.data);
        const gId = locRes.data[0]?.location_group?.id;
        if (gId) {
          getLocationGroupBilling(gId).then((bRes) => {
            if (bRes.data) setGroupBilling(bRes.data);
          });
        }
      }
      setNewLocationName('');
      setNewLocationCity('');
      setNewLocationState('');
      setNewLocationConcept('');
      setShowAddLocation(false);
    }
    setAddingLocation(false);
  };

  const handleManageGroupBilling = async () => {
    const groupId = locations[0]?.location_group?.id;
    if (!groupId) return;
    setBillingPortalLoading(true);
    const res = await createLocationGroupPortalSession(groupId);
    setBillingPortalLoading(false);
    if (res.data?.portal_url) {
      window.location.href = res.data.portal_url;
    }
  };

  return (
    <div className="p-4 md:p-8 bg-[#FFF9F3] min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600 ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Account Info Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-lg text-[#4F4F4F]">Account Info</h2>
            {isGuest ? (
              <Button
                onClick={() => setAuthDrawerOpen(true)}
                className="bg-[#F2993D] hover:bg-[#E08A2E] text-white text-sm"
              >
                Log In
              </Button>
            ) : (
              !isEditingAccount && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingAccount(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )
            )}
          </div>
          <p className="text-sm text-[#4F4F4F] mb-6">
            Manage your account information and preferences
          </p>

          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {/* Profile Photo */}
            <div className="flex-shrink-0 flex md:block flex-col items-center">
              <div
                className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden cursor-pointer relative group"
                onClick={handleProfilePhotoClick}
              >
                <img
                  src={profilePhoto || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop'}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/png, image/jpeg"
                className="hidden"
                onChange={handleProfilePhotoChange}
              />
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
                  readOnly={accountFieldsReadOnly}
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
                  readOnly={accountFieldsReadOnly}
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
                  readOnly={accountFieldsReadOnly}
                />
              </div>

              {/* Show save/cancel for logged-in editing, or prompt login for guests */}
              {isGuest ? (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setAuthDrawerOpen(true)}
                    className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
                  >
                    Log In to Save
                  </Button>
                </div>
              ) : isEditingAccount ? (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={handleCancelAccountEdit}>
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!email) return;
                      setError(null);
                      setSuccessMessage(null);
                      const res = await sendPasswordReset(email);
                      if (res.data) {
                        setSuccessMessage('Password reset email sent. Check your inbox.');
                      } else {
                        setError(res.error || 'Failed to send reset email');
                      }
                    }}
                  >
                    Reset Password
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Log Out - Only for logged-in users */}
          {!isGuest && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm text-[#4F4F4F] mb-1">Log Out</h3>
              <p className="text-sm text-[#4F4F4F] mb-3">Log out from current session</p>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => { logout(); navigate('/'); }}
              >
                Log Out
              </Button>
            </div>
          )}
        </div>

        {/* Distributor Settings Section — hidden for buyer role */}
        {!isBuyer && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-lg text-[#4F4F4F]">Distributor Settings</h2>
            {!isEditingDistributor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingDistributor(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
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
                  {isEditingDistributor && (
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
                  )}
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
                  readOnly={distributorFieldsReadOnly}
                />
              </div>

              <div>
                <label className="block text-xs text-[#4F4F4F] mb-1">Email Address</label>
                <Input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="bg-white"
                  readOnly={distributorFieldsReadOnly}
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
                  readOnly={distributorFieldsReadOnly}
                />
              </div>

              <div>
                <label className="block text-xs text-[#4F4F4F] mb-1">Phone Number</label>
                <Input
                  type="tel"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="bg-white"
                  readOnly={distributorFieldsReadOnly}
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
                  readOnly={distributorFieldsReadOnly}
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
                    readOnly={distributorFieldsReadOnly}
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
                  readOnly={distributorFieldsReadOnly}
                />
                <p className="text-xs text-[#4F4F4F] mt-1">
                  e.g., "Net 30" or "COD" or "Credit Card"
                </p>
              </div>
            </div>
          </div>

          {isEditingDistributor && (
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <Button
                onClick={handleSaveCompany}
                disabled={isSavingCompany}
                className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
              >
                {isSavingCompany ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button variant="outline" onClick={handleCancelDistributorEdit}>
                Cancel
              </Button>
            </div>
          )}
        </div>
        )}

        {/* Documents Section — hidden for buyer role */}
        {!isBuyer && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg text-[#4F4F4F] mb-1">Documents</h2>
              <p className="text-sm text-[#4F4F4F]">Upload and manage your onboarding documents</p>
            </div>
          </div>

          <div className="text-center py-8">
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-[#4F4F4F] mb-1">No documents uploaded yet</p>
            <p className="text-xs text-[#4F4F4F]">Document management coming soon</p>
          </div>
        </div>
        )}

        {/* Locations Section — buyer only */}
        {isBuyer && !isGuest && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-lg text-[#4F4F4F]">Locations</h2>
            {!showAddLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddLocation(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            )}
          </div>
          <p className="text-sm text-[#4F4F4F] mb-6">
            Manage your restaurant locations
          </p>

          {/* Existing locations */}
          {locations.length > 0 && (
            <div className="space-y-3 mb-6">
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <MapPin className="w-5 h-5 text-[#7FAEC2] flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-[#2A2A2A]">{loc.name}</p>
                    <p className="text-sm text-[#4F4F4F]">
                      {[loc.city, loc.state].filter(Boolean).join(', ')}
                      {loc.concept_type ? ` \u2022 ${loc.concept_type}` : ''}
                    </p>
                  </div>
                  {loc.membership_role === 'group_admin' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Admin</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Location Form */}
          {showAddLocation && (
            <div className="border border-[#7FAEC2] rounded-lg p-4 bg-[#F8FCFD]">
              {locations.length === 1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800">
                    Adding a second location starts your group plan at $50/month. Your first location stays free.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-[#4F4F4F] mb-1">Location Name *</label>
                  <Input
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="e.g., Downtown Location"
                    className="bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-[#4F4F4F] mb-1">City</label>
                    <Input
                      value={newLocationCity}
                      onChange={(e) => setNewLocationCity(e.target.value)}
                      placeholder="City"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#4F4F4F] mb-1">State</label>
                    <Input
                      value={newLocationState}
                      onChange={(e) => setNewLocationState(e.target.value)}
                      placeholder="e.g., CA"
                      className="bg-white"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#4F4F4F] mb-1">Concept Type</label>
                  <Input
                    value={newLocationConcept}
                    onChange={(e) => setNewLocationConcept(e.target.value)}
                    placeholder="e.g., Fine Dining, Fast Casual"
                    className="bg-white"
                  />
                </div>
                {locationError && <p className="text-sm text-red-500">{locationError}</p>}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleAddLocation}
                    disabled={addingLocation || !newLocationName.trim()}
                    className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                  >
                    {addingLocation ? 'Adding...' : 'Add Location'}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowAddLocation(false); setLocationError(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {locations.length === 0 && !showAddLocation && (
            <div className="text-center py-8">
              <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-[#4F4F4F] mb-1">No locations yet</p>
              <p className="text-xs text-[#4F4F4F]">Add your first location to get started</p>
            </div>
          )}

          {/* Group Billing — group_admin only */}
          {isGroupAdmin && groupBilling && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-[#4F4F4F] mb-3">Group Billing</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#4F4F4F]">Locations</span>
                  <span className="font-medium text-[#2A2A2A]">{groupBilling.location_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#4F4F4F]">Plan</span>
                  <span className="font-medium text-[#2A2A2A]">
                    {groupBilling.billable_locations === 0 ? 'Free' : `$${groupBilling.monthly_total_cents / 100}/month`}
                  </span>
                </div>
                {groupBilling.billable_locations > 0 && (
                  <p className="text-xs text-[#4F4F4F]">
                    $50/month per additional location. First location is free.
                  </p>
                )}
                {groupBilling.subscription && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${
                      groupBilling.subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {groupBilling.subscription.status}
                    </span>
                    {groupBilling.subscription.current_period_end && (
                      <span className="text-[#4F4F4F]">
                        Next billing: {new Date(groupBilling.subscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                )}
                {groupBilling.stripe_customer_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManageGroupBilling}
                    disabled={billingPortalLoading}
                    className="mt-2"
                  >
                    {billingPortalLoading ? 'Loading...' : 'Manage Billing'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Billing Section */}
        <div
          ref={billingRef}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h2 className="text-lg text-[#4F4F4F] mb-1">Billing</h2>
          <p className="text-sm text-[#4F4F4F] mb-6">
            Manage your subscription and payment details
          </p>

          {new URLSearchParams(window.location.search).get('success') === 'true' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">You're all set!</p>
                <p className="text-xs text-green-600">Your subscription is active. You now have unlimited quotes.</p>
              </div>
            </div>
          )}
          {new URLSearchParams(window.location.search).get('canceled') === 'true' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">Checkout was canceled. No changes were made.</p>
            </div>
          )}

          {isGuest ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#4F4F4F] mb-4">Log in to manage billing</p>
              <Button
                onClick={() => setAuthDrawerOpen(true)}
                className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
              >
                Log In
              </Button>
            </div>
          ) : billingLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#4F4F4F]">Loading billing information...</p>
            </div>
          ) : (
            <>
              {/* Trial Status Banner - Only show for non-paid users */}
              {!billingData?.has_paid_subscription && !profile.hasPaidSubscription && (
                <div className="bg-[#FFF9F3] border border-[#F2993D] rounded-lg p-4 mb-6">
                  <p className="text-sm text-[#2A2A2A] font-semibold mb-1">Free Trial Active</p>
                  <p className="text-xs text-[#4F4F4F]">
                    You've used {billingData?.quotes_used ?? profile.quotesUsed} of {billingData?.quotes_limit ?? profile.quotesLimit} free quotes. Sign up to keep building quotes.
                  </p>
                </div>
              )}

              {/* Current Plan */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm text-[#4F4F4F]">Current Plan</h3>
                    <p className="text-lg text-[#2A2A2A]">
                      {(billingData?.has_paid_subscription ?? profile.hasPaidSubscription) ? (billingData?.plan_name || 'Premium Plan') : 'Free Trial'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl text-[#2A2A2A]">
                      {(billingData?.has_paid_subscription ?? profile.hasPaidSubscription)
                        ? `$${billingData?.price_dollars ?? 29}`
                        : '$0'}
                    </p>
                    <p className="text-sm text-[#4F4F4F]">/{billingData?.interval || 'month'}</p>
                  </div>
                </div>
                {billingData?.has_paid_subscription && billingData?.status && (
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      billingData.status === 'active' ? 'bg-green-50 text-green-600' :
                      billingData.status === 'past_due' ? 'bg-red-50 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {billingData.status === 'active' ? 'Active' : billingData.status === 'past_due' ? 'Past Due' : billingData.status}
                    </span>
                    {billingData.current_period_end && (
                      <span className="text-xs text-[#4F4F4F]">
                        Next billing: {new Date(billingData.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  {!(billingData?.has_paid_subscription ?? profile.hasPaidSubscription) ? (
                    <Button
                      onClick={handleUpgradePlan}
                      className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white text-sm"
                    >
                      Upgrade to Premium
                    </Button>
                  ) : (
                    <Button
                      onClick={handleManagePlan}
                      disabled={billingActionLoading}
                      className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white text-sm"
                    >
                      {billingActionLoading ? 'Loading...' : 'Manage Billing'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Payment Method - Only show for paid users */}
              {(billingData?.has_paid_subscription ?? profile.hasPaidSubscription) && billingData?.payment_method && (
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-sm text-[#4F4F4F] mb-1">Payment Method</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs">
                          {billingData.payment_method.brand === 'visa' ? 'VISA' : billingData.payment_method.brand?.toUpperCase() || '****'}
                        </div>
                        <div>
                          <p className="text-sm text-[#2A2A2A]">
                            {billingData.payment_method.brand ? `${billingData.payment_method.brand.charAt(0).toUpperCase()}${billingData.payment_method.brand.slice(1)}` : 'Card'} ending in {billingData.payment_method.last4 || '****'}
                          </p>
                          {billingData.payment_method.exp_month && billingData.payment_method.exp_year && (
                            <p className="text-xs text-[#4F4F4F]">
                              Expires {String(billingData.payment_method.exp_month).padStart(2, '0')}/{billingData.payment_method.exp_year}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleManagePlan}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              )}

              {/* Billing History - Only show for paid users with invoices */}
              {(billingData?.has_paid_subscription ?? profile.hasPaidSubscription) && billingData?.invoices && billingData.invoices.length > 0 && (
                <div>
                  <h3 className="text-sm text-[#4F4F4F] mb-4">Billing History</h3>
                  <div className="space-y-3">
                    {billingData.invoices.map((invoice: any) => (
                      <div key={invoice.id} className="flex justify-between items-center py-2">
                        <div>
                          <p className="text-sm text-[#2A2A2A]">{invoice.period || invoice.date}</p>
                          {invoice.paid_at && (
                            <p className="text-xs text-[#4F4F4F]">Paid on {invoice.paid_at}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-sm text-[#2A2A2A]">{invoice.amount || invoice.total}</p>
                          {invoice.receipt_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(invoice.receipt_url, '_blank')}
                            >
                              Receipt
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Auth Drawer */}
      <AuthDrawer
        isOpen={authDrawerOpen}
        onClose={() => setAuthDrawerOpen(false)}
        defaultMode="login"
        onSuccess={() => setAuthDrawerOpen(false)}
      />
    </div>
  );
}
