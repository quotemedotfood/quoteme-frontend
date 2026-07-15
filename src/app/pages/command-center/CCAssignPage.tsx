// CCAssignPage — Assignment Center. Section 4.
//
// Replaces CCSoonPage at /distributor-admin/command-center/assign.
//
// Purpose: every unassigned quote and ownerless inbound gets a rep.
// Must feel completable: pick a rep via RepTypeahead → row flips to
// assigned confirmation with Undo. Undo reverts to unassigned.
//
// P3+P4: The separate "Assign" button + inline picker have been removed.
// The single assign workflow is now the RepTypeahead control inline on
// each row — consistent with the Inbound Forward-To pattern.
//
// No charts, no scores, no rankings. Reps sorted by open load ascending
// (lightest first) — the copy says so and there is no score column.
//
// BE contract:
//   GET  /api/v1/distributor_admin/command_center/unassigned
//   PATCH /api/v1/distributor_admin/quotes/:id/assign         body: { rep_id }
//   PATCH /api/v1/distributor_admin/restaurants/:id/assign_rep body: { rep_id }

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { FileText, RotateCcw, Check } from 'lucide-react';
import {
  CCSectionHead,
  AttentionRule,
  SoftRule,
  sans,
  serif,
  tabular,
  C,
  CC_ACK_NAVY,
} from '../../components/distributor-admin/command-center/cc-atoms';
import { RepTypeahead } from '../../components/distributor-admin/command-center/RepTypeahead';
import {
  getCommandCenterUnassigned,
  assignQuote,
  assignRestaurantRep,
  type CCUnassignedItem,
  type CCUnassignedRep,
} from '../../services/api';
import { stripSeedPrefix } from '../../utils/format';

// ── Row-level state ───────────────────────────────────────────────────────────

interface RowState {
  assignedRepId: string | null;
  error: string | null;
  saving: boolean;
}

// ── Assign-control visibility (B-188 / B-188b) ───────────────────────────────
//
// `reps` here comes straight from GET .../command_center/unassigned, and the
// BE already scopes that query to `rep_profiles.is_active = true`
// (see command_center_controller.rb#unassigned) — inactive reps are never
// included in the payload at all. So `reps.length === 0` already means
// "zero ACTIVE reps" (whether that's because the distributor has no reps yet,
// or because every rep on file happens to be inactive) — there is no separate
// "reps exist but are all inactive" state reachable on the FE. CCUnassignedRep
// intentionally has no active/status field for this reason; if the BE contract
// ever starts returning inactive reps in this array, this resolver is the one
// place that needs updating (and CCUnassignedRep would need the extra field).
//
// This resolver mirrors that contract explicitly so the zero-active-reps
// empty state (self-assign + invite link, never a dead typeahead) is a single
// tested decision rather than three independent JSX conditions that could
// drift apart.
export interface AssignRowControls {
  showTypeahead: boolean;
  showTakeThis: boolean; // quote rows only — restaurant assign_rep has no self-assign yet
  showAddRep: boolean;
}

export function resolveAssignRowControls(
  kind: 'quote' | 'relationship',
  repsCount: number
): AssignRowControls {
  return {
    showTypeahead: repsCount > 0,
    showTakeThis: kind === 'quote',
    showAddRep: repsCount === 0,
  };
}

// ── Assign row ────────────────────────────────────────────────────────────────

