import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Mail, Phone, Clock, FileText, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useLocation2 } from '../contexts/LocationContext';
import {
  getLocationDistributors,
  getLocationQuotes,
  type LocationDistributorRelationship,
  type LocationQuote,
} from '../services/api';

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  inbound: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Inbound' },
  assigned: { bg: 'bg-green-100', text: 'text-green-700', label: 'Assigned' },
  priced: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Priced' },
  deactivated: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Deactivated' },
};

export function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedLocation } = useLocation2();
  const [vendor, setVendor] = useState<LocationDistributorRelationship | null>(null);
  const [quotes, setQuotes] = useState<LocationQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedLocation || !id) return;

    async function load() {
      setLoading(true);
      const [vendorsRes, quotesRes] = await Promise.all([
        getLocationDistributors(selectedLocation!.id),
        getLocationQuotes(selectedLocation!.id),
      ]);

      if (vendorsRes.data) {
        const found = vendorsRes.data.find((v) => v.id === id);
        setVendor(found || null);

        // Filter quotes for this vendor's distributor
        if (found && quotesRes.data) {
          const distId = found.distributor?.id;
          if (distId) {
            setQuotes(quotesRes.data.filter((q) => q.distributor?.id === distId));
          } else {
            setQuotes([]);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [selectedLocation?.id, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#F2993D] border-t-transparent" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate('/vendors')} className="text-sm text-[#7FAEC2] hover:underline mb-4 flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Vendors
        </button>
        <p className="text-gray-500">Vendor not found.</p>
      </div>
    );
  }

  const distName = vendor.distributor?.name || vendor.distributor_name_text;
  const repName = vendor.rep?.name || vendor.rep_name_text;
  const repEmail = vendor.rep?.email || vendor.rep_email_text;
  const repPhone = vendor.rep_phone_text;
  const status = statusStyles[vendor.status] || statusStyles.inbound;
  const isUnregistered = !vendor.distributor;

  const handleRequestQuote = () => {
    navigate('/', {
      state: {
        preselectedDistributorId: vendor.distributor?.id,
        preselectedDistributorName: distName,
        skipCoverage: true,
      },
    });
  };

  const formatCents = (cents: number | null) => {
    if (!cents) return '--';
    return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate('/vendors')}
          className="text-sm text-[#7FAEC2] hover:underline mb-6 flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back to Vendors
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'Playfair Display, serif', color: '#A5CFDD' }}
            >
              {distName}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2.5 py-1 rounded font-medium ${status.bg} ${status.text}`}>
                {status.label}
              </span>
              {vendor.status === 'priced' && (
                <span className="text-xs px-2.5 py-1 rounded font-medium bg-emerald-100 text-emerald-700">
                  Price Access Enabled
                </span>
              )}
            </div>
          </div>
          <Button
            onClick={handleRequestQuote}
            className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
          >
            Request a Quote
          </Button>
        </div>

        {/* Unregistered Notice */}
        {isUnregistered && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              This distributor isn't on QuoteMe yet. We've invited them.
            </p>
          </div>
        )}

        {/* Rep Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-[#4F4F4F] uppercase tracking-wide mb-4">
            Assigned Rep
          </h2>
          {repName || repEmail ? (
            <div className="space-y-2">
              {repName && (
                <p className="font-medium text-[#2A2A2A]">{repName}</p>
              )}
              {repEmail && (
                <div className="flex items-center gap-2 text-sm text-[#4F4F4F]">
                  <Mail size={14} className="text-[#7FAEC2]" />
                  <a href={`mailto:${repEmail}`} className="hover:underline" style={{ color: '#7FAEC2' }}>
                    {repEmail}
                  </a>
                </div>
              )}
              {repPhone && (
                <div className="flex items-center gap-2 text-sm text-[#4F4F4F]">
                  <Phone size={14} className="text-[#7FAEC2]" />
                  <a href={`tel:${repPhone}`} className="hover:underline" style={{ color: '#7FAEC2' }}>
                    {repPhone}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock size={14} />
              <span>Waiting for distributor to assign a rep.</span>
            </div>
          )}
        </div>

        {/* Quote History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-[#4F4F4F] uppercase tracking-wide mb-4">
            Quote History
          </h2>
          {quotes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No quotes with this vendor yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quotes.map((q) => {
                const qStatus = q.status === 'sent' ? 'bg-green-100 text-green-700'
                  : q.status === 'draft' ? 'bg-gray-100 text-gray-600'
                  : q.status === 'accepted' ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600';
                return (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/quote-builder`, { state: { quoteId: q.id } })}
                    className="w-full text-left flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:border-[#7FAEC2] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-[#2A2A2A] truncate">
                          {q.working_label || 'Quote'}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${qStatus}`}>
                          {q.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(q.created_at)}
                        {q.total_cents ? ` · ${formatCents(q.total_cents)}` : ''}
                      </p>
                    </div>
                    <ExternalLink size={14} className="text-gray-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
