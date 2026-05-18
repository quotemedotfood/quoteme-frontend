import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { createGuestQuote } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import { MultiRestaurantConfirmModal, type ExistingRestaurant } from '../../components/MultiRestaurantConfirmModal';

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
  const { initGuestSession } = useUser();
  // V2 W4-3 — when the chef arrives here from /chef/catalog with a
  // distributor pre-selected, propagate the id into createGuestQuote so
  // BE quote-resolution honors the chef's chosen distributor instead of
  // falling back through ChefDistributorResolutionService.
  const incomingDistributorId = searchParams.get('distributor_id');

  const [restaurantName, setRestaurantName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // V2 W4-2 — multi-restaurant guard rail modal state. Populated when BE
  // returns 409 with error_code "multi_restaurant_confirm_required".
  const [multiRestaurantPrompt, setMultiRestaurantPrompt] = useState<{
    existing_restaurants: ExistingRestaurant[];
    typed_name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const hasContent = pasteText.trim().length > 0 || selectedFile !== null;
  const textareaDisabled = selectedFile !== null || submitting;
  const fileDisabled = pasteText.trim().length > 0 || submitting;

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
  }

  function handleClearFile() {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
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
    return <BuildingQuoteOverlay />;
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

          {/* Menu paste */}
          <div className="flex flex-col gap-1">
            <label className={labelStyle}>Paste your menu</label>
            <textarea
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setError(null);
              }}
              disabled={textareaDisabled}
              placeholder="Paste your full menu here — dishes, ingredients, sections…"
              rows={8}
              // iOS Safari's QuickType bar will silently inject autofill text
              // into a focused textarea via an `input` event, flipping
              // pasteText non-empty before the chef has typed. That makes the
              // fileDisabled derivation (pasteText.trim().length > 0) flip
              // true on first mobile mount, greying the Upload + Camera
              // buttons. These five attributes suppress every iOS autofill
              // surface for this field.
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

          {/* Upload + camera row */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#9E9E9E]">or</span>

            {/* File upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={fileDisabled}
              className={`flex items-center gap-2 border border-[#E0E0E0] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                fileDisabled
                  ? 'opacity-40 cursor-not-allowed text-[#9E9E9E]'
                  : 'text-[#4F4F4F] hover:border-[#E5A84B] hover:text-[#E5A84B]'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt,.xlsx,.xls,image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Camera */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={fileDisabled}
              className={`flex items-center gap-2 border border-[#E0E0E0] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                fileDisabled
                  ? 'opacity-40 cursor-not-allowed text-[#9E9E9E]'
                  : 'text-[#4F4F4F] hover:border-[#E5A84B] hover:text-[#E5A84B]'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Add photo
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Selected file chip */}
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
          {error && <p className={errorText}>{error}</p>}

          {/* Submit */}
          <button
            className={primaryBtn}
            onClick={handleSubmit}
            disabled={!hasContent || submitting}
          >
            {submitting ? 'Sending…' : 'Build my quote'}
          </button>
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

function BuildingQuoteOverlay() {
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const dotsRef = useRef(0);
  const startedAtRef = useRef<number>(Date.now());

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
