import { Search, ChevronDown, ChevronRight, Edit, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState, useCallback, useEffect } from 'react';
import { AddCustomerDrawer } from '../components/AddCustomerDrawer';
import { EditCustomerDrawer } from '../components/EditCustomerDrawer';
import {
  getRestaurants,
  getRestaurant,
  getQuotes,
  updateQuote,
  type RestaurantIndexItem,
  type RestaurantDetail,
  type RestaurantContact,
} from '../services/api';

export function CustomersPage() {
  const [restaurants, setRestaurants] = useState<RestaurantIndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded restaurant detail cache
  const [restaurantDetails, setRestaurantDetails] = useState<Record<string, RestaurantDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantDetail | null>(null);
  const [selectedContact, setSelectedContact] = useState<RestaurantContact | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const isLoggedIn = !!localStorage.getItem('quoteme_token');

  // Sample restaurants shown to guests (display only — cannot be used for quotes)
  const sampleRestaurants: RestaurantIndexItem[] = [
    { id: 'sample-1', name: 'The Garden Bistro', city: 'Portland', state: 'OR', primary_rep: '--', contact_count: 2, status: 'active', restaurant_group: null },
    { id: 'sample-2', name: 'Coastal Kitchen', city: 'San Diego', state: 'CA', primary_rep: '--', contact_count: 1, status: 'active', restaurant_group: { id: 'g1', name: 'Seaside Hospitality' } },
    { id: 'sample-3', name: 'Fire & Smoke BBQ', city: 'Austin', state: 'TX', primary_rep: '--', contact_count: 3, status: 'active', restaurant_group: null },
    { id: 'sample-4', name: 'Bella Cucina', city: 'Chicago', state: 'IL', primary_rep: '--', contact_count: 2, status: 'active', restaurant_group: { id: 'g2', name: 'Italian Concepts' } },
    { id: 'sample-5', name: 'Sakura Sushi House', city: 'Seattle', state: 'WA', primary_rep: '--', contact_count: 1, status: 'active', restaurant_group: null },
    { id: 'sample-6', name: 'Farm Table Kitchen', city: 'Nashville', state: 'TN', primary_rep: '--', contact_count: 2, status: 'active', restaurant_group: null },
  ];

  const fetchRestaurants = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getRestaurants();
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setRestaurants(result.data);
    }
    setLoading(false);
  }, [isLoggedIn]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const fetchRestaurantDetail = useCallback(async (id: string) => {
    if (restaurantDetails[id]) return; // Already cached
    setLoadingDetail(id);
    const result = await getRestaurant(id);
    if (result.data) {
      setRestaurantDetails((prev) => ({ ...prev, [id]: result.data! }));
    }
    setLoadingDetail(null);
  }, [restaurantDetails]);

  const handleExpandCustomer = useCallback(async (id: string) => {
    if (expandedCustomer === id) {
      setExpandedCustomer(null);
    } else {
      setExpandedCustomer(id);
      await fetchRestaurantDetail(id);
    }
  }, [expandedCustomer, fetchRestaurantDetail]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  const handleEditCustomer = useCallback(async (restaurant: RestaurantIndexItem) => {
    // Fetch full detail if not cached
    let detail = restaurantDetails[restaurant.id];
    if (!detail) {
      const result = await getRestaurant(restaurant.id);
      if (result.data) {
        detail = result.data;
        setRestaurantDetails((prev) => ({ ...prev, [restaurant.id]: detail }));
      }
    }
    if (detail) {
      setSelectedRestaurant(detail);
      setSelectedContact(null);
      setEditCustomerOpen(true);
    }
  }, [restaurantDetails]);

  const handleEditContact = useCallback((restaurant: RestaurantDetail, contact: RestaurantContact) => {
    setSelectedRestaurant(restaurant);
    setSelectedContact(contact);
    setEditCustomerOpen(true);
  }, []);

  const handleDrawerSuccess = useCallback(async (savedRestaurant?: { id: string; name: string }) => {
    // Clear detail cache so expanded rows re-fetch fresh contacts
    setRestaurantDetails({});
    await fetchRestaurants();

    // Auto-populate: if there's a draft quote for "New Restaurant" (placeholder),
    // update it to the saved restaurant so contacts flow through
    if (savedRestaurant && isLoggedIn) {
      try {
        const quotesRes = await getQuotes({ status: 'draft' });
        const placeholderDraft = quotesRes.data?.find(
          (q) => q.restaurant === 'New Restaurant' || q.restaurant === null
        );
        if (placeholderDraft) {
          await updateQuote(placeholderDraft.id, { restaurant_id: savedRestaurant.id });
        }
      } catch {
        // Non-fatal — quote auto-populate is best-effort
      }
    }
  }, [fetchRestaurants, isLoggedIn]);

  // Filter restaurants by search query
  const filteredRestaurants = restaurants.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.city || '').toLowerCase().includes(q) ||
      (r.state || '').toLowerCase().includes(q) ||
      (r.primary_rep || '').toLowerCase().includes(q) ||
      (r.restaurant_group?.name || '').toLowerCase().includes(q)
    );
  });

  // Sort filtered restaurants
  const sortedRestaurants = [...filteredRestaurants].sort((a, b) => {
    if (!sortColumn) return 0;

    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (sortColumn) {
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'group':
        aVal = a.restaurant_group?.name || '';
        bVal = b.restaurant_group?.name || '';
        break;
      case 'city':
        aVal = a.city || '';
        bVal = b.city || '';
        break;
      case 'primary_rep':
        aVal = a.primary_rep || '';
        bVal = b.primary_rep || '';
        break;
      case 'contact_count':
        aVal = a.contact_count;
        bVal = b.contact_count;
        break;
      default:
        return 0;
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    if (sortDirection === 'asc') {
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    } else {
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
    }
  });

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl md:text-2xl mb-1 text-[#4F4F4F]">Customers</h1>
            <p className="text-[#4F4F4F] text-sm hidden md:block">
              Manage your restaurant customers and contacts
            </p>
          </div>
          {isLoggedIn && (
            <Button
              className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
              onClick={() => setAddCustomerOpen(true)}
            >
              + Add Customer
            </Button>
          )}
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg p-4 md:p-6 mb-6 shadow-sm border border-gray-200">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-gray-200"
            />
          </div>
          <p className="text-xs text-gray-500">Search by customer name, group, city, state, or rep name</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#F2993D] mr-2" />
            <span className="text-gray-500">Loading customers...</span>
          </div>
        )}

        {/* Guest State */}
        {!isLoggedIn && !loading && (
          <>
            <div className="bg-[#A5CFDD]/10 border border-[#A5CFDD]/30 rounded-lg p-6 mb-6 text-center">
              <p className="text-[#2A2A2A] font-medium mb-1">Sign up to manage your customers</p>
              <p className="text-gray-500 text-sm">Create an account to add restaurants, contacts, and track quote history.</p>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Sample Customers (view only)</p>
            </div>

            {/* Sample table */}
            <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 opacity-75 mb-6">
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_0.75fr] gap-4 pb-2 border-b-2 border-gray-300 text-xs text-gray-600">
                    <div className="font-semibold">Customer Name</div>
                    <div className="font-semibold">Group</div>
                    <div className="font-semibold">Location</div>
                    <div className="font-semibold">Rep</div>
                    <div className="font-semibold">Contacts</div>
                  </div>
                  {sampleRestaurants.map((r) => (
                    <div key={r.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_0.75fr] gap-4 py-4 items-center border-b border-gray-100 text-sm">
                      <div>{r.name}</div>
                      <div>{r.restaurant_group?.name || '--'}</div>
                      <div>{[r.city, r.state].filter(Boolean).join(', ')}</div>
                      <div>{r.primary_rep}</div>
                      <div>{r.contact_count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Error State */}
        {error && !loading && isLoggedIn && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchRestaurants}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && isLoggedIn && sortedRestaurants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">
              {searchQuery ? 'No customers match your search.' : 'No customers yet.'}
            </p>
            {!searchQuery && (
              <Button
                className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white mt-2"
                onClick={() => setAddCustomerOpen(true)}
              >
                + Add Your First Customer
              </Button>
            )}
          </div>
        )}

        {/* Customer Table */}
        {!loading && !error && sortedRestaurants.length > 0 && (
          <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Sticky Table Header */}
                <div className="sticky top-0 bg-white z-10 grid grid-cols-[2fr_1fr_1fr_1fr_0.75fr_0.5fr] gap-4 pb-2 border-b-2 border-gray-300 text-xs text-gray-600">
                  <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('name')}>
                    Customer Name {getSortIcon('name')}
                  </div>
                  <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('group')}>
                    Group {getSortIcon('group')}
                  </div>
                  <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('city')}>
                    Location {getSortIcon('city')}
                  </div>
                  <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('primary_rep')}>
                    Rep {getSortIcon('primary_rep')}
                  </div>
                  <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('contact_count')}>
                    Contacts {getSortIcon('contact_count')}
                  </div>
                  <div className="font-semibold">Actions</div>
                </div>

                {/* Customer Rows */}
                {sortedRestaurants.map((restaurant) => {
                  const detail = restaurantDetails[restaurant.id];

                  return (
                    <div key={restaurant.id} className="border-b border-gray-100">
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_0.75fr_0.5fr] gap-4 py-4 items-center hover:bg-gray-50">
                        <div
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => handleExpandCustomer(restaurant.id)}
                        >
                          {expandedCustomer === restaurant.id ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                          <span>{restaurant.name}</span>
                        </div>
                        <div className="text-sm">{restaurant.restaurant_group?.name || '--'}</div>
                        <div className="text-sm">{[restaurant.city, restaurant.state].filter(Boolean).join(', ') || '--'}</div>
                        <div className="text-sm">{restaurant.primary_rep || '--'}</div>
                        <div className="text-sm">{restaurant.contact_count}</div>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCustomer(restaurant);
                            }}
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </Button>
                        </div>
                      </div>

                      {expandedCustomer === restaurant.id && (
                        <div className="pb-4 bg-gray-50">
                          <div className="pl-6 pt-3 mb-2">
                            <h3 className="font-medium text-sm">Contacts</h3>
                          </div>
                          {loadingDetail === restaurant.id && (
                            <div className="flex items-center justify-center py-4 mx-6">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                              <span className="text-sm text-gray-400">Loading contacts...</span>
                            </div>
                          )}
                          {detail && detail.contacts.length === 0 && (
                            <p className="text-sm text-gray-400 mx-6 py-4">No contacts for this customer.</p>
                          )}
                          <div className="space-y-2">
                            {detail?.contacts.map((contact) => (
                              <div
                                key={contact.id}
                                className="bg-white mx-4 md:mx-6 mb-2 px-4 py-3 rounded border border-gray-200 hover:shadow-sm transition-shadow"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr] gap-x-6 gap-y-1 md:items-center">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{contact.first_name} {contact.last_name}</span>
                                      {contact.is_primary && (
                                        <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">Primary</span>
                                      )}
                                    </div>
                                    <div className="text-gray-600 text-sm">{contact.role || '--'}</div>
                                    <div className="text-[#A5CFDD] text-sm">{contact.email || '--'}</div>
                                    <div className="text-gray-600 text-sm">{contact.phone || '--'}</div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditContact(detail, contact);
                                      }}
                                    >
                                      <Edit className="w-4 h-4 text-gray-500" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <AddCustomerDrawer
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        onSuccess={handleDrawerSuccess}
      />
      <EditCustomerDrawer
        open={editCustomerOpen}
        onOpenChange={setEditCustomerOpen}
        restaurant={selectedRestaurant}
        contact={selectedContact}
        onSuccess={handleDrawerSuccess}
      />
    </div>
  );
}
