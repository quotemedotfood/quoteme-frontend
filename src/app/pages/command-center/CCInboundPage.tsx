// CCInboundPage — Inbound routing table. Surface 1 admin view.
//
// Every inbound lead (opportunities + quotes) in one feed.
// Admin picks the rep for each row via the Forward To dropdown.
// 409 "rep owns it" guard shows inline next to the row.
//
// Mounted at: /distributor-admin/command-center/inbound (inside CCLayout).
//
// BE contracts:
//   GET  /api/v1/distributor_admin/command_center/inbound          → InboundRow[]
//   GET  /api/v1/distributor_admin/reps                             → DistributorRep[]
//   POST /api/v1/distributor_admin/inbound_opportunities/:id/assign → InboundRow (+ 409)
//   PATCH /api/v1/distributor_admin/quotes/:id/assign               → { ok: boolean }

import React, { useCallback, useEffect, useState } from 'react';
import {
  CCSectionHead,
  AttentionRule,
  SoftRule,
  sans,
  tabular,
  C,
} from '../../components/distributor-admin/command-center/cc-atoms';
import { RoutingTable } from '../../components/distributor-admin/command-center/RoutingTable';
import {
  getCommandCenterInbound,
  getDistributorAdminReps,
  assignInboundOpportunity,
  assignQuote,
  type InboundRow,
  type DistributorRep,
} from '../../services/api';

// ── CCInboundPage ─────────────────────────────────────────────────────────────

export function CCInboundPage() {
  const [rows, setRows] = useState<InboundRow[]>([]);
  const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorByRowId, setErrorByRowId] = useState<Record<string, string>>({});

  // Simple mobile detection — mirrors CCAssignPage / CCQuotesPage pattern
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 1024);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Fetch on mount ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [inboundRes, repsRes] = await Promise.all([
        getCommandCenterInbound(),
        getDistributorAdminReps(),
      ]);

      if (cancelled) return;

      if (inboundRes.error) {
        setError(inboundRes.error);
        setLoading(false);
        return;
      }

      setRows(inboundRes.data ?? []);

      // Map DistributorRep to { id, name } using user_id as the rep id that
      // the assign endpoints expect (assignInboundOpportunity + assignQuote
      // both receive rep_id = user_id, not the rep_profile id).
      if (repsRes.data) {
        const mapped = repsRes.data
          .filter((r: DistributorRep) => r.is_active && r.user_id)
          .map((r: DistributorRep) => ({
            id: r.user_id as string,
            name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email,
          }));
        setReps(mapped);
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── onForward — dispatch by row.kind ──
  const handleForward = useCallback(
    async (row: InboundRow, repId: string) => {
      // Clear any prior error for this row
      setErrorByRowId((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });

      let res;
      if (row.kind === 'opportunity') {
        res = await assignInboundOpportunity(row.id, repId);
      } else {
        // kind === 'quote'
        res = await assignQuote(row.id, repId);
      }

      if (res.error) {
        // Surface the error inline next to the row (includes 409 guard)
        setErrorByRowId((prev) => ({ ...prev, [row.id]: res.error! }));
        return;
      }

      // Optimistically update the row's assigned_rep from the response or from
      // the rep list so the dropdown reflects the new assignment immediately.
      const rep = reps.find((r) => r.id === repId);
      const updatedAssignedRep = rep ? { id: rep.id, name: rep.name } : null;

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id && r.kind === row.kind
            ? { ...r, assigned_rep: updatedAssignedRep }
            : r
        )
      );
    },
    [reps]
  );

  return (
    <div>
      <CCSectionHead
        eyebrow="INBOUND"
        title={isMobile ? 'Inbound.' : 'Inbound — route each lead.'}
        sub={
          isMobile
            ? undefined
            : 'New leads and open quotes waiting for a rep. Pick the right owner for each one.'
        }
      />

      <div style={{ marginTop: 24 }}>
        {/* Count + assignability summary */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <span
              style={{
                ...sans,
                fontSize: 10,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: C.gray700,
                fontWeight: 600,
              }}
            >
              WAITING TO BE ROUTED
            </span>
            {/* Assignability breakdown — unassigned vs already owned */}
            {!loading && rows.length > 0 && (() => {
              const unassigned = rows.filter((r) => !r.assigned_rep).length;
              const assigned = rows.length - unassigned;
              return (
                <div
                  style={{
                    ...sans,
                    fontSize: 11.5,
                    color: C.gray500,
                    marginTop: 4,
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  {unassigned > 0 && (
                    <span style={{ color: '#92400E', fontWeight: 500 }}>
                      {unassigned} need{unassigned === 1 ? 's' : ''} an owner
                    </span>
                  )}
                  {assigned > 0 && (
                    <span>
                      {assigned} already assigned
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          <span style={{ ...sans, ...tabular, fontSize: 11, color: C.gray400, paddingTop: 2 }}>
            {loading ? '—' : rows.length}
          </span>
        </div>

        <AttentionRule />

        {/* Content */}
        {error ? (
          <div
            style={{
              ...sans,
              padding: '48px 0',
              textAlign: 'center',
              fontSize: 13,
              color: C.gray500,
            }}
          >
            {error}
          </div>
        ) : !loading && rows.length === 0 ? (
          <div
            style={{
              ...sans,
              padding: '48px 0',
              textAlign: 'center',
              fontSize: 13,
              color: C.gray500,
            }}
          >
            No inbound opportunities yet.
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <RoutingTable
              rows={rows}
              reps={reps}
              onForward={handleForward}
              canForward
              loading={loading}
              errorByRowId={errorByRowId}
            />
          </div>
        )}

        {/* Closing note */}
        {!loading && !error && rows.length > 0 && (
          <div
            style={{
              ...sans,
              marginTop: 24,
              fontSize: 12,
              color: C.gray400,
              lineHeight: 1.7,
              fontStyle: 'italic',
            }}
          >
            Every lead routed is one less person waiting to hear from someone.
          </div>
        )}
      </div>
    </div>
  );
}
