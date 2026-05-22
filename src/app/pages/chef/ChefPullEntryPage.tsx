// ChefPullEntryPage — /chef/pull/entry
//
// Chef initiates a pull quote against a specific distributor.
// Two menu source modes:
//   1. Saved menu dropdown (from /api/v1/chef/menus via Agent C1)
//   2. Paste-text entry
//
// Distributor is received via router state (distributor_id + distributor meta)
// so the page renders the anchor immediately without a second round-trip.
//
// Affiliated copy variant: warm — "We'll let your rep know"
// Unaffiliated copy variant: matter-of-fact — "We'll create a quote you can share"
//
// Copy doctrine: calm, operational.
// BANNED: AI, intelligent, automated, platform, ecosystem, seamless.

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  getChefMenus,
  createPullQuote,
  type ChefMenuSummary,
  type PullQuoteDistributor,
} from '../../services/api';
import { PullDistributorAnchor } from '../../components/chef/PullDistributorAnchor';
import { MENU_DRAFT_KEY } from '../../components/chef/StuckRecoveryScreen';

// ─── Shared styles ─────────────────────────────────────────────────────────────

const pageWrap = 'min-h-screen bg-[#FBFAF7] flex flex-col';
const contentWrap = 'flex-1 flex flex-col items-center justify-center p-6';
const card = 'w-full max-w-lg';
const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };
const primaryBtn =
  'w-full bg-[#F9A64B] hover:bg-[#E8953A] text-white rounded-lg px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const labelStyle = 'text-sm font-medium text-[#4F4F4F]';
const errorText = 'text-sm text-red-500';

// ─── ChefPullEntryPage ─────────────────────────────────────────────────────────

export function ChefPullEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Distributor context passed via router state from ChefCatalogSelectionPage
  // or ChefDashboardPage. Falls back gracefully when absent.
  const locationState = location.state as {
    distributor?: PullQuoteDistributor;
    distributor_id?: string;
  } | null;

  const distributor: PullQuoteDistributor | null = locationState?.distributor ?? null;
  const distributorId = distributor?.id ?? locationState?.distributor_id ?? null;

  const [menus, setMenus] = useState<ChefMenuSummary[]>([]);
  const [menusLoading, setMenusLoading] = useState(true);

  // Selected menu ID or 'paste' for free-text mode
  const [menuSource, setMenuSource] = useState<'paste' | string>('paste');
  const [pasteText, setPasteText] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved menus
  useEffect(() => {
    setMenusLoading(true);
    getChefMenus().then((res) => {
      if (res.data?.menus) {
        setMenus(res.data.menus);
        // Default to first saved menu when available
        if (res.data.menus.length > 0) {
          setMenuSource(res.data.menus[0].id);
        }
      }
      setMenusLoading(false);
    });
  }, []);

  const isPasteMode = menuSource === 'paste';
  const hasContent = isPasteMode
    ? pasteText.trim().length > 0
    : menuSource !== 'paste';

  // Guard: if no distributor context, route back to catalog selection
  if (!distributorId) {
    return (
      <div className={pageWrap}>
        <div className={contentWrap}>
          <div className={card}>
            <p className="text-[#4F4F4F] text-sm">
              No distributor selected.{' '}
              <button
                type="button"
                className="underline text-[#2B2B2B]"
                onClick={() => navigate('/chef/catalog')}
              >
                Choose one
              </button>{' '}
              to continue.
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (!hasContent || !distributorId) return;
    setError(null);
    setSubmitting(true);

    try {
      const payload: Parameters<typeof createPullQuote>[0] = {
        distributor_id: distributorId,
        ...(restaurantName.trim() ? { restaurant_name: restaurantName.trim() } : {}),
      };

      if (isPasteMode) {
        payload.raw_text = pasteText.trim();
        // Persist draft so recovery path can retrieve it
        if (pasteText.trim()) {
          localStorage.setItem(MENU_DRAFT_KEY, pasteText.trim());
        }
      } else {
        payload.menu_id = menuSource;
      }

      const res = await createPullQuote(payload);

      if (res.error) {
        setError(res.error);
        return;
      }

      navigate(`/chef/pull/status/${res.data!.pull_quote_id}`, {
        state: {
          distributor,
          raw_text: isPasteMode ? pasteText.trim() : undefined,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const affiliated = distributor?.affiliated ?? false;

  return (
    <div className={pageWrap}>
      {/* Anchor strip */}
      <PullDistributorAnchor
        distributor={distributor}
        onChangeDistributor={() => navigate('/chef/catalog')}
      />

      <div className={contentWrap}>
        <div className={card}>
          {/* Headline */}
          <div className="mb-8">
            <h1
              className="text-3xl font-bold text-[#2B2B2B] mb-3"
              style={headlineStyle}
            >
              Pull a quote from {distributor?.name ?? 'your distributor'}
            </h1>
            <p className="text-[#4F4F4F] text-base leading-relaxed">
              {affiliated
                ? "Share your menu and we'll let your rep know."
                : "Share your menu. We'll build a quote you can share or review on your own."}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Restaurant name (optional) */}
            <div className="flex flex-col gap-1">
              <label className={labelStyle}>
                Restaurant name{' '}
                <span className="text-[#9E9E9E] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="e.g. The Blue Apron"
                disabled={submitting}
                autoComplete="off"
                autoCapitalize="words"
                className={`border border-[#E8E8E8] rounded-lg px-4 py-2.5 text-sm text-[#2B2B2B] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2B2B2B]/10 focus:border-[#E8E8E8] ${
                  submitting ? 'opacity-40 cursor-not-allowed bg-[#F9F9F9]' : 'bg-white'
                }`}
              />
            </div>

            {/* Menu source selector */}
            <div className="flex flex-col gap-2">
              <label className={labelStyle}>Menu</label>

              {/* Saved menus dropdown (when any exist) */}
              {!menusLoading && menus.length > 0 && (
                <select
                  value={menuSource}
                  onChange={(e) => {
                    setMenuSource(e.target.value);
                    setError(null);
                  }}
                  disabled={submitting}
                  className={`border border-[#E8E8E8] rounded-lg px-4 py-2.5 text-sm text-[#2B2B2B] focus:outline-none focus:ring-2 focus:ring-[#2B2B2B]/10 focus:border-[#E8E8E8] ${
                    submitting ? 'opacity-40 cursor-not-allowed bg-[#F9F9F9]' : 'bg-white'
                  }`}
                >
                  {menus.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.item_count ? ` · ${m.item_count} items` : ''}
                    </option>
                  ))}
                  <option value="paste">Paste a menu instead…</option>
                </select>
              )}

              {/* Paste textarea — shown when paste mode OR no saved menus */}
              {(isPasteMode || (!menusLoading && menus.length === 0)) && (
                <textarea
                  value={pasteText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPasteText(val);
                    setError(null);
                    if (val.trim()) {
                      localStorage.setItem(MENU_DRAFT_KEY, val);
                    } else {
                      localStorage.removeItem(MENU_DRAFT_KEY);
                    }
                  }}
                  disabled={submitting}
                  placeholder="Paste your full menu here: dishes, ingredients, sections…"
                  rows={8}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-form-type="other"
                  className={`border border-[#E8E8E8] rounded-lg px-4 py-3 text-sm text-[#2B2B2B] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2B2B2B]/10 focus:border-[#E8E8E8] resize-none leading-relaxed ${
                    submitting ? 'opacity-40 cursor-not-allowed bg-[#F9F9F9]' : 'bg-white'
                  }`}
                />
              )}

              {menusLoading && (
                <div className="h-10 flex items-center">
                  <span className="text-sm text-[#9E9E9E]">Loading saved menus…</span>
                </div>
              )}
            </div>

            {/* Error */}
            {error && <p className={errorText}>{error}</p>}

            {/* Submit */}
            <button
              className={primaryBtn}
              onClick={handleSubmit}
              disabled={!hasContent || submitting || !distributorId}
            >
              {submitting ? 'Building…' : 'Build quote'}
            </button>

            {/* Affiliated context note */}
            {affiliated && distributor?.rep && (
              <p className="text-xs text-[#9E9E9E] text-center leading-relaxed">
                Your rep {distributor.rep.first_name ?? distributor.rep.name} will be notified
                when the quote is ready.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
