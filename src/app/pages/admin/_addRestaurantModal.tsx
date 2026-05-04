import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { X, Loader2, Check, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useGooglePlaces } from '../../hooks/useGooglePlaces';
import {
  createRestaurant,
  getAdminDistributors,
  type AdminDistributor,
  type Restaurant,
} from '../../services/adminApi';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL',
  'GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddRestaurantModal({ open, onClose, onCreated }: Props) {
  const navigate = useNavigate();

  // Distributor list
  const [distributors, setDistributors] = useState<AdminDistributor[]>([]);
  const [distributorId, setDistributorId] = useState('');

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
  const [pickedFormatted, setPickedFormatted] = useState('');
  const [pickedLat, setPickedLat] = useState<number | null>(null);
  const [pickedLng, setPickedLng] = useState<number | null>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Restaurant | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateId, setDuplicateId] = useState('');

  // Google Places
  const autocompleteRef = useRef<HTMLInputElement | null>(null);
  const { error: placesError } = useGooglePlaces(
    autocompleteRef,
    (addr) => {
      setAddress(addr.addressLine1);
      setAddress2(addr.addressLine2);
      setCity(addr.city);
      setState(addr.state);
      setZip(addr.zip);
      setGooglePlaceId(addr.placeId);
      setPickedFormatted(addr.formatted);
      setPickedLat(addr.lat);
      setPickedLng(addr.lng);
    },
    { types: ['establishment', 'geocode'] },
  );

  // Load distributors on modal open
  useEffect(() => {
    if (!open) return;
    getAdminDistributors().then((res) => {
      if (res.data) setDistributors(res.data);
    });
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    if (submitting) return;
    resetForm();
    onClose();
  }

  function resetForm() {
    setDistributorId('');
    setName('');
    setAddress('');
    setAddress2('');
    setCity('');
    setState('');
    setZip('');
    setPhone('');
    setEmail('');
    setGooglePlaceId('');
    setPickedFormatted('');
    setPickedLat(null);
    setPickedLng(null);
    setSubmitting(false);
    setCreated(null);
    setErrorMsg('');
    setDuplicateId('');
  }

  function validate(): string | null {
    if (!distributorId) return 'Please select a distributor.';
    if (!name.trim()) return 'Restaurant name is required.';
    if (!city.trim()) return 'City is required.';
    if (!state) return 'State is required.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setDuplicateId('');

    const validErr = validate();
    if (validErr) {
      setErrorMsg(validErr);
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
      distributor_id: distributorId,
    });

    setSubmitting(false);

    if ('duplicateId' in res && res.duplicateId) {
      setDuplicateId(res.duplicateId);
      setErrorMsg(res.error || 'A restaurant with this name already exists for the selected distributor.');
      return;
    }

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    if (res.data) {
      setCreated(res.data);
      onCreated();
      // Auto-close after 1.5s
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1500);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-[#7FAEC2]" />
            <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Add Restaurant
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {created && (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-medium text-[#2A2A2A] mb-1">{created.name}</p>
            <p className="text-xs text-gray-400 mb-4">ID: {created.id}</p>
            <button
              onClick={() => { resetForm(); onClose(); }}
              className="text-sm text-[#7FAEC2] underline hover:text-[#5C94AE]"
            >
              Done
            </button>
          </div>
        )}

        {/* Form */}
        {!created && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Error banners */}
            {errorMsg && !duplicateId && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {errorMsg}
              </div>
            )}
            {duplicateId && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <p className="font-medium">A restaurant with this name already exists for the selected distributor.</p>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => { handleClose(); navigate(`/qm-admin/restaurants/${duplicateId}`); }}
                    className="text-[#7FAEC2] underline hover:text-[#5C94AE] text-sm"
                  >
                    View existing
                  </button>
                  <span className="text-xs text-gray-400">(ID: {duplicateId})</span>
                </div>
              </div>
            )}

            {/* Distributor */}
            <div>
              <Label className="text-sm font-medium text-[#4F4F4F]">
                Distributor <span className="text-red-500">*</span>
              </Label>
              <select
                value={distributorId}
                onChange={(e) => setDistributorId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#A5CFDD]"
              >
                <option value="">(select distributor)</option>
                {distributors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Restaurant Name */}
            <div>
              <Label className="text-sm font-medium text-[#4F4F4F]">
                Restaurant name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Spotted Owl"
                className="mt-1"
              />
            </div>

            {/* Address autocomplete */}
            <div>
              <Label className="text-sm font-medium text-[#4F4F4F]">
                Search address
              </Label>
              <p className="text-xs text-gray-400 mb-1">
                Select from the dropdown to auto-fill address fields below.
              </p>
              <Input
                ref={autocompleteRef}
                placeholder="Start typing an address or restaurant name..."
                className="mt-1"
                autoComplete="off"
              />
              {placesError && (
                <p className="mt-1 text-xs text-amber-600">
                  Address autocomplete unavailable: {placesError}. Fill in fields manually.
                </p>
              )}
              {pickedFormatted && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-800">
                  <p className="font-medium">Picked: {pickedFormatted}</p>
                  {pickedLat !== null && pickedLng !== null && (
                    <p className="mt-0.5 text-green-700">
                      Coordinates: {pickedLat.toFixed(6)}, {pickedLng.toFixed(6)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Address Line 1 */}
            <div>
              <Label className="text-sm font-medium text-[#4F4F4F]">Address line 1</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                className="mt-1"
              />
            </div>

            {/* Address Line 2 */}
            <div>
              <Label className="text-sm font-medium text-[#4F4F4F]">Address line 2</Label>
              <Input
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                placeholder="Suite 200"
                className="mt-1"
              />
            </div>

            {/* City / State / Zip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label className="text-sm font-medium text-[#4F4F4F]">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Portland"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#4F4F4F]">
                  State <span className="text-red-500">*</span>
                </Label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#A5CFDD]"
                >
                  <option value="">-</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-[#4F4F4F]">Zip</Label>
                <Input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="97201"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <Label className="text-sm font-medium text-[#4F4F4F]">Phone</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(503) 555-1234"
                className="mt-1"
              />
            </div>

            {/* Email */}
            <div>
              <Label className="text-sm font-medium text-[#4F4F4F]">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@restaurant.com"
                className="mt-1"
              />
            </div>

            {/* TODO: Restaurant group dropdown - deferred to follow-up (requires fetching restaurant groups) */}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-[#4F4F4F]"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
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
        )}
      </div>
    </div>
  );
}
