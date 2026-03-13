import { Search, ChevronDown, ChevronRight, Edit, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState, useCallback, useEffect } from 'react';
import { AddCustomerDrawer } from '../components/AddCustomerDrawer';
import { EditCustomerDrawer } from '../components/EditCustomerDrawer';
import { SwipeableCard } from '../components/SwipeableCard';
import { BottomSheet } from '../components/BottomSheet';
import { MobilePullToRefresh } from '../components/MobilePullToRefresh';
import { SwipeHint } from '../components/SwipeHint';
import {
  getRestaurants,
  getRestaurant,
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
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [expandedChefs, setExpandedChefs] = useState<string | null>(null);
  const [expandedContacts, setExpandedContacts] = useState<string | null>(null);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantDetail | null>(null);
  const [selectedContact, setSelectedContact] = useState<RestaurantContact | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
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

  const handleRefresh = useCallback(async () => {
    setRestaurantDetails({});
    await fetchRestaurants();
  }, [fetchRestaurants]);

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

  const handleDrawerSuccess = useCallback(() => {
    setRestaurantDetails({});
    fetchRestaurants();
  }, [fetchRestaurants]);

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

  const getPrimaryContact = (detail: RestaurantDetail) => {
    return detail.contacts.find((c) => c.is_primary) || detail.contacts[0] || null;
  };

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Sticky Header - Mobile */}
        <div className="md:hidden sticky top-0 z-10 bg-[#FFF9F3] -mx-4 px-4 pt-4 pb-3 mb-4 border-b border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-xl text-[#4F4F4F]">Customers</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setFilterSheetOpen(true)}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
              {isLoggedIn && (
                <Button
                  size="sm"
                  className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white h-9 px-3"
                  onClick={() => setAddCustomerOpen(true)}
                >
                  + Add
                </Button>
              )}
            </div>
          </div>
          {/* Mobile Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-300 h-10"
            />
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl mb-1 text-[#4F4F4F]">Customers</h1>
            <p className="text-[#4F4F4F] text-sm">
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

        {/* Desktop Search Section */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200 hidden md:block">
          <h2 className="text-lg mb-3">Search Customers</h2>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search..."
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-center">
              <p className="text-[#2A2A2A] font-medium mb-1">Sign up to manage your customers</p>
              <p className="text-gray-500 text-sm">Create an account to add restaurants, contacts, and track quote history.</p>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Sample Customers (view only)</p>
            </div>

            {/* Mobile sample cards */}
            <div className="md:hidden space-y-3 mb-6">
              {sampleRestaurants.map((r) => (
                <div key={r.id} className="rounded-lg border border-gray-200 shadow-sm p-4 opacity-75 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-[#2A2A2A] text-base">{r.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{r.restaurant_group?.name || ''}</p>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-600">
                    <div>
                      <span className="text-xs text-gray-400 block uppercase tracking-wide">Location</span>
                      <span className="text-[#2A2A2A]">{[r.city, r.state].filter(Boolean).join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block uppercase tracking-wide">Contacts</span>
                      <span className="text-[#2A2A2A]">{r.contact_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop sample table */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hidden md:block opacity-75 mb-6">
              <div className="overflow-x-auto">
                <div className="min-w-[1000px]">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_0.75fr] gap-4 pb-2 border-b-2 border-gray-300 text-xs text-gray-600">
                    <div className="font-semibold">Customer Name</div>
                    <div className="font-semibold">Group</div>
                    <div className="font-semibold">Location</div>
                    <div className="font-semibold">Rep</div>
                    <div className="font-semibold">Contacts</div>
                  </div>
                  {sampleRestaurants.map((r) => (
                    <div key={r.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_0.75fr] gap-4 py-4 items-center border-b border-gray-100">
                      <div>{r.name}</div>
                      <div className="text-sm">{r.restaurant_group?.name || '--'}</div>
                      <div className="text-sm">{[r.city, r.state].filter(Boolean).join(', ')}</div>
                      <div className="text-sm">{r.primary_rep}</div>
                      <div className="text-sm">{r.contact_count}</div>
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

        {/* Mobile Pull-to-Refresh Card List */}
        {!loading && !error && sortedRestaurants.length > 0 && (
          <MobilePullToRefresh onRefresh={handleRefresh}>
            <div className="space-y-3">
              {sortedRestaurants.map((restaurant) => {
                const detail = restaurantDetails[restaurant.id];
                const primaryContact = detail ? getPrimaryContact(detail) : null;

                return (
                  <SwipeableCard
                    key={restaurant.id}
                    onEdit={() => handleEditCustomer(restaurant)}
                    className="rounded-lg border border-gray-200 shadow-sm p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => handleExpandCustomer(restaurant.id)}
                        >
                          <h3 className="font-medium text-[#2A2A2A] text-base">{restaurant.name}</h3>
                          {expandedCustomer === restaurant.id ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{restaurant.restaurant_group?.name || ''}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="text-xs text-gray-400 block uppercase tracking-wide">Location</span>
                        <span className="text-[#2A2A2A]">{[restaurant.city, restaurant.state].filter(Boolean).join(', ') || '--'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block uppercase tracking-wide">Rep</span>
                        <span className="text-[#2A2A2A]">{restaurant.primary_rep || '--'}</span>
                      </div>
                      <div className="col-span-2">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (expandedContacts === restaurant.id) {
                              setExpandedContacts(null);
                            } else {
                              setExpandedContacts(restaurant.id);
                              fetchRestaurantDetail(restaurant.id);
                            }
                          }}
                        >
                          <span className="text-xs text-gray-400 block uppercase tracking-wide">Primary Contact</span>
                          {expandedContacts === restaurant.id ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        {expandedContacts === restaurant.id && primaryContact && (
                          <>
                            <div className="text-[#2A2A2A]">{primaryContact.first_name} {primaryContact.last_name}</div>
                            {primaryContact.email && <div className="text-blue-600 truncate">{primaryContact.email}</div>}
                            {primaryContact.phone && <div className="text-[#2A2A2A]">{primaryContact.phone}</div>}
                          </>
                        )}
                        {expandedContacts === restaurant.id && !primaryContact && detail && (
                          <div className="text-gray-400 text-xs">No contacts</div>
                        )}
                        {expandedContacts === restaurant.id && !detail && (
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm border-t border-gray-100 pt-3">
                      <div>
                        <span className="text-xs text-gray-400 mr-1">Contacts:</span>
                        <span className="font-medium text-[#2A2A2A]">{restaurant.contact_count}</span>
                      </div>
                    </div>

                    {expandedCustomer === restaurant.id && (
                      <div className="mt-4 pt-3 border-t border-gray-200 bg-gray-50 -mx-4 px-4 pb-2 rounded-b-lg">
                        <div
                          className="flex items-center justify-between cursor-pointer mb-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedChefs(expandedChefs === restaurant.id ? null : restaurant.id);
                          }}
                        >
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contacts</h4>
                          {expandedChefs === restaurant.id ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </div>

                        {expandedChefs === restaurant.id && (
                          <div className="space-y-3">
                            {loadingDetail === restaurant.id && (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                                <span className="text-xs text-gray-400">Loading contacts...</span>
                              </div>
                            )}
                            {detail && detail.contacts.length === 0 && (
                              <p className="text-xs text-gray-400 text-center py-4">No contacts for this customer.</p>
                            )}
                            {detail?.contacts.map((contact) => (
                              <div key={contact.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-1 font-medium text-sm text-[#2A2A2A]">
                                    {contact.first_name} {contact.last_name}
                                    {contact.is_primary && (
                                      <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded ml-1">Primary</span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditContact(detail, contact);
                                    }}
                                  >
                                    <Edit className="w-3 h-3 text-gray-400" />
                                  </Button>
                                </div>
                                {contact.role && <p className="text-xs text-gray-500 mb-2 font-medium">{contact.role}</p>}
                                <div className="text-xs space-y-1">
                                  {contact.email && <div className="text-blue-600">{contact.email}</div>}
                                  {contact.phone && <div className="text-gray-600">{contact.phone}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </SwipeableCard>
                );
              })}
            </div>
          </MobilePullToRefresh>
        )}

        {/* Desktop Table */}
        {!loading && !error && sortedRestaurants.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hidden md:block">
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* Sticky Table Header - Desktop */}
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
                                className="bg-white mx-6 mb-2 px-4 py-3 rounded border border-gray-200 hover:shadow-sm transition-shadow"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 grid grid-cols-[auto_1fr_1fr_1fr] gap-x-6 gap-y-2 items-center">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{contact.first_name} {contact.last_name}</span>
                                      {contact.is_primary && (
                                        <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">Primary</span>
                                      )}
                                    </div>
                                    <div className="text-gray-600">{contact.role || '--'}</div>
                                    <div className="text-blue-600 text-sm">{contact.email || '--'}</div>
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

      {/* Mobile Filter/Sort Bottom Sheet */}
      <BottomSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        title="Sort & Filter"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-[#4F4F4F] mb-3">Sort By</h3>
            <div className="space-y-2">
              <Button
                variant={sortColumn === 'name' ? 'default' : 'outline'}
                className={`w-full justify-start ${sortColumn === 'name' ? 'bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white' : ''}`}
                onClick={() => {
                  handleSort('name');
                  setFilterSheetOpen(false);
                }}
              >
                Customer Name {sortColumn === 'name' && (sortDirection === 'asc' ? '\u2191' : '\u2193')}
              </Button>
              <Button
                variant={sortColumn === 'contact_count' ? 'default' : 'outline'}
                className={`w-full justify-start ${sortColumn === 'contact_count' ? 'bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white' : ''}`}
                onClick={() => {
                  handleSort('contact_count');
                  setFilterSheetOpen(false);
                }}
              >
                Contacts {sortColumn === 'contact_count' && (sortDirection === 'asc' ? '\u2191' : '\u2193')}
              </Button>
            </div>
          </div>
        </div>
      </BottomSheet>

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

      {/* Swipe Hint for Mobile Users */}
      <SwipeHint />
    </div>
  );
}
