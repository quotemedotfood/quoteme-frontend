// ChefStackPage — /chef/stack
//
// Free "My Stack" manage view: pin/unpin distributors, per-location roster.
//
// This is distinct from ChefMenuStackPage (/chef/menus/:menuId/stack) which
// is the per-menu compare-spread table. That route is untouched.
//
// BE API (api.ts):
//   GET  /api/v1/chef/stack           → getChefStack()
//   POST /api/v1/chef/stack           → createChefStack()
//   POST /api/v1/chef/stack/pins      → addChefStackPin()
//   DELETE /api/v1/chef/stack/pins/:id → removeChefStackPin()
//
// Empty state (no stack yet): auto-creates the stack on first render
// so the chef can immediately pin distributors.
//
// Hard rules:
//   • NO gradient colors
//   • NO "Customer" word
//   • NO paywall / counter gate
//   • createPortal from 'react-dom' if used (not 'react')

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Layers, Trash2, Plus, AlertCircle, Loader2 } from 'lucide-react';
import {
  getChefStack,
  createChefStack,
  removeChefStackPin,
  type ChefStackResponse,
  type ChefStackPin,
} from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  charcoal:  '#2B2B2B',
  orange:    '#F2993D',
  orangeHover: '#E08A2E',
  warmPaper: '#FBFAF7',
  softLine:  '#E8E8E8',
  gray700:   '#4F4F4F',
  gray500:   '#6B7280',
  gray400:   '#9CA3AF',
  errorRed:  '#DC2626',
  errorBg:   '#FEF2F2',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'ready' | 'error';

export function ChefStackPage() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [stack, setStack] = useState<ChefStackResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  // Track which pin IDs are mid-delete so we can show per-row loading
  const [deletingPins, setDeletingPins] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string>('');

  const loadStack = useCallback(async () => {
    setPageState('loading');
    setErrorMsg('');

    const res = await getChefStack();

    if (res.error && res.status !== 404) {
      // Real error (auth failure, server error, etc.)
      setErrorMsg(res.error);
      setPageState('error');
      return;
    }

    if (res.data) {
      setStack(res.data);
      setPageState('ready');
      return;
    }

    // stack is null (BE returned { stack: null }) — auto-create so the
    // chef lands straight into the manage view without an extra click.
    const createRes = await createChefStack();
    if (createRes.data) {
      setStack(createRes.data);
      setPageState('ready');
    } else if (createRes.status === 409) {
      // Race: stack already exists, re-fetch.
      const refetch = await getChefStack();
      if (refetch.data) {
        setStack(refetch.data);
        setPageState('ready');
      } else {
        setErrorMsg(refetch.error || 'Could not load your Stack');
        setPageState('error');
      }
    } else {
      // No restaurant/location set up yet — show empty state rather than hard error.
      setStack(null);
      setPageState('ready');
    }
  }, []);

  useEffect(() => {
    loadStack();
  }, [loadStack]);

  const handleUnpin = async (pin: ChefStackPin) => {
    if (!stack) return;
    setDeleteError('');
    setDeletingPins((prev) => new Set(prev).add(pin.id));

    const res = await removeChefStackPin(pin.id);

    setDeletingPins((prev) => {
      const next = new Set(prev);
      next.delete(pin.id);
      return next;
    });

    if (res.error) {
      setDeleteError(`Could not remove ${pin.distributor_name}: ${res.error}`);
      return;
    }

    // Optimistic update: remove from local state
    setStack((prev) =>
      prev ? { ...prev, pins: prev.pins.filter((p) => p.id !== pin.id) } : prev
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-10" style={{ textAlign: 'center' }}>
        <Loader2
          size={28}
          strokeWidth={1.6}
          style={{ color: C.gray400, animation: 'spin 1s linear infinite', display: 'inline-block' }}
          aria-label="Loading"
        />
        <p style={{ ...sans, fontSize: 13, color: C.gray500, marginTop: 12 }}>Loading your Stack…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-10">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            background: C.errorBg,
            borderRadius: 8,
            border: `1px solid ${C.errorRed}22`,
          }}
        >
          <AlertCircle size={18} strokeWidth={1.6} style={{ color: C.errorRed, flexShrink: 0 }} />
          <span style={{ ...sans, fontSize: 14, color: C.errorRed }}>{errorMsg}</span>
        </div>
        <button
          type="button"
          onClick={loadStack}
          style={{
            ...sans,
            marginTop: 16,
            fontSize: 13,
            color: C.orange,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const pins = stack?.pins ?? [];

  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-12">
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Layers size={22} strokeWidth={1.6} style={{ color: C.charcoal, flexShrink: 0 }} />
          <h1 style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.charcoal, lineHeight: 1.15 }}>
            My Stack
          </h1>
        </div>
        <p style={{ ...sans, fontSize: 13, color: C.gray500, lineHeight: 1.6 }}>
          The distributors you order from. Pin them here to compare pricing across menus.
        </p>
      </div>

      {/* Inline delete error */}
      {deleteError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 14px',
            marginBottom: 16,
            background: C.errorBg,
            borderRadius: 8,
            border: `1px solid ${C.errorRed}22`,
          }}
        >
          <AlertCircle size={16} strokeWidth={1.6} style={{ color: C.errorRed, flexShrink: 0 }} />
          <span style={{ ...sans, fontSize: 13, color: C.errorRed }}>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: C.gray500, padding: 0, fontSize: 18, lineHeight: 1 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Pin list or empty state */}
      {pins.length === 0 ? (
        <EmptyState onAddDistributor={() => navigate('/chef/distributor/new')} />
      ) : (
        <PinList
          pins={pins}
          deletingPins={deletingPins}
          onUnpin={handleUnpin}
          onAddDistributor={() => navigate('/chef/distributor/new')}
        />
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAddDistributor }: { onAddDistributor: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        background: C.warmPaper,
        borderRadius: 12,
        border: `1px solid ${C.softLine}`,
      }}
    >
      <Layers
        size={36}
        strokeWidth={1.4}
        style={{ color: C.gray400, marginBottom: 16 }}
        aria-hidden="true"
      />
      <h2
        style={{
          ...serif,
          fontSize: 20,
          fontWeight: 600,
          color: C.charcoal,
          marginBottom: 8,
          lineHeight: 1.3,
        }}
      >
        Get a quote from a distributor
      </h2>
      <p
        style={{
          ...sans,
          fontSize: 13,
          color: C.gray700,
          lineHeight: 1.65,
          maxWidth: 300,
          marginBottom: 24,
        }}
      >
        Start a quote to see pricing — pinned distributors will appear here so you can compare across menus.
      </p>
      <button
        type="button"
        onClick={onAddDistributor}
        style={{
          ...sans,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '11px 20px',
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          background: C.orange,
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.orangeHover; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.orange; }}
      >
        <Plus size={15} strokeWidth={2} color="#fff" />
        Browse distributors
      </button>
    </div>
  );
}

