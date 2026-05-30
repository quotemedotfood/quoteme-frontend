// TechLandingPage — token-gated public catalog upload landing.
// Reached via /c/:token — the link the rep forwarded to their catalog person.
// NO auth, NO QuoteMe account required. Bare document on cream, no app chrome.
//
// SU-FE-3 (Wave 3 · Secure Rep-Catalog Upload).
// Canonical spec: handoff/SECURE_REP_CATALOG_UPLOAD.md
// Source reference: handoff/source/screens-secure-public.jsx
//   ForwardedContext (~line 22), CatalogDropZoneV45 (~line 66),
//   V45Footnote (~line 162), V45Sent (~line 179), V45Expired (~line 201),
//   TechLandingMobile (~line 229), TechLandingDesktop (~line 256).
//
// Translation notes (JSX → TSX):
//   • `qm-btn`, `qm-btn-orange`, `qm-eyebrow`, `ink`, `ink-soft`, `ink-faint`,
//     `serif`, `num`, `scroller`, `hairline` are prototype-only CSS classes (not
//     present in the real app). Converted to inline styles using local C +
//     sans/serifStyle constants — same pattern as RepCatalogEmail.tsx (SU-FE-2).
//   • `--qm-*` CSS vars not defined in real app → hex values inlined from source.
//   • `--accent` exists as `#7FAEC2` in theme.css; used as-is for ticks/borders.
//   • Sacred Orange = ONE per surface: "Send it to {rep}" (the upload CTA).
//     App orange = `#F2993D` (var(--primary)); NOT the prototype's `#F9A64B`.
//   • `PhoneShell` is prototype-only → mobile chrome reproduced inline.
//   • `Icon` (lucide passthrough) → lucide-react directly (SU-FE-1/2 pattern).
//   • `QuoteMeWordmark variant="square"` → quoteme-logo.png (same as SU-FE-2).
//   • Real file input behind the drop zone (click → browse), not prototype demo
//     click that faked a filename.
//
// Upload wiring:
//   BE-4 (upload-consume endpoint) is NOT yet on main / in api.ts as of
//   2026-05-30. onSend transitions idle→sent via local state for now.
//
//   TODO(BE-4): When the secure catalog upload-consume endpoint lands, wire here:
//     POST /api/v1/public/catalog_upload_links/:token/consume
//     FormData: { catalog_file: File, note?: string }
//     200  → transition to "sent"
//     410  → transition to "expired"
//   Replace the optimistic `setPageState('sent')` call in handleSend() below.

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Check, ArrowRight, Mail } from 'lucide-react';
import { useParams } from 'react-router';
import quotemeLogo from '../../../assets/quoteme-logo.png';

// ─── Demo data (locked — do not mutate during port) ──────────────────────────
// Canonical: handoff/SECURE_REP_CATALOG_UPLOAD.md § Demo data
// and handoff/source/screens-secure-public.jsx § SECURE object.
export const SECURE = {
  repFull:         "Marcus Rivera",
  repFirst:        "Marcus",
  repEmail:        "marcus@dlisius.co",
  distributor:     "D'Lisius",
  distributorFull: "D'Lisius Distribution Co.",
  chefFirst:       "Daniel",
  chefFull:        "Daniel Reeves",
  restaurant:      "Holloway & Sons",
  restaurantCity:  "Hudson, NY",
  quoteNo:         "Q-1042",
  catalogHeldFrom: "Feb 3, 2026",
  link:            "quoteme.co/c/8FK2-QX9D",
  catalogAdmin:    "Priya Shah",
  sampleFile:      "DLisius_Spring_2026_Master.pdf",
} as const;

