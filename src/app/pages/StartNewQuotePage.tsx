import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ExternalLink, Upload, Plus, Link as LinkIcon, X, PlusCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Checkbox } from '../components/ui/checkbox';
import { useUser } from '../contexts/UserContext';
import { UpgradeDrawer } from '../components/UpgradeDrawer';
import { createMenu, createGuestQuote } from '../services/api';

// Test restaurant data with multiple contacts
const testRestaurants = [
  {
    id: '1',
    name: 'The Garden Bistro',
    businessName: 'Garden Bistro LLC',
    streetAddress: '456 Oak Avenue',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    country: 'USA',
    website: 'www.gardenbistro.com',
    restaurantType: 'Fine Dining',
    cuisineType: 'American, Farm-to-Table',
    notes: 'Focus on seasonal menus and local partnerships',
    preferences: 'Organic produce, locally sourced meats, sustainable seafood',
    contacts: [
      { id: 'c1-1', name: 'Sarah Mitchell', email: 'sarah@gardenbistro.com', phone: '(555) 123-4567', role: 'Owner' },
      { id: 'c1-2', name: 'James Chef', email: 'james@gardenbistro.com', phone: '(555) 123-4568', role: 'Head Chef' },
      { id: 'c1-3', name: 'Maria Manager', email: 'maria@gardenbistro.com', phone: '(555) 123-4569', role: 'Manager' },
    ]
  },
  {
    id: '2',
    name: 'Riverside Steakhouse',
    businessName: 'Riverside Dining Group',
    streetAddress: '789 Water Street',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101',
    country: 'USA',
    website: 'www.riversidesteakhouse.com',
    restaurantType: 'Casual Dining',
    cuisineType: 'Steakhouse, Seafood',
    notes: 'High-volume location with strong happy hour business',
    preferences: 'Premium aged beef, fresh seafood, organic vegetables',
    contacts: [
      { id: 'c2-1', name: 'Michael Chen', email: 'mchen@riversidesteakhouse.com', phone: '(555) 987-6543', role: 'General Manager' },
      { id: 'c2-2', name: 'Lisa Sous', email: 'lisa@riversidesteakhouse.com', phone: '(555) 987-6544', role: 'Sous Chef' },
    ]
  },
  {
    id: '3',
    name: 'Bella Italia',
    businessName: 'Bella Italia Restaurant Inc',
    streetAddress: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'USA',
    website: 'www.bellaitalia.com',
    restaurantType: 'Fine Dining',
    cuisineType: 'Italian',
    notes: 'Family-owned, emphasis on authentic Italian recipes',
    preferences: 'Imported Italian ingredients, fresh herbs, artisanal cheeses',
    contacts: [
      { id: 'c3-1', name: 'Antonio Rossi', email: 'antonio@bellaitalia.com', phone: '(555) 456-7890', role: 'Owner' },
      { id: 'c3-2', name: 'Marco Rossi', email: 'marco@bellaitalia.com', phone: '(555) 456-7891', role: 'Head Chef' },
    ]
  },
];

