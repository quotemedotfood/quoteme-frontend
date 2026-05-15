// V2 Increment 2 — Moose/Justin lock: cross-restaurant contamination guard.
// Triggered when the BE multi_restaurant_guard returns 409 from chef quote
// create. Chef has 2+ RestaurantContacts and typed a name that didn't match
// any of them. The modal forces an explicit pick — no dismiss, no cancel,
// no "remember this choice".
//
// Options shown:
//   • One card per existing restaurant the chef is linked to (re-submits
//     with name=restaurant.name → BE matches existing exact, no new record)
//   • One card for the typed-but-rejected name (re-submits with
//     confirm_new_restaurant: true → BE creates fresh)
//
// Bottom-sheet on mobile (the chef-flow's default form factor). On wider
// viewports the same sheet centers as a card.

import { useEffect } from 'react';

const C = {
  charcoal: '#2B2B2B',
  orange: '#F9A64B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
};
const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export interface ExistingRestaurant {
  id: string;
  name: string;
}

interface Props {
  /** Restaurants the chef is already linked to (from 409 payload). */
  existingRestaurants: ExistingRestaurant[];
  /** The name the chef typed that triggered the 409. */
  typedName: string;
  /** User picked an existing restaurant — re-submit with that name (BE
   * matches existing by case-insensitive name, no new record). */
  onPickExisting: (restaurant: ExistingRestaurant) => void;
  /** User wants to create the typed-name restaurant — re-submit with
   * confirm_new_restaurant: true. */
  onCreateNew: (typedName: string) => void;
  /** True while a re-submit is in flight; disables all cards. */
  busy?: boolean;
}

export function MultiRestaurantConfirmModal({
  existingRestaurants,
  typedName,
  onPickExisting,
  onCreateNew,
  busy = false,
}: Props) {
  // Lock body scroll while modal is open so the dimmed page below doesn't
  // jiggle when the chef interacts with the sheet.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="multi-restaurant-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      {/* Backdrop — intentionally not click-dismissable. The guard is the
          only thing protecting against cross-restaurant contamination, so
          the chef must explicitly pick. */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(40,30,20,.45)' }}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="relative bg-white w-full sm:max-w-md mx-auto"
        style={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderRadius: 'min(20px, calc(20px))',
          boxShadow: '0 -8px 30px rgba(43,43,43,.20), 0 20px 50px rgba(43,43,43,.15)',
          padding: 24,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: C.warmPaper, border: `1px solid ${C.softLine}` }}
            aria-hidden="true"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.charcoal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l1-5h16l1 5" />
              <path d="M5 9v11h14V9" />
              <path d="M9 22V12h6v10" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div
              style={{ ...sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gray700 }}
            >
              QUICK CHECK
            </div>
            <h2
              id="multi-restaurant-title"
              className="mt-1"
              style={{ ...serif, fontSize: 22, fontWeight: 600, color: C.charcoal, lineHeight: 1.2 }}
            >
              Which restaurant is this quote for?
            </h2>
          </div>
        </div>

        {/* Restaurant cards */}
        <div className="mt-5 space-y-2">
          {existingRestaurants.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => !busy && onPickExisting(r)}
              disabled={busy}
              className="w-full text-left bg-white rounded-lg p-4 transition-shadow hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: `1px solid ${C.softLine}` }}
            >
              <div
                style={{ ...serif, fontSize: 16, fontWeight: 500, color: C.charcoal }}
              >
                {r.name}
              </div>
              <div
                className="mt-3 inline-flex items-center gap-1"
                style={{ ...sans, fontSize: 12, color: C.gray700, fontWeight: 500 }}
              >
                Use {r.name}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.gray700} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </button>
          ))}

          {/* Create-new card — visually distinct, weighted as the third
              option since chef's choice (typed a new name) implied wanting
              to create it. Renders only when typed_name is present. */}
          {typedName && (
            <button
              type="button"
              onClick={() => !busy && onCreateNew(typedName)}
              disabled={busy}
              className="w-full text-left bg-white rounded-lg p-4 transition-shadow hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: `1px dashed ${C.gray400}` }}
            >
              <div
                style={{ ...sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gray500 }}
              >
                YOU TYPED
              </div>
              <div
                className="mt-1"
                style={{ ...serif, fontSize: 16, fontWeight: 500, color: C.charcoal }}
              >
                {typedName}
              </div>
              <div
                className="mt-3 inline-flex items-center gap-1"
                style={{ ...sans, fontSize: 12, color: C.charcoal, fontWeight: 500 }}
              >
                Add as a new restaurant
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.charcoal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
            </button>
          )}
        </div>

        {/* Footer copy — no dismiss option per Moose lock. */}
        <p
          className="mt-4"
          style={{ ...sans, fontSize: 10.5, color: C.gray500, lineHeight: 1.4 }}
        >
          You can switch back any time from your quote history. We can't link the same quote to
          two restaurants at once, so pick one to continue.
        </p>
      </div>
    </div>
  );
}

