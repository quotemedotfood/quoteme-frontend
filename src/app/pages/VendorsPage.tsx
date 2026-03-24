import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  getLocations,
  getLocationDistributors,
  type LocationItem,
  type LocationDistributorRelationship,
} from '../services/api';

const statusStyles: Record<string, string> = {
  assigned: 'bg-green-100 text-green-700',
  priced: 'bg-blue-100 text-blue-700',
  inbound: 'bg-yellow-100 text-yellow-700',
  deactivated: 'bg-gray-100 text-gray-500',
};

export function VendorsPage() {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [vendors, setVendors] = useState<LocationDistributorRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    const locRes = await getLocations();
    if (locRes.error || !locRes.data) {
      setError(locRes.error || 'Failed to load locations');
      setLoading(false);
      return;
    }
    setLocations(locRes.data);

    // Fetch distributors for the first (active) location
    if (locRes.data.length > 0) {
      const distRes = await getLocationDistributors(locRes.data[0].id);
      if (distRes.data) {
        setVendors(distRes.data);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl mb-1 text-[#4F4F4F]">Vendors</h1>
          <p className="text-[#4F4F4F] text-sm">
            Your distributor relationships
          </p>
        </div>

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
            <p className="text-sm mt-1">When a distributor sends you a quote, they'll appear here.</p>
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
