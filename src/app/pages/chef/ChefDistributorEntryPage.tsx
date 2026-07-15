// ChefDistributorEntryPage — /chef/distributor/new
//
// Chef's "add a distributor / pull a quote" entry surface. Three segmented-tab
// modes (default = Pick):
//   1. PICK FROM NETWORK — type-ahead/list of existing distributors; select
//      routes to ChefPullEntryPage with distributor context.
//   2. UPLOAD A CATALOG — distributor name + drag/drop catalog file + optional
//      rep capture. Submits multipart to POST /api/v1/chef/distributors.
//   3. REQUEST FROM A REP — distributor name + rep email + pre-filled,
//      editable composer. Submits JSON to POST /api/v1/chef/distributors.
//
// Ported from handoff/desi-chef-v3/src/screens-chef-distributor-entry.jsx
// (Moose, May 26 2026). Prototype helper classes translated to FE idioms:
//   ink → text-[#2A2A2A]
//   ink-soft → text-[#4F4F4F]
//   ink-faint → text-[#9E9E9E]
//   serif → style={{ fontFamily: "'Playfair Display', serif" }}
//   qm-input → border border-[#E8E8E8] rounded-lg px-4 py-2.5 text-sm text-[#2A2A2A]
//   qm-eyebrow → text-[10px] font-medium tracking-[0.08em] uppercase text-[#4F4F4F]
//   qm-btn-orange → bg-[#F2993D] hover:bg-[#E08A2E] text-white

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  FileText,
  Image,
  Table2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  getChefDistributorsAvailable,
  getChefDistributorDetail,
  createChefDistributor,
  type ChefDistributorSummary,
  type PullQuoteDistributor,
} from '../../services/api';
import { useUser } from '../../contexts/UserContext';

// ─── Shared style constants ────────────────────────────────────────────────

const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };
const serifStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

const inputClass =
  'w-full border border-[#E8E8E8] rounded-lg px-4 py-2.5 text-sm text-[#2A2A2A] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2A2A2A]/10 bg-white disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-[#F9F9F9]';

const textareaClass =
  'w-full border border-[#E8E8E8] rounded-lg px-4 py-3 text-sm text-[#2A2A2A] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2A2A2A]/10 bg-white resize-none leading-relaxed disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-[#F9F9F9]';

const eyebrowClass = 'text-[10px] font-medium tracking-[0.08em] uppercase text-[#4F4F4F]';

const primaryBtn =
  'w-full flex items-center justify-center gap-2 bg-[#F2993D] hover:bg-[#E08A2E] text-white rounded-lg px-6 py-3 font-medium transition-colors text-[13.5px] disabled:opacity-50 disabled:cursor-not-allowed';

const errorText = 'text-sm text-red-500';

type Mode = 'pick' | 'upload' | 'request';

// ─── Mode tabs ────────────────────────────────────────────────────────────

interface ModeTabsProps {
  mode: Mode;
  onChange: (m: Mode) => void;
}

