import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLocation2 } from '../contexts/LocationContext';
import {
  getLocationDistributors,
  searchDistributors,
  createLocationVendor,
  type LocationDistributorRelationship,
  type DistributorSearchResult,
} from '../services/api';

const statusStyles: Record<string, string> = {
  assigned: 'bg-green-100 text-green-700',
  priced: 'bg-blue-100 text-blue-700',
  inbound: 'bg-yellow-100 text-yellow-700',
  deactivated: 'bg-gray-100 text-gray-500',
};

export function VendorsPage() {
  const { selectedLocation } = useLocation2();
  const [vendors, setVendors] = useState<LocationDistributorRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Vendor form
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorRepName, setVendorRepName] = useState('');
  const [vendorRepEmail, setVendorRepEmail] = useState('');
  const [addingVendor, setAddingVendor] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DistributorSearchResult[]>([]);
  const [selectedDistId, setSelectedDistId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchVendors = useCallback(async () => {
    if (!selectedLocation) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const distRes = await getLocationDistributors(selectedLocation.id);
    if (distRes.error) {
      setError(distRes.error);
    } else if (distRes.data) {
      setVendors(distRes.data);
    }
    setLoading(false);
  }, [selectedLocation?.id]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleNameChange = (val: string) => {
    setVendorName(val);
    setSelectedDistId(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        const res = await searchDistributors(val.trim());
        if (res.data) {
          setSuggestions(res.data);
          setShowSuggestions(res.data.length > 0);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (d: DistributorSearchResult) => {
    setVendorName(d.name);
    setSelectedDistId(d.id);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleAddVendor = async () => {
    if (!vendorName.trim() || !selectedLocation) return;
    setAddingVendor(true);
    setAddError(null);

    const res = await createLocationVendor(selectedLocation.id, {
      distributor_name_text: vendorName.trim(),
      distributor_id: selectedDistId || undefined,
      rep_name_text: vendorRepName.trim() || undefined,
      rep_email_text: vendorRepEmail.trim() || undefined,
    });

    if (res.error) {
      setAddError(res.error);
    } else if (res.data) {
      setVendors((prev) => [res.data!, ...prev]);
      setVendorName('');
      setVendorRepName('');
      setVendorRepEmail('');
      setSelectedDistId(null);
      setShowAddVendor(false);
    }
    setAddingVendor(false);
  };

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl mb-1 text-[#4F4F4F]">Vendors</h1>
            <p className="text-[#4F4F4F] text-sm">
              Your distributor relationships
              {selectedLocation ? ` for ${selectedLocation.name}` : ''}
            </p>
          </div>
          {!showAddVendor && (
            <Button
              className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
              onClick={() => setShowAddVendor(true)}
            >
              <Plus size={16} className="mr-1" /> Add Vendor
            </Button>
          )}
        </div>

        {/* Add Vendor Form */}
        {showAddVendor && (
          <div className="bg-white border border-[#F2993D] rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#2A2A2A]">Add Vendor</h2>
              <button onClick={() => { setShowAddVendor(false); setAddError(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="relative" ref={suggestRef}>
                <label className="block text-sm text-[#4F4F4F] mb-1">Distributor Name *</label>
                <Input
                  value={vendorName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Start typing distributor name..."
                  className="bg-white"
                  autoFocus
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                    {suggestions.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleSelectSuggestion(d)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                      >
                        {d.logo_url ? (
                          <img src={d.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                            {d.name.charAt(0)}
                          </div>
                        )}
                        <span>{d.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#4F4F4F] mb-1">Rep Name</label>
                  <Input
                    value={vendorRepName}
                    onChange={(e) => setVendorRepName(e.target.value)}
                    placeholder="Optional"
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#4F4F4F] mb-1">Rep Email</label>
                  <Input
                    type="email"
                    value={vendorRepEmail}
                    onChange={(e) => setVendorRepEmail(e.target.value)}
                    placeholder="Optional"
                    className="bg-white"
                  />
                </div>
              </div>
              {addError && <p className="text-sm text-red-500">{addError}</p>}
              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleAddVendor}
                  disabled={addingVendor || !vendorName.trim()}
                  className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
                >
                  {addingVendor ? 'Adding...' : 'Add Vendor'}
                </Button>
                <Button variant="outline" onClick={() => { setShowAddVendor(false); setAddError(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#F2993D] mr-2" />
            <span className="text-gray-500">Loading vendors...</span>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && vendors.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No vendors yet</p>
            <p className="text-sm mt-1">Upload a menu to see who can help.</p>
          </div>
        )}

        {!loading && vendors.length > 0 && (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {vendors.map((v) => (
                <div key={v.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-[#2A2A2A]">
                      {v.distributor?.name || v.distributor_name_text}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusStyles[v.status] || 'bg-gray-100 text-gray-600'}`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div>
                      <span className="text-xs text-gray-400 block uppercase tracking-wide">Rep</span>
                      <span className="text-[#2A2A2A]">
                        {v.rep?.name || v.rep_name_text || '--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block uppercase tracking-wide">Email</span>
                      <span className="text-[#2A2A2A] text-xs">
                        {v.rep?.email || v.rep_email_text || '--'}
                      </span>
                    </div>
                    {v.rep_phone_text && (
                      <div className="col-span-2">
                        <span className="text-xs text-gray-400 block uppercase tracking-wide">Phone</span>
                        <span className="text-[#2A2A2A]">{v.rep_phone_text}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300 text-xs text-gray-600">
                      <th className="text-left pb-2 font-semibold">Distributor</th>
                      <th className="text-left pb-2 font-semibold">Rep</th>
                      <th className="text-left pb-2 font-semibold">Email</th>
                      <th className="text-left pb-2 font-semibold">Phone</th>
                      <th className="text-left pb-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 font-medium text-[#2A2A2A]">
                          {v.distributor?.name || v.distributor_name_text}
                        </td>
                        <td className="py-3 text-sm text-[#4F4F4F]">
                          {v.rep?.name || v.rep_name_text || '--'}
                        </td>
                        <td className="py-3 text-sm text-[#A5CFDD]">
                          {v.rep?.email || v.rep_email_text || '--'}
                        </td>
                        <td className="py-3 text-sm text-[#4F4F4F]">
                          {v.rep_phone_text || '--'}
                        </td>
                        <td className="py-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusStyles[v.status] || 'bg-gray-100 text-gray-600'}`}>
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
