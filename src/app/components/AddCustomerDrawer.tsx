import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Plus, Trash2, Loader2, MapPin, ChevronDown } from 'lucide-react';
import { createRestaurant, createContact } from '../services/api';
import { useGooglePlaces } from '../hooks/useGooglePlaces';
import type { ParsedAddress } from '../hooks/useGooglePlaces';

interface AddCustomerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (savedRestaurant?: { id: string; name: string }) => void;
}

const recommendedPositions = [
  'Executive Chef',
  'Sous Chef',
  'Pastry Chef',
  'Porter',
];

interface ChefContact {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export function AddCustomerDrawer({ open, onOpenChange, onSuccess }: AddCustomerDrawerProps) {
  const [formData, setFormData] = useState({
    restaurantName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
  });
  const [addressDisplay, setAddressDisplay] = useState('');

  const addressInputRef = useRef<HTMLInputElement>(null);
  const handlePlaceSelect = useCallback((address: ParsedAddress) => {
    setFormData(prev => ({
      ...prev,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      zip: address.zip,
    }));
    setAddressDisplay(address.formatted);
  }, []);
  const { ready: placesReady, error: placesError } = useGooglePlaces(addressInputRef, handlePlaceSelect);

  const [contacts, setContacts] = useState<ChefContact[]>([]);
  const [showNewPositionInput, setShowNewPositionInput] = useState<Record<string, boolean>>({});
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close role dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openRoleDropdown) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenRoleDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openRoleDropdown]);

  const addContact = () => {
    const newContact: ChefContact = {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      role: '',
      email: '',
      phone: '',
      isPrimary: contacts.length === 0, // First contact is primary by default
    };
    setContacts([...contacts, newContact]);
  };

  const removeContact = (id: string) => {
    const remaining = contacts.filter(c => c.id !== id);
    // If we removed the primary, make the first remaining one primary
    if (remaining.length > 0 && !remaining.some(c => c.isPrimary)) {
      remaining[0].isPrimary = true;
    }
    setContacts(remaining);
  };

  const updateContactField = (id: string, field: keyof ChefContact, value: string | boolean) => {
    setContacts(contacts.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const resetForm = () => {
    setFormData({
      restaurantName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zip: '',
    });
    setAddressDisplay('');
    setContacts([]);
    setShowNewPositionInput({});
    setOpenRoleDropdown(null);
    setError(null);
  };

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSave = useCallback(async () => {
    if (!formData.restaurantName.trim()) {
      setError('Restaurant name is required');
      return;
    }

    setSaving(true);
    setError(null);

    // Create the restaurant
    const result = await createRestaurant({
      name: formData.restaurantName,
      address_line_1: formData.addressLine1 || undefined,
      address_line_2: formData.addressLine2 || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      zip: formData.zip || undefined,
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    const restaurantId = result.data!.id;
    const restaurantName = formData.restaurantName;

    // Create contacts
    for (const contact of contacts) {
      if (!contact.firstName && !contact.lastName) continue;
      const contactResult = await createContact(restaurantId, {
        first_name: contact.firstName,
        last_name: contact.lastName,
        role: contact.role || undefined,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        is_primary: contact.isPrimary,
      });
      if (contactResult.error) {
        // Non-fatal: restaurant was created, just warn about contact
        console.warn('Failed to create contact:', contactResult.error);
      }
    }

    setSaving(false);
    resetForm();
    onOpenChange(false);
    onSuccess?.({ id: restaurantId, name: restaurantName });
  }, [formData, contacts, onOpenChange, onSuccess]);

  const handleSelectRole = (contactId: string, value: string) => {
    if (value === 'add-new') {
      setShowNewPositionInput({ ...showNewPositionInput, [contactId]: true });
      updateContactField(contactId, 'role', '');
    } else {
      setShowNewPositionInput({ ...showNewPositionInput, [contactId]: false });
      updateContactField(contactId, 'role', value);
    }
    setOpenRoleDropdown(null);
  };

  const renderPositionSelect = (contactId: string, currentRole: string) => {
    if (showNewPositionInput[contactId]) {
      return (
        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
          <Input
            type="text"
            value={currentRole}
            onChange={(e) => updateContactField(contactId, 'role', e.target.value)}
            placeholder="Enter role"
            className="bg-white"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowNewPositionInput({ ...showNewPositionInput, [contactId]: false });
              updateContactField(contactId, 'role', '');
            }}
            className="text-xs text-gray-600"
          >
            Cancel - Select from list
          </Button>
        </div>
      );
    }

    const isOpen = openRoleDropdown === contactId;
    const displayLabel = currentRole || 'Select role (optional)';

    return (
      <div className="relative" ref={isOpen ? dropdownRef : undefined} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpenRoleDropdown(isOpen ? null : contactId);
          }}
          className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm text-left flex items-center justify-between"
        >
          <span className={currentRole ? 'text-gray-900' : 'text-gray-500'}>{displayLabel}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
              onClick={(e) => { e.stopPropagation(); handleSelectRole(contactId, ''); }}
            >
              Select role (optional)
            </button>
            {recommendedPositions.map((position) => (
              <button
                type="button"
                key={position}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${currentRole === position ? 'bg-gray-100 font-medium' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleSelectRole(contactId, position); }}
              >
                {position}
              </button>
            ))}
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-orange-500 font-medium hover:bg-orange-50 border-t border-gray-100"
              onClick={(e) => { e.stopPropagation(); handleSelectRole(contactId, 'add-new'); }}
            >
              + Add New Role
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Drawer open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }} direction="right" handleOnly>
      <DrawerContent className="w-full sm:max-w-md h-full flex flex-col">
        <DrawerHeader className="border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>Add New Customer</DrawerTitle>
              <DrawerDescription>
                Create a new restaurant customer profile
              </DrawerDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Restaurant Name */}
            <div>
              <Label htmlFor="restaurant-name" className="text-sm mb-2 block">
                Restaurant Name *
              </Label>
              <Input
                id="restaurant-name"
                type="text"
                value={formData.restaurantName}
                onChange={(e) =>
                  setFormData({ ...formData, restaurantName: e.target.value })
                }
                placeholder="Enter restaurant name"
                className="bg-gray-50"
              />
            </div>

            {/* Address — Google Places Autocomplete */}
            <div>
              <Label htmlFor="address-autocomplete" className="text-sm mb-2 block">
                Address
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={addressInputRef}
                  id="address-autocomplete"
                  type="text"
                  defaultValue={addressDisplay}
                  placeholder={placesReady ? 'Start typing an address...' : 'Loading address search...'}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#7FAEC2] focus:border-transparent"
                  autoComplete="off"
                />
              </div>
              {placesError && (
                <p className="text-xs text-amber-600 mt-1">{placesError}</p>
              )}
              {formData.addressLine1 && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  <p className="text-xs text-green-700 font-medium">Address selected:</p>
                  <p className="text-xs text-green-600">
                    {formData.addressLine1}
                    {formData.addressLine2 ? `, ${formData.addressLine2}` : ''}
                    {formData.city ? `, ${formData.city}` : ''}
                    {formData.state ? `, ${formData.state}` : ''}
                    {formData.zip ? ` ${formData.zip}` : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Contacts */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm">Contacts</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addContact}
                  className="text-xs h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Contact
                </Button>
              </div>
              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <div key={contact.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600">
                        Contact {index + 1}
                        {contact.isPrimary && <span className="text-orange-500 ml-1">(Primary)</span>}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(contact.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="text"
                          value={contact.firstName}
                          onChange={(e) => updateContactField(contact.id, 'firstName', e.target.value)}
                          placeholder="First Name"
                          className="bg-white"
                        />
                        <Input
                          type="text"
                          value={contact.lastName}
                          onChange={(e) => updateContactField(contact.id, 'lastName', e.target.value)}
                          placeholder="Last Name"
                          className="bg-white"
                        />
                      </div>
                      {renderPositionSelect(contact.id, contact.role)}
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateContactField(contact.id, 'email', e.target.value)}
                        placeholder="Email"
                        className="bg-white"
                      />
                      <Input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => updateContactField(contact.id, 'phone', e.target.value)}
                        placeholder="Phone"
                        className="bg-white"
                      />
                      {!contact.isPrimary && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setContacts(contacts.map(c => ({
                              ...c,
                              isPrimary: c.id === contact.id,
                            })));
                          }}
                          className="text-xs text-[#A5CFDD]"
                        >
                          Set as Primary
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">
                    No contacts added yet. Click "Add Contact" to add one.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t border-gray-200">
            <Button
              type="button"
              className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white w-full"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Customer'
              )}
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={saving} onClick={handleClose}>
              Cancel
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