// ─── Design constants ─────────────────────────────────────────────────────────
const C = {
  charcoal:   '#2B2B2B',
  orange:     '#F2993D',         // app orange (var(--primary)) — ONE sacred CTA
  cream:      '#FFF9F3',
  warmPaper:  '#FBFAF7',
  softLine:   '#E8E8E8',
  gray700:    '#4F4F4F',
  gray500:    '#6B7280',
  accent:     '#7FAEC2',         // var(--accent) from theme.css
  accentBg:   'rgba(127,174,194,0.06)',
  eyebrow:    'rgba(60,50,40,.55)',
  blockQuote: 'rgba(60,50,40,.32)',
  bodyText:   'rgba(60,50,40,1)',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const serifStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

// ─── Page state ───────────────────────────────────────────────────────────────
export type TechLandingState = 'idle' | 'sent' | 'expired';

// ─── ForwardedContext ─────────────────────────────────────────────────────────
// Header block: who asked, which distributor. Reads as a forwarded internal
// request — Marcus (the colleague) leads, the chef is the reason.

interface ForwardedContextProps {
  desktop?: boolean;
}

function ForwardedContext({ desktop = false }: ForwardedContextProps) {
  return (
    <div>
      {/* Eyebrow */}
      <div
        style={{
          ...sans,
          fontSize: desktop ? 10.5 : 9.5,
          fontWeight: 700,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: C.eyebrow,
        }}
      >
        CATALOG REQUEST · FORWARDED BY {SECURE.repFirst.toUpperCase()}
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
          marginTop: desktop ? 14 : 10,
        }}
      >
        {SECURE.repFull} needs your latest{' '}
        <em style={{ fontStyle: 'italic' }}>{SECURE.distributor}</em> catalog.
      </h1>

      {/* Body — block-quote style */}
      <p
        style={{
          ...serifStyle,
          fontSize: desktop ? 15 : 13.5,
          lineHeight: 1.62,
          color: C.charcoal,
          marginTop: desktop ? 20 : 16,
          paddingLeft: desktop ? 18 : 14,
          borderLeft: `2px solid ${C.charcoal}`,
        }}
      >
        He's pricing a quote for {SECURE.restaurant} in {SECURE.restaurantCity}, and the price
        list on file is from {SECURE.catalogHeldFrom}. You're the one who keeps ours current — so he
        sent it your way. A current catalog is all he needs: a PDF, a spreadsheet, even photos of a
        printed sheet.
      </p>

      {/* Attribution line */}
      <div
        style={{
          ...sans,
          marginTop: desktop ? 16 : 13,
          fontSize: desktop ? 12.5 : 11.5,
          lineHeight: 1.55,
          color: C.gray700,
        }}
      >
        {SECURE.repFull} · {SECURE.distributorFull} · {SECURE.repEmail}
      </div>
    </div>
  );
}

// ─── CatalogDropZoneV45 ───────────────────────────────────────────────────────
// Dedicated drop zone — drag-a-file or click to browse. Optional note field.
// One orange CTA: "Send it to {rep}".

interface CatalogDropZoneV45Props {
  desktop?: boolean;
  onSend: (file: File, note: string) => void;
}

