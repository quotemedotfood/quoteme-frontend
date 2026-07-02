// PinToStackButton — pin/unpin a distributor to the chef's stack.
//
// Desi canonical treatment (screens-stack-v2.jsx PinToStackDrawerDemo, lines 974–993):
//   • 32×32 circular button, border: 1px solid --qm-soft-line when not pinned.
//   • Pinned state: border+bg = --qm-charcoal, icon filled charcoal.
//   • Pin icon rotated -18deg. Focus ring: orange glow.
//   • On click:
//     - If chef has 0 stacks: create stack + add pin immediately. No drawer.
//     - If chef has 1+ stacks: open PinToStackDrawer (which stack to add to).
//     - If already pinned: unpin immediately (DELETE pin by id).
//
// Reuses: addChefStackPin, removeChefStackPin, getChefStack, createChefStack
// from ../../services/api.
//
// Usage:
//   <PinToStackButton
//     distributorId={d.id}
//     distributorName={d.name}
//     stackData={stackData}           // null = not yet loaded; load via getChefStack on mount
//     onStackChange={refreshStack}    // called after any pin/unpin to refresh parent state
//   />

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addChefStackPin,
  removeChefStackPin,
  createChefStack,
  type ChefStackResponse,
  type ChefStackPin,
} from '../../services/api';