// ─── Pin list ─────────────────────────────────────────────────────────────────

function PinList({
  pins,
  deletingPins,
  onUnpin,
  onAddDistributor,
}: {
  pins: ChefStackPin[];
  deletingPins: Set<string>;
  onUnpin: (pin: ChefStackPin) => void;
  onAddDistributor: () => void;
}) {
  return (
    <div>
      {/* Pinned distributors */}
      <div
        style={{
          border: `1px solid ${C.softLine}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {pins.map((pin, idx) => (
          <PinRow
            key={pin.id}
            pin={pin}
            isFirst={idx === 0}
            isDeleting={deletingPins.has(pin.id)}
            onUnpin={onUnpin}
          />
        ))}
      </div>

      {/* Add another distributor */}
      <button
        type="button"
        onClick={onAddDistributor}
        style={{
          ...sans,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          marginTop: 20,
          padding: '9px 16px',
          fontSize: 13,
          fontWeight: 500,
          color: C.orange,
          background: 'transparent',
          border: `1.5px solid ${C.orange}`,
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'background 120ms ease, color 120ms ease',
        }}
        onMouseEnter={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.background = C.orange;
          btn.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.background = 'transparent';
          btn.style.color = C.orange;
        }}
      >
        <Plus size={14} strokeWidth={2} />
        Add distributor
      </button>
    </div>
  );
}

// ─── Single pin row ───────────────────────────────────────────────────────────

function PinRow({
  pin,
  isFirst,
  isDeleting,
  onUnpin,
}: {
  pin: ChefStackPin;
  isFirst: boolean;
  isDeleting: boolean;
  onUnpin: (pin: ChefStackPin) => void;
}) {
  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderTop: isFirst ? 'none' : `1px solid ${C.softLine}`,
        background: isDeleting ? '#F9FAFB' : '#fff',
        opacity: isDeleting ? 0.6 : 1,
        transition: 'opacity 150ms ease, background 150ms ease',
      }}
    >
      {/* Distributor info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...sans,
            fontSize: 14,
            fontWeight: 500,
            color: C.charcoal,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {pin.distributor_name}
        </div>
        {pin.chef_label && (
          <div style={{ ...sans, fontSize: 11.5, color: C.gray500, marginTop: 1 }}>
            {pin.chef_label}
          </div>
        )}
        {pin.pinned_at && (
          <div style={{ ...sans, fontSize: 11, color: C.gray400, marginTop: 1 }}>
            Pinned {formatDate(pin.pinned_at)}
          </div>
        )}
      </div>

      {/* Unpin button */}
      <button
        type="button"
        onClick={() => !isDeleting && onUnpin(pin)}
        disabled={isDeleting}
        aria-label={`Remove ${pin.distributor_name} from Stack`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          background: 'none',
          border: 'none',
          borderRadius: 6,
          cursor: isDeleting ? 'not-allowed' : 'pointer',
          color: C.gray400,
          flexShrink: 0,
          transition: 'color 120ms ease, background 120ms ease',
        }}
        onMouseEnter={(e) => {
          if (!isDeleting) {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.color = C.errorRed;
            btn.style.background = '#FEF2F2';
          }
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.color = C.gray400;
          btn.style.background = 'none';
        }}
      >
        {isDeleting ? (
          <Loader2
            size={16}
            strokeWidth={1.8}
            style={{ animation: 'spin 1s linear infinite' }}
            aria-hidden="true"
          />
        ) : (
          <Trash2 size={16} strokeWidth={1.6} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