function CatalogDropZoneV45({ desktop = false, onSend }: CatalogDropZoneV45Props) {
  const [file, setFile]       = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [note, setNote]       = useState('');
  const [hover, setHover]     = useState(false);
  const fileInputRef          = useRef<HTMLInputElement>(null);
  const hasFile               = !!fileName;

  const acceptFile = useCallback((f: File) => {
    setFile(f);
    setFileName(f.name);
    setFileSize(
      f.size > 1_048_576
        ? `${(f.size / 1_048_576).toFixed(1)} MB`
        : `${Math.max(1, Math.round(f.size / 1024))} KB`,
    );
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHover(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) acceptFile(f);
  }, [acceptFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  }, [acceptFile]);

  const handleZoneClick = useCallback(() => {
    if (!hasFile) fileInputRef.current?.click();
  }, [hasFile]);

  const handleSend = useCallback(() => {
    if (file) onSend(file, note);
  }, [file, note, onSend]);

  return (
    <div>
      {/* Hidden real file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={handleDrop}
        onClick={handleZoneClick}
        role="button"
        tabIndex={0}
        aria-label={hasFile ? 'Replace catalog file' : 'Drop catalog file or click to browse'}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleZoneClick(); }}
        style={{
          marginTop: desktop ? 28 : 22,
          padding: desktop ? '38px 32px' : '30px 22px',
          textAlign: 'center',
          background: hasFile
            ? C.accentBg
            : hover ? 'rgba(43,43,43,.025)' : 'rgba(255,255,255,.55)',
          border: hasFile
            ? `1px solid ${C.accent}`
            : `1.5px dashed ${hover ? C.charcoal : 'rgba(60,50,40,.32)'}`,
          borderRadius: 6,
          transition: 'background .15s ease, border-color .15s ease',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {hasFile ? (
          <>
            {/* Check circle */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 999,
                background: '#fff',
                border: `1px solid ${C.accent}`,
                margin: '0 auto',
              }}
            >
              <Check size={16} color={C.accent} />
            </div>

            {/* File name */}
            <div
              style={{
                ...serifStyle,
                fontSize: desktop ? 15.5 : 14,
                marginTop: 12,
                fontWeight: 500,
                lineHeight: 1.3,
                color: C.charcoal,
              }}
            >
              {fileName}
            </div>

            {/* File size */}
            <div style={{ ...sans, fontSize: 11.5, marginTop: 4, color: C.gray500 }}>
              {fileSize} · ready to send
            </div>

            {/* Replace link */}
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
            {/* Upload icon */}
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
                fontSize: desktop ? 16 : 14.5,
                marginTop: 14,
                fontWeight: 500,
                lineHeight: 1.3,
                color: C.charcoal,
              }}
            >
              Drop the catalog here
            </div>
            <div style={{ ...sans, fontSize: 12, marginTop: 6, lineHeight: 1.45, color: C.gray500 }}>
              PDF, spreadsheet, or photos of a printed price list.
            </div>
            <div
              style={{
                ...serifStyle,
                fontStyle: 'italic',
                fontSize: 11,
                marginTop: 14,
                lineHeight: 1.5,
                color: C.gray500,
              }}
            >
              or tap to browse
            </div>
          </>
        )}
      </div>

      {/* Optional note field */}
      <div style={{ marginTop: desktop ? 26 : 20 }}>
        <div
          style={{
            ...sans,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: C.eyebrow,
          }}
        >
          ANYTHING {SECURE.repFirst.toUpperCase()} SHOULD KNOW · OPTIONAL
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={desktop ? 3 : 2}
          placeholder="e.g. seafood prices update again Monday — I'll resend if you want to wait."
          style={{
            ...sans,
            width: '100%',
            boxSizing: 'border-box',
            marginTop: 10,
            padding: '11px 13px',
            fontSize: 13.5,
            background: '#fff',
            border: `1px solid ${C.softLine}`,
            borderRadius: 4,
            color: C.charcoal,
            outline: 'none',
            resize: 'none',
            lineHeight: 1.45,
          }}
        />
      </div>

      {/* Sacred Orange CTA — ONE per surface */}
      <button
        type="button"
        onClick={handleSend}
        disabled={!hasFile}
        style={{
          ...sans,
          marginTop: desktop ? 26 : 20,
          width: '100%',
          padding: desktop ? '14px 20px' : '13px 18px',
          fontSize: desktop ? 14.5 : 13.5,
          fontWeight: 500,
          color: '#fff',
          background: hasFile ? C.orange : 'rgba(60,50,40,.18)',
          border: 'none',
          borderRadius: 4,
          cursor: hasFile ? 'pointer' : 'not-allowed',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background .15s ease',
        }}
      >
        <ArrowRight size={14} color="#fff" />
        Send it to {SECURE.repFirst}
      </button>

      {!hasFile && (
        <div
          style={{
            ...serifStyle,
            fontStyle: 'italic',
            fontSize: 11,
            marginTop: 8,
            textAlign: 'center',
            lineHeight: 1.45,
            color: C.gray500,
          }}
        >
          Drop the catalog first.
        </div>
      )}
    </div>
  );
}

// ─── V45Footnote ──────────────────────────────────────────────────────────────
// Incidental footer — the uploader may never have heard of QuoteMe.

interface V45FootnoteProps {
  desktop?: boolean;
}

function V45Footnote({ desktop = false }: V45FootnoteProps) {
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
        }}
      >
        Your catalog stays private. Only {SECURE.repFull}'s customer sees these prices, and they're never
        shared with other distributors.
      </p>
      <div
        style={{
          ...sans,
          marginTop: desktop ? 13 : 11,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          letterSpacing: '.12em',
          color: 'rgba(60,50,40,.45)',
          textTransform: 'uppercase',
        }}
      >
        <span>Sent through</span>
        <img
          src={quotemeLogo}
          alt="QuoteMe"
          style={{ width: 14, height: 14, objectFit: 'contain', opacity: 0.55 }}
        />
        <span style={{ color: C.charcoal, letterSpacing: '.08em' }}>QuoteMe</span>
        <span>· catalog intake</span>
      </div>
    </div>
  );
}