function AssignRow({
  row,
  reps,
}: {
  row: CCUnassignedItem;
  reps: CCUnassignedRep[];
}) {
  const [state, setState] = useState<RowState>({
    assignedRepId: null,
    error: null,
    saving: false,
  });

  const navigate = useNavigate();

  // B-186 — open the underlying quote (rep flow accepts distributor admins).
  // P0: old triage view (/rep/quotes/:id) deleted — route into the canonical
  // quote-build flow instead (MapIngredientsPage loads the existing quote).
  const openQuote = () => {
    if (row.kind === 'quote') navigate('/map-ingredients', { state: { quoteId: row.id } });
  };

  const assignedRep = state.assignedRepId
    ? reps.find((r) => r.id === state.assignedRepId) ?? null
    : null;

  async function handlePick(repId: string) {
    // Optimistic: flip to assigned immediately
    setState((s) => ({ ...s, assignedRepId: repId, saving: true, error: null }));
    const rep = reps.find((r) => r.id === repId);

    try {
      const res =
        row.kind === 'quote'
          ? await assignQuote(row.id, repId)
          : await assignRestaurantRep(row.id, repId);

      if (res.error) {
        // Revert optimistic update on failure
        setState((s) => ({
          ...s,
          assignedRepId: null,
          saving: false,
          error: res.error ?? 'Could not assign. Try again.',
        }));
      } else {
        setState((s) => ({ ...s, saving: false, error: null }));
      }
    } catch {
      setState((s) => ({
        ...s,
        assignedRepId: null,
        saving: false,
        error: 'Network error. Try again.',
      }));
    }
  }

  async function handleUndo() {
    // Optimistic: return to unassigned
    const prevRepId = state.assignedRepId;
    setState((s) => ({ ...s, assignedRepId: null, saving: true, error: null }));

    try {
      const res =
        row.kind === 'quote'
          ? await assignQuote(row.id, null)
          : await assignRestaurantRep(row.id, null);

      if (res.error) {
        // Revert: put the rep back
        setState((s) => ({
          ...s,
          assignedRepId: prevRepId,
          saving: false,
          error: res.error ?? 'Could not undo. Try again.',
        }));
      } else {
        setState((s) => ({ ...s, saving: false, error: null }));
      }
    } catch {
      setState((s) => ({
        ...s,
        assignedRepId: prevRepId,
        saving: false,
        error: 'Network error. Try again.',
      }));
    }
  }

  // ── Assigned confirmation state ──
  if (state.assignedRepId) {
    const repName = state.assignedRepId === 'self' ? 'you' : (assignedRep?.name ?? 'your rep');
    const contextLabel =
      row.kind === 'quote' && row.q_label
        ? stripSeedPrefix(row.q_label)
        : row.restaurant;

    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 0',
            background: C.warmPaper,
            borderRadius: 4,
            paddingLeft: 10,
            paddingRight: 10,
            opacity: state.saving ? 0.6 : 1,
            transition: 'opacity 150ms',
          }}
        >
          <Check size={16} color={CC_ACK_NAVY} strokeWidth={2} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                ...serif,
                fontSize: 14.5,
                fontWeight: 500,
                color: C.charcoal,
                lineHeight: 1.3,
              }}
            >
              {row.restaurant || '—'}
            </div>
            <div
              style={{
                ...sans,
                fontSize: 12,
                color: C.gray500,
                lineHeight: 1.4,
                marginTop: 1,
              }}
            >
              Now with{' '}
              <span style={{ color: C.charcoal }}>{repName}</span>
              {' · '}
              {contextLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={handleUndo}
            disabled={state.saving}
            style={{
              ...sans,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              color: C.gray500,
              background: 'none',
              border: 'none',
              cursor: state.saving ? 'default' : 'pointer',
              padding: '4px 0',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!state.saving)
                (e.currentTarget as HTMLButtonElement).style.color = C.gray700;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = C.gray500;
            }}
          >
            <RotateCcw size={12} color="currentColor" strokeWidth={1.8} />
            Undo
          </button>
        </div>
        {state.error && (
          <div
            style={{ ...sans, fontSize: 11.5, color: '#C0392B', marginTop: 4, paddingLeft: 10 }}
          >
            {state.error}
          </div>
        )}
        <SoftRule />
      </div>
    );
  }

  // ── Unassigned row ──
  // B-107: row.city can be null from the BE even though the type says string.
  // Template literals coerce null → "null"; guard with ?? to show "—" instead.
  const safeCity = (row.city as string | null) ?? '—';
  const metaLine =
    row.kind === 'quote'
      ? safeCity
      : row.age ?? safeCity;

  const contextLabel =
    row.kind === 'quote' && row.q_label
      ? stripSeedPrefix(row.q_label)
      : row.kind === 'relationship' && row.age
      ? row.age
      : null;

  const rowControls = resolveAssignRowControls(row.kind, reps.length);

  return (
    <div>
      <div style={{ padding: '14px 0' }}>
        {/* Row: icon + restaurant info + RepTypeahead inline assign */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <FileText
            size={16}
            color={C.gray500}
            strokeWidth={1.6}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          {/* B-186 — clicking the quote info opens the quote in the rep flow. */}
          <div
            style={{ flex: 1, minWidth: 0, cursor: row.kind === 'quote' ? 'pointer' : 'default' }}
            onClick={row.kind === 'quote' ? openQuote : undefined}
            role={row.kind === 'quote' ? 'button' : undefined}
            title={row.kind === 'quote' ? 'Open this quote' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  ...serif,
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: C.charcoal,
                  lineHeight: 1.3,
                }}
              >
                {row.restaurant || '—'}
              </span>
              {contextLabel && (
                <span
                  style={{
                    ...sans,
                    ...tabular,
                    fontSize: 11,
                    color: C.gray400,
                  }}
                >
                  {contextLabel}
                  {row.kind === 'quote' && row.items != null ? ` · ${row.items} ${row.items === 1 ? 'item' : 'items'}` : ''}
                </span>
              )}
            </div>
            <div
              style={{
                ...sans,
                fontSize: 12,
                color: C.gray500,
                lineHeight: 1.4,
                marginTop: 2,
              }}
            >
              {metaLine}
            </div>
          </div>
          {/* Assign control. B-188/B-188b: with zero ACTIVE reps (none on file,
              or every rep on file is inactive — `reps` is already BE-filtered
              to active-only, see resolveAssignRowControls above) the typeahead
              is a dead end — offer "Take this one" (self-assign, quote rows
              only) + "+ Add a rep" instead. B-187: the admin can take any
              quote himself even when reps exist. */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            {rowControls.showTypeahead && (
              <RepTypeahead
                reps={reps}
                value={undefined}
                onSelect={handlePick}
                placeholder="Assign rep…"
                disabled={state.saving}
              />
            )}
            {rowControls.showTakeThis && (
              <button
                onClick={() => handlePick('self')}
                disabled={state.saving}
                style={{
                  ...sans,
                  fontSize: 12,
                  fontWeight: 500,
                  color: CC_ACK_NAVY,
                  background: 'transparent',
                  border: `1px solid ${CC_ACK_NAVY}`,
                  borderRadius: 6,
                  padding: '6px 12px',
                  cursor: state.saving ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Take this one
              </button>
            )}
            {rowControls.showAddRep && (
              <a
                href="/distributor-admin/invite"
                style={{ ...sans, fontSize: 12, color: C.gray500, textDecoration: 'underline', whiteSpace: 'nowrap' }}
              >
                + Add a rep
              </a>
            )}
          </div>
        </div>

        {state.error && (
          <div
            style={{ ...sans, fontSize: 11.5, color: '#C0392B', marginTop: 6, paddingLeft: 28 }}
          >
            {state.error}
          </div>
        )}
      </div>
      <SoftRule />
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '14px 0',
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            background: '#E5E7EB',
            borderRadius: 3,
            flexShrink: 0,
            marginTop: 2,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: 14,
              width: 200,
              background: '#E5E7EB',
              borderRadius: 4,
              marginBottom: 6,
            }}
          />
          <div
            style={{
              height: 11,
              width: 140,
              background: '#E5E7EB',
              borderRadius: 4,
            }}
          />
        </div>
        <div
          style={{
            width: 70,
            height: 32,
            background: '#E5E7EB',
            borderRadius: 6,
            flexShrink: 0,
          }}
        />
      </div>
      <SoftRule />
    </div>
  );
}

