// ChefPullEntryPage — /chef/pull/entry
//
// Chef initiates a pull quote against a specific distributor.
// Menu source modes (Track 4 parity with ChefEntryPage):
//   1. Saved menu dropdown (from /api/v1/chef/menus via Agent C1)
//   2. Drag-zone / file picker → extractMenuText (PDF, image, CSV, text)
//   3. URL fetch → extractMenuText
//   4. Paste-text entry
//
// Distributor is received via router state (distributor_id + distributor meta)
// so the page renders the anchor immediately without a second round-trip.
//
// Restaurant field: auto-populated from the chef's most recent quote restaurant
// (getChefQuotes()[0].restaurant.name), falling back to the user's first name
// when no quotes exist yet. Kept editable so the chef can override.
//
// Affiliated copy variant: warm — "We'll let your rep know"
// Unaffiliated copy variant: matter-of-fact — "We'll create a quote you can share"
//
// Copy doctrine: calm, operational.
// BANNED: AI, intelligent, automated, platform, ecosystem, seamless.

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Upload, Loader2 } from 'lucide-react';
import {
  getChefMenus,
  getChefQuotes,
  createPullQuote,
  extractMenuText,
  type ChefMenuRow,
  type PullQuoteDistributor,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PullDistributorAnchor } from '../../components/chef/PullDistributorAnchor';
import { MENU_DRAFT_KEY } from '../../components/chef/StuckRecoveryScreen';

// ─── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle = 'text-sm font-medium text-[#4F4F4F]';
const errorText = 'text-sm text-red-500';
const primaryBtn =
  'w-full bg-[#F9A64B] hover:bg-[#E8953A] text-white rounded-lg px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

// ─── ChefPullEntryPage ─────────────────────────────────────────────────────────

