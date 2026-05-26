import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router';
import { Upload, Loader2 } from 'lucide-react';
import { createGuestQuote, extractMenuText } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import { MultiRestaurantConfirmModal, type ExistingRestaurant } from '../../components/MultiRestaurantConfirmModal';
import { MENU_DRAFT_KEY } from '../../components/chef/StuckRecoveryScreen';

// Session-scoped marker for the most recently submitted quote. Survives
// back/forward navigation within the tab (which is the bug case — browser
// bfcache restores the page state, leaving the form editable). Cleared on
// tab close.
const RECENT_QUOTE_KEY = 'chef_recent_quote_id';

// ─── Shared styles ─────────────────────────────────────────────────────────────

const pageWrap = 'min-h-screen bg-[#FBFAF7] flex flex-col items-center justify-center p-6';
const card = 'w-full max-w-lg';
const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };
const primaryBtn =
  'w-full bg-[#F9A64B] hover:bg-[#E8953A] text-white rounded-lg px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const labelStyle = 'text-sm font-medium text-[#4F4F4F]';
const errorText = 'text-sm text-red-500';

// ─── ChefEntryPage ─────────────────────────────────────────────────────────────

export function ChefEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { initGuestSession } = useUser();
  // V2 W4-3 — when the chef arrives here from /chef/catalog with a
  // distributor pre-selected, propagate the id into createGuestQuote so
  // BE quote-resolution honors the chef's chosen distributor instead of
  // falling back through ChefDistributorResolutionService.
  const incomingDistributorId = searchParams.get('distributor_id');

  // c144 — recovery path (b): when navigated here from StuckRecoveryScreen
  // with { restoreMenuDraft: true }, pull the saved draft from localStorage
  // and populate the textarea. Show a soft hint about shorter sections.
  const locationState = location.state as {
    restoreMenuDraft?: boolean;
    hint?: string;
  } | null;
  const shouldRestoreDraft = !!locationState?.restoreMenuDraft;
  const showShorterSectionsHint = locationState?.hint === 'shorter_sections';

  const [restaurantName, setRestaurantName] = useState('');
  const [pasteText, setPasteText] = useState(() => {
    if (shouldRestoreDraft) {
      return localStorage.getItem(MENU_DRAFT_KEY) ?? '';
    }
    return '';
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track 4 (chef-entry v2): drag-zone state + URL fetch state. The drag-zone
  // accepts PDF / image (→ selectedFile → existing FormData submit) and
  // CSV / text (→ FileReader → fills pasteText, like rep's flow). The URL
  // Fetch path uses extractMenuText({url}) — same endpoint rep uses, returns
  // plain text into pasteText — then existing JSON submit path fires.
  const [isDragging, setIsDragging] = useState(false);
  const [menuUrl, setMenuUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  // V2 W4-2 — multi-restaurant guard rail modal state. Populated when BE
  // returns 409 with error_code "multi_restaurant_confirm_required".
  const [multiRestaurantPrompt, setMultiRestaurantPrompt] = useState<{
    existing_restaurants: ExistingRestaurant[];
    typed_name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasContent = pasteText.trim().length > 0 || selectedFile !== null;
  const textareaDisabled = selectedFile !== null || submitting;

  // If the chef arrived back on this page via browser back from /chef/status/<id>,
  // forward them to that status page instead of letting them re-edit/re-submit
  // the menu they already sent. (Browser bfcache restores form state on back-nav;
  // useState wouldn't.) The marker is cleared once the chef explicitly starts a
  // new menu from scratch.
  // Scope guard: only redirect when the chef arrived via browser-back from
  // /chef/status (the bfcache case). Direct navigation to /chef/entry — from
  // sidebar tap, dashboard CTA, address bar, or fresh post-login routing —
  // must always show the form regardless of any stale sessionStorage marker.
  // We detect "back from status" by inspecting document.referrer for the
  // chef/status path, since react-router's location.state isn't populated on
  // bfcache-restored navigation.
  useEffect(() => {
    const recentId = sessionStorage.getItem(RECENT_QUOTE_KEY);
    if (!recentId) return;
    const fromStatusBack = /\/chef\/status\//.test(document.referrer);
    if (fromStatusBack) {
      navigate(`/chef/status/${recentId}`, { replace: true });
    }
  }, [navigate]);

  // Track 4: branch the file by extension. CSV / TXT get read straight into
  // pasteText (no separate selectedFile state) — keeps the build path JSON.
  // PDF / image / xlsx go through the existing selectedFile → FormData submit.
  function processFile(file: File | null) {
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
      // Clear any prior selectedFile so the JSON path (raw_text) fires on submit.
      setSelectedFile(null);
      return;
    }
    // PDF / image / xlsx — existing FormData path on submit.
    setSelectedFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    processFile(e.target.files?.[0] ?? null);
  }

  function handleClearFile() {
    setSelectedFile(null);
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
        // Map a few common known errors to chef-readable copy; otherwise
        // fall through to the raw message.
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
        // URL fetch fills pasteText → JSON submit path; clear any file.
        setSelectedFile(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to extract text from URL');
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSubmit() {
    if (!hasContent) return;
    setError(null);
    setMultiRestaurantPrompt(null);
    await submitQuote();
  }

  /**
   * Submit the quote. Used both on initial submit and on re-submit after the
   * MultiRestaurantConfirmModal closes. `nameOverride` lets the modal force a
   * specific restaurant name (an existing one matched exactly); `confirmNew`
   * sets the BE bypass flag when the chef explicitly approved creating a
   * fresh Restaurant.
   */
  async function submitQuote(opts: { nameOverride?: string; confirmNew?: boolean } = {}) {
    setSubmitting(true);
    setError(null);

    try {
      if (!localStorage.getItem('quoteme_guest_token')) {
        await initGuestSession();
      }

      if (selectedFile) {
        // File path: send as FormData (createGuestQuote is JSON-only)
        const formData = new FormData();
        formData.append('file', selectedFile);
        const sendName = opts.nameOverride ?? restaurantName.trim();
        if (sendName) formData.append('name', sendName);
        if (opts.confirmNew) formData.append('confirm_new_restaurant', 'true');
        if (incomingDistributorId) formData.append('distributor_id', incomingDistributorId);

        const guestToken = localStorage.getItem('quoteme_guest_token');
        const authToken = localStorage.getItem('quoteme_token');
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://web-production-9f6e9.up.railway.app';
        const response = await fetch(`${API_BASE}/api/v1/guest/quotes`, {
          method: 'POST',
          headers: {
            ...(guestToken ? { 'X-Guest-Token': guestToken } : {}),
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: formData,
        });

        if (response.status === 409) {
          const body = await response.json().catch(() => ({}));
          if (body.error === 'multi_restaurant_confirm_required') {
            setMultiRestaurantPrompt({
              existing_restaurants: body.existing_restaurants || [],
              typed_name: body.typed_name || sendName,
            });
            return;
          }
        }
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        sessionStorage.setItem(RECENT_QUOTE_KEY, data.quote_id);
        navigate(`/chef/status/${data.quote_id}`);
        return;
      }

      // Text paste path — restaurant name is optional. When blank, omit it
      // so BE falls back to the chef's existing RestaurantContact (P0-11).
      const sendName = opts.nameOverride ?? restaurantName.trim();
      const res = await createGuestQuote(
        {
          raw_text: pasteText.trim(),
          ...(sendName ? { name: sendName } : {}),
          ...(opts.confirmNew ? { confirm_new_restaurant: true } : {}),
        },
        incomingDistributorId || undefined,
      );

      if (res.error_code === 'multi_restaurant_confirm_required' && res.error_data) {
        setMultiRestaurantPrompt({
          existing_restaurants: (res.error_data.existing_restaurants as ExistingRestaurant[]) || [],
          typed_name: (res.error_data.typed_name as string) || sendName,
        });
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }

      sessionStorage.setItem(RECENT_QUOTE_KEY, res.data!.quote_id);
      navigate(`/chef/status/${res.data!.quote_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // P0-12: take over the screen with the status-page visual the moment the
  // chef clicks "Build my quote" — no waiting for the POST response before
  // showing feedback. When the response returns, we navigate(replace) to
  // /chef/status/<id>; the chef perceives zero transition because
  // ChefStatusPage renders the identical layout.
  if (submitting) {
    return (
      <BuildingQuoteOverlay
        onTimeout={() => {
          setSubmitting(false);
          setError('Taking longer than usual. Please try again.');
        }}
      />
    );
  }

  return (
    <div className={pageWrap}>
      {multiRestaurantPrompt && (
        <MultiRestaurantConfirmModal
          existingRestaurants={multiRestaurantPrompt.existing_restaurants}
          typedName={multiRestaurantPrompt.typed_name}
          busy={submitting}
          onPickExisting={(r) => {
            setMultiRestaurantPrompt(null);
            // confirm_new_restaurant unconditionally bypasses the guard so a
            // stale `restaurantName` closure can't fall through to the typed
            // name. resolve_restaurant_for_quote still matches r.name → the
            // existing record (case-insensitive); no new Restaurant is created.
            submitQuote({ nameOverride: r.name, confirmNew: true });
          }}
          onCreateNew={(typedName) => {
            setMultiRestaurantPrompt(null);
            submitQuote({ nameOverride: typedName, confirmNew: true });
          }}
        />
      )}
      <div className={card}>
        {/* Headline */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-[#2B2B2B] mb-3"
            style={headlineStyle}
          >
            What's on your menu?
          </h1>
          <p className="text-[#4F4F4F] text-base leading-relaxed">
            Paste your menu, upload a file, or share a photo. We'll take it from here.
          </p>
        </div>

        {/* c144 — shorter-sections hint, shown when chef returns via recovery path (b) */}
        {showShorterSectionsHint && (
          <div className="mb-6 border border-[#E8E8E8] rounded-xl px-5 py-4 bg-[#FFFBF5]">
            <p className="text-sm text-[#4F4F4F] leading-relaxed">
              <span className="font-medium text-[#2A2A2A]">Your menu is here.</span>{' '}
              Splitting it into smaller sections — one course or category at a time —
              tends to work better.
            </p>
          </div>
        )}

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
              autoCorrect="off"
              autoCapitalize="words"
              className={`border border-[#E8E8E8] rounded-lg px-4 py-2.5 text-sm text-[#2B2B2B] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2B2B2B]/10 focus:border-[#E8E8E8] ${
                submitting ? 'opacity-40 cursor-not-allowed bg-[#F9F9F9]' : ''
              }`}
            />
          </div>

          {/* Track 4: Drag-zone (PDF / image / CSV / text). On mobile, the
              click handler opens the file picker which itself offers camera +
              library — covers the prior "Add photo" affordance. Matches rep
              visual exactly (border-2 dashed, accent-blue palette). */}
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

          {/* Track 4: Menu URL row — Fetch wires to the rep-side
              extract_text endpoint (guest-auth allowed). On success, the
              extracted text lands in pasteText and the chef builds via the
              existing JSON path. */}
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

          {/* OR PASTE TEXT divider — matches rep flow */}
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-[#E8E8E8]"></div>
            <span className="flex-shrink mx-3 text-xs text-[#9E9E9E] tracking-wider">OR PASTE TEXT</span>
            <div className="flex-grow border-t border-[#E8E8E8]"></div>
          </div>

          {/* Menu paste */}
          <div className="flex flex-col gap-1">
            <textarea
              value={pasteText}
              onChange={(e) => {
                const val = e.target.value;
                setPasteText(val);
                setError(null);
                // c144 — persist draft so recovery path (a) mailto and
                // path (b) return-to-edit both have the latest text.
                if (val.trim()) {
                  localStorage.setItem(MENU_DRAFT_KEY, val);
                } else {
                  localStorage.removeItem(MENU_DRAFT_KEY);
                }
              }}
              disabled={textareaDisabled}
              placeholder="Paste your full menu here: dishes, ingredients, sections…"
              rows={8}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              className={`border border-[#E8E8E8] rounded-lg px-4 py-3 text-sm text-[#2B2B2B] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2B2B2B]/10 focus:border-[#E8E8E8] resize-none leading-relaxed ${
                textareaDisabled ? 'opacity-40 cursor-not-allowed bg-[#F9F9F9]' : 'bg-white'
              }`}
            />
          </div>

          {/* Selected file chip — shown when a PDF / image / xlsx was dropped
              or picked (CSV / TXT goes straight into pasteText via FileReader,
              so no chip for those). */}
          {selectedFile && (
            <div className="flex items-center gap-2 bg-white border border-[#E8E8E8] rounded-lg px-4 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E5A84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-sm text-[#4F4F4F] flex-1 truncate">{selectedFile.name}</span>
              <button
                type="button"
                onClick={handleClearFile}
                className="text-[#9E9E9E] hover:text-[#4F4F4F] transition-colors"
                aria-label="Remove file"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex flex-col gap-2">
              <p className={errorText}>{error}</p>
              {error.startsWith('Taking longer than usual') && (
                <button
                  type="button"
                  className={primaryBtn}
                  onClick={handleSubmit}
                  disabled={!hasContent}
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {/* Submit */}
          {!error?.startsWith('Taking longer than usual') && (
            <button
              className={primaryBtn}
              onClick={handleSubmit}
              disabled={!hasContent || submitting}
            >
              {submitting ? 'Sending…' : 'Build my quote'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BuildingQuoteOverlay ────────────────────────────────────────────────────
// Visual carbon-copy of ChefStatusPage so the chef perceives zero transition
// between submit-click and the status page. Used while the POST is in flight
// (we don't yet have a quote_id to navigate to). Stage messages tick from the
// moment the click registers; after navigate() resolves to /chef/status/<id>
// the timer restarts there — close enough that the chef doesn't notice.

// Four canonical messages per QUOTEME_CHEF_FLOW_CANONICAL_V3 Part 6 Step 4.
// Dots animation provides trailing ellipsis — strings omit it.
const STATUS_STAGES: Array<{ at: number; message: string }> = [
  { at:  0, message: 'Preparing your draft' },
  { at:  8, message: 'Checking catalog coverage' },
  { at: 18, message: 'Organizing menu components' },
  { at: 30, message: 'Preparing distributor alignment' },
];

function stageFor(elapsedSec: number): string {
  let current = STATUS_STAGES[0].message;
  for (const stage of STATUS_STAGES) {
    if (elapsedSec >= stage.at) current = stage.message;
  }
  return current;
}

interface BuildingQuoteOverlayProps {
  onTimeout: () => void;
}

function BuildingQuoteOverlay({ onTimeout }: BuildingQuoteOverlayProps) {
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const dotsRef = useRef(0);
  const startedAtRef = useRef<number>(Date.now());
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    const states = ['', '.', '..', '...'];
    const interval = setInterval(() => {
      dotsRef.current = (dotsRef.current + 1) % states.length;
      setDots(states[dotsRef.current]);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // c133: 60-second timeout — if the POST hasn't resolved by then, surface
  // a calm retry prompt so the chef is never left on a blank spinner.
  useEffect(() => {
    const timer = setTimeout(() => {
      onTimeoutRef.current();
    }, 60_000);
    return () => clearTimeout(timer);
  }, []);

  const stageMessage = stageFor(elapsed);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
        <div
          className="w-12 h-12 rounded-full border-4 border-[#E0E0E0] border-t-[#E5A84B]"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <div>
          <h1
            className="text-2xl font-bold text-[#2B2B2B] mb-2"
            style={headlineStyle}
          >
            {stageMessage}{dots}
          </h1>
          <p className="text-[#4F4F4F] text-base">
            This usually takes about 30 seconds.
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
