import { Upload, Plus, Edit, Mail, Eye, Check, Trash2, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { getQuotes, QuoteListItem } from '../services/api';
import { AuthDrawer } from '../components/AuthDrawer';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../components/ui/sheet';

export function QuoteMePage() {
  const navigate = useNavigate();
  const { profile } = useUser();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showPremiumDrawer, setShowPremiumDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDrawer, setActiveDrawer] = useState<
    'catalog' | 'documents' | 'links' | 'reps' | null
  >(null);
  const [catalogUploaded, setCatalogUploaded] = useState(true);
  const [defaultCatalogName, setDefaultCatalogName] = useState('Spring 2024 Catalog.xlsx');
  const [erpConnected, setErpConnected] = useState(true);
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);

  // Real quotes state
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);

  // Fetch quotes for logged-in users
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    setQuotesLoading(true);
    getQuotes().then((res) => {
      if (res.data) {
        setQuotes(res.data);
      } else {
        setQuotesError(res.error || 'Failed to load quotes');
      }
      setQuotesLoading(false);
    });
  }, [isAuthenticated, authLoading]);

  const handleManageAction = (drawerName: 'catalog' | 'documents' | 'links' | 'reps') => {
    if (profile.plan !== 'premium') {
      setShowPremiumDrawer(true);
    } else {
      setActiveDrawer(drawerName);
    }
  };
  const [showReps, setShowReps] = useState(true);

  // File input refs for drawer uploads
  const catalogFileRef = useRef<HTMLInputElement>(null);
  const documentFileRef = useRef<HTMLInputElement>(null);

  // Editing state for drawer items
  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null);
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editingRepId, setEditingRepId] = useState<number | null>(null);

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
  const [reps, setReps] = useState([
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@premiumfood.com',
      phone: '(555) 123-4567',
      territory: 'Downtown',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.j@premiumfood.com',
      phone: '(555) 987-6543',
      territory: 'West LA',
    },
    {
      id: 3,
      name: 'Mike Chen',
      email: 'mchen@premiumfood.com',
      phone: '(555) 456-7890',
      territory: 'South Bay',
    },
  ]);
  const [newRep, setNewRep] = useState({
    name: '',
    email: '',
    phone: '',
    territory: '',
  });

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
      });
    }
  };

  const formatCents = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredQuotes = quotes.filter((quote) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (quote.restaurant || '').toLowerCase().includes(query) ||
      quote.id.toLowerCase().includes(query) ||
      quote.working_label.toLowerCase().includes(query) ||
      quote.status.toLowerCase().includes(query)
    );
  });

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
              <label className="block text-sm mb-2">Product Catalog</label>
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
                Sales Representatives
              </h2>
              <p className="text-gray-500 text-sm">
                Manage your sales team
              </p>
            </div>
          </div>

          <div>
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

          {/* Guest prompt */}
          {profile.isGuest ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 mb-4">Log in to view your quote history</p>
              <Button
                onClick={() => setAuthDrawerOpen(true)}
                className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
              >
                Log In
              </Button>
            </div>
          ) : quotesLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading quotes...</p>
            </div>
          ) : quotesError ? (
            <div className="text-center py-12">
              <p className="text-sm text-red-500">{quotesError}</p>
            </div>
          ) : quotes.length === 0 && !searchQuery ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 mb-4">No quotes yet. Start your first quote!</p>
              <Button
                className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
                onClick={() => navigate('/start-new-quote')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Quote
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredQuotes.map((quote) => (
                  <div key={quote.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-blue-600">
                          {quote.restaurant || quote.working_label}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {quote.id.slice(0, 8)} &bull; {formatDate(quote.created_at)}
                        </p>
                      </div>
                      <div className="text-sm font-medium text-[#2A2A2A]">
                        {formatCents(quote.total_cents)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        quote.status === 'sent' ? 'bg-green-100 text-green-700' :
                        quote.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {quote.status}
                      </span>
                      <span className="text-xs text-gray-500">{quote.line_count} items</span>
                    </div>

                    <div className="flex items-center justify-end border-t border-gray-200 pt-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="sm" className="h-8 w-8 p-0"
                          onClick={() => navigate('/quote-builder', { state: { quoteId: quote.id } })}
                          title="Edit quote"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-8 w-8 p-0"
                          onClick={() => navigate('/export-finalize', { state: { quoteId: quote.id } })}
                          title="View quote"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-8 w-8 p-0"
                          onClick={() => navigate('/export-finalize', { state: { quoteId: quote.id, autoSend: true } })}
                          title="Send quote"
                        >
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
                  <div className="grid grid-cols-6 gap-4 pb-3 border-b border-gray-200 text-xs text-gray-600">
                    <div>Restaurant / Label</div>
                    <div>Date</div>
                    <div>Status</div>
                    <div>Items</div>
                    <div>Amount</div>
                    <div>Actions</div>
                  </div>

                  {/* Quote Rows */}
                  {filteredQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="grid grid-cols-6 gap-4 py-4 items-center border-b border-gray-100 hover:bg-gray-50"
                    >
                      <div className="text-sm text-blue-600">
                        {quote.restaurant || quote.working_label}
                      </div>
                      <div className="text-sm">{formatDate(quote.created_at)}</div>
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          quote.status === 'sent' ? 'bg-green-100 text-green-700' :
                          quote.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {quote.status}
                        </span>
                      </div>
                      <div className="text-sm">{quote.line_count}</div>
                      <div className="text-sm">{formatCents(quote.total_cents)}</div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => navigate('/quote-builder', { state: { quoteId: quote.id } })}
                          title="Edit quote"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => navigate('/export-finalize', { state: { quoteId: quote.id } })}
                          title="View quote"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => navigate('/export-finalize', { state: { quoteId: quote.id, autoSend: true } })}
                          title="Send quote"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {filteredQuotes.length === 0 && searchQuery && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No quotes found matching "{searchQuery}"
                </div>
              )}
            </>
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
              <input
                ref={catalogFileRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCatalogs([...catalogs, { id: Date.now(), name: file.name }]);
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={() => catalogFileRef.current?.click()}>
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
                      {editingCatalogId === catalog.id ? (
                        <Input
                          type="text"
                          value={catalog.name}
                          onChange={(e) => setCatalogs(catalogs.map(c => c.id === catalog.id ? { ...c, name: e.target.value } : c))}
                          onBlur={() => setEditingCatalogId(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingCatalogId(null)}
                          className="text-sm h-8"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm">{catalog.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCatalogId(catalog.id)}
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
              <input
                ref={documentFileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setDocuments([...documents, { id: Date.now(), name: file.name }]);
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={() => documentFileRef.current?.click()}>
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
                      {editingDocId === doc.id ? (
                        <Input
                          type="text"
                          value={doc.name}
                          onChange={(e) => setDocuments(documents.map(d => d.id === doc.id ? { ...d, name: e.target.value } : d))}
                          onBlur={() => setEditingDocId(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingDocId(null)}
                          className="text-sm h-8"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm">{doc.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingDocId(doc.id)}
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
              <h3 className="text-sm mb-3">Current Reps</h3>
              <div className="space-y-2">
                {reps.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    {editingRepId === rep.id ? (
                      <div className="space-y-2">
                        <Input
                          type="text" value={rep.name} className="text-sm h-8"
                          onChange={(e) => setReps(reps.map(r => r.id === rep.id ? { ...r, name: e.target.value } : r))}
                          placeholder="Name"
                        />
                        <Input
                          type="email" value={rep.email} className="text-sm h-8"
                          onChange={(e) => setReps(reps.map(r => r.id === rep.id ? { ...r, email: e.target.value } : r))}
                          placeholder="Email"
                        />
                        <Input
                          type="tel" value={rep.phone} className="text-sm h-8"
                          onChange={(e) => setReps(reps.map(r => r.id === rep.id ? { ...r, phone: e.target.value } : r))}
                          placeholder="Phone"
                        />
                        <Input
                          type="text" value={rep.territory} className="text-sm h-8"
                          onChange={(e) => setReps(reps.map(r => r.id === rep.id ? { ...r, territory: e.target.value } : r))}
                          placeholder="Territory"
                        />
                        <Button size="sm" onClick={() => setEditingRepId(null)} className="bg-[#F2993D] hover:bg-[#E08A2E] text-white">
                          Done
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{rep.name}</span>
                          <p className="text-xs text-gray-500">{rep.email}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRepId(rep.id)}
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
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Auth Drawer */}
      <AuthDrawer
        isOpen={authDrawerOpen}
        onClose={() => setAuthDrawerOpen(false)}
        defaultMode="login"
        onSuccess={() => setAuthDrawerOpen(false)}
      />

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
                Sales Representatives, Catalog Management, and Unlimited Quotes are available exclusively on our Premium plan.
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