export function ChefPullEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Distributor context passed via router state from ChefCatalogSelectionPage
  // or ChefDashboardPage. Falls back gracefully when absent.
  const locationState = location.state as {
    distributor?: PullQuoteDistributor;
    distributor_id?: string;
  } | null;

  const distributor: PullQuoteDistributor | null = locationState?.distributor ?? null;
  const distributorId = distributor?.id ?? locationState?.distributor_id ?? null;

  const [menus, setMenus] = useState<ChefMenuRow[]>([]);
  const [menusLoading, setMenusLoading] = useState(true);

  // Selected menu ID, 'file' for file/drag mode, or 'paste' for free-text mode
  const [menuSource, setMenuSource] = useState<'paste' | 'file' | string>('paste');
  const [pasteText, setPasteText] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantNameLoading, setRestaurantNameLoading] = useState(false);

  // Track 4: file / URL extraction state
  const [isDragging, setIsDragging] = useState(false);
  const [menuUrl, setMenuUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // c151-E rep capture. Prefilled from distributor.rep when affiliated;
  // empty + friendlier placeholders when unaffiliated. Required at submit.
  const [repName, setRepName] = useState(distributor?.rep?.name ?? '');
  const [repEmail, setRepEmail] = useState(distributor?.rep?.email ?? '');
  const [repNameError, setRepNameError] = useState<string | null>(null);
  const [repEmailError, setRepEmailError] = useState<string | null>(null);
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

  // Auto-populate restaurant from the chef's most recent quote, falling back
  // to the user's first name when no quotes exist yet. Kept editable.
  useEffect(() => {
    setRestaurantNameLoading(true);
    getChefQuotes().then((res) => {
      const firstQuote = res.data?.quotes?.[0];
      if (firstQuote?.restaurant?.name) {
        setRestaurantName(firstQuote.restaurant.name);
      } else if (user?.first_name) {
        // Derive a default that matches BE fallback logic (chef display name + "Restaurant")
        setRestaurantName(`${user.first_name}'s Restaurant`);
      }
      setRestaurantNameLoading(false);
    }).catch(() => {
      if (user?.first_name) {
        setRestaurantName(`${user.first_name}'s Restaurant`);
      }
      setRestaurantNameLoading(false);
    });
  }, [user?.first_name]);

  // ─── Track 4: file processing (mirrors ChefEntryPage.processFile) ──────────
  // CSV / TXT read straight into pasteText via FileReader.
  // PDF / image / xlsx extract via the extract_text endpoint (Claude Vision).
  async function processFile(file: File | null) {
    if (!file) return;
    setError(null);
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv') || name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) ?? '';
        setPasteText(text);
        if (text.trim()) {
          localStorage.setItem(MENU_DRAFT_KEY, text);
        }
      };
      reader.readAsText(file);
      setMenuSource('paste');
      return;
    }

    setIsExtracting(true);
    setMenuSource('file');
    try {
      const res = await extractMenuText({ file });
      if (res.error) {
        const err = res.error;
        if (err.includes('pdf_too_large')) {
          setError("This menu is too large to read at once. Try a single section — entrees, apps, or the cocktail list.");
        } else if (err.includes('service_busy') || err === 'service_busy') {
          setError("Our menu service is temporarily busy. Please try again in a few seconds.");
        } else {
          setError(err);
        }
        setMenuSource('paste');
        return;
      }
      if (res.data?.text) {
        setPasteText(res.data.text);
        if (res.data.text.trim()) {
          localStorage.setItem(MENU_DRAFT_KEY, res.data.text);
        }
        setMenuSource('paste');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read text from that file');
      setMenuSource('paste');
    } finally {
      setIsExtracting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    processFile(e.target.files?.[0] ?? null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    processFile(file);
  }

  async function handleUrlExtract() {
    const trimmed = menuUrl.trim();
    if (!trimmed) return;
    setIsExtracting(true);
    setError(null);
    try {
      let url = trimmed;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const res = await extractMenuText({ url });
      if (res.error) {
        const err = res.error;
        if (err.includes('url_fetch_failed')) {
          setError("We couldn't fetch that URL. Check the link or try uploading the PDF directly.");
        } else if (err.includes('url_unsupported_type')) {
          setError("That URL didn't return a menu we can read. Try uploading the PDF directly.");
        } else if (err.includes('service_busy') || err === 'service_busy') {
          setError("Our menu service is temporarily busy. Please try again in a few seconds.");
        } else {
          setError(err);
        }
        return;
      }
      if (res.data?.text) {
        setPasteText(res.data.text);
        if (res.data.text.trim()) {
          localStorage.setItem(MENU_DRAFT_KEY, res.data.text);
        }
        setMenuSource('paste');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to extract text from URL');
    } finally {
      setIsExtracting(false);
    }
  }

  const isPasteMode = menuSource === 'paste' || menuSource === 'file';
  const hasContent = isPasteMode
    ? pasteText.trim().length > 0
    : menuSource !== 'paste' && menuSource !== 'file';

  // Guard: if no distributor context, route back to catalog selection
  if (!distributorId) {
    return (
      <div className="py-16 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg">
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
    );
  }

  // c151-E: regex matches the dispatch spec verbatim
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateRepFields(): boolean {
    let ok = true;
    const trimmedName = repName.trim();
    const trimmedEmail = repEmail.trim();
    if (trimmedName.length < 2) {
      setRepNameError('Add the rep’s name.');
      ok = false;
    } else {
      setRepNameError(null);
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setRepEmailError('Add the rep’s email.');
      ok = false;
    } else {
      setRepEmailError(null);
    }
    return ok;
  }

  async function handleSubmit() {
    if (!hasContent || !distributorId) return;
    if (!validateRepFields()) return;
    setError(null);
    setSubmitting(true);

    try {
      const payload: Parameters<typeof createPullQuote>[0] = {
        distributor_id: distributorId,
        ...(restaurantName.trim() ? { restaurant_name: restaurantName.trim() } : {}),
        rep_name: repName.trim(),
        rep_email: repEmail.trim(),
      };

      if (isPasteMode) {
        payload.raw_text = pasteText.trim();
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
    <>
      {/* Anchor strip */}
      <PullDistributorAnchor
        distributor={distributor}
        onChangeDistributor={() => navigate('/chef/catalog')}
      />

      <div className="py-10 px-4 flex flex-col items-center">
        <div className="w-full max-w-lg">
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
            {/* Restaurant name — auto-populated, editable */}
            <div className="flex flex-col gap-1">
              <label className={labelStyle}>
                Restaurant name{' '}
                <span className="text-[#9E9E9E] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder={restaurantNameLoading ? 'Loading…' : 'e.g. The Blue Apron'}
                disabled={submitting || restaurantNameLoading}
                autoComplete="off"
                autoCapitalize="words"
                className={`border border-[#E8E8E8] rounded-lg px-4 py-2.5 text-sm text-[#2B2B2B] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2B2B2B]/10 focus:border-[#E8E8E8] ${
                  submitting || restaurantNameLoading ? 'opacity-40 cursor-not-allowed bg-[#F9F9F9]' : 'bg-white'
                }`}
              />
            </div>

            {/* Menu source */}
            <div className="flex flex-col gap-2">
              <label className={labelStyle}>Menu</label>

              {/* Saved menus dropdown — shown when any exist. Distributor context
                  note: ChefMenuRow (index) does not carry distributor_history;
                  that lives in ChefMenuDetail (per-menu). Showing item_count +
                  last-quoted date as context instead. For full distributor labels
                  per menu, the BE menus index needs a distributor_last_quoted
                  field (deferred — see report). */}
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
                  {menus.map((m) => {
                    const parts = [m.name];
                    if (m.item_count) parts.push(`${m.item_count} items`);
                    if (m.last_quoted_at) {
                      const d = new Date(m.last_quoted_at);
                      parts.push(`last quoted ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
                    }
                    return (
                      <option key={m.id} value={m.id}>
                        {parts.join(' · ')}
                      </option>
                    );
                  })}
                  <option value="paste">Paste or upload a menu instead…</option>
                </select>
              )}

              {/* Track 4: Drag-zone — mirrors ChefEntryPage pattern.
                  Shown when paste/file mode is active OR no saved menus. */}
              {(isPasteMode || (!menusLoading && menus.length === 0)) && (
                <>
                  <div
                    className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                      isDragging ? 'border-[#7FAEC2] bg-[#A5CFDD]/10' : 'border-[#A5CFDD] hover:border-[#7FAEC2]'
                    } ${submitting ? 'opacity-40 cursor-not-allowed' : ''}`}
                    onClick={() => !submitting && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {isExtracting ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#A5CFDD]" />
                        <p className="text-sm text-gray-600">Reading menu...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-[#A5CFDD] mx-auto mb-2" />
                        <p className="text-sm text-gray-700 mb-1">Drag files here or click to browse</p>
                        <p className="text-xs text-gray-400">PDF, image, CSV, or text file</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.csv,.txt,.xlsx,.xls,image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* URL fetch row */}
                  <div className="flex flex-col gap-1">
                    <label className={labelStyle}>Menu URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={menuUrl}
                        onChange={(e) => setMenuUrl(e.target.value)}
                        placeholder="www.example.com/menu"
                        disabled={isExtracting || submitting}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        className={`flex-1 border border-[#E8E8E8] rounded-lg px-4 py-2.5 text-sm text-[#2B2B2B] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2B2B2B]/10 focus:border-[#E8E8E8] ${
                          isExtracting || submitting ? 'opacity-40 cursor-not-allowed bg-[#F9F9F9]' : 'bg-white'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleUrlExtract}
                        disabled={!menuUrl.trim() || isExtracting || submitting}
                        className="bg-[#A5CFDD] hover:bg-[#7FAEC2] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center min-w-[72px]"
                      >
                        {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                      </button>
                    </div>
                  </div>

                  {/* OR PASTE TEXT divider */}
                  <div className="relative flex items-center">
                    <div className="flex-grow border-t border-[#E8E8E8]"></div>
                    <span className="flex-shrink mx-3 text-xs text-[#9E9E9E] tracking-wider">OR PASTE TEXT</span>
                    <div className="flex-grow border-t border-[#E8E8E8]"></div>
                  </div>

                  {/* Paste textarea */}
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
                </>
              )}

              {menusLoading && (
                <div className="h-10 flex items-center">
                  <span className="text-sm text-[#9E9E9E]">Loading saved menus…</span>
                </div>
              )}
            </div>

            {/* c151-E: Rep capture — required. */}
            <div className="border border-[#E8C9A0] rounded-lg p-4 bg-[#FFF9F3] flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#2B2B2B]">
                  Who at {distributor?.name ?? 'this distributor'} should get this?
                </h3>
                <p className="text-xs text-[#4F4F4F] mt-1 leading-relaxed">
                  We'll email them your quote as soon as it's ready.
                  {!affiliated && ' We’ll also send them an invite to QuoteMe.'}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="rep_name" className={labelStyle}>Rep name</label>
                <input
                  id="rep_name"
                  type="text"
                  value={repName}
                  onChange={(e) => { setRepName(e.target.value); if (repNameError) setRepNameError(null); }}
                  placeholder={affiliated ? '' : 'Pat from Riverbend'}
                  disabled={submitting}
                  autoComplete="name"
                  className={`border border-[#E8E8E8] rounded-lg px-4 py-2.5 text-sm text-[#2B2B2B] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2B2B2B]/10 focus:border-[#E8E8E8] ${
                    submitting ? 'opacity-40 cursor-not-allowed bg-[#F9F9F9]' : 'bg-white'
                  }`}
                />
                {repNameError && <p className={errorText}>{repNameError}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="rep_email" className={labelStyle}>Rep email</label>
                <input
                  id="rep_email"
                  type="email"
                  inputMode="email"
                  value={repEmail}
                  onChange={(e) => { setRepEmail(e.target.value); if (repEmailError) setRepEmailError(null); }}
                  placeholder={affiliated ? '' : 'pat@riverbend.com'}
                  disabled={submitting}
                  autoComplete="email"
                  className={`border border-[#E8E8E8] rounded-lg px-4 py-2.5 text-sm text-[#2B2B2B] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2B2B2B]/10 focus:border-[#E8E8E8] ${
                    submitting ? 'opacity-40 cursor-not-allowed bg-[#F9F9F9]' : 'bg-white'
                  }`}
                />
                {repEmailError && <p className={errorText}>{repEmailError}</p>}
              </div>
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
          </div>
        </div>
      </div>
    </>
  );
}