// ─── Color constants ──────────────────────────────────────────────────────────
const C = {
  charcoal: '#2B2B2B',
  orange: '#F2993D',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─────────────────────────────────────────────────────────────────────────────
// PinIcon — SVG pin, rotated -18deg per Desi spec.
// filled=true → solid charcoal fill (pinned); false → transparent fill (unpinned).
// ─────────────────────────────────────────────────────────────────────────────
function PinIcon({ size = 14, color = C.charcoal, filled = false }: {
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: 'rotate(-18deg)', display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* Lucide-style pin path */}
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17H19V15L17 9V3H7V9L5 15V17Z" />
      <line x1="9" y1="3" x2="15" y2="3" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PinToStackDrawer — right-side drawer: "Which stack to add this distributor to?"
//
// From Desi's screens-stack-v2.jsx PinToStackDrawer (lines 786–927).
// Behavior:
//   • If chef has 0 stacks → this drawer is never opened (caller creates stack + pins directly).
//   • If chef has 1+ stacks → opens asking which stack, or "+ Start a new stack".
//   • Each stack row: click → addChefStackPin(distributorId) + close.
//   • "Start new stack" → createChefStack() + addChefStackPin() + close.
//   • ESC + backdrop click close.
// ─────────────────────────────────────────────────────────────────────────────
interface PinToStackDrawerProps {
  open: boolean;
  onClose: () => void;
  distributorId: string;
  distributorName: string;
  stacks: ChefStackResponse[];
  onPinned: (pin: ChefStackPin) => void;
}

function PinToStackDrawer({
  open,
  onClose,
  distributorId,
  distributorName,
  stacks,
  onPinned,
}: PinToStackDrawerProps) {
  const [newing, setNewing] = useState(false);
  const [newName, setNewName] = useState('');
  const [pinState, setPinState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (!open) {
      setNewing(false);
      setNewName('');
      setPinState('idle');
      setPinError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handlePinToStack(stackId: string) {
    setPinState('loading');
    setPinError('');
    const res = await addChefStackPin(distributorId);
    if (res.error || !res.data) {
      setPinError(res.error ?? 'Could not pin. Try again.');
      setPinState('error');
    } else {
      onPinned(res.data);
      onClose();
    }
  }

  async function handleCreateAndPin() {
    if (pinState === 'loading') return;
    setPinState('loading');
    setPinError('');
    // Create new stack first, then pin.
    const stackRes = await createChefStack();
    if (stackRes.error || !stackRes.data) {
      setPinError(stackRes.error ?? 'Could not create stack.');
      setPinState('error');
      return;
    }
    const pinRes = await addChefStackPin(distributorId);
    if (pinRes.error || !pinRes.data) {
      setPinError(pinRes.error ?? 'Could not pin. Try again.');
      setPinState('error');
      return;
    }
    onPinned(pinRes.data);
    onClose();
  }

  const distShort = distributorName;

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Add ${distShort} to a stack`}
      style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'flex-end' }}
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close drawer"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(43,43,43,.32)',
          border: 'none',
          cursor: 'default',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          width: 'min(480px, 92vw)',
          height: '100%',
          background: '#FFFFFF',
          borderLeft: `1px solid ${C.softLine}`,
          boxShadow: '-20px 0 40px rgba(43,43,43,.10)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'qmPinDrawerIn .22s cubic-bezier(.2,.7,.2,1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            padding: '22px 28px 18px',
            borderBottom: `2px solid ${C.charcoal}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{
              ...sans,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: C.gray500,
            }}>
              Pin To A Stack
            </div>
            <h2 style={{ ...serif, fontSize: 22, fontWeight: 600, color: C.charcoal, marginTop: 4, lineHeight: 1.15 }}>
              Add {distShort} to…
            </h2>
            <p style={{ ...sans, fontSize: 12.5, color: C.gray700, lineHeight: 1.6, marginTop: 6, maxWidth: 380 }}>
              Pick a stack to add this distributor to, or start a new one.
              Stacks are how you group distributors — like playlists.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.charcoal,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 28px 28px' }}>

          {pinError && (
            <div style={{
              ...sans,
              marginBottom: 12,
              padding: '10px 14px',
              borderRadius: 6,
              background: '#FEE2E2',
              color: '#DC2626',
              fontSize: 12.5,
              lineHeight: 1.4,
            }}>
              {pinError}
            </div>
          )}

          <div style={{
            ...sans,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: C.gray500,
          }}>
            Your Stacks
          </div>

          <div style={{ marginTop: 8 }}>
            {stacks.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={pinState === 'loading'}
                onClick={() => handlePinToStack(s.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: `1px solid ${C.softLine}`,
                  background: 'none',
                  border: 'none',
                  borderBottomWidth: 1,
                  borderBottomStyle: 'solid',
                  borderBottomColor: C.softLine,
                  cursor: pinState === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: pinState === 'loading' ? 0.6 : 1,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...serif, fontSize: 14.5, fontWeight: 500, color: C.charcoal, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.name}
                  </div>
                  <div style={{ ...sans, fontSize: 11, color: C.gray500, lineHeight: 1.3, marginTop: 2 }}>
                    {s.pins.length} {s.pins.length === 1 ? 'distributor' : 'distributors'}
                  </div>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: `1px solid ${C.charcoal}`,
                  }}
                  aria-hidden="true"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.charcoal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </button>
            ))}
          </div>

          {/* Start new stack — inline expand */}
          {!newing && (
            <button
              type="button"
              onClick={() => setNewing(true)}
              style={{
                marginTop: 16,
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px',
                borderRadius: 6,
                background: C.warmPaper,
                border: `1px dashed ${C.charcoal}`,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  border: `1px dashed ${C.charcoal}`,
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.charcoal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              <span style={{ ...sans, fontSize: 13.5, color: C.charcoal, lineHeight: 1.3 }}>
                Start a new stack with {distShort}
              </span>
            </button>
          )}

          {newing && (
            <div
              style={{
                marginTop: 16,
                padding: '12px',
                borderRadius: 6,
                background: C.warmPaper,
                border: `1px solid ${C.charcoal}`,
              }}
            >
              <label
                htmlFor="pin_new_stack_name"
                style={{
                  ...sans,
                  display: 'block',
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: C.gray500,
                }}
              >
                New Stack Name
              </label>
              <input
                id="pin_new_stack_name"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Broadliner price comparison"
                onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) handleCreateAndPin(); }}
                style={{
                  ...sans,
                  display: 'block',
                  width: '100%',
                  marginTop: 6,
                  padding: '9px 12px',
                  fontSize: 13.5,
                  border: `1px solid ${C.softLine}`,
                  borderRadius: 6,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ ...sans, marginTop: 4, fontSize: 10.5, color: C.gray500, fontStyle: 'italic', lineHeight: 1.4 }}>
                You can rename a stack any time.
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setNewing(false)}
                  style={{
                    ...sans,
                    padding: '8px 12px',
                    fontSize: 12,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: C.gray700,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newName.trim() || pinState === 'loading'}
                  onClick={handleCreateAndPin}
                  style={{
                    ...sans,
                    padding: '9px 16px',
                    fontSize: 12.5,
                    background: C.orange,
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    cursor: !newName.trim() || pinState === 'loading' ? 'not-allowed' : 'pointer',
                    opacity: !newName.trim() || pinState === 'loading' ? 0.5 : 1,
                    fontWeight: 500,
                  }}
                >
                  {pinState === 'loading' ? 'Creating…' : `Create & Add ${distShort}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes qmPinDrawerIn {
          from { transform: translateX(24px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PinToStackButton — the main export.
//
// Props:
//   distributorId   — the distributor to pin/unpin.
//   distributorName — short display name for the distributor.
//   stackData       — current chef stack (null = not loaded, undefined = no stack).
//   onStackChange   — called after successful pin/unpin so parent can refresh
//                     stackData (typically re-calls getChefStack()).
// ─────────────────────────────────────────────────────────────────────────────
export interface PinToStackButtonProps {
  distributorId: string;
  distributorName: string;
  /** The chef's current stack response. Pass null while loading, undefined if not yet created. */
  stackData: ChefStackResponse | null | undefined;
  /** Called after a successful pin or unpin so the parent can refresh stackData. */
  onStackChange: () => void;
}

export function PinToStackButton({
  distributorId,
  distributorName,
  stackData,
  onStackChange,
}: PinToStackButtonProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionState, setActionState] = useState<'idle' | 'loading'>('idle');

  // Derive pinned state: look up this distributor in the stack's pins.
  // NF-5 defense-in-depth: guard `pins` too — a stackless { stack: null }
  // response is a truthy object without a pins array, so `?.` on stackData
  // alone is not enough.
  const existingPin: ChefStackPin | undefined = stackData?.pins?.find(
    (p) => p.distributor_id === distributorId,
  );
  const isPinned = !!existingPin;

  async function handleClick() {
    if (actionState === 'loading') return;

    if (isPinned) {
      // Unpin immediately.
      setActionState('loading');
      await removeChefStackPin(existingPin!.id);
      setActionState('idle');
      onStackChange();
      return;
    }

    // Not pinned — decide whether to open drawer or pin immediately.
    if (stackData === null) {
      // Still loading stack data — do nothing (button shows as loading).
      return;
    }

    if (stackData === undefined || (stackData.pins?.length ?? 0) === 0) {
      // No stack exists yet OR stack has no pins yet — zero-friction path:
      // create stack if needed, then pin immediately.
      setActionState('loading');
      let targetStack = stackData;
      if (!targetStack) {
        const createRes = await createChefStack();
        if (createRes.error || !createRes.data) {
          setActionState('idle');
          return;
        }
        targetStack = createRes.data;
      }
      const pinRes = await addChefStackPin(distributorId);
      setActionState('idle');
      if (!pinRes.error) onStackChange();
      return;
    }

    // Stack exists with 1+ distributors → open "which stack" drawer.
    setDrawerOpen(true);
  }

  function handlePinned() {
    setDrawerOpen(false);
    onStackChange();
  }

  const loading = actionState === 'loading' || stackData === null;
  const title = isPinned ? `Remove ${distributorName} from stack` : `Pin ${distributorName} to a stack`;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title={title}
        aria-label={title}
        aria-pressed={isPinned}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 999,
          border: `1px solid ${isPinned ? C.charcoal : C.softLine}`,
          background: isPinned ? C.warmPaper : 'transparent',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'border-color .15s ease, background .15s ease',
          flexShrink: 0,
        }}
      >
        {loading ? (
          // Minimal spinner — same style as ChefDistributorsTab
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.charcoal}
            strokeWidth="3"
            strokeLinecap="round"
            aria-hidden="true"
            style={{ animation: 'qmPinSpin 0.9s linear infinite' }}
          >
            <path d="M12 2a10 10 0 0 1 0 20" />
            <style>{`@keyframes qmPinSpin { to { transform: rotate(360deg); } }`}</style>
          </svg>
        ) : (
          <PinIcon
            size={14}
            color={isPinned ? C.charcoal : C.gray500}
            filled={isPinned}
          />
        )}
      </button>

      {drawerOpen && stackData && (
        <PinToStackDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          distributorId={distributorId}
          distributorName={distributorName}
          stacks={[stackData]}
          onPinned={handlePinned}
        />
      )}
    </>
  );
}
