import { Bookmark } from 'lucide-react';

// ─── RepMemoryBadge ────────────────────────────────────────────────────────
// Operational Memory Epic, Lane 1 — the "your choice surfaces first" bookmark
// label. HARD RULES (spec is explicit, verbatim):
//   - rollover text must be EXACTLY "Your choice. 1 previous quote."
//   - no sparkles, no confidence numbers/percentages, no personification
//   - plain bookmark icon + native title/aria-label tooltip, no custom
//     tooltip primitive, no gradients
// Render this immediately adjacent to a candidate/product whenever that
// candidate's `alignment_candidates[].rep_memory === true`.

export const REP_MEMORY_LABEL = 'Your choice. 1 previous quote.';

export function RepMemoryBadge() {
  return (
    <span
      className="inline-flex items-center text-[#2A2A2A]"
      title={REP_MEMORY_LABEL}
      aria-label={REP_MEMORY_LABEL}
    >
      <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
    </span>
  );
}
