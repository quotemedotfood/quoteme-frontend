import { useState, useEffect } from 'react';
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
import {
  updateRestaurant,
  createContact,
  updateContact,
  deleteContact,
  type RestaurantDetail,
  type RestaurantContact,
} from '../services/api';

interface EditCustomerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: RestaurantDetail | null;
  contact?: RestaurantContact | null;
  onSuccess?: () => void;
}

const recommendedPositions = [
  'Executive Chef',
  'Sous Chef',
  'Pastry Chef',
  'Porter',
];

interface EditableContact {
  id: string;
  isNew: boolean;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  deleted: boolean;
}

export function EditCustomerDrawer({
  open,
  onOpenChange,
  restaurant,
  contact,
  onSuccess,
}: EditCustomerDrawerProps) {
  // Restaurant form fields
  const [formData, setFormData] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
  });

  // Contact editing (single contact mode)
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    role: '',
    email: '',
    phone: '',
    isPrimary: false,
  });

  // Contact list editing (restaurant mode)
  const [editableContacts, setEditableContacts] = useState<EditableContact[]>([]);
  const [showNewPositionInput, setShowNewPositionInput] = useState<Record<string, boolean>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  const isContactMode = !!contact;

  // Populate form when data changes
  useEffect(() => {
    if (contact) {
      setContactForm({
        firstName: contact.first_name || '',
        lastName: contact.last_name || '',
        role: contact.role || '',
        email: contact.email || '',
        phone: contact.phone || '',
        isPrimary: contact.is_primary,
      });
      setEditableContacts([]);
    } else if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        addressLine1: restaurant.address_line_1 || '',
        addressLine2: restaurant.address_line_2 || '',
        city: restaurant.city || '',
        state: restaurant.state || '',
        zip: restaurant.zip || '',
      });
      setEditableContacts(
        restaurant.contacts.map((c) => ({
          id: c.id,
          isNew: false,
          firstName: c.first_name,
          lastName: c.last_name,
          role: c.role || '',
          email: c.email || '',
          phone: c.phone || '',
          isPrimary: c.is_primary,
          deleted: false,
        }))
      );
    }
    setError(null);
    setShowNewPositionInput({});
  }, [restaurant, contact]);

  const addNewContact = () => {
    const newContact: EditableContact = {
      id: `new-${Date.now()}`,
      isNew: true,
      firstName: '',
      lastName: '',
      role: '',
      email: '',
      phone: '',
      isPrimary: false,
      deleted: false,
    };
    setEditableContacts([...editableContacts, newContact]);
  };

  const markContactDeleted = (id: string) => {
    setEditableContacts(editableContacts.map(c =>
      c.id === id ? { ...c, deleted: true } : c
    ));
  };

  const removeNewContact = (id: string) => {
    setEditableContacts(editableContacts.filter(c => c.id !== id));
  };

  const updateEditableContact = (id: string, field: keyof EditableContact, value: string | boolean) => {
    setEditableContacts(editableContacts.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleDeleteContact = async (contactToDelete: EditableContact) => {
    if (contactToDelete.isNew) {
      removeNewContact(contactToDelete.id);
      return;
    }

    if (!restaurant) return;

    setDeletingContactId(contactToDelete.id);
    const result = await deleteContact(restaurant.id, contactToDelete.id);
    setDeletingContactId(null);

    if (result.error) {
      setError(`Failed to delete contact: ${result.error}`);
      return;
    }

    markContactDeleted(contactToDelete.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    setSaving(true);
    setError(null);

    if (isContactMode && contact) {
      // Update single contact
      const result = await updateContact(restaurant.id, contact.id, {
        first_name: contactForm.firstName,
        last_name: contactForm.lastName,
        role: contactForm.role || undefined,
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
        is_primary: contactForm.isPrimary,
      });

      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
    } else {
      // Update restaurant
      const restaurantResult = await updateRestaurant(restaurant.id, {
        name: formData.name,
        address_line_1: formData.addressLine1 || undefined,
        address_line_2: formData.addressLine2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip: formData.zip || undefined,
      });

      if (restaurantResult.error) {
        setError(restaurantResult.error);
        setSaving(false);
        return;
      }

      // Process contact changes
      const activeContacts = editableContacts.filter(c => !c.deleted);
      for (const ec of activeContacts) {
        if (ec.isNew) {
          if (!ec.firstName && !ec.lastName) continue;
          const result = await createContact(restaurant.id, {
            first_name: ec.firstName,
            last_name: ec.lastName,
            role: ec.role || undefined,
            email: ec.email || undefined,
            phone: ec.phone || undefined,
            is_primary: ec.isPrimary,
          });
          if (result.error) {
            console.warn('Failed to create contact:', result.error);
          }
        } else {
          // Update existing contact
          const original = restaurant.contacts.find(c => c.id === ec.id);
          if (!original) continue;

          const hasChanged =
            original.first_name !== ec.firstName ||
            original.last_name !== ec.lastName ||
            (original.role || '') !== ec.role ||
            (original.email || '') !== ec.email ||
            (original.phone || '') !== ec.phone ||
            original.is_primary !== ec.isPrimary;

          if (hasChanged) {
            const result = await updateContact(restaurant.id, ec.id, {
              first_name: ec.firstName,
              last_name: ec.lastName,
              role: ec.role || undefined,
              email: ec.email || undefined,
              phone: ec.phone || undefined,
              is_primary: ec.isPrimary,
            });
            if (result.error) {
              console.warn('Failed to update contact:', result.error);
            }
          }
        }
      }
    }

    setSaving(false);
    onOpenChange(false);
    onSuccess?.();
  };

  const handlePositionChange = (contactId: string, value: string) => {
    if (value === 'add-new') {
      setShowNewPositionInput({ ...showNewPositionInput, [contactId]: true });
      if (isContactMode) {
        setContactForm({ ...contactForm, role: '' });
      } else {
        updateEditableContact(contactId, 'role', '');
      }
    } else {
      setShowNewPositionInput({ ...showNewPositionInput, [contactId]: false });
      if (isContactMode) {
        setContactForm({ ...contactForm, role: value });
      } else {
        updateEditableContact(contactId, 'role', value);
      }
    }
  };

  const renderPositionSelect = (contactId: string, currentRole: string) => {
    if (showNewPositionInput[contactId]) {
      return (
        <div className="space-y-1">
          <Input
            type="text"
            value={currentRole}
            onChange={(e) => {
              if (isContactMode) {
                setContactForm({ ...contactForm, role: e.target.value });
              } else {
                updateEditableContact(contactId, 'role', e.target.value);
              }
            }}
            placeholder="Enter role"
            className="bg-white"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowNewPositionInput({ ...showNewPositionInput, [contactId]: false });
              if (isContactMode) {
                setContactForm({ ...contactForm, role: '' });
              } else {
                updateEditableContact(contactId, 'role', '');
              }
            }}
            className="text-xs text-gray-600"
          >
            Cancel - Select from list
          </Button>
        </div>
      );
    }

    return (
      <select
        value={currentRole}
        onChange={(e) => handlePositionChange(contactId, e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm"
      >
        <option value="">Select role (optional)</option>
        {recommendedPositions.map((position) => (
          <option key={position} value={position}>
            {position}
          </option>
        ))}
        {/* Show current role if not in list */}
        {currentRole && !recommendedPositions.includes(currentRole) && (
          <option value={currentRole}>{currentRole}</option>
        )}
        <option value="add-new" className="text-orange-500 font-medium">
          + Add New Role
        </option>
      </select>
    );
  };

  const activeContacts = editableContacts.filter(c => !c.deleted);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-full sm:max-w-md h-full flex flex-col">
        <DrawerHeader className="border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle>
                {isContactMode ? 'Edit Contact' : 'Edit Customer'}
              </DrawerTitle>
              <DrawerDescription>
                {isContactMode
                  ? `Update contact for ${restaurant?.name || ''}`
                  : 'Update restaurant customer profile'}
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

            {isContactMode ? (
              <>
                {/* Single Contact Edit */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm mb-2 block">First Name *</Label>
                    <Input
                      type="text"
                      value={contactForm.firstName}
                      onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                      placeholder="First name"
                      required
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Last Name *</Label>
                    <Input
                      type="text"
                      value={contactForm.lastName}
                      onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                      placeholder="Last name"
                      required
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Role</Label>
                  {renderPositionSelect('single-contact', contactForm.role)}
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Email</Label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="contact@restaurant.com"
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Phone</Label>
                  <Input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="bg-gray-50"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-primary"
                    checked={contactForm.isPrimary}
                    onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is-primary" className="text-sm cursor-pointer">
                    Primary contact
                  </Label>
                </div>

                {/* Delete Contact Button */}
                {contact && restaurant && (
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      disabled={deletingContactId === contact.id}
                      onClick={async () => {
                        if (!confirm('Are you sure you want to delete this contact?')) return;
                        setDeletingContactId(contact.id);
                        const result = await deleteContact(restaurant.id, contact.id);
                        setDeletingContactId(null);
                        if (result.error) {
                          setError(`Failed to delete: ${result.error}`);
                          return;
                        }
                        onOpenChange(false);
                        onSuccess?.();
                      }}
                    >
                      {deletingContactId === contact.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Contact
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Restaurant Edit */}
                <div>
                  <Label htmlFor="restaurant-name" className="text-sm mb-2 block">
                    Restaurant Name *
                  </Label>
                  <Input
                    id="restaurant-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter restaurant name"
                    required
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Address</Label>
                  <Input
                    type="text"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    placeholder="Street address"
                    className="bg-gray-50 mb-2"
                  />
                  <Input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    placeholder="Suite, unit, etc. (optional)"
                    className="bg-gray-50 mb-2"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                      className="bg-gray-50"
                    />
                    <Input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                      className="bg-gray-50"
                    />
                    <Input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      placeholder="ZIP"
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                {/* Contacts Section */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-sm">Contacts</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNewContact}
                      className="text-xs h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Contact
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {activeContacts.map((ec, index) => (
                      <div key={ec.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-600">
                            Contact {index + 1}
                            {ec.isPrimary && <span className="text-orange-500 ml-1">(Primary)</span>}
                            {ec.isNew && <span className="text-green-500 ml-1">(New)</span>}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteContact(ec)}
                            disabled={deletingContactId === ec.id}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            {deletingContactId === ec.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="text"
                              value={ec.firstName}
                              onChange={(e) => updateEditableContact(ec.id, 'firstName', e.target.value)}
                              placeholder="First Name"
                              className="bg-white"
                            />
                            <Input
                              type="text"
                              value={ec.lastName}
                              onChange={(e) => updateEditableContact(ec.id, 'lastName', e.target.value)}
                              placeholder="Last Name"
                              className="bg-white"
                            />
                          </div>
                          {renderPositionSelect(ec.id, ec.role)}
                          <Input
                            type="email"
                            value={ec.email}
                            onChange={(e) => updateEditableContact(ec.id, 'email', e.target.value)}
                            placeholder="Email"
                            className="bg-white"
                          />
                          <Input
                            type="tel"
                            value={ec.phone}
                            onChange={(e) => updateEditableContact(ec.id, 'phone', e.target.value)}
                            placeholder="Phone"
                            className="bg-white"
                          />
                          {!ec.isPrimary && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditableContacts(editableContacts.map(c => ({
                                  ...c,
                                  isPrimary: c.id === ec.id,
                                })));
                              }}
                              className="text-xs text-blue-600"
                            >
                              Set as Primary
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {activeContacts.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-4">
                        No contacts. Click "Add Contact" to add one.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
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
                'Save Changes'
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