// ─── V45Sent ──────────────────────────────────────────────────────────────────
// Sent confirmation block — shown after the file is successfully submitted.

interface V45SentProps {
  desktop?: boolean;
  sentFileName?: string;
  sentFileSize?: string;
}

function V45Sent({ desktop = false, sentFileName, sentFileSize }: V45SentProps) {
  return (
    <div
      style={{
        marginTop: desktop ? 32 : 26,
        padding: desktop ? '30px 32px' : '22px 20px',
        background: C.accentBg,
        border: `1px solid ${C.accent}`,
        borderRadius: 6,
      }}
    >
      {/* Check circle */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: desktop ? 36 : 32,
          height: desktop ? 36 : 32,
          borderRadius: 999,
          background: '#fff',
          border: `1px solid ${C.accent}`,
        }}
      >
        <Check size={desktop ? 16 : 15} color={C.accent} />
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
        Sent to {SECURE.repFirst}. Thank you.
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
        {SECURE.repFirst} will get this, and {SECURE.restaurant} will be quoting against your
        catalog within the hour. You can close this page.
      </p>

      {/* File metadata slip */}
      <div
        style={{
          ...sans,
          fontSize: desktop ? 12 : 11,
          marginTop: desktop ? 18 : 14,
          lineHeight: 1.5,
          color: C.gray500,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {sentFileName ?? SECURE.sampleFile}{sentFileSize ? ` · ${sentFileSize}` : ' · 1.4 MB'} · sent just now
      </div>
    </div>
  );
}

// ─── V45Expired ───────────────────────────────────────────────────────────────
// Expired token — 7-day single-use (Q8). Warm, no error-red. One clear path:
// email the rep to ask for a fresh link. Mirrors chef expired-magic-link recovery.

interface V45ExpiredProps {
  desktop?: boolean;
}

function V45Expired({ desktop = false }: V45ExpiredProps) {
  return (
    <div>
      {/* Eyebrow */}
      <div
        style={{
          ...sans,
          fontSize: desktop ? 10.5 : 9.5,
          fontWeight: 700,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: C.eyebrow,
        }}
      >
        CATALOG REQUEST · FORWARDED BY {SECURE.repFirst.toUpperCase()}
      </div>

      {/* Headline */}
      <h1
        style={{
          ...serifStyle,
          fontWeight: 500,
          fontSize: desktop ? 28 : 21,
          lineHeight: 1.18,
          color: C.charcoal,
          marginTop: desktop ? 14 : 10,
        }}
      >
        This link has expired.
      </h1>

      {/* Body — block-quote style */}
      <p
        style={{
          ...serifStyle,
          fontSize: desktop ? 15 : 13.5,
          lineHeight: 1.62,
          color: C.charcoal,
          marginTop: desktop ? 18 : 14,
          maxWidth: 460,
          paddingLeft: desktop ? 18 : 14,
          borderLeft: `2px solid ${C.charcoal}`,
        }}
      >
        Catalog links are good for seven days, then they close on their own. {SECURE.repFirst} can
        send a fresh one in a couple of taps — the new link will work just like this one.
      </p>

      {/* CTA — email the rep (sacred orange, same role as Send CTA on idle) */}
      <a
        href={`mailto:${SECURE.repEmail}?subject=${encodeURIComponent('Catalog link expired — can you resend?')}`}
        style={{
          ...sans,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginTop: desktop ? 26 : 20,
          padding: desktop ? '13px 18px' : '12px 16px',
          fontSize: desktop ? 14 : 13,
          fontWeight: 500,
          color: '#fff',
          background: C.orange,
          borderRadius: 4,
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <Mail size={15} color="#fff" />
        Ask {SECURE.repFirst} for a fresh link
      </a>

      {/* Recovery reassurance */}
      <div
        style={{
          ...serifStyle,
          fontStyle: 'italic',
          fontSize: desktop ? 11.5 : 10.5,
          color: C.gray500,
          lineHeight: 1.5,
          marginTop: desktop ? 14 : 12,
          maxWidth: 460,
        }}
      >
        Nothing was lost. Once you have the new link, drop the catalog and you're done.
      </div>
    </div>
  );
}

// ─── TechLandingDesktop ───────────────────────────────────────────────────────
// Desktop layout — centered single column on cream. Reads like letterhead on a desk.

interface TechLandingDesktopProps {
  state?: TechLandingState;
  onSend?: (file: File, note: string) => void;
  sentFileName?: string;
  sentFileSize?: string;
}

export function TechLandingDesktop({
  state = 'idle',
  onSend = () => {},
  sentFileName,
  sentFileSize,
}: TechLandingDesktopProps) {
  return (
    <div
      style={{
        ...sans,
        background: C.cream,
        minHeight: 760,
        padding: '64px 0 88px',
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 40px' }}>
        {state === 'expired' ? (
          <>
            <V45Expired desktop />
            <V45Footnote desktop />
          </>
        ) : (
          <>
            <ForwardedContext desktop />
            <div style={{ marginTop: 34, borderTop: `1px solid ${C.softLine}` }} />
            {state === 'sent' ? (
              <V45Sent desktop sentFileName={sentFileName} sentFileSize={sentFileSize} />
            ) : (
              <CatalogDropZoneV45 desktop onSend={onSend} />
            )}
            <V45Footnote desktop />
          </>
        )}
      </div>
    </div>
  );
}

// ─── TechLandingMobile ────────────────────────────────────────────────────────
// Mobile layout — bare document on cream, no app chrome.

interface TechLandingMobileProps {
  state?: TechLandingState;
  onSend?: (file: File, note: string) => void;
  sentFileName?: string;
  sentFileSize?: string;
}

export function TechLandingMobile({
  state = 'idle',
  onSend = () => {},
  sentFileName,
  sentFileSize,
}: TechLandingMobileProps) {
  return (
    <div
      style={{
        ...sans,
        background: C.cream,
        minHeight: '100dvh',
      }}
    >
      <div style={{ padding: '32px 22px 40px' }}>
        {state === 'expired' ? (
          <>
            <V45Expired />
            <V45Footnote />
          </>
        ) : (
          <>
            <ForwardedContext />
            <div style={{ marginTop: 24, borderTop: `1px solid ${C.softLine}` }} />
            {state === 'sent' ? (
              <V45Sent sentFileName={sentFileName} sentFileSize={sentFileSize} />
            ) : (
              <CatalogDropZoneV45 onSend={onSend} />
            )}
            <V45Footnote />
          </>
        )}
      </div>
    </div>
  );
}

// ─── TechLandingPage ──────────────────────────────────────────────────────────
// Route component for /c/:token — reads token from route params, manages
// idle/sent/expired state, and renders responsive mobile or desktop layout.
//
// Upload wiring: see TODO(BE-4) at top of file. Currently transitions
// optimistically on file selection (no network call until BE-4 lands).

export function TechLandingPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<TechLandingState>('idle');
  const [sentFileName, setSentFileName] = useState<string | undefined>();
  const [sentFileSize, setSentFileSize] = useState<string | undefined>();
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false,
  );

  // Responsive breakpoint tracking
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    setIsDesktop(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Silence the unused-variable lint if token is not yet wired to a fetch call.
  void token;

  const handleSend = useCallback((_file: File, _note: string) => {
    // TODO(BE-4): Replace this block with a real fetch when the BE endpoint lands.
    //
    //   const formData = new FormData();
    //   formData.append('catalog_file', _file);
    //   if (_note.trim()) formData.append('note', _note.trim());
    //
    //   const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://web-production-9f6e9.up.railway.app';
    //   const res = await fetch(
    //     `${API_BASE}/api/v1/public/catalog_upload_links/${encodeURIComponent(token ?? '')}/consume`,
    //     { method: 'POST', body: formData },
    //   );
    //   if (res.status === 410) { setPageState('expired'); return; }
    //   if (!res.ok) { /* surface error */ return; }
    //
    setSentFileName(_file.name);
    setSentFileSize(
      _file.size > 1_048_576
        ? `${(_file.size / 1_048_576).toFixed(1)} MB`
        : `${Math.max(1, Math.round(_file.size / 1024))} KB`,
    );
    setPageState('sent');
  }, [token]);

  const sharedProps = { state: pageState, onSend: handleSend, sentFileName, sentFileSize };

  return isDesktop
    ? <TechLandingDesktop {...sharedProps} />
    : <TechLandingMobile {...sharedProps} />;
}