export function StartNewQuotePage() {
  const navigate = useNavigate();
  const [isAddRestaurantOpen, setIsAddRestaurantOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<typeof testRestaurants[0] | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [menuPreviewText, setMenuPreviewText] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [menuUrl, setMenuUrl] = useState('');
  const [isQuoteOpened, setIsQuoteOpened] = useState(false);
  const [isUpgradeDrawerOpen, setIsUpgradeDrawerOpen] = useState(false);
  const { hasQuotesRemaining, incrementQuoteCount, quotesRemaining, profile } = useUser();
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);

  const handleParseMenu = () => {
    if (pasteText) {
      setMenuPreviewText(pasteText);
    } else {
      // Simulation for demo purposes if no text is pasted
      setMenuPreviewText("Parsed Menu Data:\n\nAppetizers:\n- Calamari Fritti $14\n- Bruschetta $10\n\nMain Courses:\n- Orecchiette with Broccoli Rabe $18\n- Margherita Pizza $16\n- Grilled Salmon $24\n\nDesserts:\n- Tiramisu $9");
    }
  };

  const handleContinueToQuoteBuilder = async () => {
    const menuText = pasteText || menuPreviewText;
    if (!menuText) {
      alert('Please paste or parse menu text before continuing.');
      return;
    }

    if (!hasQuotesRemaining()) {
      setIsUpgradeDrawerOpen(true);
      return;
    }

    console.log('profile:', profile);

    setIsCreatingQuote(true);
    try {
      if (profile.isGuest || localStorage.getItem('quoteme_token') === null) {
        const response = await createGuestQuote({ raw_text: menuText, name: selectedRestaurant?.name || 'New Quote' });
        if (response.data) {
          incrementQuoteCount();
          navigate('/map-ingredients', { state: { quoteId: response.data.id } });
        }
      } else {
        const response = await createMenu({ raw_text: menuText, name: selectedRestaurant?.name || 'New Quote' });
        if (response.data) {
          incrementQuoteCount();
          navigate('/map-ingredients', { state: { menuId: response.data.id } });
        }
      }
    } catch (error) {
      console.error('Failed to create quote:', error);
      alert('Failed to create quote. Please try again.');
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const handleRestaurantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'add-new') {
      setIsAddRestaurantOpen(true);
      e.target.value = ''; // Reset the select
    } else if (e.target.value) {
      const restaurant = testRestaurants.find(r => r.id === e.target.value);
      setSelectedRestaurant(restaurant || null);
      setSelectedContactIds([]); // Reset contacts when restaurant changes
    } else {
      setSelectedRestaurant(null);
      setSelectedContactIds([]);
    }
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl mb-1 text-[#4F4F4F]">Start New Quote</h1>
          <p className="text-[#4F4F4F] text-sm">
            Create a new quote for a restaurant customer
          </p>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg">Customer Information</h2>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-blue-600 text-sm"
              onClick={() => setIsQuoteOpened(!isQuoteOpened)}
            >
              {isQuoteOpened ? 'Back to Customer Info' : 'Open quote'}
            </Button>
          </div>
          <p className="text-gray-500 text-sm mb-4 font-bold">
            For customer intake and information
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="restaurant" className="text-sm mb-2 block">Customer</Label>
              <div className="relative">
                <select
                  id="restaurant"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm appearance-none pr-8"
                  onChange={handleRestaurantChange}
                >
                  <option>Select a customer</option>
                  {testRestaurants.map(restaurant => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                  <option value="add-new" className="text-[#F2993D]">+ Add new</option>
                </select>
                <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 font-bold" />
              </div>
            </div>
            <div>
              <Label htmlFor="group" className="text-sm mb-2 block">Customer Group</Label>
              <div className="relative">
                <select
                  id="group"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm appearance-none pr-8"
                  onChange={(e) => {
                    if (e.target.value === 'add-new') {
                      setIsAddGroupOpen(true);
                      e.target.value = ''; // Reset the select
                    }
                  }}
                >
                  <option>Select a group</option>
                  <option value="add-new" className="text-[#F2993D]">+ Add new</option>
                </select>
                <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 font-bold" />
              </div>
            </div>
          </div>

          {/* Contacts Section */}
          {selectedRestaurant && (
            <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mb-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium text-gray-700">
                  Select Contacts for Quote
                </Label>
                <Button variant="ghost" size="sm" className="h-6 text-[#F2993D] hover:text-[#E08935] hover:bg-orange-50 text-xs px-2 border border-[#F2993D]"
                  onClick={() => setIsAddContactOpen(true)}
                >
                  <PlusCircle className="w-3 h-3 mr-1" />
                  Add Contact
                </Button>
              </div>
              
              <div className="space-y-3">
                {selectedRestaurant.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-start space-x-3 bg-white p-3 rounded border border-gray-100 shadow-sm">
                    <Checkbox 
                      id={contact.id}
                      checked={selectedContactIds.includes(contact.id)}
                      onCheckedChange={() => handleContactToggle(contact.id)}
                      className="mt-1 border-gray-300 data-[state=checked]:bg-[#F2993D] data-[state=checked]:border-[#F2993D]"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <label
                          htmlFor={contact.id}
                          className="text-sm font-medium text-gray-900 cursor-pointer"
                        >
                          {contact.name}
                        </label>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 font-bold">
                          {contact.role}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 grid grid-cols-2 gap-2 font-bold">
                        <span>{contact.email}</span>
                        <span>{contact.phone}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {selectedRestaurant ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      Restaurant Name
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      Business Name
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.businessName}</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      Street Address
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.streetAddress}</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      City
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.city}</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      State
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.state}</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      ZIP Code
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.zipCode}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      Country
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.country}</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      Restaurant Type
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.restaurantType}</p>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block text-gray-600 font-bold">
                      Cuisine Type
                    </Label>
                    <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.cuisineType}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block text-gray-600 font-bold">
                    Preferences
                  </Label>
                  <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.preferences}</p>
                </div>

                <div>
                  <Label className="text-sm mb-2 block text-gray-600 font-bold">
                    Notes
                  </Label>
                  <p className="text-sm text-[#2A2A2A]">{selectedRestaurant.notes}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm font-bold">{isQuoteOpened ? 'Open Quote - No Customer Details Needed' : 'Select a customer to view details'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Catalog */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-1">Upload Catalog</h2>
          <p className="text-gray-500 text-sm mb-4 font-bold">
            Upload your entire catalog or details
          </p>

          <div className="mb-4">
            <h3 className="text-sm mb-2">Selected Catalog(s)</h3>
            <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-sm">Spring 2024 Catalog</p>
                  <p className="text-xs text-gray-500 font-bold">2.5 MB, xlsx</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm mb-2">Upload Custom Catalog</h3>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload your own catalog
              </Button>
              <p className="text-xs text-gray-500 mt-2 font-bold">
                csv or Excel valid .csv, .xlsx
              </p>
            </div>
          </div>
        </div>

        {/* Upload or Paste Menu */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-1">Upload Menu</h2>
          <p className="text-gray-500 text-sm mb-4 font-bold">
            PDF Image or screenshot taken from Epo.txt Device
          </p>

          <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center mb-4">
            <p className="text-sm mb-1">Drag files here or click to browse</p>
            <p className="text-xs text-gray-500 font-bold">or, you can drop a URL</p>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 font-bold">
            <span>NO FILE PICKED</span>
          </div>

          {/* Divider */}
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold">OR USE A MENU URL</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Menu URLs */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg">Menu URLs</h2>
              <Button variant="ghost" size="sm" className="text-blue-600">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <div className="flex items-start gap-2">
                
                <div className="flex-1">
                  <h3 className="text-sm mb-1">
                    Restaurant Type - Auto-Populate Quote
                  </h3>
                  <p className="text-xs text-gray-600 mb-2 font-bold">
                    Select a restaurant type to auto-populate the quote with relevant
                    catalog items
                  </p>
                  <select className="w-48 px-3 py-1.5 border border-blue-200 rounded-md bg-white text-xs">
                    <option>Select restaurant type</option>
                    <option>Bar/Grill</option>
                    <option>Spanish</option>
                    <option>Italian</option>
                    <option>Brewery</option>
                    <option>Coffee shop</option>
                  </select>
                  <Button
                    size="sm"
                    className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    Make Stock Quote
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="menu-name" className="text-sm mb-2 block">
                  Menu URL
                </Label>
                <Input
                  id="menu-name"
                  type="text"
                  placeholder="www.example.com/menu"
                  className="bg-gray-50"
                  value={menuUrl}
                  onChange={(e) => setMenuUrl(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm mb-2 block">Click to Link from Customer Profile</Label>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    if (selectedRestaurant?.website) {
                      setMenuUrl(selectedRestaurant.website);
                    }
                  }}
                  disabled={!selectedRestaurant}
                  title={!selectedRestaurant ? "Select a customer first" : "Use customer's website"}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  {selectedRestaurant ? 'Link Profile URL' : 'Select Customer First'}
                </Button>
              </div>
            </div>

            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold">OR PASTE TEXT</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <div className="mt-2">
              <Label className="text-sm mb-2 block">Paste menu text here...</Label>
              <Textarea 
                className="bg-gray-50 h-32" 
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                maxLength={5000}
              />
              <div className="text-right mt-1">
                <span className="text-xs text-gray-500">
                  {pasteText.length} / 5,000 characters
                </span>
              </div>
            </div>
            
            {/* Divider */}
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold">CLICK HERE TO PREVIEW MENU</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* Parse Button Moved Here */}
            <div className="flex justify-center mt-2">
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-white px-8"
                onClick={handleParseMenu}
              >
                Parse Menu
              </Button>
            </div>
          </div>

          {/* Menu Preview */}
          <div>
            <h2 className="text-lg mb-1 mt-6">Menu Preview</h2>
            <p className="text-gray-500 text-sm mb-4 font-bold">See menu on the preview (You can manually add additional dishes or components in the next step).</p>

            <div className="border border-gray-200 rounded-lg p-6 min-h-[200px] bg-gray-50 text-left whitespace-pre-wrap">
               {menuPreviewText ? (
                   <p className="text-sm text-[#2A2A2A]">{menuPreviewText}</p>
               ) : (
                   <div className="text-center pt-10">
                        <p className="text-gray-400 font-bold">Your parsed menu will appear here</p>
                   </div>
               )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
                <Button
                    className="w-full sm:w-auto bg-[#F2993D] hover:bg-[#e88929] text-white"
                    onClick={handleContinueToQuoteBuilder}
                    disabled={isCreatingQuote}
                >
                    {isCreatingQuote ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating…
                      </>
                    ) : (
                      'Match Ingredients to Catalog'
                    )}
                </Button>
                <Button 
                    variant="outline" 
                    onClick={() => setMenuPreviewText('')}
                    className="w-full sm:w-auto text-sm"
                >
                    Clear Results
                </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Restaurant Drawer */}
      {isAddRestaurantOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsAddRestaurantOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl text-[#4F4F4F]">Add New Restaurant</h2>
              <button
                onClick={() => setIsAddRestaurantOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="new-restaurant-name" className="text-sm mb-2 block">
                  Restaurant Name *
                </Label>
                <Input
                  id="new-restaurant-name"
                  type="text"
                  placeholder="Enter restaurant name"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="new-business-name" className="text-sm mb-2 block">
                  Business Name
                </Label>
                <Input
                  id="new-business-name"
                  type="text"
                  placeholder="Enter business name"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="new-restaurant-group" className="text-sm mb-2 block">
                  Restaurant Group
                </Label>
                <select
                  id="new-restaurant-group"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                  onChange={(e) => {
                    if (e.target.value === 'add-new') {
                      setIsAddGroupOpen(true);
                      e.target.value = ''; // Reset the select
                    }
                  }}
                >
                  <option>Select a group</option>
                  <option>Premium Dining Partners</option>
                  <option>Local Restaurant Network</option>
                  <option>Casual Dining Collective</option>
                  <option>Independent Restaurants</option>
                  <option>Chain Restaurant Group</option>
                  <option value="add-new" className="text-[#F2993D]">+ Add new Group</option>
                </select>
              </div>

              <div>
                <Label htmlFor="new-contact-name" className="text-sm mb-2 block">
                  Contact Name
                </Label>
                <Input
                  id="new-contact-name"
                  type="text"
                  placeholder="Enter contact name"
                  className="bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-email" className="text-sm mb-2 block">
                    Email *
                  </Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="email@example.com"
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="new-phone" className="text-sm mb-2 block">
                    Phone
                  </Label>
                  <Input
                    id="new-phone"
                    type="tel"
                    placeholder="(555) 555-5555"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="new-street-address" className="text-sm mb-2 block">
                  Street Address
                </Label>
                <Input
                  id="new-street-address"
                  type="text"
                  placeholder="123 Main St"
                  className="bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="new-city" className="text-sm mb-2 block">
                    City
                  </Label>
                  <Input
                    id="new-city"
                    type="text"
                    placeholder="City"
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="new-state" className="text-sm mb-2 block">
                    State
                  </Label>
                  <Input
                    id="new-state"
                    type="text"
                    placeholder="State"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-zip" className="text-sm mb-2 block">
                    ZIP Code
                  </Label>
                  <Input
                    id="new-zip"
                    type="text"
                    placeholder="12345"
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="new-country" className="text-sm mb-2 block">
                    Country
                  </Label>
                  <Input
                    id="new-country"
                    type="text"
                    placeholder="USA"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="new-website" className="text-sm mb-2 block">
                  Website
                </Label>
                <Input
                  id="new-website"
                  type="text"
                  placeholder="www.example.com"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="new-restaurant-type" className="text-sm mb-2 block">
                  Restaurant Type
                </Label>
                <select
                  id="new-restaurant-type"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                >
                  <option>Select type</option>
                  <option>Fine Dining</option>
                  <option>Casual Dining</option>
                  <option>Fast Casual</option>
                  <option>Cafe</option>
                  <option>Bar & Grill</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="new-cuisine" className="text-sm mb-2 block">
                  Cuisine Type
                </Label>
                <Input
                  id="new-cuisine"
                  type="text"
                  placeholder="e.g., Italian, Japanese, American"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="new-notes" className="text-sm mb-2 block">
                  Notes
                </Label>
                <Textarea
                  id="new-notes"
                  placeholder="Additional notes about the restaurant"
                  className="bg-gray-50 h-24"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsAddRestaurantOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#F2993D] hover:bg-[#E08935] text-white"
                onClick={() => {
                  // Handle save logic here
                  setIsAddRestaurantOpen(false);
                }}
              >
                Save Restaurant
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Add Contact Drawer */}
      {isAddContactOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsAddContactOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl text-[#4F4F4F]">Add New Contact</h2>
              <button
                onClick={() => setIsAddContactOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="contact-name" className="text-sm mb-2 block">
                  Name *
                </Label>
                <Input
                  id="contact-name"
                  type="text"
                  placeholder="Enter contact name"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="contact-email" className="text-sm mb-2 block">
                  Contact Email *
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="email@example.com"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="contact-phone" className="text-sm mb-2 block">
                  Contact Phone
                </Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="contact-position" className="text-sm mb-2 block">
                  Position
                </Label>
                <Input
                  id="contact-position"
                  type="text"
                  placeholder="e.g., Head Chef, Manager, Owner"
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsAddContactOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#F2993D] hover:bg-[#E08935] text-white"
                onClick={() => {
                  // Handle save logic here
                  setIsAddContactOpen(false);
                }}
              >
                Save Contact
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Add Group Drawer */}
      {isAddGroupOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsAddGroupOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl text-[#4F4F4F]">Add New Restaurant Group</h2>
              <button
                onClick={() => setIsAddGroupOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="group-name" className="text-sm mb-2 block">
                  Group Name *
                </Label>
                <Input
                  id="group-name"
                  type="text"
                  placeholder="Enter group name"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="group-primary-contact-name" className="text-sm mb-2 block">
                  Primary Contact Name *
                </Label>
                <Input
                  id="group-primary-contact-name"
                  type="text"
                  placeholder="Enter primary contact name"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="group-primary-contact-email" className="text-sm mb-2 block">
                  Primary Contact Email *
                </Label>
                <Input
                  id="group-primary-contact-email"
                  type="email"
                  placeholder="email@example.com"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="group-primary-contact-phone" className="text-sm mb-2 block">
                  Primary Contact Phone
                </Label>
                <Input
                  id="group-primary-contact-phone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="group-office-address" className="text-sm mb-2 block">
                  Office Address *
                </Label>
                <Input
                  id="group-office-address"
                  type="text"
                  placeholder="123 Main St, City, State, ZIP"
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="group-restaurant-types" className="text-sm mb-2 block">
                  Restaurant Types
                </Label>
                <select
                  id="group-restaurant-types"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm"
                >
                  <option>Select type</option>
                  <option>Restaurant</option>
                  <option>Hotel</option>
                  <option>Catering</option>
                  <option>Venue</option>
                  <option>Healthcare</option>
                  <option>Multi-Unit</option>
                </select>
              </div>

              <div>
                <Label htmlFor="group-internal-notes" className="text-sm mb-2 block">
                  Internal Rep Notes
                </Label>
                <Textarea
                  id="group-internal-notes"
                  placeholder="Internal notes for sales reps"
                  className="bg-gray-50 h-24"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsAddGroupOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#F2993D] hover:bg-[#E08935] text-white"
                onClick={() => {
                  // Handle save logic here
                  setIsAddGroupOpen(false);
                }}
              >
                Save Group
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Upgrade Drawer */}
      <UpgradeDrawer
        isOpen={isUpgradeDrawerOpen}
        onClose={() => setIsUpgradeDrawerOpen(false)}
      />
    </div>
  );
}