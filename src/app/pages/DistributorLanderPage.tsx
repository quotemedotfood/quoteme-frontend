// DistributorLanderPage — F1 branded standing lander for distributor slugs.
// Reached via /d/:slug — public-facing, no auth required, no RootLayout.
// Mirrors the public-outside-RootLayout pattern of /c/:token (TechLandingPage).
//
// BE contract (live on Test, verified 2026-06-05):
//   GET  {API_BASE}/api/v1/d/:slug → 200 {distributor, branding, accepted_payload, accepted_content_types}
//                                    | 404 {error}
//   POST {API_BASE}/api/v1/d/:slug/upload
//     JSON body: {payload_type:"menu"|"order_guide", text, contact_name, contact_email, contact_phone, restaurant_name}
//     OR multipart: file (PDF), contact_name, contact_email, contact_phone, restaurant_name
//     → 201 {status:"delivered", distributor_name} | 422 {errors}
//
// Branding intent (locked):
//   • primary_hex  → ONE primary action color (submit button bg). No other orange/blue CTA.
//   • secondary_hex → accent (eyebrow rules, section dividers, drop-zone border active).
//   • logo_url     → distributor logo in page header.
//   • custom_notes → distributor's own message block, rendered verbatim.
//   • quoteme_verbiage → optional header trust line, etc. Placeholders shown when absent.
//
// NO GRADIENTS. No prices anywhere.
//
// Slug resolution: useParams only via resolveSlug(). Seam comment marks where
// host-based resolution (e.g. lipari.quoteme.food → slug="lipari") swaps in.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { fileRejection, MENU_SURFACE } from '../utils/fileGate';
import { extractMenuText } from '../services/api';
import {
  parseMenuText,
  stripPrices,
  reconstructText,
  countIngredients,
  extractionFailureMessage,
  extractionProgressMessage,
  type ParsedDish,
} from '../utils/menuIngestion';
import { useParams } from 'react-router';
import { Upload, Check, FileText, AlertCircle } from 'lucide-react';
import quotemeLogo from '../../assets/quoteme-logo.png';

// ─── API base — mirrors the mapping in src/app/services/api.ts ───────────────
// Keep in sync if api.ts ever changes the env-var name or fallback.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://web-production-9f6e9.up.railway.app';

// ─── Slug resolution seam ─────────────────────────────────────────────────────
// Currently derives slug from React Router useParams() only.
// TODO(subdomain): when subdomain routing goes live, swap this function body to:
//   const host = window.location.hostname;            // e.g. "lipari.quoteme.food"
//   const sub  = host.split('.')[0];                  // "lipari"
//   return sub !== 'quoteme' && sub !== 'www' && sub !== 'app' ? sub : fromParams;
function resolveSlug(fromParams: string | undefined): string | null {
  return fromParams ?? null;
}

