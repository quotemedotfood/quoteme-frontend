import { Search, ChevronDown, ChevronRight, Edit, ArrowUpDown, ArrowUp, ArrowDown, Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState, useCallback } from 'react';
import { AddCustomerDrawer } from '../components/AddCustomerDrawer';
import { EditCustomerDrawer } from '../components/EditCustomerDrawer';
import { SwipeableCard } from '../components/SwipeableCard';
import { BottomSheet } from '../components/BottomSheet';
import { MobilePullToRefresh } from '../components/MobilePullToRefresh';
import { SwipeHint } from '../components/SwipeHint';

const customers = [
  {
    id: 1,
    restaurantName: 'The Red Door Bistro',
    group: 'Red Door Group',
    purchaser: 'John Smith',
    position: 'Executive Chef',
    email: 'john@reddoor.com',
    phone: '(212) 555-0101',
    contacts: '3',
  },
  {
    id: 2,
    restaurantName: 'Lakeside Grill & Bar',
    group: 'Lakeside Hospitality',
    purchaser: 'Sarah Johnson',
    position: 'Sous Chef',
    email: 'sarah@lakeside.com',
    phone: '(312) 555-0202',
    contacts: '2',
  },
];

const chefContacts = [
  {
    id: 1,
    name: 'Gordon Ramsay',
    role: 'Executive Chef',
    email: 'gordon@lakeside.com',
    phone: '(312) 555-9999',
    notes: 'Preferred contact for new orders',
  },
  {
    id: 2,
    name: 'Amy Wong',
    role: 'Sous Chef',
    email: 'amy.wong@lakeside.com',
    phone: '(312) 555-8888',
    notes: 'Handles produce and dry goods',
  },
  {
    id: 3,
    name: 'Michael Jordan',
    role: 'Pastry Chef',
    email: 'mj@lakeside.com',
    phone: '(312) 555-2323',
    notes: 'Only available Tuesday and Thursdays',
  },
];

const moreCustomers = [
  {
    id: 3,
    restaurantName: 'Bella Vista Italian',
    group: 'Bella Group',
    purchaser: 'Marco Polo',
    position: 'Pastry Chef',
    email: 'marco@bellavista.com',
    phone: '(877) 555-0203',
    contacts: '2',
  },
  {
    id: 4,
    restaurantName: 'Golden Harvest',
    group: 'Golden Group',
    purchaser: 'Li Wei',
    position: 'Porter',
    email: 'li@goldenharvest.com',
    phone: '(416) 555-0404',
    contacts: '4',
  },
  {
    id: 5,
    restaurantName: 'Harbor House Seafood',
    group: 'Coastline Dining',
    purchaser: 'Robert Fisher',
    position: 'Executive Chef',
    email: 'bob@harborhouse.com',
    phone: '(206) 555-0605',
    contacts: '5',
  },
];

