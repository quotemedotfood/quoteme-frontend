import { Home } from 'lucide-react';

// ─── DistributorMemoryBadge ────────────────────────────────────────────────
// Operational Memory Epic, Lane 2 -- the distributor-tier candidate label.
// Surfaces when the alignment engine forced a candidate to position 1
// because the DISTRIBUTOR (not this rep personally) has a standing signal
// for it, per spec section 8. Ruling 2 splits that signal into two kinds:
//   - PREFERENCE: presentation only, "the house tends to pick this."
//   - MANDATE: a hard distributor requirement. A mandate MUST be visible
//     and attributable -- who set it and why -- so it renders a distinct
//     label whose tooltip carries that attribution.
// HARD RULES:
//   - no sparkles, no confidence numbers/percentages, no personification
//   - no gradients; plain text pill, same visual family as the Best
//     Match / Alternate tier tags elsewhere in the match surfaces
//   - native title/aria-label tooltip carries the copy, no custom
//     tooltip primitive
// Render this immediately adjacent to a candidate/product whenever that
// candidate's `alignment_candidates[].distributor_memory === true`. The
// engine never sets both rep_memory and distributor_memory true on the same
// candidate (rep tier always wins first), so callers can treat these two
// badges as mutually exclusive.

export type DistributorSignalType = 'preference' | 'mandate' | null | undefined;

const PREFERENCE_LABEL = 'Distributor Focus';
const MANDATE_LABEL = 'Distributor Mandate';

// Tooltip copy for a PREFERENCE candidate (or null/legacy, which is treated
// as a preference). Presentation only -- no attribution, matches the
// original "house pick" language.
export function distributorMemoryLabel(distributorName: string | null | undefined): string {
  const name = distributorName?.trim();
  return name ? `House pick, set by your team at ${name}.` : 'House pick, set by your team.';
}

// Tooltip copy for a MANDATE candidate. Ruling 2: a mandate MUST be visible
// and attributable, so this always states who set it and why, falling back
// to plain language when either is missing.
export function distributorMandateTooltip(
  distributorName: string | null | undefined,
  mandateSetBy: string | null | undefined,
  mandateReason: string | null | undefined,
): string {
  const name = distributorName?.trim();
  const setBy = mandateSetBy?.trim();
  const reason = mandateReason?.trim();
  const base = name ? `Distributor mandate at ${name}` : 'Distributor mandate';
  const who = setBy ? `, set by ${setBy}` : '';
  const why = reason ? `. Reason: ${reason}.` : '.';
  return `${base}${who}${why}`;
}

interface DistributorMemoryBadgeProps {
  distributorName?: string | null;
  signalType?: DistributorSignalType;
  mandateReason?: string | null;
  mandateSetBy?: string | null;
}

export function DistributorMemoryBadge({
  distributorName,
  signalType,
  mandateReason,
  mandateSetBy,
}: DistributorMemoryBadgeProps) {
  const isMandate = signalType === 'mandate';
  const label = isMandate ? MANDATE_LABEL : PREFERENCE_LABEL;
  const tooltip = isMandate
    ? distributorMandateTooltip(distributorName, mandateSetBy, mandateReason)
    : distributorMemoryLabel(distributorName);
  const bg = isMandate ? '#FBEFD8' : '#EDEDED';
  const color = isMandate ? '#8A6114' : '#2A2A2A';

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-[2px] rounded-full whitespace-nowrap"
      style={{ background: bg, color }}
      title={tooltip}
      aria-label={tooltip}
    >
      <Home className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  );
}
