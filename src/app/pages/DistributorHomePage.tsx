import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDistributorHome } from '../services/api';
import type { DistributorHomeData } from '../services/api';

export function DistributorHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [homeData, setHomeData] = useState<DistributorHomeData | null>(null);
  const [loading, setLoading] = useState(true);

  const firstName = user?.first_name || '';

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
    async function load() {
      setLoading(true);
      const res = await getDistributorHome();
      if (res.data) setHomeData(res.data);
      setLoading(false);
    }
    load();
  }, []);

  const hasCatalog = homeData?.has_catalog ?? false;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1
        className="text-2xl md:text-3xl font-bold text-[#A5CFDD] mb-1"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {firstName ? `Welcome, ${firstName}` : 'Welcome'}
      </h1>
      <p
        className="text-sm text-[#4F4F4F] mb-8"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Start with your catalog. Then quote a menu.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
            {/* Upload Catalog */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col items-center text-center">
              <Upload className="w-10 h-10 text-white bg-[#A5CFDD] rounded-full p-2.5 mb-4" />
              <h2
                className="text-lg font-semibold text-[#2A2A2A] mb-2"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Upload Catalog
              </h2>
              <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {hasCatalog
                  ? `${homeData?.catalog_product_count ?? 0} products loaded`
                  : 'Import your product catalog to start quoting'}
              </p>
              <Button
                onClick={() => navigate('/start-new-quote', { state: { expandCatalog: true } })}
                className="w-full bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
              >
                {hasCatalog ? 'Update Catalog' : 'Upload Catalog'}
              </Button>
            </div>

            {/* Create Quote */}
            <div className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col items-center text-center ${!hasCatalog ? 'opacity-50' : ''}`}>
              <FileText className="w-10 h-10 text-white bg-[#A5CFDD] rounded-full p-2.5 mb-4" />
              <h2
                className="text-lg font-semibold text-[#2A2A2A] mb-2"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Create Quote
              </h2>
              <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {hasCatalog
                  ? 'Upload a menu and build a quote'
                  : 'Upload a catalog first to enable quoting'}
              </p>
              <Button
                onClick={() => navigate('/start-new-quote')}
                disabled={!hasCatalog}
                className={`w-full ${hasCatalog ? 'bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                Create Quote
              </Button>
            </div>
          </div>

          {/* Progress breadcrumb */}
          <div className="text-center">
            <p className="text-xs text-gray-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Upload catalog &rarr; Build quote &rarr; Add reps
            </p>
          </div>

          {/* Stats row if data exists */}
          {homeData && (hasCatalog || homeData.rep_count > 0 || homeData.quote_count > 0) && (
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <p className="text-2xl font-semibold text-[#2A2A2A]">{homeData.catalog_product_count}</p>
                <p className="text-xs text-gray-500">Products</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <p className="text-2xl font-semibold text-[#2A2A2A]">{homeData.quote_count}</p>
                <p className="text-xs text-gray-500">Quotes</p>
              </div>
              <div
                className="bg-white rounded-lg border border-gray-200 p-4 text-center cursor-pointer hover:border-[#A5CFDD] transition-colors"
                onClick={() => navigate('/distributor-admin/reps')}
              >
                <p className="text-2xl font-semibold text-[#2A2A2A]">{homeData.rep_count}</p>
                <p className="text-xs text-gray-500">Reps</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
