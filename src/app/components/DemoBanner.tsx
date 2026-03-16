import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { PROD_SIGNUP_URL, isLiquorDemo } from '../utils/demoMode';
import logoSquare from '/src/assets/e549e7d27b183e98e791f43494c715b8cc6ce7e9.png';

export function DemoBanner() {
  const { quotesRemaining, profile } = useUser();
  const exhausted = quotesRemaining <= 0;
  const liquor = isLiquorDemo();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 shrink-0">
      {/* ── Mobile header ── */}
      <div className="flex items-center justify-between px-4 py-2 landscape:py-1 md:hidden">
        <img src={logoSquare} alt="QuoteMe" className="w-7 h-7 object-contain" />
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="p-2 -mr-2 text-[#2A2A2A]"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div className="flex flex-col gap-3 px-4 pb-3 md:hidden border-t border-gray-100">
          <span className="text-sm font-medium text-[#2A2A2A] pt-2">
            {liquor ? 'QuoteMe Beverage Demo' : 'QuoteMe Demo'}
          </span>

          {exhausted ? (
            <>
              <span className="text-sm text-red-500 font-medium">
                You've used your free quotes.
              </span>
              <a
                href={PROD_SIGNUP_URL}
                className="text-sm font-medium text-white bg-[#F2993D] hover:bg-[#E08A2E] px-4 py-2 rounded-lg transition-colors text-center"
              >
                Sign up to continue &rarr;
              </a>
            </>
          ) : (
            <>
              <div className="bg-[#FFF9F3] border border-[#F2993D] rounded-lg px-3 py-1 self-start">
                <span className="text-sm font-bold text-[#F2993D]">{quotesRemaining}</span>
                <span className="text-xs text-[#4F4F4F] ml-1">Free Quotes Left</span>
              </div>
              <a
                href={PROD_SIGNUP_URL}
                className="text-sm text-[#F2993D] hover:underline"
              >
                Sign up to keep building quotes
              </a>
            </>
          )}

          <a
            href={PROD_SIGNUP_URL}
            className="text-sm text-gray-500 hover:text-[#2A2A2A] transition-colors"
          >
            Already have an account? <span className="underline">Sign in &rarr;</span>
          </a>
        </div>
      )}

      {/* ── Desktop header (unchanged) ── */}
      <div className="hidden md:flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <img src={logoSquare} alt="QuoteMe" className="w-8 h-8 object-contain" />
          <span className="text-sm font-medium text-[#2A2A2A]">{liquor ? 'QuoteMe Beverage Demo' : 'QuoteMe Demo'}</span>
        </div>
        <div className="flex items-center gap-4">
          {exhausted ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-500 font-medium">
                You've used your free quotes.
              </span>
              <a
                href={PROD_SIGNUP_URL}
                className="text-sm font-medium text-white bg-[#F2993D] hover:bg-[#E08A2E] px-4 py-1.5 rounded-lg transition-colors"
              >
                Sign up to continue &rarr;
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="bg-[#FFF9F3] border border-[#F2993D] rounded-lg px-3 py-1">
                <span className="text-sm font-bold text-[#F2993D]">{quotesRemaining}</span>
                <span className="text-xs text-[#4F4F4F] ml-1">Free Quotes Left</span>
              </div>
              <a
                href={PROD_SIGNUP_URL}
                className="text-xs text-[#F2993D] hover:underline"
              >
                Sign up to keep building quotes
              </a>
            </div>
          )}
          <span className="text-gray-300">|</span>
          <a
            href={PROD_SIGNUP_URL}
            className="text-xs text-gray-500 hover:text-[#2A2A2A] transition-colors"
          >
            Already have an account? <span className="underline">Sign in &rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
}
