import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Loader2, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCatalogConfirmation, flagCatalogCategory } from '../services/api';
import type { CatalogConfirmation } from '../services/api';

export function CatalogConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const catalogId: string | undefined = (location.state as any)?.catalogId;

  const [data, setData] = useState<CatalogConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Flag form state
  const [showFlagInput, setShowFlagInput] = useState(false);
  const [flagMessage, setFlagMessage] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [flagSent, setFlagSent] = useState(false);

  const distributorName = user?.distributor?.name || user?.distributor_name || 'Your';

  // Load fonts
  useEffect(() => {
    if (!document.getElementById('quoteme-fonts')) {
      const link = document.createElement('link');
      link.id = 'quoteme-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (!catalogId) {
      setLoading(false);
      setError('No catalog ID provided.');
      return;
    }
    async function load() {
      setLoading(true);
      const res = await getCatalogConfirmation(catalogId!);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setData(res.data);
      }
      setLoading(false);
    }
    load();
  }, [catalogId]);

  const handleFlag = async () => {
    if (!flagMessage.trim() || !catalogId) return;
    setFlagging(true);
    const res = await flagCatalogCategory(catalogId, flagMessage.trim());
    if (res.error) {
      setError(res.error);
    } else {
      setFlagSent(true);
      setFlagMessage('');
      setShowFlagInput(false);
    }
    setFlagging(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F3] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#FFF9F3] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => navigate('/')} className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const categories = data?.category_breakdown ? Object.entries(data.category_breakdown) : [];

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1
        className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-6"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Catalog Imported
      </h1>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
            <p className="text-2xl font-semibold text-[#2A2A2A]">{data.total_processed}</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>Total Processed</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
            <p className="text-2xl font-semibold text-red-500">{data.excluded_count}</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>Excluded</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
            <p className="text-2xl font-bold text-[#A5CFDD]">{data.net_usable}</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>Net Usable</p>
          </div>
        </div>
      )}

      {/* Excluded reasons */}
      {data && data.excluded_reasons.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <p className="text-sm font-medium text-[#2A2A2A] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Exclusion Reasons
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            {data.excluded_reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">-</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <p className="text-sm font-medium text-[#2A2A2A] mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Category Breakdown
          </p>
          <div className="space-y-2">
            {categories.map(([category, count]) => (
              <div key={category} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-[#4F4F4F]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {category}
                </span>
                <span className="text-sm font-medium text-[#2A2A2A]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flag a category issue */}
      <div className="mb-8">
        {flagSent && (
          <p className="text-sm text-green-600 mb-3 flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            Flag submitted. We'll take a look.
          </p>
        )}
        {!showFlagInput ? (
          <Button
            variant="outline"
            onClick={() => setShowFlagInput(true)}
            className="border-gray-300 text-[#4F4F4F]"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Flag a Category Issue
          </Button>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-[#2A2A2A] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Describe the issue
            </p>
            <Textarea
              value={flagMessage}
              onChange={(e) => setFlagMessage(e.target.value)}
              placeholder="e.g. Seafood category is missing shrimp products..."
              rows={3}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleFlag}
                disabled={flagging || !flagMessage.trim()}
                className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
              >
                {flagging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit Flag
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowFlagInput(false); setFlagMessage(''); }}
                className="border-gray-300 text-[#2A2A2A]"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ready state */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="space-y-2 mb-6">
          <p className="text-sm text-[#2A2A2A] flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <Check className="w-4 h-4 text-green-500" />
            {distributorName} catalog is ready
          </p>
          <p className="text-sm text-[#2A2A2A] flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <Check className="w-4 h-4 text-green-500" />
            {data?.net_usable ?? 0} products available for quoting
          </p>
          <p className="text-sm text-[#2A2A2A] flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <Check className="w-4 h-4 text-green-500" />
            Category structure confirmed
          </p>
        </div>
        <Button
          onClick={() => navigate('/')}
          className="w-full sm:w-auto bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
        >
          Start First Quote
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