// ─── Design tokens (branding overrides will layer on top via inline style) ───
const C = {
  charcoal:  '#2B2B2B',
  cream:     '#FFF9F3',
  warmPaper: '#FBFAF7',
  softLine:  '#E8E8E8',
  gray700:   '#4F4F4F',
  gray500:   '#6B7280',
  eyebrow:   'rgba(60,50,40,.55)',
  danger:    '#B00020',
  accentBg:  'rgba(127,174,194,0.06)',
  accentRing: '#7FAEC2',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const serifStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

// ─── Branding shape (from BE GET /d/:slug) ───────────────────────────────────
interface DistributorBranding {
  logo_url:           string | null;
  primary_hex:        string;   // submit button color
  secondary_hex:      string;   // accent / eyebrow / divider color
  custom_notes:       string | null;
  quoteme_verbiage:   Record<string, string> | null;
}

interface DistributorMeta {
  id:           string;
  name:         string;
  display_name: string;
}

interface LanderConfig {
  distributor:           DistributorMeta;
  branding:              DistributorBranding;
  accepted_payload:      string[];   // ["menu","order_guide"]
  accepted_content_types: string[];  // ["text","pdf"]
}

// ─── Page state machine ───────────────────────────────────────────────────────
type PageState = 'loading' | 'idle' | 'sent' | 'not_found' | 'error';
type PayloadType = 'menu' | 'order_guide';
type InputMode = 'text' | 'file';

// ─── Validation helpers ───────────────────────────────────────────────────────
function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
function isValidPhone(s: string): boolean {
  return /[\d]{7,}/.test(s.replace(/\D/g, ''));
}

// ─── Opportunity reference formatter ─────────────────────────────────────────
// Converts a UUID to a short, user-visible reference code.
// "550e8400-e29b-41d4-a716-446655440000" → "QM-55440000"
export function formatOpportunityRef(id: string | null | undefined): string | null {
  if (!id) return null;
  const clean = id.replace(/-/g, '');
  return `QM-${clean.slice(-8).toUpperCase()}`;
}

// ─── Not-found frame ──────────────────────────────────────────────────────────
function NotFoundFrame() {
  return (
    <div
      style={{
        ...sans,
        background: C.cream,
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 999,
            background: '#fff',
            border: `1px solid ${C.softLine}`,
            marginBottom: 20,
          }}
        >
          <AlertCircle size={22} color={C.gray500} />
        </div>
        <h1
          style={{
            ...serifStyle,
            fontSize: 26,
            fontWeight: 500,
            color: C.charcoal,
            lineHeight: 1.25,
            marginBottom: 12,
          }}
        >
          This page isn't available.
        </h1>
        <p style={{ ...sans, fontSize: 14, color: C.gray500, lineHeight: 1.6, marginBottom: 28 }}>
          The link may have changed or the distributor hasn't enabled their public page yet.
          Check the link you were sent and try again.
        </p>
        <div
          style={{
            ...sans,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 10,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: 'rgba(60,50,40,.45)',
          }}
        >
          <span>Powered by</span>
          <img
            src={quotemeLogo}
            alt="QuoteMe"
            style={{ width: 14, height: 14, objectFit: 'contain', opacity: 0.55 }}
          />
          <span style={{ color: C.charcoal, letterSpacing: '.08em' }}>QuoteMe</span>
        </div>
      </div>
    </div>
  );
}

// ─── Delivered (success) frame ────────────────────────────────────────────────
interface DeliveredFrameProps {
  distributorName: string;
  primaryHex: string;
  secondaryHex: string;
  desktop: boolean;
  opportunityId: string | null;
}
function DeliveredFrame({ distributorName, primaryHex, secondaryHex, desktop, opportunityId }: DeliveredFrameProps) {
  return (
    <div
      style={{
        marginTop: desktop ? 32 : 26,
        padding: desktop ? '30px 32px' : '22px 20px',
        background: `${secondaryHex}12`,
        border: `1px solid ${secondaryHex}`,
        borderRadius: 6,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: desktop ? 36 : 32,
          height: desktop ? 36 : 32,
          borderRadius: 999,
          background: '#fff',
          border: `1px solid ${secondaryHex}`,
        }}
      >
        <Check size={desktop ? 16 : 14} color={secondaryHex} />
      </div>
      <div
        style={{
          ...serifStyle,
          fontSize: desktop ? 19 : 16,
          fontWeight: 500,
          color: C.charcoal,
          marginTop: desktop ? 14 : 12,
          lineHeight: 1.3,
        }}
      >
        Delivered to {distributorName}.
      </div>
      <p
        style={{
          ...sans,
          fontSize: desktop ? 13.5 : 12.5,
          lineHeight: 1.62,
          color: C.gray500,
          marginTop: desktop ? 10 : 8,
          maxWidth: 460,
        }}
      >
        They'll follow up through QuoteMe.
        {opportunityId && (
          <>
            {' '}Your reference:{' '}
            <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '.04em' }}>
              {formatOpportunityRef(opportunityId)}
            </span>
          </>
        )}
      </p>
      <div
        style={{
          ...sans,
          fontSize: 10,
          marginTop: desktop ? 20 : 16,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          color: 'rgba(60,50,40,.45)',
          letterSpacing: '.1em',
          textTransform: 'uppercase',
        }}
      >
        <span>Sent through</span>
        <img
          src={quotemeLogo}
          alt="QuoteMe"
          style={{ width: 13, height: 13, objectFit: 'contain', opacity: 0.5 }}
        />
        <span style={{ color: C.charcoal }}>QuoteMe</span>
      </div>
    </div>
  );
}

// ─── Main lander form ─────────────────────────────────────────────────────────
interface LanderFormProps {
  config:      LanderConfig;
  desktop:     boolean;
  onDelivered: (opportunityId: string | null) => void;
  slug:        string;
}

