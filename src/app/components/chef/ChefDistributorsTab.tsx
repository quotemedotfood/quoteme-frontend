// ChefDistributorsTab — mobile Distributors tab.
//
// V2 W4 live-data wiring: replaces hardcoded YOUR_DISTRIBUTORS + AREA_DISTRIBUTORS
// with GET /api/v1/chef/distributors. Row clicks navigate to /chef/distributor/:id.
//
// SU-FE-1 (Wave 3 · Secure Rep-Catalog Upload):
//   Connected distributors with catalog_state ∈ {no_catalog, provisional,
//   needs_confirmation} show a RequestCatalogCallout (one Sacred Orange per tab).
//   Tapping "Ask {rep}" fires POST /api/v1/chef/catalog_upload_links, then
//   flips to RequestCatalogAsked + DropStatusStepper at "requested".
//
//   NOTE: The BE serialize_distributor (index action) currently returns only
//   {id, name, status}. Extending it to include {catalog_state, drop_status,
//   rep_first, catalog_held_from} is a companion BE task. Until that ships,
//   the callout is invisible (catalog_state is undefined → no-render); the
//   ChefDistributorDetailPage already has a "Request fresh catalog" button as
//   a fallback for the current state.
//
// Original port notes (Desi V2 handoff, 2026-05-19):
//   • PhoneShell / MobileTopBar — prototype-only chrome; not mounted here.
//   • CSS vars (--qm-*) → inline styles using FE color constants.
//   • UseDistributorForQuoteModal: wired for area distributor rows (B3).

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, ArrowRight, Upload, RefreshCw } from 'lucide-react';
import { CatalogStatusBadge } from './CatalogStatusBadge';
import { UseDistributorForQuoteModal } from './UseDistributorForQuoteModal';
import { PinToStackButton } from './PinToStackButton';
import { RequestCatalogCallout } from './RequestCatalogCallout';
import { RequestCatalogAsked } from './RequestCatalogAsked';
import type { DropStatusKey } from './DropStatusStepper';
import type { DistributorForModal } from './UseDistributorForQuoteModal';
import {
  getChefDistributors,
  getChefStack,
  requestCatalogUploadLink,
  type ChefDistributorSummary,
  type ChefStackResponse,
} from '../../services/api';

