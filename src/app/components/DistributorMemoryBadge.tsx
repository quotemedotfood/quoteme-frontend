import { Home } from 'lucide-react';

// ─── DistributorMemoryBadge ────────────────────────────────────────────────
// Operational Memory Epic, Lane 2 -- the distributor-tier "house pick" label.
// Surfaces when the alignment engine forced a candidate to position 1
// because the DISTRIBUTOR (not this rep personally) has a standing
// preference for it, per spec section 8: "Preferred brand: small house
// icon... separates *the house wants this* from *you picked this*."
// HARD RULES (same as RepMemoryBadge):
//   - no sparkles, no confidence numbers/percentages, no personification
//   - plain house icon + native title/aria-label tooltip, no custom
//     tooltip primitive, no gradients
// Render this immediately adjacent to a candidate/product whenever that
// candidate's `alignment_candidates[].distributor_memory === true`. The
// engine never sets both rep_memory and distributor_memory true on the same
// candidate (rep tier always wins first), so callers can treat these two
// badges as mutually exclusive.

export function distributorMemoryLabel(distributorName: string | null | undefined): string {
  const name = distributorName?.trim();
  return name ? `House pick, set by your team at ${name}.` : 'House pick, set by your team.';
}

export function DistributorMemoryBadge({ distributorName }: { distributorName?: string | null }) {
  const label = distributorMemoryLabel(distributorName);
  return (
    <span
      className="inline-flex items-center text-[#2A2A2A]"
      title={label}
      aria-label={label}
    >
      <Home className="w-3.5 h-3.5" aria-hidden="true" />
    </span>
  );
}
