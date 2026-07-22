import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { exitImpersonation } from '../services/api';

// ------------------------------------------------------------------ helpers

function toTitleCase(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ------------------------------------------------------------------ Chef Impersonation Banner

/**
 * Shown when a QM admin has stepped into a chef account.
 * Uses QM Orange (#F39839) per project design constraints (no gradients).
 * Click anywhere on the banner to exit impersonation and restore admin session.
 */
function ChefImpersonationBanner({ chefName }: { chefName: string }) {
  const [exiting, setExiting] = useState(false);

  async function handleExit() {
    if (exiting) return;
    setExiting(true);
    // Call the audit endpoint to stamp ended_at
    await exitImpersonation();
    // Restore admin session token (stored client-side on impersonate)
    const adminToken = localStorage.getItem('quoteme_admin_token');
    if (adminToken) {
      localStorage.setItem('quoteme_token', adminToken);
      localStorage.removeItem('quoteme_admin_token');
    }
    localStorage.removeItem('quoteme_chef_impersonating');
    localStorage.removeItem('quoteme_chef_impersonation_event_id');
    window.location.href = '/qm-admin/chefs';
  }

  return (
    <div
      role="banner"
      aria-label="Chef impersonation active"
      onClick={handleExit}
      style={{ backgroundColor: '#F39839' }}
      className="text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-3 relative z-50 cursor-pointer select-none"
      data-testid="chef-impersonation-banner"
    >
      {exiting ? (
        <span>Exiting impersonation...</span>
      ) : (
        <span>
          Impersonating {toTitleCase(chefName)}. Click to exit.
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Legacy Impersonation Banner
// Used for non-chef impersonation (distributor admin, restaurant admin, etc.)
// Keeps the existing amber-500 style and client-only restore logic.

function LegacyImpersonationBanner({ displayName }: { displayName: string }) {
  function stopImpersonating() {
    const adminToken = localStorage.getItem('quoteme_admin_token');
    if (adminToken) {
      localStorage.setItem('quoteme_token', adminToken);
      localStorage.removeItem('quoteme_admin_token');
    }
    localStorage.removeItem('quoteme_impersonating');
    window.location.href = '/qm-admin';
  }

  return (
    <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-3 relative z-50">
      <span>Viewing as {displayName}</span>
      <button
        onClick={stopImpersonating}
        className="underline hover:no-underline font-semibold"
      >
        Stop Impersonating
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ Exported Banner

/**
 * Root-level banner that detects and renders the appropriate impersonation
 * notice. Checks chef impersonation first (new audit-logged path), then
 * falls back to the legacy generic path.
 *
 * BUG #29: this used to be a mount-once effect (deps: []), which meant a
 * chef who opened their magic link into an already-mounted RootWrapper
 * (e.g. a background tab, or a client-side nav that never fully unmounts
 * the app shell) could get stuck showing a PRIOR admin/impersonation
 * identity's banner forever, because it only ever read localStorage once at
 * first paint. Re-deriving on every route change (via useLocation) makes
 * the banner reflect whatever session is actually live right now -
 * including immediately after useEstablishSession clears the stale
 * impersonation keys and navigates the chef onward.
 */
export function ImpersonationBanner() {
  const [chefName, setChefName] = useState<string | null>(null);
  const [legacyName, setLegacyName] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    setChefName(localStorage.getItem('quoteme_chef_impersonating'));
    setLegacyName(localStorage.getItem('quoteme_impersonating'));
  }, [location.pathname]);

  if (chefName) return <ChefImpersonationBanner chefName={chefName} />;
  if (legacyName) return <LegacyImpersonationBanner displayName={legacyName} />;
  return null;
}
