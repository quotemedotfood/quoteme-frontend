import { Plus, FileText, UtensilsCrossed, ArrowRight, ClipboardPaste, Store, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useLocation2 } from '../contexts/LocationContext';
import { isBuyerRole } from '../utils/roles';
import {
  getQuotes,
  getRestaurants,
  getLocationDistributors,
  QuoteListItem,
  RestaurantIndexItem,
  LocationDistributorRelationship,
} from '../services/api';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-red-100', text: 'text-red-700' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  assigned: { bg: 'bg-[#A5CFDD]/20', text: 'text-[#2A5F6F]' },
  sent: { bg: 'bg-green-100', text: 'text-green-700' },
  won: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  lost: { bg: 'bg-red-100', text: 'text-red-700' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// =============================================================
// Buyer Dashboard
// =============================================================
function BuyerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedLocation } = useLocation2();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [vendors, setVendors] = useState<LocationDistributorRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const promises: Promise<void>[] = [
      getQuotes().then((r) => { if (r.data) setQuotes(r.data); }),
    ];
    if (selectedLocation) {
      promises.push(
        getLocationDistributors(selectedLocation.id).then((r) => { if (r.data) setVendors(r.data); })
      );
    }
    Promise.all(promises).then(() => setLoading(false));
  }, [selectedLocation?.id]);

  const draftQuotes = quotes.filter((q) => q.status === 'draft');
  const openRequests = quotes.filter((q) => ['pending', 'assigned'].includes(q.status)).length;
  const quotesReady = quotes.filter((q) => q.status === 'sent').length;
  const pendingFollowUp = quotes.filter((q) => q.status === 'won' || q.status === 'expired').length;
  const recentQuotes = quotes.filter((q) => q.status !== 'draft').slice(0, 5);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* Welcome */}
      <h1
        className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-1"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {user?.first_name ? `Welcome back, ${user.first_name}` : 'Welcome back'}
      </h1>
      <p className="text-sm text-[#4F4F4F] mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        What do you need quoted?
      </p>

      {/* Draft Quotes — red treatment */}
      {draftQuotes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-red-600 mb-2 uppercase tracking-wide">Draft Quotes</h2>
          <div className="space-y-2">
            {draftQuotes.map((q) => (
              <button
                key={q.id}
                onClick={() => navigate('/quote-builder', { state: { quoteId: q.id } })}
                className="w-full text-left bg-red-50 border border-red-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium text-red-800 text-sm truncate">
                    {q.working_label || q.restaurant || 'Untitled Draft'}
                  </div>
                  <div className="text-xs text-red-400 mt-0.5">
                    {formatDate(q.created_at)} · {q.line_count} items
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 flex-shrink-0 ml-3">
                  draft
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Primary Action */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <Button
          onClick={() => navigate('/start-new-quote')}
          className="w-full sm:w-auto bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white text-base px-8 py-6"
          size="lg"
        >
          <Plus size={20} className="mr-2" /> Start New Quote
        </Button>
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => navigate('/start-new-quote')}
            className="flex items-center gap-2 text-sm text-[#7FAEC2] hover:underline"
          >
            <FileText size={14} /> Upload Menu
          </button>
          <button
            onClick={() => navigate('/start-new-quote')}
            className="flex items-center gap-2 text-sm text-[#7FAEC2] hover:underline"
          >
            <ClipboardPaste size={14} /> Paste Menu
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertCircle size={16} className="text-yellow-500" />
            <span className="text-2xl font-bold text-[#2A2A2A]">{openRequests}</span>
          </div>
          <p className="text-xs text-[#4F4F4F]">Open Requests</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-2xl font-bold text-[#2A2A2A]">{quotesReady}</span>
          </div>
          <p className="text-xs text-[#4F4F4F]">Quotes Ready</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock size={16} className="text-orange-500" />
            <span className="text-2xl font-bold text-[#2A2A2A]">{pendingFollowUp}</span>
          </div>
          <p className="text-xs text-[#4F4F4F]">Pending Follow-Up</p>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400 py-4">Loading...</p>}

      {!loading && (
        <div className="grid gap-8 md:grid-cols-2">
          {/* Your Vendors */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Your Vendors
              </h2>
              {vendors.length > 0 && (
                <button onClick={() => navigate('/vendors')} className="text-xs text-[#7FAEC2] hover:underline">
                  View all &rarr;
                </button>
              )}
            </div>

            {vendors.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                <Store size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">No vendors yet</p>
                <p className="text-gray-400 text-xs mt-1">Upload a menu to see who can help.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {vendors.slice(0, 5).map((v) => (
                  <div
                    key={v.id}
                    className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[#2A2A2A] text-sm truncate">
                        {v.distributor?.name || v.distributor_name_text}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {v.rep?.name || v.rep_name_text || 'No rep assigned'}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ml-3 ${
                      v.status === 'assigned' ? 'bg-green-100 text-green-700' :
                      v.status === 'priced' ? 'bg-blue-100 text-blue-700' :
                      v.status === 'inbound' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quote History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Quote History
              </h2>
              {quotes.length > 5 && (
                <button onClick={() => navigate('/quotes')} className="text-xs text-[#7FAEC2] hover:underline">
                  View all &rarr;
                </button>
              )}
            </div>

            {recentQuotes.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-sm">No quotes yet</p>
                <p className="text-gray-400 text-xs mt-1">Start your first quote above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentQuotes.map((q) => {
                  const status = STATUS_COLORS[q.status] || STATUS_COLORS.draft;
                  return (
                    <button
                      key={q.id}
                      onClick={() => navigate('/quote-builder', { state: { quoteId: q.id } })}
                      className="w-full text-left bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[#2A2A2A] text-sm truncate">
                          {q.working_label || q.restaurant || 'Untitled Quote'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {formatDate(q.created_at)} · {q.line_count} items
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.text}`}>
                          {q.status}
                        </span>
                        <ArrowRight size={14} className="text-gray-300" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// Rep Dashboard (original)
// =============================================================
function RepDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantIndexItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getQuotes(), getRestaurants()]).then(([qRes, rRes]) => {
      if (qRes.data) setQuotes(qRes.data);
      if (rRes.data) setRestaurants(rRes.data);
      setLoading(false);
    });
  }, []);

  const recentQuotes = quotes.slice(0, 5);
  const recentRestaurants = restaurants.slice(0, 5);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* Welcome */}
      <h1
        className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-1"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {user?.first_name ? `Welcome back, ${user.first_name}` : 'Welcome back'}
      </h1>
      <p className="text-sm text-[#4F4F4F] mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        What quote are you building next?
      </p>

      {/* Primary Action */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <Button
          onClick={() => navigate('/start-new-quote')}
          className="w-full sm:w-auto bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white text-base px-8 py-6"
          size="lg"
        >
          <Plus size={20} className="mr-2" /> Start New Quote
        </Button>
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => navigate('/start-new-quote')}
            className="flex items-center gap-2 text-sm text-[#7FAEC2] hover:underline"
          >
            <FileText size={14} /> Upload Menu
          </button>
          <button
            onClick={() => navigate('/start-new-quote')}
            className="flex items-center gap-2 text-sm text-[#7FAEC2] hover:underline"
          >
            <ClipboardPaste size={14} /> Paste Menu
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400 py-4">Loading...</p>}

      {!loading && (
        <div className="grid gap-8 md:grid-cols-2">
          {/* Quote History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Quote History
              </h2>
              {quotes.length > 5 && (
                <button onClick={() => navigate('/quotes')} className="text-xs text-[#7FAEC2] hover:underline">
                  View all &rarr;
                </button>
              )}
            </div>

            {recentQuotes.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-sm">No quotes yet</p>
                <p className="text-gray-400 text-xs mt-1">Start your first quote above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentQuotes.map((q) => {
                  const status = STATUS_COLORS[q.status] || STATUS_COLORS.draft;
                  return (
                    <button
                      key={q.id}
                      onClick={() => navigate('/quote-builder', { state: { quoteId: q.id } })}
                      className="w-full text-left bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[#2A2A2A] text-sm truncate">
                          {q.working_label || q.restaurant || 'Untitled Quote'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {formatDate(q.created_at)} · {q.line_count} items
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.text}`}>
                          {q.status}
                        </span>
                        <ArrowRight size={14} className="text-gray-300" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Your Customers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Your Customers
              </h2>
              {restaurants.length > 5 && (
                <button onClick={() => navigate('/customers')} className="text-xs text-[#7FAEC2] hover:underline">
                  View all &rarr;
                </button>
              )}
            </div>

            {recentRestaurants.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-sm">No customers yet</p>
                <p className="text-gray-400 text-xs mt-1">Customers are created when you send quotes.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRestaurants.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => navigate('/start-new-quote')}
                    className="w-full text-left bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-[#2A2A2A] text-sm truncate">{r.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {[r.city, r.state].filter(Boolean).join(', ') || 'No location'}
                        {r.contact_count > 0 && ` · ${r.contact_count} contact${r.contact_count > 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <UtensilsCrossed size={14} className="text-gray-300" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// Main export — branches on role
// =============================================================
export function QuoteMePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) return null;

  const isBuyer = isBuyerRole(user?.role);

  if (isBuyer) return <BuyerDashboard />;
  return <RepDashboard />;
}
