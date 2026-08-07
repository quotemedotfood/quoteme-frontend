import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import {
  ArrowLeft,
  Fingerprint,
  Copy,
  Check,
  Flag,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import {
  getAdminRestaurantCrawlTruth,
  AdminRestaurantCrawlTruth,
  AdminRestaurantCrawlTruthSource,
} from '../../services/adminApi';

// D3 restaurant-truth screen. Renders the payload described in
// D3_restaurant_truth_payload_contract.md. Two rules from that contract
// shape every choice below:
//   1. Identity first - `fetched.reference` renders in the header, always,
//      above any data, so a wrong-record binding is visible on the screen
//      (not only in an API diff).
//   2. Presence is not quality - char_count / component_count / source
//      counts are facts in neutral styling. No "healthy" green, no
//      progress bar implying a fuller screen is a better restaurant.

function formatDateTime(value: string | null): string {
  if (!value) return 'Not recorded';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateOnly(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isRestaurantLabel(v: boolean | null): string {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return 'Not classified';
}

function confidenceLabel(c: number | null): string {
  if (c === null || c === undefined) return 'Not scored';
  if (c >= 80) return 'High confidence';
  if (c >= 50) return 'Medium confidence';
  return 'Low confidence';
}

const PROVENANCE_STYLES: Record<string, string> = {
  'Crawler': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Diner photo': 'bg-purple-50 text-purple-700 border border-purple-200',
  'Rep upload': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Restaurant direct': 'bg-teal-50 text-teal-700 border border-teal-200',
};

function provenanceStyle(label: string): string {
  return PROVENANCE_STYLES[label] || 'bg-gray-100 text-gray-600 border border-gray-200';
}

function SourceRow({ source }: { source: AdminRestaurantCrawlTruthSource }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isSuperseded = source.source_state === 'superseded';

  return (
    <div
      className={`border rounded-xl px-5 py-4 ${
        isSuperseded ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#2A2A2A]">
              {source.is_recognized_kind ? source.kind_label : 'Other menu'}
            </span>
            {!source.is_recognized_kind && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                <Flag size={11} />
                Unrecognized kind
              </span>
            )}
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${provenanceStyle(
                source.provenance_label
              )}`}
            >
              {source.provenance_label}
            </span>
            {isSuperseded && (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                Superseded
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{source.host || 'No host recorded'}</p>
          {isSuperseded && source.superseded_by && (
            <p className="text-xs text-gray-500 mt-1 italic">
              superseded on {formatDateOnly(source.superseded_at, 'an unrecorded date')} by{' '}
              {source.superseded_by.reference}
            </p>
          )}
          <p className="text-sm text-[#4F4F4F] mt-2">{source.status_sentence}</p>
        </div>
        <div className="text-right text-xs text-gray-500 space-y-1 shrink-0">
          <p>List date: {formatDateOnly(source.list_date, 'no date')}</p>
          <p>Fetched: {formatDateOnly(source.fetched_at, 'not fetched')}</p>
        </div>
      </div>

      {/* Presence facts - neutral styling, no health implication. */}
      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <span>Chars: {source.char_count}</span>
        {source.truncated && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
            <AlertTriangle size={11} />
            Truncated
          </span>
        )}
        <span>Components: {source.component_count}</span>
        <span>{source.is_extracted ? 'Extracted' : 'Not yet extracted'}</span>
        {source.extraction_method && <span>Method: {source.extraction_method}</span>}
      </div>

      <button
        type="button"
        onClick={() => setDetailsOpen((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-xs text-[#7FAEC2] hover:underline"
      >
        {detailsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {detailsOpen ? 'Hide details' : 'Show details'}
      </button>
      {detailsOpen && (
        <div className="mt-2 text-xs text-gray-500 space-y-1 bg-gray-50 rounded-lg px-3 py-2">
          <p>Source id: {source.id}</p>
          <p>Raw kind: {source.kind_raw}</p>
          {source.url && (
            <p className="break-all">
              URL:{' '}
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7FAEC2] hover:underline inline-flex items-center gap-1"
              >
                {source.url}
                <ExternalLink size={11} />
              </a>
            </p>
          )}
          {isSuperseded && source.superseded_by && <p>Superseded by id: {source.superseded_by.id}</p>}
        </div>
      )}
    </div>
  );
}

export function QMAdminRestaurantCrawlTruth() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AdminRestaurantCrawlTruth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRestaurantId, setShowRestaurantId] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showSuperseded, setShowSuperseded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    async function load() {
      const res = await getAdminRestaurantCrawlTruth(id!);
      if (res.data) setData(res.data);
      else setError(res.error || 'Not found');
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="p-10 text-gray-400">Loading...</div>;
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!data) return null;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(data.fetched.restaurant_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      /* clipboard unavailable - no-op */
    }
  };

  const activeSources = data.sources.filter((s) => s.source_state !== 'superseded');
  const supersededSources = data.sources.filter((s) => s.source_state === 'superseded');
  const visibleSources = showSuperseded ? data.sources : activeSources;

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <Link
        to={`/qm-admin/restaurants/${id}`}
        className="text-sm text-[#7FAEC2] hover:underline flex items-center gap-1 mb-4"
      >
        <ArrowLeft size={14} /> Back to Restaurant
      </Link>

      {/* ── Identity first: this is the honesty check. If this header does not
          match the restaurant the operator opened, the binding is wrong -
          it must be visible here, not only in an API diff. ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {data.fetched.reference}
        </h1>
        <p className="text-xs text-gray-400 uppercase tracking-wide mt-1">Crawl truth</p>
        {data.fetched.website && (
          <a
            href={data.fetched.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#7FAEC2] hover:underline mt-1 inline-block"
          >
            {data.fetched.website}
          </a>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Data as of {data.fetched.as_of ? formatDateTime(data.fetched.as_of) : 'not recorded'}
        </p>
        <div className="mt-2">
          {!showRestaurantId ? (
            <button
              type="button"
              onClick={() => setShowRestaurantId(true)}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-[#7FAEC2] hover:underline"
            >
              <Fingerprint size={12} />
              Show restaurant id
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 text-xs text-gray-500">
              <span>ID: {data.fetched.restaurant_id}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 text-[#7FAEC2] hover:underline"
              >
                {copiedId ? <Check size={12} /> : <Copy size={12} />}
                {copiedId ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Crawl provenance scalars ── */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Crawl
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-[#4F4F4F] uppercase tracking-wide">Status</p>
            <p className="text-sm text-[#2A2A2A] mt-0.5">{data.crawl.status || 'No crawl status recorded.'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#4F4F4F] uppercase tracking-wide">Confidence</p>
            <p className="text-sm text-[#2A2A2A] mt-0.5">
              {data.crawl.confidence === null || data.crawl.confidence === undefined
                ? 'Not scored'
                : `${data.crawl.confidence} - ${confidenceLabel(data.crawl.confidence)}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#4F4F4F] uppercase tracking-wide">Is a restaurant</p>
            <p className="text-sm text-[#2A2A2A] mt-0.5">{isRestaurantLabel(data.crawl.is_restaurant)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#4F4F4F] uppercase tracking-wide">Source state</p>
            <p className="text-sm text-[#2A2A2A] mt-0.5">{data.crawl.source_state || 'not recorded'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#4F4F4F] uppercase tracking-wide">Found at</p>
            <p className="text-sm text-[#2A2A2A] mt-0.5">{formatDateOnly(data.crawl.found_at, 'not recorded')}</p>
          </div>
          {data.crawl.data_flags && data.crawl.data_flags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#4F4F4F] uppercase tracking-wide">Data flags</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.crawl.data_flags.map((flag) => (
                  <span
                    key={flag}
                    className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Source reporting: counts are facts, not a quality score. No green
          "healthy" styling, no progress bar, no size-implies-completeness
          layout - a 2-source and a 60-source restaurant get equal weight. ── */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Source reporting
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-[#2A2A2A]">
            <span>Sources: {data.source_reporting.source_count}</span>
            <span>Extracted: {data.source_reporting.extracted_count}</span>
            <span>Total chars: {data.source_reporting.total_char_count}</span>
            <span>Truncated: {data.source_reporting.truncated_source_count}</span>
            <span>Unknown kind: {data.source_reporting.unknown_kind_count}</span>
          </div>
          <p className="flex items-center gap-1 text-xs text-gray-400 mt-3">
            <Info size={12} />
            {data.source_reporting.coverage_note}
          </p>
        </div>
      </section>

      {/* ── Sources ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Sources
          </h2>
          {supersededSources.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSuperseded((v) => !v)}
              className="text-xs text-[#7FAEC2] hover:underline"
            >
              {showSuperseded
                ? 'Hide superseded sources'
                : `Show superseded sources (${supersededSources.length})`}
            </button>
          )}
        </div>
        {visibleSources.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No sources recorded</p>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleSources.map((s) => (
              <SourceRow key={s.id} source={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
