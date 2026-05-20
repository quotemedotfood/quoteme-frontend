// V2 W4 increment 3 — ChefCatalogSelectionPage  (/chef/catalog)
//
// Justin/Moose lock: three-path visual hierarchy
//   1. Connected — distributors the chef is already linked to (the rep
//      relationship surface). Top of hierarchy.
//   2. (Uploaded path — design has it; OUT OF V2 SCOPE per Moose. Hidden
//      until V2.5 catalog-upload ships.)
//   3. Demo — sample distributor catalog. Honest framing: "prices won't
//      be your rep's." Bottom of hierarchy.
//
// No TrustRibbon (chef is making the selection — there's nothing to
// trust yet). After pick, navigate to /chef/entry with the chosen
// distributor_id; ChefEntryPage uses it as the createGuestQuote
// distributor target.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getChefDistributors, type ChefDistributorSummary } from '../../services/api';

const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
  lightBlue: '#A5CFDD',
  hoverBlue: '#7FAEC2',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  warning: '#D97706',
};
const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export function ChefCatalogSelectionPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [distributors, setDistributors] = useState<ChefDistributorSummary[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getChefDistributors();
      if (cancelled) return;
      if (res.data) {
        setDistributors(res.data.distributors || []);
        setPrimaryId(res.data.primary_distributor_id);
        setState('ready');
      } else {
        setErrorMsg(res.error || 'Could not load distributors');
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function pickDistributor(id: string) {
    navigate(`/chef/entry?distributor_id=${encodeURIComponent(id)}`);
  }

  function pickDemo() {
    // BE auto-falls-back to active demo distributor when distributor_id is
    // absent (see resolve_distributor_and_catalog in guest_quotes_controller).
    navigate('/chef/entry');
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.warmPaper, color: C.charcoal }}>
      <Header />
      <div className="flex-1">
        <div className="max-w-md mx-auto px-5 pt-6 pb-10">
          <h1 style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15 }}>
            What are we quoting against?
          </h1>
          <p
            className="mt-2"
            style={{ ...sans, fontSize: 13, color: C.gray700, lineHeight: 1.55 }}
          >
            Pick a catalog. We'll match your menu against it and price the items.
          </p>

          {state === 'loading' && <LoadingRow />}
          {state === 'error' && <ErrorRow message={errorMsg} />}

          {state === 'ready' && (
            <>
              {distributors.length > 0 && (
                <section className="mt-6">
                  <div
                    className="flex items-center justify-between"
                    style={{ ...sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gray700 }}
                  >
                    <span>Your connected distributors</span>
                    <Pill
                      label="Connected"
                      background="color-mix(in srgb, var(--accent) 20%, transparent)"
                      color="#2A5F6F"
                    />
                  </div>
                  <div className="mt-2 space-y-2">
                    {distributors.map((d) => (
                      <DistributorCard
                        key={d.id}
                        d={d}
                        primary={d.id === primaryId}
                        onPick={() => pickDistributor(d.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Demo path — honest framing per chef-flow design lock.
                  Only path shown when the chef has zero connected
                  distributors. */}
              <section className="mt-6">
                <div style={{ ...sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gray700 }}>
                  {distributors.length === 0 ? 'Try it out' : 'Not ready?'}
                </div>
                <button
                  type="button"
                  onClick={pickDemo}
                  className="mt-2 w-full text-left rounded-lg p-3.5 transition-shadow hover:shadow-sm flex items-center gap-3"
                  style={{ background: C.warmPaper, border: `1px dashed ${C.softLine}` }}
                >
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: '#fff', border: `1px solid ${C.softLine}` }}
                    aria-hidden="true"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16.5 9.4 7.55 4.24" />
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <path d="m3.27 6.96 8.73 5.05 8.73-5.05" />
                      <path d="M12 22.08V12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ ...sans, fontSize: 13.5, fontWeight: 500, color: C.charcoal, lineHeight: 1.35 }}>
                      Use a sample distributor catalog
                    </div>
                    <div
                      className="mt-0.5"
                      style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.4 }}
                    >
                      Prices won't be your rep's.
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </section>

              {/* Operational footer */}
              <div
                className="mt-7 flex items-start gap-3"
                style={{ ...sans, fontSize: 11.5, color: C.gray700, borderTop: `1px solid ${C.softLine}`, paddingTop: 12 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.hoverBlue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2 }} aria-hidden="true">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div style={{ lineHeight: 1.45 }}>
                  Distributors shown are the ones you're already linked to. Tell your rep about
                  QuoteMe to get more catalogs connected.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function Header() {
  return (
    <div
      className="flex items-center justify-between px-5 py-3 bg-white"
      style={{ borderBottom: `1px solid ${C.softLine}` }}
    >
      <span style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal, lineHeight: 1 }}>
        QuoteMe
      </span>
    </div>
  );
}

function Pill({ label, background, color }: { label: string; background: string; color: string }) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        ...sans,
        background,
        color,
        fontSize: 9,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 999,
        letterSpacing: 0,
        textTransform: 'none',
      }}
    >
      {label}
    </span>
  );
}

function DistributorCard({
  d,
  primary,
  onPick,
}: {
  d: ChefDistributorSummary;
  primary: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full text-left bg-white rounded-lg p-3.5 transition-shadow hover:shadow-sm"
      style={{
        border: `${primary ? '1.5px' : '1px'} solid ${primary ? C.charcoal : C.softLine}`,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div
          className="min-w-0"
          style={{ ...sans, fontSize: 14, fontWeight: 500, color: C.charcoal, lineHeight: 1.35 }}
        >
          {d.name}
        </div>
        {primary && (
          <span
            className="shrink-0 inline-flex items-center"
            style={{
              ...sans,
              background: C.charcoal,
              color: '#fff',
              fontSize: 9,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 999,
              letterSpacing: 0,
              textTransform: 'none',
            }}
          >
            Your rep
          </span>
        )}
      </div>
    </button>
  );
}

function LoadingRow() {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 py-8">
      <div
        className="w-8 h-8 rounded-full border-4"
        style={{ borderColor: C.softLine, borderTopColor: C.orange, animation: 'spin 1s linear infinite' }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="mt-8 text-center">
      <div style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal }}>
        Couldn't load your distributors.
      </div>
      <p
        className="mt-2"
        style={{ ...sans, fontSize: 13, color: C.gray700, lineHeight: 1.55 }}
      >
        {message || 'Try again in a moment, or ask your rep for the right link.'}
      </p>
    </div>
  );
}
