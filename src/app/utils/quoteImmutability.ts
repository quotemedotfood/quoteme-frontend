// P0 route/shell guard: shared read-only predicates for quote surfaces.
//
// Two independent reasons a quote surface must render read-only:
//
// 1. Sent immutability: once a quote has gone out (sent_at set, or a
//    sent/accepted/won status or J1 accepted state), rep-side write controls
//    (Edit, Delete, Email Quote to Chef, Convert to Order Guide, document
//    controls, and matching-side Add Match / lock / pricing / feedback) are
//    disabled or hidden and the surface carries a "Sent (read-only)" marker.
//    The backend refuses these writes; the frontend must not offer them.
//
// 2. Admin viewer: a quoteme_admin deep-linking into a rep quote surface
//    (e.g. /map-ingredients?quoteId=...) is a viewer, not the quote's author.
//    Server-side intent is to refuse admin writes on rep surfaces, so those
//    surfaces render read-only with an explicit marker instead of showing
//    write controls whose submissions we intend to refuse. During
//    impersonation the JWT (and the /me role) belongs to the impersonated
//    user, so impersonated sessions are NOT affected by this gate.
//
// Scope note: this predicate is deliberately narrower than
// isLockedQuoteState (which also treats confirmed/declined/expired as
// locked for CTA suppression). Sent immutability is about Sent + Accepted
// records specifically; other terminal states keep their existing
// per-surface behavior.

import { isAcceptedQuoteState } from './quoteStatusLabel';

export interface QuoteImmutabilitySignals {
  status?: string | null;
  state?: string | null;
  sent_at?: string | null;
}

/** Marker copy for a quote frozen by send/acceptance. */
export const SENT_READ_ONLY_MARKER = 'Sent (read-only)';

/** Marker copy for a QM admin viewing a rep quote surface. */
export const ADMIN_READ_ONLY_MARKER = 'Admin view (read-only)';

/**
 * True when the quote is immutable because it has been sent or accepted.
 * sent_at stays set through the whole post-send resting period even while
 * status/state are frozen (see QuotesPage P1-3 notes), so it is checked
 * alongside the legacy statuses and the J1 accepted state.
 */
export function isSentImmutableQuote(q: QuoteImmutabilitySignals): boolean {
  return (
    !!q.sent_at ||
    q.status === 'sent' ||
    q.status === 'won' ||
    isAcceptedQuoteState(q.state)
  );
}

// Removed: a `q.status === 'accepted'` term. `accepted` is not a valid quote
// STATUS -- Quote::VALID_STATUSES is
// [processing draft pending assigned sent won lost expired] and the backend
// validates inclusion, so no payload can carry it. It IS a valid `state`, which
// the isAcceptedQuoteState(q.state) term above already covers. Keeping both was
// the two-vocabulary confusion in miniature: the same token guarded twice, once
// on the axis that can hold it and once on the axis that cannot.

/** True when the viewer role gets read-only rendering on rep quote surfaces. */
export function isAdminViewerRole(role: string | null | undefined): boolean {
  return role === 'quoteme_admin';
}

/**
 * Resolves the read-only marker to show, or null when the surface is
 * writable. Sent immutability wins over the admin marker because "Sent" is
 * the stronger, quote-intrinsic fact.
 */
export function quoteReadOnlyMarker(
  adminViewer: boolean,
  sentImmutable: boolean,
): string | null {
  if (sentImmutable) return SENT_READ_ONLY_MARKER;
  if (adminViewer) return ADMIN_READ_ONLY_MARKER;
  return null;
}