function ModeTabs({ mode, onChange }: ModeTabsProps) {
  const tabs: { id: Mode; label: string; sub: string }[] = [
    { id: 'pick',    label: 'Pick from network',  sub: 'Servicing your area' },
    { id: 'upload',  label: 'Upload a catalog',   sub: 'PDF, CSV, or photos' },
    { id: 'request', label: 'Request from a rep', sub: "We'll help draft the email" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {tabs.map((t) => {
        const active = t.id === mode;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="text-left rounded-md transition-colors"
            style={{
              padding: '10px 12px',
              background: active ? '#FBFAF7' : 'transparent',
              border: `1px solid ${active ? '#2A2A2A' : '#E8E8E8'}`,
            }}
          >
            <div
              className="text-[12.5px] leading-snug font-medium text-[#2A2A2A]"
            >
              {t.label}
            </div>
            <div className="text-[10.5px] text-[#9E9E9E] leading-snug mt-0.5">{t.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── PICK FROM NETWORK ────────────────────────────────────────────────────

interface PickPanelProps {
  onSelect: (distributor: PullQuoteDistributor) => void;
}

function PickPanel({ onSelect }: PickPanelProps) {
  const [distributors, setDistributors] = useState<ChefDistributorSummary[] | null>(null);
  const [chefState, setChefState] = useState<string | null>(null);
  const [geoFiltered, setGeoFiltered] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Lazy-load on first render of this tab
  if (!loaded && !loading) {
    setLoading(true);
    getChefDistributorsAvailable().then((res) => {
      setDistributors(res.data?.distributors ?? []);
      // Defensive: fall back to false/null if BE hasn't shipped the fields yet.
      setChefState(res.data?.chef_state ?? null);
      setGeoFiltered(res.data?.geo_filtered ?? false);
      setLoading(false);
      setLoaded(true);
    });
  }

  return (
    <div className="mt-5">
      <div className={eyebrowClass} style={{ fontSize: 10, textTransform: 'none' }}>Available distributors</div>
      <p className="text-[11.5px] text-[#4F4F4F] leading-relaxed mt-1.5" style={{ maxWidth: 560 }}>
        Distributors with a verified catalog. Select one to build a quote.
      </p>
      <div className="mt-4 border-t border-[#E8E8E8]" />

      {/* Geo nudge: shown only when the chef's state is not set and list is not geo-filtered. */}
      {loaded && !geoFiltered && chefState === null && (
        <div
          className="mt-4 px-4 py-3 rounded-md text-[12px] text-[#4F4F4F] leading-relaxed"
          style={{ background: '#FBFAF7', border: '1px solid #E8E8E8' }}
        >
          Set your location's state to see distributors that serve your area.{' '}
          <a
            href="/settings"
            className="underline underline-offset-2 text-[#2A2A2A] hover:opacity-70"
            onClick={(e) => {
              // Navigate via history so state activeTab wires correctly.
              e.preventDefault();
              window.history.pushState({ activeTab: 'settings' }, '', '/settings');
              window.dispatchEvent(new PopStateEvent('popstate', { state: { activeTab: 'settings' } }));
            }}
          >
            Update location settings
          </a>
        </div>
      )}

      {loading && (
        <div className="py-8 flex items-center justify-center gap-2 text-sm text-[#9E9E9E]">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading distributors…
        </div>
      )}

      {loaded && distributors && distributors.length === 0 && (
        <p className="py-6 text-sm text-[#9E9E9E] text-center">
          No distributors found for your area yet. Try uploading a catalog or requesting one from a rep.
        </p>
      )}

      {loaded && distributors && distributors.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() =>
            onSelect({
              id: d.id,
              name: d.name,
              affiliated: d.status === 'active',
            })
          }
          className="w-full text-left border-b border-[#E8E8E8] py-3.5 flex items-start gap-3 hover:bg-[#FBFAF7] transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className="font-medium text-[#2A2A2A] leading-snug"
                style={{ ...serifStyle, fontSize: 15 }}
              >
                {d.name}
              </span>
              {d.status !== 'active' && (
                <span
                  className="text-[#4F4F4F] rounded-full"
                  style={{
                    background: '#FFF9F3',
                    border: '1px solid #E8E8E8',
                    fontSize: 9.5,
                    padding: '1px 7px',
                  }}
                >
                  No rep yet on QuoteMe
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={14} color="#9E9E9E" />
        </button>
      ))}
    </div>
  );
}

// ─── UPLOAD A CATALOG ─────────────────────────────────────────────────────

interface UploadPanelProps {
  onDone: () => void;
}

function UploadPanel({ onDone }: UploadPanelProps) {
  const [companyName, setCompanyName] = useState('');
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [repName, setRepName] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [skipRep, setSkipRep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
    if (file) setCatalogFile(file);
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) setCatalogFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!companyName.trim() || !catalogFile) return;
    setError(null);
    setSubmitting(true);
    try {
      const repContact =
        !skipRep && (repName.trim() || repEmail.trim() || repPhone.trim())
          ? {
              name: repName.trim() || undefined,
              email: repEmail.trim() || undefined,
              phone: repPhone.trim() || undefined,
            }
          : undefined;

      const res = await createChefDistributor(
        {
          mode: 'upload',
          distributor_company_name: companyName.trim(),
          rep_contact: repContact,
        },
        catalogFile,
      );

      if (res.error) {
        setError(res.error);
        return;
      }

      navigate(res.data!.redirect_to);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = companyName.trim().length > 0 && catalogFile !== null && !submitting;

  return (
    <div className="mt-5">
      <div className={eyebrowClass} style={{ fontSize: 10, textTransform: 'none' }}>Upload</div>
      <p className="text-[11.5px] text-[#4F4F4F] leading-relaxed mt-1.5" style={{ maxWidth: 560 }}>
        We'll parse it and match the items against your menu. Photos of an order guide work too,
        most reps' price lists are just a printed PDF anyway.
      </p>

      {/* Distributor name */}
      <div className="mt-4">
        <label className={`${eyebrowClass} block mb-1`} htmlFor="up_company" style={{ fontSize: 9 }}>
          DISTRIBUTOR NAME
        </label>
        <input
          id="up_company"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Hudson Provisions Co."
          disabled={submitting}
          autoComplete="off"
          className={inputClass}
        />
      </div>

      {/* Drop zone */}
      <div
        className={`mt-4 rounded-md text-center cursor-pointer transition-colors ${
          isDragging ? 'bg-[#F0EDE8]' : ''
        }`}
        style={{
          padding: '28px 16px',
          border: `1.5px dashed ${isDragging ? '#2A2A2A' : '#E8E8E8'}`,
          background: isDragging ? '#F0EDE8' : '#FBFAF7',
        }}
        onClick={() => !submitting && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className="inline-flex items-center justify-center rounded-full mx-auto"
          style={{ width: 36, height: 36, background: '#fff', border: '1px solid #E8E8E8' }}
        >
          <Upload size={16} color="#2A2A2A" />
        </div>
        {catalogFile ? (
          <>
            <div className="font-medium text-[#2A2A2A] mt-2.5 leading-snug text-sm" style={serifStyle}>
              {catalogFile.name}
            </div>
            <div className="text-[11.5px] text-[#4F4F4F] mt-1 leading-snug">
              {(catalogFile.size / 1024 / 1024).toFixed(1)} MB · click to replace
            </div>
          </>
        ) : (
          <>
            <div className="font-medium text-[#2A2A2A] mt-2.5 leading-snug" style={{ ...serifStyle, fontSize: 15 }}>
              Drop a catalog or order guide
            </div>
            <div className="text-[11.5px] text-[#4F4F4F] mt-1 leading-snug">
              PDF, CSV, XLSX, or photos · multiple files OK
            </div>
            <div className="mt-3 inline-flex items-center gap-1 text-[12px] text-[#2A2A2A] underline underline-offset-2">
              Choose a file
            </div>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.xlsx,.xls,image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Format hint row */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-[#4F4F4F] leading-snug">
        <div className="flex items-start gap-1.5">
          <FileText size={11} color="#4F4F4F" /> Price list PDF
        </div>
        <div className="flex items-start gap-1.5">
          <Image size={11} color="#4F4F4F" /> Photo of order guide
        </div>
        <div className="flex items-start gap-1.5">
          <Table2 size={11} color="#4F4F4F" /> CSV / spreadsheet
        </div>
      </div>

      {/* Optional rep contact */}
      <div className="mt-5" style={{ borderTop: '1px solid #E8E8E8', paddingTop: 16 }}>
        <div className={`${eyebrowClass} mb-1`} style={{ fontSize: 9, textTransform: 'none' }}>Rep contact (optional)</div>
        <p className="text-[11px] text-[#9E9E9E] leading-relaxed mb-3">
          We don't need the rep's contact info to ingest a catalog. You can add a rep later when one
          comes on board with the distributor.
        </p>

        {!skipRep ? (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
              placeholder="Rep name"
              disabled={submitting}
              autoComplete="off"
              className={inputClass}
            />
            <input
              type="email"
              inputMode="email"
              value={repEmail}
              onChange={(e) => setRepEmail(e.target.value)}
              placeholder="rep@distributor.com"
              disabled={submitting}
              autoComplete="email"
              className={inputClass}
            />
            <input
              type="tel"
              inputMode="tel"
              value={repPhone}
              onChange={(e) => setRepPhone(e.target.value)}
              placeholder="Phone (optional)"
              disabled={submitting}
              autoComplete="tel"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setSkipRep(true)}
              className="text-[11px] text-[#9E9E9E] underline underline-offset-2 text-left"
            >
              I'll add a rep later
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSkipRep(false)}
            className="text-[11px] text-[#4F4F4F] underline underline-offset-2"
          >
            Add rep contact
          </button>
        )}
      </div>

      {/* Error */}
      {error && <p className={`${errorText} mt-4`}>{error}</p>}

      {/* Submit */}
      <button
        type="button"
        className={`${primaryBtn} mt-5`}
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>Upload catalog</>
        )}
      </button>
      <div className="mt-2 text-[10.5px] text-[#9E9E9E] text-center leading-snug" onClick={onDone}>
      </div>
    </div>
  );
}

// ─── REQUEST FROM A REP ───────────────────────────────────────────────────

interface RequestPanelProps {
  restaurantName: string;
}

function RequestPanel({ restaurantName }: RequestPanelProps) {
  const navigate = useNavigate();
  const { user } = useUser();

  const defaultNote =
    `Hi, building out our menu at ${restaurantName || 'our restaurant'} and would love to see your latest price list. Happy to send over what we're looking at.`;

  const [distName, setDistName] = useState('');
  const [repName, setRepName] = useState('');
  const [repContact, setRepContact] = useState('');
  const [note, setNote] = useState(defaultNote);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chefDisplay = user
    ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email
    : '';
  const chefEmail = user?.email ?? '';

  /** Detect whether a contact string looks like an email or a phone number. */
  function parseRepContact(raw: string): { email?: string; phone?: string } {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    // Simple heuristic: contains @ → treat as email; otherwise treat as phone
    if (trimmed.includes('@')) {
      return { email: trimmed };
    }
    return { phone: trimmed };
  }

  async function handleSubmit() {
    if (!distName.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const contactParsed = parseRepContact(repContact);
      const rep_contact =
        repName.trim() || repContact.trim()
          ? { name: repName.trim() || undefined, ...contactParsed }
          : undefined;

      const res = await createChefDistributor({
        mode: 'request',
        distributor_company_name: distName.trim(),
        rep_name: repName.trim() || undefined,
        rep_contact,
        request_message: note.trim(),
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      navigate(res.data!.redirect_to);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-5">
      <div className={eyebrowClass} style={{ fontSize: 10, textTransform: 'none' }}>Request a catalog</div>
      <p className="text-[11.5px] text-[#4F4F4F] leading-relaxed mt-1.5" style={{ maxWidth: 560 }}>
        We'll send a short note from your address asking for the rep's current price list. When they
        reply with the catalog, we'll add it to your distributors automatically.
      </p>

      <div className="mt-5">
        <label className={`${eyebrowClass} block mb-1`} htmlFor="rq_dist" style={{ fontSize: 9 }}>
          DISTRIBUTOR
        </label>
        <input
          id="rq_dist"
          type="text"
          value={distName}
          onChange={(e) => setDistName(e.target.value)}
          placeholder="e.g. Hudson Provisions Co."
          disabled={submitting}
          autoComplete="off"
          className={inputClass}
        />
      </div>

      <div className="mt-3">
        <label className={`${eyebrowClass} block mb-1`} htmlFor="rq_rep_name" style={{ fontSize: 9 }}>
          REP NAME (OPTIONAL)
        </label>
        <input
          id="rq_rep_name"
          type="text"
          value={repName}
          onChange={(e) => setRepName(e.target.value)}
          placeholder="e.g. Jamie Torres"
          disabled={submitting}
          autoComplete="off"
          className={inputClass}
        />
      </div>

      <div className="mt-3">
        <label className={`${eyebrowClass} block mb-1`} htmlFor="rq_contact" style={{ fontSize: 9 }}>
          REP EMAIL OR PHONE (OPTIONAL)
        </label>
        <input
          id="rq_contact"
          type="text"
          inputMode="text"
          value={repContact}
          onChange={(e) => setRepContact(e.target.value)}
          placeholder="name@distributor.com or 555-867-5309"
          disabled={submitting}
          autoComplete="off"
          className={inputClass}
        />
        <p className="text-[10.5px] text-[#9E9E9E] italic leading-snug mt-1" style={serifStyle}>
          Either works, we'll route it to the right place.
        </p>
      </div>

      <div className="mt-3">
        <label className={`${eyebrowClass} block mb-1`} htmlFor="rq_note" style={{ fontSize: 9 }}>
          YOUR NOTE
        </label>
        <textarea
          id="rq_note"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={submitting}
          className={textareaClass}
        />
        <p className="text-[10.5px] text-[#9E9E9E] leading-snug mt-1" style={serifStyle}>
          Pre-filled: edit anything that doesn't sound like you.
        </p>
      </div>

      {/* Sent-from card */}
      {(chefDisplay || chefEmail) && (
        <div
          className="mt-4 px-4 py-3 rounded-md"
          style={{ background: '#FBFAF7', border: '1px solid #E8E8E8' }}
        >
          <div className={eyebrowClass} style={{ fontSize: 9 }}>SENT FROM</div>
          <div className="text-[12.5px] text-[#2A2A2A] mt-0.5 leading-snug">
            {chefDisplay} {chefEmail ? `· ${chefEmail}` : ''}
          </div>
        </div>
      )}

      {/* Error — inline, per spec (not a toast) */}
      {error && <p className={`${errorText} mt-4`}>{error}</p>}

      <button
        type="button"
        className={`${primaryBtn} mt-5`}
        onClick={handleSubmit}
        disabled={!distName.trim() || submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            Send request <ArrowRight size={14} color="white" />
          </>
        )}
      </button>
      <p className="mt-2 text-[10.5px] text-[#9E9E9E] text-center leading-snug">
        We'll let you know when the rep replies. You can keep building quotes in the meantime.
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ChefDistributorEntryPage
// ═════════════════════════════════════════════════════════════════════════════

export function ChefDistributorEntryPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [mode, setMode] = useState<Mode>('pick');

  const restaurantName = ''; // Will come from user context in a future iteration

  async function handlePickSelect(distributor: PullQuoteDistributor) {
    let repData: PullQuoteDistributor['rep'] = null;
    try {
      const detail = await getChefDistributorDetail(distributor.id);
      if (detail.data?.rep) {
        repData = {
          name: detail.data.rep.name,
          email: detail.data.rep.email,
        };
      }
    } catch {
      // rep data is optional — proceed without it
    }
    navigate('/chef/pull/entry', {
      state: {
        distributor_id: distributor.id,
        distributor: { ...distributor, rep: repData },
      },
    });
  }

  function handleBack() {
    navigate(-1);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 pt-5 pb-12">
        {/* Back nav */}
        <button
          type="button"
          onClick={handleBack}
          className="text-[12.5px] text-[#4F4F4F] inline-flex items-center gap-1 mb-4"
        >
          <ChevronLeft size={14} /> Distributors
        </button>

        {/* Page headline */}
        <h1
          className="font-semibold text-[#2A2A2A] mt-2"
          style={{ ...headlineStyle, fontSize: 28, lineHeight: 1.15 }}
        >
          Add a distributor.
        </h1>
        <p className="mt-1.5 text-[13px] text-[#4F4F4F] leading-relaxed">
          Pick one we already know, upload a catalog you have on hand, or have us reach out to a rep.
        </p>

        {/* Mode tabs */}
        <div className="mt-5">
          <ModeTabs mode={mode} onChange={setMode} />
        </div>

        {/* Mode panels */}
        {mode === 'pick' && <PickPanel onSelect={handlePickSelect} />}
        {mode === 'upload' && <UploadPanel onDone={() => navigate('/chef/quotes')} />}
        {mode === 'request' && (
          <RequestPanel restaurantName={restaurantName || (user ? '' : '')} />
        )}
      </div>
    </div>
  );
}