// ── CCAssignPage ──────────────────────────────────────────────────────────────

export function CCAssignPage() {
  const [items, setItems] = useState<CCUnassignedItem[]>([]);
  const [reps, setReps] = useState<CCUnassignedRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCommandCenterUnassigned().then((res) => {
      if (cancelled) return;
      if (res.data) {
        setItems(res.data.items);
        // Reps already sorted ascending by open from the endpoint — preserve order
        setReps(res.data.reps);
      } else {
        setError(res.error ?? 'Could not load assignments.');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <CCSectionHead
        eyebrow="ASSIGNMENTS"
        title="Unassigned — pick an owner."
        sub="Inbound interest and quotes nobody's holding yet. Hand each one to a rep. Loads are shown so you can spread the work — never a ranking."
      />

      <div style={{ marginTop: 24 }}>
        {/* WAITING ON YOU count line */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
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
            WAITING ON YOU
          </span>
          <span style={{ ...sans, ...tabular, fontSize: 11, color: C.gray400 }}>
            {loading ? '—' : items.length}
          </span>
        </div>

        <AttentionRule />

        {/* Row list */}
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </>
        ) : error ? (
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
        ) : items.length === 0 ? (
          <div
            style={{
              ...sans,
              padding: '48px 0',
              textAlign: 'center',
              fontSize: 13,
              color: C.gray500,
            }}
          >
            No unassigned items right now.
          </div>
        ) : (
          items.map((item) => (
            <AssignRow
              key={`${item.kind}-${item.id}`}
              row={item}
              reps={reps}
            />
          ))
        )}

        {/* Closing serif-italic line */}
        {!loading && !error && (
          <div
            style={{
              ...serif,
              marginTop: 24,
              fontSize: 12,
              color: C.gray400,
              lineHeight: 1.7,
              fontStyle: 'italic',
            }}
          >
            When this list is empty, every lead and quote has someone's name on it.
          </div>
        )}
      </div>
    </div>
  );
}
