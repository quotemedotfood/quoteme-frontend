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
import { X, Plus, Trash2 } from 'lucide-react';

interface AddCustomerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const existingGroups = [
  'Red Door Group',
  'Lakeside Hospitality',
  'Bella Group',
  'Golden Group',
  'Coastline Dining',
  'Urban Eats Collective',
  'Harbor Side Restaurants',
];

const recommendedPositions = [
  'Executive Chef',
  'Sous Chef',
  'Pastry Chef',
  'Porter',
];

const restaurantTypes = [
  'Fine Dining',
  'Casual Dining',
  'Fast Casual',
  'Cafe',
  'Bar & Grill',
  'Steakhouse',
  'Seafood',
  'Italian',
  'Asian',
  'Mexican',
  'Other',
];

interface ChefContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
}

interface MenuUrl {
  id: string;
  url: string;
  label: string;
}

export function AddCustomerDrawer({ open, onOpenChange }: AddCustomerDrawerProps) {
  const [formData, setFormData] = useState({
    restaurantName: '',
    address: '',
    restaurantType: '',
    contactName: '',
    position: '',
    email: '',
    phone: '',
    groupName: '',
  });

  const [menuUrls, setMenuUrls] = useState<MenuUrl[]>([]);
  const [chefContacts, setChefContacts] = useState<ChefContact[]>([]);
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [showNewPositionInput, setShowNewPositionInput] = useState(false);

  const addMenuUrl = () => {
    const newMenuUrl: MenuUrl = {
      id: Date.now().toString(),
      url: '',
      label: '',
    };
    setMenuUrls([...menuUrls, newMenuUrl]);
  };

  const removeMenuUrl = (id: string) => {
    setMenuUrls(menuUrls.filter(menu => menu.id !== id));
  };

  const updateMenuUrl = (id: string, field: keyof MenuUrl, value: string) => {
    setMenuUrls(menuUrls.map(menu => 
      menu.id === id ? { ...menu, [field]: value } : menu
    ));
  };

  const addChefContact = () => {
    const newChef: ChefContact = {
      id: Date.now().toString(),
      name: '',
      role: '',
      email: '',
      phone: '',
      notes: '',
    };
    setChefContacts([...chefContacts, newChef]);
  };

  const removeChefContact = (id: string) => {
    setChefContacts(chefContacts.filter(chef => chef.id !== id));
  };

  const updateChefContact = (id: string, field: keyof ChefContact, value: string) => {
    setChefContacts(chefContacts.map(chef => 
      chef.id === id ? { ...chef, [field]: value } : chef
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData, chefContacts);
    onOpenChange(false);
    // Reset form
    setFormData({
      restaurantName: '',
      address: '',
      restaurantType: '',
      contactName: '',
      position: '',
      email: '',
      phone: '',
      groupName: '',
    });
    setMenuUrls([]);
    setChefContacts([]);
    setShowNewGroupInput(false);
    setShowNewPositionInput(false);
  };

  const handleGroupChange = (value: string) => {
    if (value === 'add-new') {
      setShowNewGroupInput(true);
      setFormData({ ...formData, groupName: '' });
    } else {
      setShowNewGroupInput(false);
      setFormData({ ...formData, groupName: value });
    }
  };

  const handlePositionChange = (value: string) => {
    if (value === 'add-new') {
      setShowNewPositionInput(true);
      setFormData({ ...formData, position: '' });
    } else {
      setShowNewPositionInput(false);
      setFormData({ ...formData, position: value });
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
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
              <Label htmlFor="address" className="text-sm mb-2 block">
                Address *
              </Label>
              <Input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="123 Main Street, City, State ZIP"
                required
                className="bg-gray-50"
              />
            </div>

            {/* Menu URL */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm">Menu URLs</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMenuUrl}
                  className="text-xs h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Menu URL
                </Button>
              </div>
              <div className="space-y-3">
                {menuUrls.map((menu, index) => (
                  <div key={menu.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600">Menu URL {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMenuUrl(menu.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={menu.url}
                        onChange={(e) => updateMenuUrl(menu.id, 'url', e.target.value)}
                        placeholder="https://www.restaurant.com/menu"
                        className="bg-white"
                      />
                      <Input
                        type="text"
                        value={menu.label}
                        onChange={(e) => updateMenuUrl(menu.id, 'label', e.target.value)}
                        placeholder="Label (optional)"
                        className="bg-white"
                      />
                    </div>
                  </div>
                ))}
                {menuUrls.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">
                    No menu URLs added yet. Click "Add Menu URL" to add one.
                  </p>
                )}
              </div>
            </div>

            {/* Restaurant Type */}
            <div>
              <Label htmlFor="restaurant-type" className="text-sm mb-2 block">
                Restaurant Type
              </Label>
              <select
                id="restaurant-type"
                value={formData.restaurantType}
                onChange={(e) =>
                  setFormData({ ...formData, restaurantType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
              >
                <option value="">Select a type (optional)</option>
                {restaurantTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Name */}
            <div>
              <Label htmlFor="contact-name" className="text-sm mb-2 block">
                Contact Name *
              </Label>
              <Input
                id="contact-name"
                type="text"
                value={formData.contactName}
                onChange={(e) =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
                placeholder="John Smith"
                required
                className="bg-gray-50"
              />
            </div>

            {/* Position */}
            <div>
              <Label htmlFor="position" className="text-sm mb-2 block">
                Position
              </Label>
              {!showNewPositionInput ? (
                <select
                  id="position"
                  value={formData.position}
                  onChange={(e) => handlePositionChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                >
                  <option value="">Select a position (optional)</option>
                  {recommendedPositions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                  <option value="add-new" className="text-orange-500 font-medium">
                    + Add New Position
                  </option>
                </select>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="text"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    placeholder="Enter new position"
                    className="bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewPositionInput(false);
                      setFormData({ ...formData, position: '' });
                    }}
                    className="text-xs text-gray-600"
                  >
                    Cancel - Select from existing positions
                  </Button>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm mb-2 block">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="contact@restaurant.com"
                required
                className="bg-gray-50"
              />
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="text-sm mb-2 block">
                Phone *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="(555) 123-4567"
                required
                className="bg-gray-50"
              />
            </div>

            {/* Group Name */}
            <div>
              <Label htmlFor="group-name" className="text-sm mb-2 block">
                Group Name
              </Label>
              {!showNewGroupInput ? (
                <select
                  id="group-name"
                  value={formData.groupName}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                >
                  <option value="">Select a group (optional)</option>
                  {existingGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                  <option value="add-new" className="text-orange-500 font-medium">
                    + Add New Group
                  </option>
                </select>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="text"
                    value={formData.groupName}
                    onChange={(e) =>
                      setFormData({ ...formData, groupName: e.target.value })
                    }
                    placeholder="Enter new group name"
                    className="bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewGroupInput(false);
                      setFormData({ ...formData, groupName: '' });
                    }}
                    className="text-xs text-gray-600"
                  >
                    Cancel - Select from existing groups
                  </Button>
                </div>
              )}
            </div>

            {/* Chef Contacts */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm">Chef Contacts</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChefContact}
                  className="text-xs h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Chef
                </Button>
              </div>
              <div className="space-y-3">
                {chefContacts.map((chef, index) => (
                  <div key={chef.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600">Chef Contact {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChefContact(chef.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={chef.name}
                        onChange={(e) => updateChefContact(chef.id, 'name', e.target.value)}
                        placeholder="Chef Name"
                        className="bg-white"
                      />
                      <Input
                        type="text"
                        value={chef.role}
                        onChange={(e) => updateChefContact(chef.id, 'role', e.target.value)}
                        placeholder="Role (e.g., Sous Chef)"
                        className="bg-white"
                      />
                      <Input
                        type="email"
                        value={chef.email}
                        onChange={(e) => updateChefContact(chef.id, 'email', e.target.value)}
                        placeholder="Email"
                        className="bg-white"
                      />
                      <Input
                        type="tel"
                        value={chef.phone}
                        onChange={(e) => updateChefContact(chef.id, 'phone', e.target.value)}
                        placeholder="Phone"
                        className="bg-white"
                      />
                      <Input
                        type="text"
                        value={chef.notes}
                        onChange={(e) => updateChefContact(chef.id, 'notes', e.target.value)}
                        placeholder="Notes (optional)"
                        className="bg-white"
                      />
                    </div>
                  </div>
                ))}
                {chefContacts.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">
                    No chef contacts added yet. Click "Add Chef" to add one.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t border-gray-200">
            <Button
              type="submit"
              className="bg-[#F2993D] hover:bg-[#E08A2E] text-white w-full"
            >
              Add Customer
            </Button>
            <DrawerClose asChild>
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}