function LanderForm({ config, desktop, onDelivered, slug }: LanderFormProps) {
  const { distributor, branding, accepted_payload, accepted_content_types } = config;
  const primaryHex   = branding.primary_hex   || '#F2993D';
  const secondaryHex = branding.secondary_hex || '#7FAEC2';
  const displayName  = distributor.display_name || distributor.name;

  // Detect logged-in session (read-only — no prefill, just the quiet line)
  const isLoggedIn = !!localStorage.getItem('quoteme_token');

  // Form fields
  const [restaurantName, setRestaurantName] = useState('');
  const [contactName,    setContactName]    = useState('');
  const [contactEmail,   setContactEmail]   = useState('');
  const [contactPhone,   setContactPhone]   = useState('');

  // Payload type toggle (menu / order_guide)
  const defaultPayload: PayloadType =
    accepted_payload.includes('menu') ? 'menu' : 'order_guide';
  const [payloadType, setPayloadType] = useState<PayloadType>(defaultPayload);

  // Input mode: always offer both paste-text and PDF upload regardless of
  // accepted_content_types — the BE text path is always available.
  const showFile = accepted_content_types.includes('pdf');
  const defaultMode: InputMode = 'text';
  const [inputMode, setInputMode] = useState<InputMode>(defaultMode);

  // Text area
  const [textContent, setTextContent] = useState('');

  // File drop zone
  const [file,     setFile]     = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [dropHover, setDropHover] = useState(false);

  // ── W4: the ingestion block, brought to the public lander ────────────────
  //
  // The chef reading this page is not a rep. They have been handed a link and
  // they get one page. So the same four ways in that the quoting page offers --
  // drop a file, fetch a URL, paste, or edit what we read -- have to be here,
  // and the parse has to be the SAME parse, which is why parseMenuText now
  // lives in utils/menuIngestion rather than inside StartNewQuotePage.
  const [menuUrl, setMenuUrl] = useState('');
  const [parsedDishes, setParsedDishes] = useState<ParsedDish[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractElapsed, setExtractElapsed] = useState(0);
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingToDish, setAddingToDish] = useState<string | null>(null);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [addingNewDish, setAddingNewDish] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const nextLocalId = useRef(1);

  // Extraction takes real time, so the wait needs a clock behind it. Without
  // this the page would show one string for up to four minutes.
  useEffect(() => {
    if (!isExtracting) { setExtractElapsed(0); return; }
    const startedAt = Date.now();
    const t = setInterval(() => setExtractElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [isExtracting]);

  // Paste -> parse, debounced. Mirrors the quoting page's 1.5s debounce.
  useEffect(() => {
    if (!textContent.trim()) { setParsedDishes([]); return; }
    const t = setTimeout(() => setParsedDishes(parseMenuText(stripPrices(textContent))), 1500);
    return () => clearTimeout(t);
  }, [textContent]);

  // ── Edits flow BACK into textContent. Load bearing.
  //
  //    This page submits TEXT: the request body is
  //    { payload_type, text, contact_* }. The quoting page carries parsedDishes
  //    forward directly, so it never needed this. Here, without it, a chef who
  //    renames a chip, removes an ingredient or adds a dish would watch the
  //    panel update, press submit, and send the text they never edited. That is
  //    a control that reports success and persists nothing.
  const commitDishes = useCallback((next: ParsedDish[]) => {
    setParsedDishes(next);
    setTextContent(reconstructText(next));
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [fieldErrors,  setFieldErrors]  = useState<Record<string, string>>({});

  // Read a local text file without a round trip. CSV and .txt are already text,
  // so sending them to the extractor would be a network call to learn nothing.
  const readLocalText = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setTextContent(text);
      setParsedDishes(parseMenuText(stripPrices(text)));
    };
    reader.onerror = () => setExtractError(extractionFailureMessage('no_text'));
    reader.readAsText(f);
  }, []);

  const runExtraction = useCallback(async (payload: { file?: File; url?: string }) => {
    setIsExtracting(true);
    setExtractError(null);
    try {
      const res = await extractMenuText(payload);
      if (res.error) {
        setExtractError(extractionFailureMessage(res.error));
      } else if (res.data?.text?.trim()) {
        setTextContent(res.data.text);
        setParsedDishes(parseMenuText(stripPrices(res.data.text)));
      } else {
        // A 200 with nothing in it is a failure the chef can act on, not a success.
        setExtractError(extractionFailureMessage('no_text'));
      }
    } catch {
      setExtractError(extractionFailureMessage(undefined));
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const acceptFile = useCallback((f: File) => {
    // GATE FIRST, before any state is touched. The <input accept> attribute is
    // only a picker hint and drag-and-drop bypasses it entirely, so this page
    // accepted a dropped .xlsx and sent it. Same gate and same words as the
    // quoting page, via MENU_SURFACE.
    const rejection = fileRejection(f, MENU_SURFACE);
    if (rejection) { setExtractError(rejection); return; }

    setExtractError(null);
    setFile(f);
    setFileName(f.name);
    setFileSize(
      f.size > 1_048_576
        ? `${(f.size / 1_048_576).toFixed(1)} MB`
        : `${Math.max(1, Math.round(f.size / 1024))} KB`,
    );

    const lower = f.name.toLowerCase();
    if (lower.endsWith('.csv') || lower.endsWith('.txt')) readLocalText(f);
    else void runExtraction({ file: f });
  }, [readLocalText, runExtraction]);

  const handleUrlFetch = useCallback(() => {
    const raw = menuUrl.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    void runExtraction({ url });
  }, [menuUrl, runExtraction]);

  // ── Ingredient editing. Every one goes through commitDishes so the submitted
  //    text and the panel can never disagree.
  const removeIngredient = (dishId: string, ingId: string) =>
    commitDishes(parsedDishes.map(d =>
      d.id === dishId ? { ...d, ingredients: d.ingredients.filter(i => i.id !== ingId) } : d));

  const saveIngredientEdit = (dishId: string, ingId: string) => {
    if (!editValue.trim()) { setEditingIngredient(null); return; }
    commitDishes(parsedDishes.map(d =>
      d.id === dishId
        ? { ...d, ingredients: d.ingredients.map(i => i.id === ingId ? { ...i, name: editValue.trim() } : i) }
        : d));
    setEditingIngredient(null);
    setEditValue('');
  };

  const addIngredient = (dishId: string) => {
    if (!newIngredientName.trim()) { setAddingToDish(null); setNewIngredientName(''); return; }
    nextLocalId.current += 1;
    commitDishes(parsedDishes.map(d =>
      d.id === dishId
        ? { ...d, ingredients: [...d.ingredients, { id: `ing-new-${nextLocalId.current}`, name: newIngredientName.trim(), confidence: 0.85 }] }
        : d));
    setNewIngredientName(''); // stays open for continuous entry
  };

  const addDish = () => {
    if (!newDishName.trim()) { setAddingNewDish(false); setNewDishName(''); return; }
    nextLocalId.current += 1;
    const dishId = `dish-new-${nextLocalId.current}`;
    commitDishes([...parsedDishes, { id: dishId, name: newDishName.trim(), ingredients: [] }]);
    setNewDishName('');
    setAddingNewDish(false);
    setAddingToDish(dishId);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDropHover(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) acceptFile(f);
    },
    [acceptFile],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) acceptFile(f);
    },
    [acceptFile],
  );

  // Client-side validation
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!restaurantName.trim()) errs.restaurantName = 'Restaurant name is required.';
    if (!contactName.trim())    errs.contactName    = 'Your name is required.';
    const hasEmail = contactEmail.trim() && isValidEmail(contactEmail);
    const hasPhone = contactPhone.trim() && isValidPhone(contactPhone);
    if (!hasEmail && !hasPhone) {
      errs.contact = 'Please provide a valid email or phone number.';
    }
    if (inputMode === 'text' && !textContent.trim()) {
      errs.content = 'Please paste your menu or order guide text.';
    }
    if (inputMode === 'file' && !file) {
      errs.content = 'Please attach a PDF before submitting.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      let response: Response;

      if (inputMode === 'file' && file) {
        // Multipart — PDF upload path
        const fd = new FormData();
        fd.append('file',            file);
        fd.append('payload_type',    payloadType);
        fd.append('restaurant_name', restaurantName.trim());
        fd.append('contact_name',    contactName.trim());
        if (contactEmail.trim()) fd.append('contact_email', contactEmail.trim());
        if (contactPhone.trim()) fd.append('contact_phone', contactPhone.trim());

        response = await fetch(
          `${API_BASE_URL}/api/v1/d/${encodeURIComponent(slug)}/upload`,
          { method: 'POST', body: fd },
        );
      } else {
        // JSON — paste-text path
        response = await fetch(
          `${API_BASE_URL}/api/v1/d/${encodeURIComponent(slug)}/upload`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              payload_type:    payloadType,
              text:            textContent.trim(),
              restaurant_name: restaurantName.trim(),
              contact_name:    contactName.trim(),
              contact_email:   contactEmail.trim() || undefined,
              contact_phone:   contactPhone.trim() || undefined,
            }),
          },
        );
      }

      if (response.status === 201) {
        const successBody = await response.json().catch(() => ({}));
        onDelivered((successBody as { opportunity_id?: string }).opportunity_id ?? null);
        return;
      }

      // 422 — surface BE validation message if present
      const body = await response.json().catch(() => ({}));
      const beMsg =
        body?.error ||
        (Array.isArray(body?.errors) ? body.errors.join(' ') : null) ||
        'Something went wrong. Please try again.';
      setSubmitError(beMsg);
    } catch {
      setSubmitError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Shared input style ─────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    ...sans,
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 13px',
    fontSize: desktop ? 14.5 : 13.5,
    border: `1px solid ${C.softLine}`,
    borderRadius: 4,
    background: '#fff',
    color: C.charcoal,
    outline: 'none',
    lineHeight: 1.4,
  };

  const labelStyle: React.CSSProperties = {
    ...sans,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color: C.eyebrow,
    display: 'block',
    marginBottom: 8,
  };

  const fieldWrap: React.CSSProperties = {
    marginBottom: desktop ? 20 : 16,
  };

  const errorText: React.CSSProperties = {
    ...sans,
    fontSize: 11.5,
    color: C.danger,
    marginTop: 5,
  };

  return (
    <div>
      {/* ── Logged-in seam (minimal — full not-you hatch is Desi's) ──────── */}
      {isLoggedIn && (
        <div
          style={{
            ...sans,
            fontSize: 11.5,
            color: C.gray500,
            marginBottom: desktop ? 22 : 18,
            fontStyle: 'italic',
          }}
        >
          Signed in? This page works without an account.
        </div>
      )}

      {/* ── Trust / header line from verbiage ──────────────────────────── */}
      {/* Unfilled slots hide entirely — bracketed placeholder values must
          never render to a real visitor (Justin's locked verbiage pending). */}
      {branding.quoteme_verbiage?.header_trust_line &&
        !/placeholder|\[verbiage/i.test(branding.quoteme_verbiage.header_trust_line) && (
        <div
          style={{
            ...serifStyle,
            fontSize: desktop ? 13 : 12,
            fontStyle: 'italic',
            color: C.gray500,
            marginBottom: desktop ? 22 : 18,
          }}
        >
          {branding.quoteme_verbiage.header_trust_line}
        </div>
      )}

      {/* ── Custom notes from distributor ───────────────────────────────── */}
      {branding.custom_notes && (
        <div
          style={{
            ...serifStyle,
            fontSize: desktop ? 15 : 13.5,
            lineHeight: 1.62,
            color: C.charcoal,
            marginBottom: desktop ? 28 : 22,
            paddingLeft: desktop ? 18 : 14,
            borderLeft: `2px solid ${secondaryHex}`,
          }}
        >
          {branding.custom_notes}
        </div>
      )}

      {/* Thin rule */}
      <div
        style={{
          borderTop: `1px solid ${C.softLine}`,
          marginBottom: desktop ? 28 : 22,
        }}
      />

      {/* ── Payload type toggle ─────────────────────────────────────────── */}
      {accepted_payload.length > 1 && (
        <div style={{ ...fieldWrap }}>
          <span style={labelStyle}>I'm sending a</span>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['menu', 'order_guide'] as PayloadType[])
              .filter((p) => accepted_payload.includes(p))
              .map((p) => {
                const active = payloadType === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPayloadType(p)}
                    style={{
                      ...sans,
                      flex: 1,
                      padding: '10px 0',
                      fontSize: desktop ? 13.5 : 12.5,
                      fontWeight: 500,
                      borderRadius: 4,
                      border: `1.5px solid ${active ? secondaryHex : C.softLine}`,
                      background: active ? `${secondaryHex}14` : '#fff',
                      color: active ? C.charcoal : C.gray500,
                      cursor: 'pointer',
                      transition: 'border-color .12s ease, background .12s ease',
                    }}
                  >
                    {p === 'menu' ? 'Menu' : 'Order Guide'}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Restaurant info ─────────────────────────────────────────────── */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Restaurant name</label>
        <input
          type="text"
          placeholder="e.g. The Holloway Grill"
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          style={inputStyle}
        />
        {fieldErrors.restaurantName && (
          <p style={errorText}>{fieldErrors.restaurantName}</p>
        )}
      </div>

      {/* ── Contact info ────────────────────────────────────────────────── */}
      <div style={fieldWrap}>
        <label style={labelStyle}>Your name</label>
        <input
          type="text"
          placeholder="e.g. Alex Rivera"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          style={inputStyle}
        />
        {fieldErrors.contactName && (
          <p style={errorText}>{fieldErrors.contactName}</p>
        )}
      </div>

      <div style={{ ...fieldWrap, display: desktop ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={desktop ? {} : { marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="you@restaurant.com"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
      {fieldErrors.contact && (
        <p style={{ ...errorText, marginTop: -10, marginBottom: 16 }}>{fieldErrors.contact}</p>
      )}

      {/* ── Input mode toggle — always shown (paste is always available) ── */}
      {showFile ? (
        <div style={{ ...fieldWrap }}>
          <span style={labelStyle}>How are you sharing it?</span>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['text', 'file'] as InputMode[]).map((m) => {
              const active = inputMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setInputMode(m)}
                  style={{
                    ...sans,
                    flex: 1,
                    padding: '10px 0',
                    fontSize: desktop ? 13.5 : 12.5,
                    fontWeight: 500,
                    borderRadius: 4,
                    border: `1.5px solid ${active ? secondaryHex : C.softLine}`,
                    background: active ? `${secondaryHex}14` : '#fff',
                    color: active ? C.charcoal : C.gray500,
                    cursor: 'pointer',
                    transition: 'border-color .12s ease, background .12s ease',
                  }}
                >
                  {m === 'text' ? 'Paste text' : 'Upload PDF'}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Text paste box ──────────────────────────────────────────────── */}
      {inputMode === 'text' && (
        <div style={fieldWrap}>
          <label style={labelStyle}>
            {payloadType === 'menu' ? 'Menu text' : 'Order guide text'}
          </label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={desktop ? 8 : 6}
            placeholder={
              payloadType === 'menu'
                ? 'Paste your full menu here: dishes, ingredients, sections…'
                : 'Paste your order guide here: items, quantities, case sizes…'
            }
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: desktop ? 180 : 140,
            }}
          />
          {fieldErrors.content && <p style={errorText}>{fieldErrors.content}</p>}
        </div>
      )}

      {/* ── W4: Menu URL + Fetch ─────────────────────────────────────────── */}
      {inputMode === 'text' && (
        <div style={fieldWrap}>
          <label style={labelStyle} htmlFor="lander-menu-url">
            {payloadType === 'menu' ? 'Or link to your menu' : 'Or link to your order guide'}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="lander-menu-url"
              type="text"
              value={menuUrl}
              onChange={(e) => setMenuUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUrlFetch(); } }}
              placeholder="yourrestaurant.com/menu"
              style={{ ...inputStyle, flex: 1 }}
              disabled={isExtracting}
            />
            <button
              type="button"
              onClick={handleUrlFetch}
              disabled={!menuUrl.trim() || isExtracting}
              style={{
                ...sans,
                padding: '11px 18px',
                fontSize: desktop ? 14 : 13,
                fontWeight: 600,
                borderRadius: 4,
                border: `1px solid ${C.accentRing}`,
                background: !menuUrl.trim() || isExtracting ? C.warmPaper : '#fff',
                color: !menuUrl.trim() || isExtracting ? C.gray500 : C.charcoal,
                cursor: !menuUrl.trim() || isExtracting ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Fetch
            </button>
          </div>
        </div>
      )}

      {/* ── W4: what the page says WHILE extraction runs ─────────────────────
          Extraction is slow enough that one static string would stop being
          true. This changes as the wait grows and, once it is long, points at
          the paste box rather than asking the chef to keep waiting. */}
      {isExtracting && (
        <div
          role="status"
          aria-live="polite"
          style={{
            ...sans, fontSize: 13, color: C.gray700,
            background: C.accentBg, border: `1px solid ${C.accentRing}`,
            borderRadius: 4, padding: '11px 13px', marginBottom: desktop ? 20 : 16,
          }}
        >
          {extractionProgressMessage(extractElapsed)}
        </div>
      )}

      {/* ── W4: what the page says when a file FAILS ─────────────────────────
          Plain language, no backend codes, and no retry offered where retrying
          cannot succeed. extractionFailureMessage owns that decision. */}
      {extractError && !isExtracting && (
        <div
          role="alert"
          style={{
            ...sans, fontSize: 13, color: C.danger,
            background: '#FDF2F4', border: `1px solid ${C.danger}`,
            borderRadius: 4, padding: '11px 13px', marginBottom: desktop ? 20 : 16,
          }}
        >
          {extractError}
        </div>
      )}

      {/* ── W4: Extracted Ingredients ────────────────────────────────────────
          Chips, edit in place, remove, add ingredient, add dish. Every edit
          goes through commitDishes, which rewrites textContent, because this
          page submits text. */}
      {(parsedDishes.length > 0 || isExtracting) && (
        <div style={fieldWrap}>
          <label style={labelStyle}>
            What we read {parsedDishes.length > 0 && `· ${countIngredients(parsedDishes)} ingredients`}
          </label>
          <div
            style={{
              border: `1px solid ${C.softLine}`, borderRadius: 4,
              background: C.warmPaper, padding: desktop ? 16 : 13,
            }}
          >
            {parsedDishes.length === 0 ? (
              <p style={{ ...sans, fontSize: 13, color: C.gray500, margin: 0 }}>
                Reading…
              </p>
            ) : (
              <>
                <p style={{ ...sans, fontSize: 12, color: C.gray500, margin: '0 0 12px' }}>
                  Tap any ingredient to correct it. Your changes are what gets sent.
                </p>
                {parsedDishes.map(dish => (
                  <div key={dish.id} style={{ marginBottom: 14 }}>
                    <div style={{ ...sans, fontSize: 13, fontWeight: 600, color: C.charcoal, marginBottom: 6 }}>
                      {dish.name}{' '}
                      <span style={{ fontWeight: 400, color: C.gray500 }}>({dish.ingredients.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {dish.ingredients.map(ing => (
                        editingIngredient === ing.id ? (
                          <input
                            key={ing.id}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); saveIngredientEdit(dish.id, ing.id); }
                              if (e.key === 'Escape') setEditingIngredient(null);
                            }}
                            onBlur={() => saveIngredientEdit(dish.id, ing.id)}
                            autoFocus
                            aria-label={`Edit ${ing.name}`}
                            style={{
                              ...sans, fontSize: 12, padding: '4px 10px', width: 130,
                              border: `1px solid ${C.accentRing}`, borderRadius: 999,
                              outline: 'none', color: C.charcoal,
                            }}
                          />
                        ) : (
                          <span
                            key={ing.id}
                            style={{
                              ...sans, display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: 12, padding: '4px 10px', borderRadius: 999,
                              border: `1px solid ${C.softLine}`, background: '#fff', color: C.charcoal,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => { setEditingIngredient(ing.id); setEditValue(ing.name); }}
                              aria-label={`Correct ${ing.name}`}
                              style={{ ...sans, background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
                            >
                              {ing.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeIngredient(dish.id, ing.id)}
                              aria-label={`Remove ${ing.name}`}
                              style={{ ...sans, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.gray500, lineHeight: 1 }}
                            >
                              ×
                            </button>
                          </span>
                        )
                      ))}
                    </div>
                    {addingToDish === dish.id ? (
                      <input
                        type="text"
                        value={newIngredientName}
                        onChange={(e) => setNewIngredientName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); addIngredient(dish.id); }
                          if (e.key === 'Escape') { setAddingToDish(null); setNewIngredientName(''); }
                        }}
                        onBlur={() => { if (!newIngredientName.trim()) { setAddingToDish(null); setNewIngredientName(''); } }}
                        autoFocus
                        placeholder="Ingredient"
                        aria-label={`Add an ingredient to ${dish.name}`}
                        style={{
                          ...sans, fontSize: 12, padding: '4px 10px', width: 150, marginTop: 8,
                          border: `1px solid ${C.softLine}`, borderRadius: 999, outline: 'none', color: C.charcoal,
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingToDish(dish.id)}
                        aria-label={`Add an ingredient to ${dish.name}`}
                        style={{ ...sans, fontSize: 12, color: C.gray700, background: 'none', border: 'none', padding: 0, marginTop: 8, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        + Add ingredient
                      </button>
                    )}
                  </div>
                ))}
                {addingNewDish ? (
                  <input
                    type="text"
                    value={newDishName}
                    onChange={(e) => setNewDishName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addDish(); }
                      if (e.key === 'Escape') { setAddingNewDish(false); setNewDishName(''); }
                    }}
                    onBlur={() => { if (!newDishName.trim()) { setAddingNewDish(false); setNewDishName(''); } }}
                    autoFocus
                    placeholder="Dish name"
                    aria-label="Add a dish"
                    style={{
                      ...sans, fontSize: 13, padding: '6px 12px', width: 190,
                      border: `1px solid ${C.softLine}`, borderRadius: 4, outline: 'none', color: C.charcoal,
                      marginTop: 8, borderTop: `1px solid ${C.softLine}`,
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingNewDish(true)}
                    style={{
                      ...sans, fontSize: 13, fontWeight: 600, color: C.charcoal,
                      background: 'none', border: 'none', padding: '10px 0 0', cursor: 'pointer',
                      borderTop: `1px solid ${C.softLine}`, width: '100%', textAlign: 'left', marginTop: 6,
                    }}
                  >
                    + Add dish
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PDF drop zone ───────────────────────────────────────────────── */}
      {inputMode === 'file' && (
        <div style={fieldWrap}>
          <label style={labelStyle}>PDF file</label>

          <input
            ref={fileInputRef}
            type="file"
            accept={MENU_SURFACE.exts.join(',')}
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />

          <div
            onDragOver={(e) => { e.preventDefault(); setDropHover(true); }}
            onDragLeave={() => setDropHover(false)}
            onDrop={handleDrop}
            onClick={() => { if (!file) fileInputRef.current?.click(); }}
            role="button"
            tabIndex={0}
            aria-label={file ? 'Replace PDF' : 'Drop PDF or click to browse'}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !file) fileInputRef.current?.click();
            }}
            style={{
              padding: desktop ? '38px 32px' : '30px 22px',
              textAlign: 'center',
              background: file
                ? `${secondaryHex}0d`
                : dropHover ? 'rgba(43,43,43,.025)' : 'rgba(255,255,255,.55)',
              border: file
                ? `1px solid ${secondaryHex}`
                : `1.5px dashed ${dropHover ? C.charcoal : 'rgba(60,50,40,.32)'}`,
              borderRadius: 6,
              cursor: 'pointer',
              outline: 'none',
              transition: 'background .15s ease, border-color .15s ease',
            }}
          >
            {file ? (
              <>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    background: '#fff',
                    border: `1px solid ${secondaryHex}`,
                    margin: '0 auto',
                  }}
                >
                  <FileText size={16} color={secondaryHex} />
                </div>
                <div
                  style={{
                    ...serifStyle,
                    fontSize: desktop ? 15 : 13.5,
                    marginTop: 12,
                    fontWeight: 500,
                    color: C.charcoal,
                    lineHeight: 1.3,
                  }}
                >
                  {fileName}
                </div>
                <div style={{ ...sans, fontSize: 11.5, marginTop: 4, color: C.gray500 }}>
                  {fileSize} · ready to send
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setFileName('');
                    setFileSize('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  style={{
                    ...sans,
                    marginTop: 12,
                    fontSize: 11.5,
                    color: C.charcoal,
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Use a different file
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    background: '#fff',
                    border: `1px solid ${C.softLine}`,
                    margin: '0 auto',
                  }}
                >
                  <Upload size={16} color={C.charcoal} />
                </div>
                <div
                  style={{
                    ...serifStyle,
                    fontSize: desktop ? 15.5 : 14,
                    marginTop: 14,
                    fontWeight: 500,
                    color: C.charcoal,
                    lineHeight: 1.3,
                  }}
                >
                  Drop your PDF here
                </div>
                <div
                  style={{
                    ...serifStyle,
                    fontStyle: 'italic',
                    fontSize: 11,
                    marginTop: 10,
                    color: C.gray500,
                    lineHeight: 1.5,
                  }}
                >
                  or tap to browse
                </div>
              </>
            )}
          </div>
          {fieldErrors.content && <p style={errorText}>{fieldErrors.content}</p>}
        </div>
      )}

      {/* ── Submit — primary_hex is the ONE action color ─────────────────── */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          ...sans,
          marginTop: desktop ? 8 : 6,
          width: '100%',
          padding: desktop ? '14px 20px' : '13px 18px',
          fontSize: desktop ? 14.5 : 13.5,
          fontWeight: 500,
          color: '#fff',
          background: submitting ? 'rgba(60,50,40,.20)' : primaryHex,
          border: 'none',
          borderRadius: 4,
          cursor: submitting ? 'not-allowed' : 'pointer',
          transition: 'background .15s ease',
        }}
      >
        {submitting ? 'Sending…' : `Send to ${displayName}`}
      </button>

      {submitError && (
        <div
          style={{
            ...sans,
            fontSize: 12.5,
            marginTop: 12,
            lineHeight: 1.5,
            color: C.danger,
            textAlign: 'center',
          }}
        >
          {submitError}
        </div>
      )}
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────
interface LanderHeaderProps {
  config:      LanderConfig;
  desktop:     boolean;
}
function LanderHeader({ config, desktop }: LanderHeaderProps) {
  const { distributor, branding } = config;
  const displayName  = distributor.display_name || distributor.name;
  const secondaryHex = branding.secondary_hex || '#7FAEC2';

  return (
    <div style={{ marginBottom: desktop ? 32 : 24 }}>
      {/* Distributor logo */}
      {branding.logo_url && (
        <img
          src={branding.logo_url}
          alt={`${displayName} logo`}
          style={{
            maxHeight: desktop ? 52 : 40,
            maxWidth: desktop ? 200 : 160,
            objectFit: 'contain',
            display: 'block',
            marginBottom: desktop ? 20 : 16,
          }}
        />
      )}

      {/* Eyebrow — colored with secondary_hex */}
      <div
        style={{
          ...sans,
          fontSize: desktop ? 10.5 : 9.5,
          fontWeight: 700,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: secondaryHex,
          marginBottom: desktop ? 10 : 8,
        }}
      >
        Quote Request · {displayName}
      </div>

      {/* Headline */}
      <h1
        style={{
          ...serifStyle,
          fontWeight: 500,
          fontSize: desktop ? 30 : 22,
          lineHeight: 1.18,
          letterSpacing: '-0.012em',
          color: C.charcoal,
          margin: 0,
        }}
      >
        Send your{' '}
        {config.accepted_payload.length === 1 && config.accepted_payload[0] === 'order_guide'
          ? 'order guide'
          : 'menu'}{' '}
        to {displayName}.
      </h1>

      {/* Sub-headline / verbiage */}
      <p
        style={{
          ...sans,
          fontSize: desktop ? 14 : 13,
          lineHeight: 1.62,
          color: C.gray500,
          marginTop: desktop ? 12 : 10,
          marginBottom: 0,
        }}
      >
        {branding.quoteme_verbiage?.sub_headline ||
          `${displayName} uses QuoteMe to receive and price menus. Drop yours here and they'll get back to you with a quote.`}
      </p>
    </div>
  );
}

// ─── Page footer ──────────────────────────────────────────────────────────────
function LanderFooter({ desktop }: { desktop: boolean }) {
  return (
    <div
      style={{
        marginTop: desktop ? 40 : 30,
        paddingTop: desktop ? 18 : 15,
        borderTop: `1px solid ${C.softLine}`,
      }}
    >
      <p
        style={{
          ...serifStyle,
          fontStyle: 'italic',
          fontSize: desktop ? 11.5 : 10.5,
          lineHeight: 1.6,
          color: C.gray500,
          maxWidth: 460,
          marginBottom: desktop ? 12 : 10,
        }}
      >
        Your information is only shared with this distributor. QuoteMe never sells contact data
        or shares pricing with other distributors.
      </p>
      <div
        style={{
          ...sans,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          letterSpacing: '.12em',
          color: 'rgba(60,50,40,.45)',
          textTransform: 'uppercase',
        }}
      >
        <span>Powered by</span>
        <img
          src={quotemeLogo}
          alt="QuoteMe"
          style={{ width: 14, height: 14, objectFit: 'contain', opacity: 0.55 }}
        />
        <span style={{ color: C.charcoal, letterSpacing: '.08em' }}>QuoteMe</span>
      </div>
    </div>
  );
}

// ─── DistributorLanderPage ────────────────────────────────────────────────────
// Route component for /d/:slug. Manages branding fetch and page state machine.
// Placed OUTSIDE RootLayout so unauthenticated visitors are not bounced to /auth.

export function DistributorLanderPage() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = resolveSlug(slugParam);

  const [pageState,     setPageState]     = useState<PageState>('loading');
  const [config,        setConfig]        = useState<LanderConfig | null>(null);
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false,
  );

  // Responsive breakpoint tracking
  useEffect(() => {
    const mq      = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    setIsDesktop(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // On mount: GET /api/v1/d/:slug for branding config
  useEffect(() => {
    if (!slug) {
      setPageState('not_found');
      return;
    }

    let cancelled = false;

    fetch(`${API_BASE_URL}/api/v1/d/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setPageState('not_found');
          return;
        }
        if (!res.ok) {
          setPageState('error');
          return;
        }
        const body = await res.json();
        setConfig(body as LanderConfig);
        setPageState('idle');
      })
      .catch(() => {
        if (!cancelled) setPageState('error');
      });

    return () => { cancelled = true; };
  }, [slug]);

  // ── Render by page state ───────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div
        style={{
          ...sans,
          background: C.cream,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.gray500,
          fontSize: 13,
        }}
      />
    );
  }

  if (pageState === 'not_found' || pageState === 'error') {
    return <NotFoundFrame />;
  }

  if (!config) return null;

  const { branding } = config;
  const primaryHex   = branding.primary_hex   || '#F2993D';
  const secondaryHex = branding.secondary_hex || '#7FAEC2';
  const displayName  = config.distributor.display_name || config.distributor.name;

  if (pageState === 'sent') {
    return (
      <div
        style={{
          ...sans,
          background: C.cream,
          minHeight: '100dvh',
          padding: isDesktop ? '64px 0 88px' : '32px 22px 40px',
        }}
      >
        <div
          style={
            isDesktop
              ? { maxWidth: 680, margin: '0 auto', padding: '0 40px' }
              : {}
          }
        >
          <LanderHeader config={config} desktop={isDesktop} />
          <DeliveredFrame
            distributorName={displayName}
            primaryHex={primaryHex}
            secondaryHex={secondaryHex}
            desktop={isDesktop}
            opportunityId={opportunityId}
          />
          <LanderFooter desktop={isDesktop} />
        </div>
      </div>
    );
  }

  // idle — show the form
  return (
    <div
      style={{
        ...sans,
        background: C.cream,
        minHeight: '100dvh',
        padding: isDesktop ? '64px 0 88px' : '32px 22px 40px',
      }}
    >
      <div
        style={
          isDesktop
            ? { maxWidth: 680, margin: '0 auto', padding: '0 40px' }
            : {}
        }
      >
        <LanderHeader config={config} desktop={isDesktop} />
        <LanderForm
          config={config}
          desktop={isDesktop}
          slug={slug!}
          onDelivered={(id) => { setOpportunityId(id); setPageState('sent'); }}
        />
        <LanderFooter desktop={isDesktop} />
      </div>
    </div>
  );
}