export function CustomersPage() {
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(2);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [expandedChefs, setExpandedChefs] = useState<number | null>(null);
  const [expandedContacts, setExpandedContacts] = useState<number | null>(null);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedChef, setSelectedChef] = useState(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Refreshed customer data');
  }, []);

  // Sort customers
  const sortedCustomers = [...customers].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal = a[sortColumn as keyof typeof a];
    let bVal = b[sortColumn as keyof typeof b];
    
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

  const sortedMoreCustomers = [...moreCustomers].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal = a[sortColumn as keyof typeof a];
    let bVal = b[sortColumn as keyof typeof b];
    
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
              <Button
                size="sm"
                className="bg-[#F2993D] hover:bg-[#E08A2E] text-white h-9 px-3"
                onClick={() => setAddCustomerOpen(true)}
              >
                + Add
              </Button>
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
          <Button
            className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
            onClick={() => setAddCustomerOpen(true)}
          >
            + Add Customer
          </Button>
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
          <p className="text-xs text-gray-500">Search by customer name, group member, email, location name, address, website, phone, or chef name</p>
        </div>

        {/* Mobile Pull-to-Refresh Card List */}
        <MobilePullToRefresh onRefresh={handleRefresh}>
          <div className="space-y-3">
            {sortedCustomers.map((customer) => (
              <SwipeableCard
                key={customer.id}
                onEdit={() => {
                  setSelectedCustomer(customer);
                  setSelectedChef(null);
                  setEditCustomerOpen(true);
                }}
                className="rounded-lg border border-gray-200 shadow-sm p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div 
                      className="flex items-center gap-2 cursor-pointer" 
                      onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                    >
                      <h3 className="font-medium text-[#2A2A2A] text-base">{customer.restaurantName}</h3>
                      {expandedCustomer === customer.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{customer.group}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="text-xs text-gray-400 block uppercase tracking-wide">Purchaser</span>
                    <span className="text-[#2A2A2A]">{customer.purchaser}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block uppercase tracking-wide">Position</span>
                    <span className="text-[#2A2A2A]">{customer.position}</span>
                  </div>
                  <div className="col-span-2">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedContacts(expandedContacts === customer.id ? null : customer.id);
                      }}
                    >
                      <span className="text-xs text-gray-400 block uppercase tracking-wide">Contact</span>
                      {expandedContacts === customer.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    {expandedContacts === customer.id && (
                      <>
                        <div className="text-blue-600 truncate">{customer.email}</div>
                        <div className="text-[#2A2A2A]">{customer.phone}</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-xs text-gray-400 mr-1">Contacts:</span>
                    <span className="font-medium text-[#2A2A2A]">{customer.contacts}</span>
                  </div>
                </div>

                {expandedCustomer === customer.id && (
                  <div className="mt-4 pt-3 border-t border-gray-200 bg-gray-50 -mx-4 px-4 pb-2 rounded-b-lg">
                    <div 
                      className="flex items-center justify-between cursor-pointer mb-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedChefs(expandedChefs === customer.id ? null : customer.id);
                      }}
                    >
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chef Contacts</h4>
                      {expandedChefs === customer.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    
                    {expandedChefs === customer.id && (
                      <div className="space-y-3">
                        {chefContacts.map((chef) => (
                          <div key={chef.id} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-1 font-medium text-sm text-[#2A2A2A]">
                                {chef.name}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedChef(chef);
                                  setSelectedCustomer(null);
                                  setEditCustomerOpen(true);
                                }}
                              >
                                <Edit className="w-3 h-3 text-gray-400" />
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 mb-2 font-medium">{chef.role}</p>
                            <div className="text-xs space-y-1">
                              <div className="text-blue-600">{chef.email}</div>
                              <div className="text-gray-600">{chef.phone}</div>
                              <div 
                                className="text-gray-500 italic mt-2 border-l-2 border-gray-200 pl-2 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedNote(expandedNote === chef.id ? null : chef.id);
                                }}
                              >
                                <div className={`${expandedNote === chef.id ? '' : 'truncate'}`}>
                                  {chef.notes}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </SwipeableCard>
            ))}

            {sortedMoreCustomers.map((customer) => (
              <SwipeableCard
                key={customer.id}
                onEdit={() => {
                  setSelectedCustomer(customer);
                  setEditCustomerOpen(true);
                }}
                className="rounded-lg border border-gray-200 shadow-sm p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-[#2A2A2A] text-base">{customer.restaurantName}</h3>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">{customer.group}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="text-xs text-gray-400 block uppercase tracking-wide">Purchaser</span>
                    <span className="text-[#2A2A2A]">{customer.purchaser}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block uppercase tracking-wide">Position</span>
                    <span className="text-[#2A2A2A]">{customer.position}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-gray-400 block uppercase tracking-wide">Contact</span>
                    <div className="text-blue-600 truncate">{customer.email}</div>
                    <div className="text-[#2A2A2A]">{customer.phone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-xs text-gray-400 mr-1">Contacts:</span>
                    <span className="font-medium text-[#2A2A2A]">{customer.contacts}</span>
                  </div>
                </div>
              </SwipeableCard>
            ))}
          </div>
        </MobilePullToRefresh>

        {/* Desktop Table */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hidden md:block">
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Sticky Table Header - Desktop */}
              <div className="sticky top-0 bg-white z-10 grid grid-cols-[2fr_1fr_1fr_1fr_1.25fr_1fr_0.75fr_0.5fr] gap-4 pb-2 border-b-2 border-gray-300 text-xs text-gray-600">
                <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('restaurantName')}>
                  Customer Name {getSortIcon('restaurantName')}
                </div>
                <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('group')}>
                  Group {getSortIcon('group')}
                </div>
                <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('purchaser')}>
                  Purchaser {getSortIcon('purchaser')}
                </div>
                <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('position')}>
                  Position {getSortIcon('position')}
                </div>
                <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('email')}>
                  Email {getSortIcon('email')}
                </div>
                <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('phone')}>
                  Phone {getSortIcon('phone')}
                </div>
                <div className="cursor-pointer hover:text-gray-900 font-semibold" onClick={() => handleSort('contacts')}>
                  Contacts {getSortIcon('contacts')}
                </div>
                <div className="font-semibold">Actions</div>
              </div>

              {/* Customer Rows */}
              {sortedCustomers.map((customer) => (
                <div key={customer.id} className="border-b border-gray-100">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.25fr_1fr_0.75fr_0.5fr] gap-4 py-4 items-center hover:bg-gray-50">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() =>
                        setExpandedCustomer(
                          expandedCustomer === customer.id ? null : customer.id
                        )
                      }
                    >
                      {expandedCustomer === customer.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <span>{customer.restaurantName}</span>
                    </div>
                    <div className="text-sm">{customer.group}</div>
                    <div className="text-sm">{customer.purchaser}</div>
                    <div className="text-sm">{customer.position}</div>
                    <div className="text-sm text-blue-600 truncate">{customer.email}</div>
                    <div className="text-sm">{customer.phone}</div>
                    <div className="text-sm">{customer.contacts}</div>
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(customer);
                          setSelectedChef(null);
                          setEditCustomerOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                    </div>
                  </div>

                  {expandedCustomer === customer.id && (
                    <div className="pb-4 bg-gray-50">
                      <div className="pl-6 pt-3 mb-2">
                        <h3 className="font-medium text-sm">Chef Contacts</h3>
                      </div>
                      <div className="space-y-2">
                        {chefContacts.map((chef) => (
                          <div
                            key={chef.id}
                            className="bg-white mx-6 mb-2 px-4 py-3 rounded border border-gray-200 hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 grid grid-cols-[auto_1fr_1fr_1fr] gap-x-6 gap-y-2 items-center">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{chef.name}</span>
                                </div>
                                <div className="text-gray-600">{chef.role}</div>
                                <div className="text-blue-600 text-sm">{chef.email}</div>
                                <div className="text-gray-600 text-sm">{chef.phone}</div>
                                <div 
                                  className="col-span-4 text-gray-500 text-xs cursor-pointer relative group"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedNote(expandedNote === chef.id ? null : chef.id);
                                  }}
                                >
                                  <span className="text-gray-400 font-medium mr-2">Note:</span>
                                  <span
                                    className={`${expandedNote === chef.id ? '' : 'truncate inline-block max-w-[90%]'}`}
                                    title={expandedNote === chef.id ? '' : chef.notes}
                                  >
                                    {chef.notes}
                                  </span>
                                  {chef.notes.length > 50 && (
                                    <span className="text-blue-500 text-xs ml-2 opacity-0 group-hover:opacity-100">
                                      {expandedNote === chef.id ? '(click to collapse)' : '(click to expand)'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedChef(chef);
                                    setSelectedCustomer(null);
                                    setEditCustomerOpen(true);
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
              ))}

              {sortedMoreCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1.25fr_1fr_0.75fr_0.5fr] gap-4 py-4 items-center border-b border-gray-100 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span>{customer.restaurantName}</span>
                  </div>
                  <div className="text-sm">{customer.group}</div>
                  <div className="text-sm">{customer.purchaser}</div>
                  <div className="text-sm">{customer.position}</div>
                  <div className="text-sm text-blue-600 truncate">{customer.email}</div>
                  <div className="text-sm">{customer.phone}</div>
                  <div className="text-sm">{customer.contacts}</div>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomer(customer);
                        setEditCustomerOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
                variant={sortColumn === 'restaurantName' ? 'default' : 'outline'}
                className={`w-full justify-start ${sortColumn === 'restaurantName' ? 'bg-[#F2993D] hover:bg-[#E08A2E] text-white' : ''}`}
                onClick={() => {
                  handleSort('restaurantName');
                  setFilterSheetOpen(false);
                }}
              >
                Customer Name {sortColumn === 'restaurantName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortColumn === 'contacts' ? 'default' : 'outline'}
                className={`w-full justify-start ${sortColumn === 'contacts' ? 'bg-[#F2993D] hover:bg-[#E08A2E] text-white' : ''}`}
                onClick={() => {
                  handleSort('contacts');
                  setFilterSheetOpen(false);
                }}
              >
                Contacts {sortColumn === 'contacts' && (sortDirection === 'asc' ? '↑' : '↓')}
              </Button>
            </div>
          </div>
        </div>
      </BottomSheet>

      <AddCustomerDrawer
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
      />
      <EditCustomerDrawer
        open={editCustomerOpen}
        onOpenChange={setEditCustomerOpen}
        customer={selectedCustomer}
        chef={selectedChef}
      />
      
      {/* Swipe Hint for Mobile Users */}
      <SwipeHint />
    </div>
  );
}