// ─── Color constants (matches ChefDashboardPage.tsx convention) ───────────────
const C = {
  charcoal: '#2B2B2B',
  orange: '#F2993D',
  hoverBlue: '#7FAEC2',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  warning: '#D97706',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const eyebrow: React.CSSProperties = {
  ...sans,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: C.gray500,
};

const dividerThick: React.CSSProperties = {
  borderTop: `2px solid ${C.charcoal}`,
  marginTop: 4,
};

const divider: React.CSSProperties = {
  borderBottom: `1px solid ${C.softLine}`,
};

export interface ChefDistributorsTabProps {
  /** Navigation callback — receives prototype target string e.g. "entry", "catalog-upload" */
  nav?: (target: string) => void;
}

export function ChefDistributorsTab({
  nav = () => {},
}: ChefDistributorsTabProps) {
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [distributors, setDistributors] = useState<ChefDistributorSummary[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Stack data for pin affordance. null = loading; undefined = no stack yet.
  const [stackData, setStackData] = useState<ChefStackResponse | null | undefined>(null);

  // Modal state for "Use for a quote" on area distributor rows.
  // Area distributors are not yet returned by the live API; modal wired for future use.
  const [modalDist, setModalDist] = useState<DistributorForModal | null>(null);

  // SU-FE-1: per-distributor ask state map.
  // Key = distributor id. Value = { loading, asked, dropStatus } once the chef taps.
  // Seeded from drop_status returned by GET /api/v1/chef/distributors (when the BE
  // exposes that field); otherwise starts undefined (no callout rendered).
  const [askMap, setAskMap] = useState<
    Record<string, { loading: boolean; asked: boolean; dropStatus: DropStatusKey }>
  >({});

  const loadStack = useCallback(() => {
    getChefStack().then((res) => {
      // null data + no error means the chef has no stack yet.
      setStackData(res.data ?? undefined);
    });
  }, []);

  const load = () => {
    setLoadState('loading');
    setErrorMsg('');
    getChefDistributors().then((res) => {
      if (res.data) {
        setDistributors(res.data.distributors);
        setLoadState('ready');
      } else {
        setErrorMsg(res.error || 'Could not load distributors.');
        setLoadState('error');
      }
    });
  };

  // SU-FE-1: initialise askMap from drop_status once distributors load.
  useEffect(() => {
    if (distributors.length === 0) return;
    setAskMap((prev) => {
      const next = { ...prev };
      for (const d of distributors) {
        if (d.drop_status && !next[d.id]) {
          next[d.id] = {
            loading: false,
            asked: true,
            dropStatus: d.drop_status as DropStatusKey,
          };
        }
      }
      return next;
    });
  }, [distributors]);

  // SU-FE-1: fires POST /api/v1/chef/catalog_upload_links for the given distributor.
  async function handleAskForCatalog(distributorId: string) {
    setAskMap((prev) => ({
      ...prev,
      [distributorId]: { loading: true, asked: false, dropStatus: 'requested' },
    }));
    const res = await requestCatalogUploadLink(distributorId);
    if (res.error || !res.data) {
      // On error revert so the chef can retry.
      setAskMap((prev) => {
        const next = { ...prev };
        delete next[distributorId];
        return next;
      });
    } else {
      setAskMap((prev) => ({
        ...prev,
        [distributorId]: { loading: false, asked: true, dropStatus: 'requested' },
      }));
    }
  }

  useEffect(() => {
    load();
    loadStack();
  }, []);

  const yourDistributors = distributors;
  // Area distributors not yet returned by GET /api/v1/chef/distributors.
  // Placeholder section preserved for when BE surfaces area data.
  const areaDistributors: ChefDistributorSummary[] = [];

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: '100%', background: '#fff', color: C.charcoal, ...sans }}
    >
      {/* Scrollable body */}
      <div className="flex-1 overflow-auto px-5 pt-5 pb-6">

        {/* Header */}
        <div>
          <div style={{ ...serif, fontSize: 24, fontWeight: 600, lineHeight: 1.15, color: C.charcoal }}>
            Distributors
          </div>
          <p style={{ ...sans, fontSize: 12.5, color: C.gray500, marginTop: 4 }}>
            Who you've quoted with, and who else is servicing your area.
          </p>
        </div>

        {/* ── SECTION 1 · YOUR DISTRIBUTORS ─────────────────────────────────── */}
        <div style={{ marginTop: 24 }}>
          <div className="flex items-baseline justify-between" style={eyebrow}>
            <span>YOUR DISTRIBUTORS</span>
            {loadState === 'ready' && yourDistributors.length > 0 && (
              <span style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400, color: C.gray500 }}>
                {yourDistributors.length}
              </span>
            )}
          </div>
          <div style={dividerThick} />

          {loadState === 'loading' && (
            <div className="flex items-center justify-center py-10">
              <div
                className="w-6 h-6 rounded-full border-4"
                style={{ borderColor: C.softLine, borderTopColor: C.orange, animation: 'spin 1s linear infinite' }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {loadState === 'error' && (
            <div style={{ paddingTop: 16, paddingBottom: 8 }}>
              <div style={{ ...sans, fontSize: 13, color: C.charcoal, lineHeight: 1.4 }}>
                {errorMsg || 'Could not load distributors.'}
              </div>
              <button
                type="button"
                onClick={load}
                className="flex items-center gap-2"
                style={{
                  ...sans,
                  marginTop: 10,
                  padding: '7px 12px',
                  fontSize: 12.5,
                  background: 'transparent',
                  border: `1.5px solid ${C.charcoal}`,
                  borderRadius: 6,
                  color: C.charcoal,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} />
                Try again
              </button>
            </div>
          )}

          {loadState === 'ready' && yourDistributors.length === 0 && (
            <div style={{ paddingTop: 20, paddingBottom: 20 }}>
              <div style={{ ...sans, fontSize: 13, color: C.charcoal, lineHeight: 1.4 }}>
                None yet.
              </div>
              <div style={{ ...sans, fontSize: 12, color: C.gray500, marginTop: 4, lineHeight: 1.4 }}>
                Distributors show up here once you've gotten a quote from one. Ask your rep
                to send one through, or upload a price list to get going.
              </div>
              <button
                type="button"
                onClick={() => navigate('/chef/distributor/new')}
                className="flex items-center gap-2"
                style={{
                  ...sans,
                  marginTop: 12,
                  padding: '8px 14px',
                  fontSize: 12.5,
                  background: 'transparent',
                  border: `1.5px solid ${C.charcoal}`,
                  borderRadius: 6,
                  color: C.charcoal,
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} />
                Add your first distributor
              </button>
            </div>
          )}

          {loadState === 'ready' && yourDistributors.map((d) => {
            // SU-FE-1: determine if this row is catalog-thin (needs the callout).
            // Trigger: catalog_state ∈ {no_catalog, provisional, needs_confirmation}
            // and the distributor is Connected (status === 'connected').
            const catalogThinStates = ['no_catalog', 'provisional', 'needs_confirmation'];
            const isCatalogThin =
              d.status === 'connected' &&
              d.catalog_state != null &&
              catalogThinStates.includes(d.catalog_state);
            const askState = askMap[d.id];

            return (
              <div
                key={d.id}
                style={{ ...divider, paddingBottom: isCatalogThin ? 14 : 0 }}
              >
                {/* Top row: nav button + pin affordance side by side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Nav area — tapping anywhere except the pin button navigates */}
                  <button
                    type="button"
                    onClick={() => navigate(`/chef/distributor/${d.id}`)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'block',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '14px 0',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div style={{ ...serif, fontSize: 15, fontWeight: 500, color: C.charcoal, lineHeight: 1.3 }}>
                          {d.name}
                        </div>
                      </div>
                      <CatalogStatusBadge status={d.status as 'connected' | 'uploaded'} />
                    </div>
                  </button>

                  {/* Pin-to-stack affordance */}
                  <div style={{ flexShrink: 0 }}>
                    <PinToStackButton
                      distributorId={d.id}
                      distributorName={d.name}
                      stackData={stackData}
                      onStackChange={loadStack}
                    />
                  </div>
                </div>

                {/* SU-FE-1: request-catalog callout (catalog-thin Connected rows only) */}
                {isCatalogThin && (
                  askState?.asked ? (
                    <RequestCatalogAsked
                      repFirst={d.rep_first ?? 'your rep'}
                      distributorName={d.name}
                      status={askState.dropStatus}
                    />
                  ) : (
                    <RequestCatalogCallout
                      distributorName={d.name}
                      catalogHeldFrom={d.catalog_held_from}
                      repFirst={d.rep_first ?? 'your rep'}
                      loading={askState?.loading ?? false}
                      onAsk={() => handleAskForCatalog(d.id)}
                    />
                  )
                )}
              </div>
            );
          })}
        </div>

        {/* ── SECTION 2 · AVAILABLE IN YOUR AREA ────────────────────────────── */}
        {/* Area distributors pending BE surfacing on GET /api/v1/chef/distributors */}
        <div style={{ marginTop: 28 }}>
          <div className="flex items-baseline justify-between" style={eyebrow}>
            <span>AVAILABLE IN YOUR AREA</span>
            {areaDistributors.length > 0 && (
              <span style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400, color: C.gray500 }}>
                {areaDistributors.length}
              </span>
            )}
          </div>
          <div style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.4, maxWidth: 320, marginTop: 4 }}>
            Servicing your area with a verified catalog.{' '}
            Order shown by recency of catalog update, not by ranking.
          </div>
          <div style={dividerThick} />

          {areaDistributors.length === 0 && (
            <div style={{ ...sans, paddingTop: 16, fontSize: 12, color: C.gray500, lineHeight: 1.4 }}>
              Area catalog coming soon.
            </div>
          )}

          {areaDistributors.map((d) => (
            <div key={d.id} style={{ ...divider, padding: '12px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="min-w-0 flex-1">
                <div style={{ ...sans, fontSize: 13.5, color: C.charcoal, lineHeight: 1.3 }}>
                  {d.name}
                </div>
              </div>
              {/* Pin-to-stack affordance on area distributor rows */}
              <div style={{ flexShrink: 0 }}>
                <PinToStackButton
                  distributorId={d.id}
                  distributorName={d.name}
                  stackData={stackData}
                  onStackChange={loadStack}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Operational footnote */}
        <div
          className="flex items-start gap-3"
          style={{ marginTop: 28, borderTop: `1px solid ${C.softLine}`, paddingTop: 12, fontSize: 11.5, color: C.gray700 }}
        >
          <MapPin size={14} color={C.hoverBlue} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={sans}>
            Area set by your restaurant address. Update it in Settings to change what shows here.
          </div>
        </div>

        {/* Paid-tier multi-distributor send — Opus c11 lock (May 18) Q1. */}
        <div
          style={{
            marginTop: 20,
            padding: '14px',
            borderRadius: 8,
            background: C.warmPaper,
            border: `1px solid ${C.softLine}`,
          }}
        >
          <div style={{ ...eyebrow, fontSize: 10 }}>WITH PAID</div>
          <div style={{ ...serif, fontSize: 14, fontWeight: 500, color: C.charcoal, marginTop: 4, lineHeight: 1.3 }}>
            Send this menu to another distributor.
          </div>
          <p style={{ ...sans, fontSize: 11.5, color: C.gray700, marginTop: 4, lineHeight: 1.6 }}>
            Request a quote from any distributor servicing your area. Each response
            stays a separate quote thread, attached to its own distributor.
          </p>
          <button
            type="button"
            onClick={() => nav('tab-settings')}
            className="flex items-center gap-1"
            style={{ ...sans, marginTop: 10, fontSize: 11.5, color: C.gray700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            See paid · $50/mo <ArrowRight size={12} style={{ marginLeft: 2 }} />
          </button>
        </div>
      </div>

      {modalDist && (
        <UseDistributorForQuoteModal
          distributor={modalDist}
          onClose={() => setModalDist(null)}
          onContinue={() => { setModalDist(null); nav('entry'); }}
          variant="mobile"
        />
      )}
    </div>
  );
}
