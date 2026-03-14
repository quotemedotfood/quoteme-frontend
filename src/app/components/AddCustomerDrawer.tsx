import { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { createRestaurant, createContact } from '../services/api';

interface AddCustomerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
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

  const [contacts, setContacts] = useState<ChefContact[]>([]);
  const [showNewPositionInput, setShowNewPositionInput] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const updateContact = (id: string, field: keyof ChefContact, value: string | boolean) => {
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
    setContacts([]);
    setShowNewPositionInput({});
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    onSuccess?.();
  };

  const handlePositionChange = (contactId: string, value: string) => {
    if (value === 'add-new') {
      setShowNewPositionInput({ ...showNewPositionInput, [contactId]: true });
      updateContact(contactId, 'role', '');
    } else {
      setShowNewPositionInput({ ...showNewPositionInput, [contactId]: false });
      updateContact(contactId, 'role', value);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(val) => { if (!val) resetForm(); onOpenChange(val); }} direction="right">
      <DrawerContent className="w-full sm:max-w-md h-full flex flex-col">
        <DrawerHeader className="border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>Add New Customer</DrawerTitle>
              <DrawerDescription>
                Create a new restaurant customer profile
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
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
                required
                className="bg-gray-50"
              />
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="address-line-1" className="text-sm mb-2 block">
                Address
              </Label>
              <Input
                id="address-line-1"
                type="text"
                value={formData.addressLine1}
                onChange={(e) =>
                  setFormData({ ...formData, addressLine1: e.target.value })
                }
                placeholder="Street address"
                className="bg-gray-50 mb-2"
              />
              <Input
                type="text"
                value={formData.addressLine2}
                onChange={(e) =>
                  setFormData({ ...formData, addressLine2: e.target.value })
                }
                placeholder="Suite, unit, etc. (optional)"
                className="bg-gray-50 mb-2"
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="City"
                  className="bg-gray-50"
                />
                <Input
                  type="text"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  placeholder="State"
                  className="bg-gray-50"
                />
                <Input
                  type="text"
                  value={formData.zip}
                  onChange={(e) =>
                    setFormData({ ...formData, zip: e.target.value })
                  }
                  placeholder="ZIP"
                  className="bg-gray-50"
                />
              </div>
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
                          onChange={(e) => updateContact(contact.id, 'firstName', e.target.value)}
                          placeholder="First Name"
                          className="bg-white"
                        />
                        <Input
                          type="text"
                          value={contact.lastName}
                          onChange={(e) => updateContact(contact.id, 'lastName', e.target.value)}
                          placeholder="Last Name"
                          className="bg-white"
                        />
                      </div>
                      {!showNewPositionInput[contact.id] ? (
                        <select
                          value={contact.role}
                          onChange={(e) => handlePositionChange(contact.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm"
                        >
                          <option value="">Select role (optional)</option>
                          {recommendedPositions.map((position) => (
                            <option key={position} value={position}>
                              {position}
                            </option>
                          ))}
                          <option value="add-new" className="text-orange-500 font-medium">
                            + Add New Role
                          </option>
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <Input
                            type="text"
                            value={contact.role}
                            onChange={(e) => updateContact(contact.id, 'role', e.target.value)}
                            placeholder="Enter role"
                            className="bg-white"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowNewPositionInput({ ...showNewPositionInput, [contact.id]: false });
                              updateContact(contact.id, 'role', '');
                            }}
                            className="text-xs text-gray-600"
                          >
                            Cancel - Select from list
                          </Button>
                        </div>
                      )}
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                        placeholder="Email"
                        className="bg-white"
                      />
                      <Input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
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
              type="submit"
              className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white w-full"
              disabled={saving}
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
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="w-full" disabled={saving}>
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
