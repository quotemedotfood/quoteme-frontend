// repRowFlags — pure flag derivation logic for rep triage rows.
//
// Flag set is intentionally small and easy to adjust. Moose will confirm the
// exact rule set — each rule is annotated with "// Moose to confirm exact rule set".
//
// To add or remove a flag:
//   1. Add/remove the key from RepFlagKey.
//   2. Add/remove its meta entry from REP_FLAG_META.
//   3. Add/remove its rule block from repRowFlags().

// ─── Flag keys ──────────────────────────────────────────────────────────────
export type RepFlagKey = 'forwarded-to-you' | 'new' | 'needs-a-call';

// ─── Display meta (label + muted solid tokens — NO gradients) ───────────────
export const REP_FLAG_META: Record<RepFlagKey, { label: string; fg: string; bg: string }> = {
  // Accent blue — signals this was routed specifically to this rep.
  'forwarded-to-you': {
    label: 'Forwarded to you',
    fg: '#1D5F7A',
    bg: 'rgba(127,174,194,.18)',
  },
  // Charcoal/gray — neutral "just arrived" signal, no urgency colour.
  'new': {
    label: 'New',
    fg: '#4F4F4F',
    bg: '#F0EFED',
  },
  // Sacred orange tones (--primary) — action urgency without being alarming.
  'needs-a-call': {
    label: 'Needs a call',
    fg: '#8B3A1E',
    bg: 'rgba(217,119,87,.14)',
  },
};

// ─── Input shape ─────────────────────────────────────────────────────────────
export interface RepFlagInput {
  kind?: 'opportunity' | 'quote';
  status?: string | null;
  /** True when this row is assigned to the current rep specifically. */
  assignedToSelf?: boolean;
  /** Hours the row has been waiting (null = unknown). */
  waitingHours?: number | null;
  /** Source code, e.g. 'cold_landing', 'website', 'referral'. */
  source?: string | null;
}

// ─── Derivation ──────────────────────────────────────────────────────────────
/**
 * repRowFlags — derive the set of flags to display on a triage row.
 *
 * Rules are applied in declaration order. The returned array maintains
 * the canonical display order: forwarded-to-you → new → needs-a-call.
 * Returns [] when no flags apply.
 */
export function repRowFlags(row: RepFlagInput): RepFlagKey[] {
  const flags: RepFlagKey[] = [];

  // 'forwarded-to-you': opportunity that was explicitly routed to this rep.
  // Moose to confirm exact rule set.
  if (row.kind === 'opportunity' && row.assignedToSelf) {
    flags.push('forwarded-to-you');
  }

  // 'new': opportunity with status='new', OR an inbound quote with status='pending'.
  // Moose to confirm exact rule set.
  if (
    (row.kind !== 'quote' && row.status === 'new') ||
    (row.kind === 'quote' && row.status === 'pending')
  ) {
    flags.push('new');
  }

  // 'needs-a-call': row has been waiting ≥48h, OR it arrived via cold_landing.
  // Moose to confirm exact rule set.
  if ((row.waitingHours ?? 0) >= 48 || row.source === 'cold_landing') {
    flags.push('needs-a-call');
  }

  return flags;
}
