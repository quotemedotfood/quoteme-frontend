import { Link2, Link2Off } from 'lucide-react';

// ─── ChainToggle ───────────────────────────────────────────────────────────
// Operational Memory Epic, Lane 1 revision (Ruling 3): replaces the old
// RepMemoryBadge "Your choice. 1 previous quote." bookmark with a plain
// bidirectional chain control in the Match Ingredients area.
//
// HARD RULES (verbatim from the ruling):
//   - broken chain = not locked, connected chain = locked
//   - brief hover text: "Remembered for this account" (exact string)
//   - no modal, no confirmation -- one click toggles the lock in ONE action
//   - no sparkles, no confidence numbers/percentages, no personification,
//     no gradients -- plain icon + native title/aria-label, no custom
//     tooltip primitive
//
// This is a real toggle (not a read-only label): clicking a connected chain
// unlocks, clicking a broken chain locks. The parent component owns the
// actual API call (POST /api/v1/quotes/:id/rep_memory_lock) and passes the
// resulting locked state back down -- ChainToggle itself holds no state.

export const CHAIN_TOGGLE_HOVER = 'Remembered for this account';

interface ChainToggleProps {
  locked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ChainToggle({ locked, onToggle, disabled = false }: ChainToggleProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onToggle();
      }}
      disabled={disabled}
      title={CHAIN_TOGGLE_HOVER}
      aria-label={locked ? 'Locked. Remembered for this account. Click to unlock.' : 'Not locked. Click to remember for this account.'}
      aria-pressed={locked}
      className="inline-flex items-center justify-center bg-transparent border-none p-0 cursor-pointer disabled:cursor-default disabled:opacity-50"
      style={{ color: locked ? '#2F7D4F' : '#9C978A' }}
    >
      {locked ? (
        <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
      ) : (
        <Link2Off className="w-3.5 h-3.5" aria-hidden="true" />
      )}
    </button>
  );
}
