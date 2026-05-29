// ChefDistributorsTab — mobile Distributors tab.
//
// V2 W4 live-data wiring: replaces hardcoded YOUR_DISTRIBUTORS + AREA_DISTRIBUTORS
// with GET /api/v1/chef/distributors. Row clicks navigate to /chef/distributor/:id.
//
// Original port notes (Desi V2 handoff, 2026-05-19):
//   • PhoneShell / MobileTopBar — prototype-only chrome; not mounted here.
//   • CSS vars (--qm-*) → inline styles using FE color constants.
//   • UseDistributorForQuoteModal: wired for area distributor rows (B3).

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, ArrowRight, Upload, RefreshCw } from 'lucide-react';
import { CatalogStatusBadge } from './CatalogStatusBadge';
import { UseDistributorForQuoteModal } from './UseDistributorForQuoteModal';
import type { DistributorForModal } from './UseDistributorForQuoteModal';
import { getChefDistributors, type ChefDistributorSummary } from '../../services/api';

// ─── Color constants (matches ChefDashboardPage.tsx convention) ───────────────
const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
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

  // Modal state for "Use for a quote" on area distributor rows.
  // Area distributors are not yet returned by the live API; modal wired for future use.
  const [modalDist, setModalDist] = useState<DistributorForModal | null>(null);

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

  useEffect(() => {
    load();
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

          {loadState === 'ready' && yourDistributors.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => navigate(`/chef/distributor/${d.id}`)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                ...divider,
              }}
            >
              <div style={{ padding: '14px 0' }}>
                {/* Title row: distributor name + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div style={{ ...serif, fontSize: 15, fontWeight: 500, color: C.charcoal, lineHeight: 1.3 }}>
                      {d.name}
                    </div>
                  </div>
                  <CatalogStatusBadge status={d.status as 'connected' | 'uploaded'} />
                </div>
              </div>
            </button>
          ))}
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
            <div key={d.id} style={{ ...divider, padding: '12px 0' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div style={{ ...sans, fontSize: 13.5, color: C.charcoal, lineHeight: 1.3 }}>
                    {d.name}
                  </div>
                </div>
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
