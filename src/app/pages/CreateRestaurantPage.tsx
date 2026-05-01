import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Check, Store } from 'lucide-react';
import { useGooglePlaces } from '../hooks/useGooglePlaces';
import { createRestaurant } from '../services/adminApi';
import type { Restaurant } from '../services/adminApi';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL',
  'GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

export function CreateRestaurantPage() {
  const navigate = useNavigate();

  // Form fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Restaurant | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateId, setDuplicateId] = useState('');
  const [stateError, setStateError] = useState('');

  // Google Places autocomplete
  const autocompleteRef = useRef<HTMLInputElement | null>(null);
  useGooglePlaces(
    autocompleteRef,
    (addr) => {
      setAddress(addr.addressLine1);
      setAddress2(addr.addressLine2);
      setCity(addr.city);
      setState(addr.state);
      setZip(addr.zip);
      setGooglePlaceId(addr.placeId);
    },
    { types: ['establishment', 'geocode'] },
  );

  const validate = () => {
    if (!name.trim()) return 'Restaurant name is required.';
    if (!city.trim()) return 'City is required.';
    if (!state) return 'State is required.';
    if (state && !US_STATES.includes(state.toUpperCase())) return 'Invalid state code.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDuplicateId('');
    setStateError('');

    const validationError = validate();
    if (validationError) {
      if (validationError.includes('state') || validationError.includes('State')) {
        setStateError(validationError);
      } else {
        setErrorMsg(validationError);
      }
      return;
    }

    setSubmitting(true);

    const res = await createRestaurant({
      name: name.trim(),
      city: city.trim(),
      state: state.toUpperCase(),
      address: address.trim() || undefined,
      address_2: address2.trim() || undefined,
      zip: zip.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      google_place_id: googlePlaceId || undefined,
    });

    setSubmitting(false);

    if ('duplicateId' in res && res.duplicateId) {
      setDuplicateId(res.duplicateId);
      setErrorMsg(res.error || 'A restaurant with this name already exists for your distributor.');
      return;
    }

    if (res.error) {
      // 422 state error
      if (res.error.toLowerCase().includes('state')) {
        setStateError(res.error);
      } else {
        setErrorMsg(res.error);
      }
      return;
    }

    if (res.data) {
      setCreated(res.data);
    }
  };

  if (created) {
    return (
      <div className="p-6 md:p-10 max-w-xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-[#2A2A2A] mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Restaurant created
          </h2>
          <p className="text-sm text-[#4F4F4F] mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {created.name}
          </p>
          <p className="text-xs text-gray-400 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            ID: {created.id}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate('/customers')}
              className="w-full bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
            >
              Back to Customers
            </Button>
            <button
              onClick={() => {
                setCreated(null);
                setName('');
                setAddress('');
                setAddress2('');
                setCity('');
                setState('');
                setZip('');
                setPhone('');
                setEmail('');
                setGooglePlaceId('');
              }}
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-[#4F4F4F]"
            >
              Add another restaurant
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-9 h-9 bg-[#A5CFDD]/20 rounded-lg">
            <Store className="w-5 h-5 text-[#7FAEC2]" />
          </div>
          <h1
            className="text-2xl font-bold text-[#2A2A2A]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Add Restaurant
          </h1>
        </div>
        <p className="text-sm text-[#4F4F4F] ml-12" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Create a new restaurant record for your distributor.
        </p>
      </div>

      {/* Error banner */}
      {errorMsg && !duplicateId && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Duplicate banner */}
      {duplicateId && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <p className="font-medium">A restaurant with this name already exists for your distributor.</p>
          <a
            href={`/customers`}
            className="mt-1 inline-block text-[#7FAEC2] underline hover:text-[#5C94AE] text-sm"
            onClick={(e) => { e.preventDefault(); navigate('/customers'); }}
          >
            View existing restaurant
          </a>
          {' '}
          <span className="text-xs text-gray-400">(ID: {duplicateId})</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
        {/* Restaurant Name */}
        <div>
          <Label htmlFor="name" className="text-sm font-medium text-[#4F4F4F]">
            Restaurant name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Spotted Owl"
            className="mt-1"
            required
          />
        </div>

        {/* Address autocomplete */}
        <div>
          <Label htmlFor="autocomplete" className="text-sm font-medium text-[#4F4F4F]">
            Search address
          </Label>
          <p className="text-xs text-gray-400 mb-1">
            Select from the dropdown to auto-fill address fields below.
          </p>
          <Input
            id="autocomplete"
            ref={autocompleteRef}
            placeholder="Start typing an address or restaurant name..."
            className="mt-1"
            autoComplete="off"
          />
        </div>

        {/* Address Line 1 */}
        <div>
          <Label htmlFor="address" className="text-sm font-medium text-[#4F4F4F]">
            Address line 1
          </Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St"
            className="mt-1"
          />
        </div>

        {/* Address Line 2 */}
        <div>
          <Label htmlFor="address2" className="text-sm font-medium text-[#4F4F4F]">
            Address line 2
          </Label>
          <Input
            id="address2"
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
            placeholder="Suite 200"
            className="mt-1"
          />
        </div>

        {/* City / State / Zip row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="city" className="text-sm font-medium text-[#4F4F4F]">
              City <span className="text-red-500">*</span>
            </Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Portland"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="state" className="text-sm font-medium text-[#4F4F4F]">
              State <span className="text-red-500">*</span>
            </Label>
            <select
              id="state"
              value={state}
              onChange={(e) => { setState(e.target.value); setStateError(''); }}
              className={`mt-1 w-full h-9 rounded-md border bg-white px-3 text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#A5CFDD] ${
                stateError ? 'border-red-400' : 'border-gray-200'
              }`}
              required
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {stateError && (
              <p className="mt-1 text-xs text-red-600">{stateError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="zip" className="text-sm font-medium text-[#4F4F4F]">
              Zip
            </Label>
            <Input
              id="zip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="97201"
              className="mt-1"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone" className="text-sm font-medium text-[#4F4F4F]">
            Phone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(503) 555-1234"
            className="mt-1"
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-[#4F4F4F]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="info@restaurant.com"
            className="mt-1"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Restaurant'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
