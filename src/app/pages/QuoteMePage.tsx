import { Upload, Download, Plus, Edit, Mail, Eye, Check, X, Trash2, ChevronDown, ChevronUp, Sparkles, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useUser } from '../contexts/UserContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../components/ui/sheet';

const recentQuotes = [
  {
    id: 1,
    customerName: 'Bella Vista Restaurant',
    date: 'Jan 14, 2024',
    quoteId: 'quote-1',
    chef: 'Michael Chan',
    amount: '$3456.75',
  },
  {
    id: 2,
    customerName: 'The Italian Kitchen',
    date: 'Jan 11, 2024',
    quoteId: 'quote-2',
    chef: 'Sophie Laurent',
    amount: '$2189.60',
  },
  {
    id: 3,
    customerName: 'Osteria del Mare',
    date: 'Jan 5, 2024',
    quoteId: 'quote-3',
    chef: 'Emily Rodriguez',
    amount: '$4372.25',
  },
];

export function QuoteMePage() {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [showPremiumDrawer, setShowPremiumDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wonQuotes, setWonQuotes] = useState<Set<number>>(new Set());
  const [activeDrawer, setActiveDrawer] = useState<
    'catalog' | 'documents' | 'links' | 'routes' | 'reps' | null
  >(null);
  const [catalogUploaded, setCatalogUploaded] = useState(true);
  const [defaultCatalogName, setDefaultCatalogName] = useState('Spring 2024 Catalog.xlsx');
  const [erpConnected, setErpConnected] = useState(true);

  const handleManageAction = (drawerName: 'catalog' | 'documents' | 'links' | 'routes' | 'reps') => {
    if (profile.plan !== 'premium') {
      setShowPremiumDrawer(true);
    } else {
      setActiveDrawer(drawerName);
    }
  };
  const [showRoutes, setShowRoutes] = useState(true);
  const [showReps, setShowReps] = useState(true);

  // State for uploaded items
  const [catalogs, setCatalogs] = useState([
    { id: 1, name: 'Spring 2024 Catalog.xlsx' },
    { id: 2, name: 'Seafood Products.csv' },
  ]);
  const [documents, setDocuments] = useState([
    { id: 1, name: 'Terms and Conditions.pdf' },
    { id: 2, name: 'Quality Standards.pdf' },
    { id: 3, name: 'Delivery Policy.pdf' },
  ]);
  const [links, setLinks] = useState([
    { id: 1, url: 'https://example.com/onboarding' },
    { id: 2, url: 'https://example.com/customer-portal' },
  ]);
  const [routes, setRoutes] = useState([
    {
      id: 1,
      name: 'Downtown Route',
      territory: 'Downtown',
      rep: 'John Smith',
      cutoffTime: '10:00 AM',
      days: ['Mon', 'Wed', 'Fri'],
    },
    {
      id: 2,
      name: 'Westside Route',
      territory: 'West LA',
      rep: 'Sarah Johnson',
      cutoffTime: '2:00 PM',
      days: ['Tue', 'Thu'],
    },
  ]);
  const [newRoute, setNewRoute] = useState({
    name: '',
    territory: '',
    rep: '',
    cutoffTime: '',
    days: [] as string[],
  });
  const [reps, setReps] = useState([
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@premiumfood.com',
      phone: '(555) 123-4567',
      territory: 'Downtown',
      routes: ['Downtown Route'],
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.j@premiumfood.com',
      phone: '(555) 987-6543',
      territory: 'West LA',
      routes: ['Westside Route'],
    },
    {
      id: 3,
      name: 'Mike Chen',
      email: 'mchen@premiumfood.com',
      phone: '(555) 456-7890',
      territory: 'South Bay',
      routes: [],
    },
  ]);
  const [newRep, setNewRep] = useState({
    name: '',
    email: '',
    phone: '',
    territory: '',
    routes: [] as string[],
  });

  const toggleWon = (quoteId: number) => {
    const newWonQuotes = new Set(wonQuotes);
    if (newWonQuotes.has(quoteId)) {
      newWonQuotes.delete(quoteId);
    } else {
      newWonQuotes.add(quoteId);
    }
    setWonQuotes(newWonQuotes);
  };

  const handleDeleteCatalog = (id: number) => {
    setCatalogs(catalogs.filter((c) => c.id !== id));
  };

  const handleDeleteDocument = (id: number) => {
    setDocuments(documents.filter((d) => d.id !== id));
  };

  const handleDeleteLink = (id: number) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  const handleAddLink = () => {
    setLinks([...links, { id: Date.now(), url: '' }]);
  };

  const handleDeleteRoute = (id: number) => {
    setRoutes(routes.filter((r) => r.id !== id));
  };

  const handleAddRoute = () => {
    if (newRoute.name && newRoute.territory) {
      setRoutes([
        ...routes,
        {
          id: Date.now(),
          ...newRoute,
        },
      ]);
      setNewRoute({
        name: '',
        territory: '',
        rep: '',
        cutoffTime: '',
        days: [],
      });
    }
  };

  const toggleDay = (day: string) => {
    const currentDays = newRoute.days;
    if (currentDays.includes(day)) {
      setNewRoute({
        ...newRoute,
        days: currentDays.filter((d) => d !== day),
      });
    } else {
      setNewRoute({
        ...newRoute,
        days: [...currentDays, day],
      });
    }
  };

  const handleDeleteRep = (id: number) => {
    setReps(reps.filter((r) => r.id !== id));
  };

  const handleAddRep = () => {
    if (newRep.name && newRep.email) {
      setReps([
        ...reps,
        {
          id: Date.now(),
          ...newRep,
        },
      ]);
      setNewRep({
        name: '',
        email: '',
        phone: '',
        territory: '',
        routes: [],
      });
    }
  };

  const filteredQuotes = recentQuotes.filter((quote) => {
    const query = searchQuery.toLowerCase();
    return (
      quote.customerName.toLowerCase().includes(query) ||
      quote.quoteId.toLowerCase().includes(query) ||
      quote.chef.toLowerCase().includes(query) ||
      quote.date.toLowerCase().includes(query)
    );
  });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                {profile.distributorLogo ? (
                  <img src={profile.distributorLogo} alt="Distributor Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm"></span>
                )}
              </div>
              <h1 className="text-2xl text-[#4F4F4F]">QuoteMe</h1>
            </div>
          </div>
          <p className="text-[#4F4F4F] text-sm">Premium Food Distributors</p>
        </div>

        {/* Distributor Details */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-1">Distributor Details</h2>
          

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Contact Details */}
            <div>
              {/* Distributor Name */}
              <div className="mb-4">
                <label className="block text-sm mb-2 text-gray-600">Distributor Name</label>
                <div className="font-medium text-[#2A2A2A] text-[14px]">{profile.distributorName}</div>
              </div>
              
              {/* User Name */}
              <div className="mb-4">
                <label className="block text-sm mb-2 text-gray-600">User Name</label>
                <div className="font-medium text-[#2A2A2A] text-[14px]">{profile.fullName}</div>
              </div>

              {/* Email Field */}
              <div className="mb-4">
                <label className="block text-sm mb-2 text-gray-600">Email</label>
                <div className="font-medium text-[#2A2A2A] text-[14px]">{profile.email}</div>
              </div>

              {/* Phone Field */}
              <div className="mb-4">
                <label className="block text-sm mb-2 text-gray-600">Phone</label>
                <div className="font-medium text-[#2A2A2A] text-[14px]">{profile.phoneNumber}</div>
              </div>

              <div className="text-xs text-gray-400 italic mt-6">
                <span className="md:hidden">Use the Settings page (top right) to change profile</span>
                <span className="hidden md:inline">Use the Settings page (bottom left) to change profile</span>
              </div>
            </div>

            {/* Right Column - Catalog */}
            <div>
              <label className="block text-sm mb-2">Catalog Template</label>
              <div className="border border-gray-200 rounded-lg p-4 mb-2">
                <Button variant="outline" size="sm" className="w-full text-sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Download the template to format your catalog
              </p>

              <label className="block text-sm mt-4 mb-2">Product Catalog</label>
              {catalogUploaded ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Default Catalog</p>
                      <p className="text-sm font-medium text-[#2A2A2A]">{defaultCatalogName}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs ml-2"
                      onClick={() => setCatalogUploaded(false)}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Change
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${erpConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs text-gray-600">
                        {erpConnected ? 'ERP Connected' : 'ERP Not Connected'}
                      </span>
                    </div>
                    <button
                      onClick={() => setErpConnected(!erpConnected)}
                      className="text-xs text-blue-600 hover:underline ml-auto"
                    >
                      {erpConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-sm"
                    onClick={() => setCatalogUploaded(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Catalog
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    CSV or Excel format. Accepts XLS, XLSX, project_specs, .prp
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sales Representatives & Delivery Routes */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border-2 border-blue-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#F2993D] text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl uppercase tracking-wider">
            Premium
          </div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg mb-1">
                Sales Representatives & Delivery Routes
              </h2>
              <p className="text-gray-500 text-sm">
                Manage your sales team and delivery logistics
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales Representatives */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm">Sales Representatives</h3>
                  <button
                    onClick={() => setShowReps(!showReps)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showReps ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <Button
                  onClick={() => handleManageAction('reps')}
                  variant="ghost"
                  size="sm"
                  className="text-sm text-blue-600"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Manage Reps
                </Button>
              </div>
              <p className="text-xs text-gray-500 mb-3">3 active representatives</p>

              {showReps && (
                <div className="space-y-2 mb-3">
                  {reps.map((rep) => (
                    <div key={rep.id} className="bg-gray-50 rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium">{rep.name}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => handleManageAction('reps')}
                        >
                          <Edit className="w-3 h-3 text-gray-500" />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {rep.email}
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {rep.phone}
                      </div>
                      <div className="text-xs text-gray-600">
                        Territory: {rep.territory}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-gray-50 rounded p-3 mb-3">
                <h4 className="text-sm mb-2">Product Catalog</h4>
                <p className="text-xs text-gray-500 mb-2">
                  Protect and automate management
                </p>
                <Button
                  onClick={() => handleManageAction('catalog')}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs flex items-center justify-between"
                >
                  <span>Manage Catalog</span>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              <div className="bg-gray-50 rounded p-3 mb-3">
                <h4 className="text-sm mb-2">Onboarding Documents</h4>
                <p className="text-xs text-gray-500 mb-2">
                  7 documents available for new customers
                </p>
                <Button
                  onClick={() => handleManageAction('documents')}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs flex items-center justify-between"
                >
                  <span>Manage Onboarding Docs</span>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              <div className="bg-gray-50 rounded p-3">
                <h4 className="text-sm mb-2">Onboarding Link(s)</h4>
                <p className="text-xs text-gray-500 mb-2">
                  3 field(s) available for new customers
                </p>
                <Button
                  onClick={() => handleManageAction('links')}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs flex items-center justify-between"
                >
                  <span>Manage Onboarding Links</span>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Delivery Routes */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm">Delivery Routes</h3>
                  <button
                    onClick={() => setShowRoutes(!showRoutes)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showRoutes ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <Button
                  onClick={() => handleManageAction('routes')}
                  variant="ghost"
                  size="sm"
                  className="text-sm text-blue-600"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Manage Routes
                </Button>
              </div>
              
              {showRoutes && (
                <div className="space-y-2">
                  {routes.map((route) => (
                    <div
                      key={route.id}
                      className="bg-gray-50 rounded p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">{route.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{route.cutoffTime}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => handleManageAction('routes')}
                          >
                            <Edit className="w-3 h-3 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        Territory: {route.territory}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        Rep: {route.rep}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {route.days.map((day) => (
                          <span
                            key={day}
                            className="px-2 py-0.5 text-xs bg-[#A5CFDD] text-white rounded"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Find Quotes */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-1">Find Quotes</h2>
          <p className="text-gray-500 text-sm mb-4">
            Search by customer name, chef name, quote id, or date
          </p>
          <Input
            type="text"
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-50 border-gray-200"
          />
        </div>

        {/* Recent Quotes */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg mb-1">Recent Quotes</h2>
          <p className="text-gray-500 text-sm mb-4">
            View latest quotes and their status
          </p>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredQuotes.map((quote) => (
              <div key={quote.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-blue-600">{quote.customerName}</h3>
                    <p className="text-xs text-gray-500">{quote.quoteId} • {quote.date}</p>
                  </div>
                  <div className="text-sm font-medium text-[#2A2A2A]">{quote.amount}</div>
                </div>
                
                <div className="mb-3">
                  <p className="text-xs text-gray-500">Chef: <span className="text-[#2A2A2A]">{quote.chef}</span></p>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Won:</span>
                    <button
                      onClick={() => toggleWon(quote.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        wonQuotes.has(quote.id)
                          ? 'bg-[#A5CFDD] border-[#A5CFDD]'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {wonQuotes.has(quote.id) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Table Header */}
              <div className="grid grid-cols-7 gap-4 pb-3 border-b border-gray-200 text-xs text-gray-600">
            <div>Customer Name</div>
            <div>Date</div>
            <div>Quote #</div>
            <div>Chef Name</div>
            <div>Amount</div>
            <div>Won</div>
            <div>Actions</div>
          </div>

          {/* Quote Rows */}
          {filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              className="grid grid-cols-7 gap-4 py-4 items-center border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="text-sm text-blue-600">{quote.customerName}</div>
              <div className="text-sm">{quote.date}</div>
              <div className="text-sm">{quote.quoteId}</div>
              <div className="text-sm">{quote.chef}</div>
              <div className="text-sm">{quote.amount}</div>
              <div>
                <button
                  onClick={() => toggleWon(quote.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    wonQuotes.has(quote.id)
                      ? 'bg-[#A5CFDD] border-[#A5CFDD]'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {wonQuotes.has(quote.id) && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Mail className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
            </div>
          </div>
          {filteredQuotes.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No quotes found matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Add New Quote Button */}
        <div className="text-center mt-6">
          <Button
            className="bg-[#F2993D] hover:bg-[#E08A2E] text-white flex items-center gap-2"
            onClick={() => navigate('/start-new-quote')}
          >
            <Plus className="w-4 h-4" />
            Start New Quote
          </Button>
        </div>
      </div>

      {/* Product Catalog Drawer */}
      <Sheet open={activeDrawer === 'catalog'} onOpenChange={(open) => !open && setActiveDrawer(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Manage Product Catalog</SheetTitle>
            <SheetDescription>
              Upload and manage your product catalogs
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Upload Section */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload New Catalog
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                CSV or Excel format. Accepts XLS, XLSX, project_specs, .prp
              </p>
            </div>

            {/* Uploaded Catalogs List */}
            <div>
              <h3 className="text-sm mb-3">Uploaded Catalogs</h3>
              <div className="space-y-2">
                {catalogs.map((catalog) => (
                  <div
                    key={catalog.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{catalog.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCatalog(catalog.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Onboarding Documents Drawer */}
      <Sheet open={activeDrawer === 'documents'} onOpenChange={(open) => !open && setActiveDrawer(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Manage Onboarding Documents</SheetTitle>
            <SheetDescription>
              Upload and manage documents for new customers
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Upload Section */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                PDF, DOC, DOCX up to 10MB
              </p>
            </div>

            {/* Uploaded Documents List */}
            <div>
              <h3 className="text-sm mb-3">Uploaded Documents</h3>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Onboarding Links Drawer */}
      <Sheet open={activeDrawer === 'links'} onOpenChange={(open) => !open && setActiveDrawer(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Manage Onboarding Links</SheetTitle>
            <SheetDescription>
              Add and manage onboarding links for new customers
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Links List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm">Onboarding Links</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddLink}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Link
                </Button>
              </div>
              <div className="space-y-3">
                {links.map((link, index) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">
                        Link {index + 1}
                      </label>
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...links];
                          newLinks[index].url = e.target.value;
                          setLinks(newLinks);
                        }}
                        className="text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLink(link.id)}
                      className="mt-5"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delivery Routes Drawer */}
      <Sheet open={activeDrawer === 'routes'} onOpenChange={(open) => !open && setActiveDrawer(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Manage Delivery Routes</SheetTitle>
            <SheetDescription>
              Add and manage delivery routes for your sales team
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* New Route Form */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm mb-4">New Route Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Route Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter route name"
                    value={newRoute.name}
                    onChange={(e) =>
                      setNewRoute({ ...newRoute, name: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Territory
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter territory"
                    value={newRoute.territory}
                    onChange={(e) =>
                      setNewRoute({ ...newRoute, territory: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Sales Rep
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter rep name"
                    value={newRoute.rep}
                    onChange={(e) =>
                      setNewRoute({ ...newRoute, rep: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Cutoff Time
                  </label>
                  <Input
                    type="time"
                    placeholder="Select cutoff time"
                    value={newRoute.cutoffTime}
                    onChange={(e) =>
                      setNewRoute({ ...newRoute, cutoffTime: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">
                    Delivery Days
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {weekDays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                          newRoute.days.includes(day)
                            ? 'bg-[#F2993D] text-white border-[#F2993D]'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleAddRoute}
                  className="w-full bg-[#F2993D] hover:bg-[#e08a35] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Route
                </Button>
              </div>
            </div>

            {/* Routes List */}
            <div>
              <h3 className="text-sm mb-3">Uploaded Routes</h3>
              <div className="space-y-2">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{route.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRoute(route.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sales Representatives Drawer */}
      <Sheet open={activeDrawer === 'reps'} onOpenChange={(open) => !open && setActiveDrawer(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Manage Sales Representatives</SheetTitle>
            <SheetDescription>
              Add and manage sales representatives for your team
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* New Rep Form */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm mb-4">New Rep Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter rep name"
                    value={newRep.name}
                    onChange={(e) =>
                      setNewRep({ ...newRep, name: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter rep email"
                    value={newRep.email}
                    onChange={(e) =>
                      setNewRep({ ...newRep, email: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    placeholder="Enter rep phone"
                    value={newRep.phone}
                    onChange={(e) =>
                      setNewRep({ ...newRep, phone: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Territory
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter territory"
                    value={newRep.territory}
                    onChange={(e) =>
                      setNewRep({ ...newRep, territory: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">
                    Routes
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {routes.map((route) => (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => {
                          const currentRoutes = newRep.routes;
                          if (currentRoutes.includes(route.name)) {
                            setNewRep({
                              ...newRep,
                              routes: currentRoutes.filter((r) => r !== route.name),
                            });
                          } else {
                            setNewRep({
                              ...newRep,
                              routes: [...currentRoutes, route.name],
                            });
                          }
                        }}
                        className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                          newRep.routes.includes(route.name)
                            ? 'bg-[#F2993D] text-white border-[#F2993D]'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {route.name}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleAddRep}
                  className="w-full bg-[#F2993D] hover:bg-[#e08a35] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rep
                </Button>
              </div>
            </div>

            {/* Reps List */}
            <div>
              <h3 className="text-sm mb-3">Uploaded Reps</h3>
              <div className="space-y-2">
                {reps.map((rep) => (
                  <div
                    key={rep.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{rep.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRep(rep.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Premium Upgrade Drawer */}
      <Sheet open={showPremiumDrawer} onOpenChange={setShowPremiumDrawer}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F2993D] fill-[#F2993D]" />
              Premium Feature
            </SheetTitle>
            <SheetDescription>
              Upgrade to access advanced management tools
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-[#F2993D]" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-[#2A2A2A]">Unlock Premium Features</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Sales Representatives, Delivery Routes, Catalog Management, and Unlimited Quotes are available exclusively on our Premium plan.
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 w-full max-w-sm">
              <ul className="space-y-3 text-sm text-left">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#F2993D]" />
                  <span>Manage Sales Representatives</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#F2993D]" />
                  <span>Configure Delivery Routes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#F2993D]" />
                  <span>Advanced Catalog Management</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#F2993D]" />
                  <span>Send Unlimited Quotes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#F2993D]" />
                  <span>Append Onboarding Docs & Links</span>
                </li>
              </ul>
            </div>

            <Button 
              className="bg-[#F2993D] hover:bg-[#E08A2E] text-white w-full max-w-sm h-12 text-lg"
              onClick={() => {
                setShowPremiumDrawer(false);
                navigate('/settings/billing');
              }}
            >
              Upgrade Plan Now
            </Button>
            
            <button 
              className="text-gray-400 text-sm hover:text-gray-600"
              onClick={() => setShowPremiumDrawer(false)}
            >
              Maybe later
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}