// ─── DistributorMemoryLabel ─────────────────────────────────────────────────
// Operational Memory Epic, Lane 2 revision (Justin's 2026-07-20 matching
// rulings, Ruling 2: mandate vs preference).
//
// The distributor signal splits in two, and they render differently:
//   - PREFERENCE (spiff, house brand, normal push): a plain LABEL only --
//     "Distributor focus" / "Current preferred option". Presentation layer.
//     Never a chain lock (the chain control is rep-lock only, see
//     ChainToggle) -- a preference never replaces a rep lock or rep pick.
//   - MANDATE (contract, compliance, supplier transition, directed
//     replacement): MAY have outranked a rep lock to get here, so it MUST be
//     visible and attributable -- who set it, why -- surfaced on hover/label.
//
// HARD RULES (same as the old badge this replaces):
//   - no sparkles, no confidence numbers/percentages, no personification
//   - plain text pill (same visual language MatchDrawer already uses for
//     "Best Match" / "Alternate" tags) + native title/aria-label tooltip, no
//     custom tooltip primitive, no gradients
//   - never shown to distributors -- this only ever renders on rep/QM-admin
//     surfaces (MatchDrawer, QM-admin learnings), never a distributor-facing page
//
// Render this immediately adjacent to a candidate/product whenever that
// candidate's `alignment_candidates[].distributor_memory === true`. The
// engine sets `distributor_memory` true only when there was NO rep-tier
// surfacing win for this component (a mandate can outrank a rep lock, in
// which case rep_memory is false on the winning candidate) -- so callers can
// still treat rep_memory and this label as mutually exclusive per candidate.

export type DistributorSignalType = 'mandate' | 'preference';

export function distributorPreferenceLabel(distributorName: string | null | undefined): string {
  const name = distributorName?.trim();
  return name ? `Current preferred option at ${name}.` : 'Current preferred option.';
}

export function distributorMandateLabel(
  mandateSetBy: string | null | undefined,
  mandateReason: string | null | undefined
): string {
  const who = mandateSetBy?.trim();
  const why = mandateReason?.trim();
  if (who && why) return `Distributor mandate. Set by ${who}: ${why}.`;
  if (who) return `Distributor mandate. Set by ${who}.`;
  if (why) return `Distributor mandate. Reason: ${why}.`;
  return 'Distributor mandate.';
}

interface DistributorMemoryLabelProps {
  signalType: DistributorSignalType;
  distributorName?: string | null;
  mandateSetBy?: string | null;
  mandateReason?: string | null;
}

export function DistributorMemoryLabel({
  signalType,
  distributorName,
  mandateSetBy,
  mandateReason,
}: DistributorMemoryLabelProps) {
  const isMandate = signalType === 'mandate';
  const hoverText = isMandate
    ? distributorMandateLabel(mandateSetBy, mandateReason)
    : distributorPreferenceLabel(distributorName);
  const pillText = isMandate ? 'Distributor mandate' : 'Distributor focus';

  return (
    <span
      className="text-[10px] font-bold px-2 py-[2px] rounded-full"
      style={{ background: '#EFE9DD', color: '#5B5346' }}
      title={hoverText}
      aria-label={hoverText}
    >
      {pillText}
    </span>
  );
}
