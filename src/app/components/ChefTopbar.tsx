// V2 minimal chef topbar — wordmark + identity + sign-out only.
//
// Per Justin/Moose working-surface lock: chefs don't need feature
// navigation (Distributors/Locations/Quotes don't exist as chef-facing
// surfaces in V2 scope). They need to know they're signed in as
// themselves, and they need a way to sign out. Everything else is
// noise on the chef-flow surface.
//
// Mounted by RootLayout when useAuth().user?.role === 'chef'. Rep flow
// keeps the existing AppSidebar.

import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

const C = {
  charcoal: '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
};
const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function initials(first: string | null | undefined, last: string | null | undefined, fallbackEmail: string): string {
  const f = (first || '').trim()[0];
  const l = (last || '').trim()[0];
  if (f || l) return `${f || ''}${l || ''}`.toUpperCase();
  return (fallbackEmail.trim()[0] || '?').toUpperCase();
}

export function ChefTopbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown when the chef clicks outside it.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleSignOut() {
    logout();
    setOpen(false);
    // Drop any chef session markers that aren't AuthContext-managed.
    sessionStorage.removeItem('chef_recent_quote_id');
    navigate('/', { replace: true });
  }

  const initialsLabel = initials(
    (user as { first_name?: string } | null)?.first_name,
    (user as { last_name?: string } | null)?.last_name,
    user?.email || '',
  );
  const displayName =
    [(user as { first_name?: string } | null)?.first_name, (user as { last_name?: string } | null)?.last_name]
      .filter(Boolean).join(' ') || user?.email || 'Chef';

  return (
    <div
      className="flex items-center justify-between px-5 py-3 bg-white"
      style={{ borderBottom: `1px solid ${C.softLine}` }}
    >
      <span style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal, lineHeight: 1 }}>
        QuoteMe
      </span>

      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Account menu"
          aria-expanded={open}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: C.warmPaper, border: `1px solid ${C.softLine}` }}
        >
          <span style={{ ...serif, fontSize: 12, fontWeight: 600, color: C.charcoal }}>
            {initialsLabel}
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 bg-white rounded-lg overflow-hidden"
            style={{
              minWidth: 220,
              border: `1px solid ${C.softLine}`,
              boxShadow: '0 8px 24px rgba(43,43,43,.10)',
              zIndex: 50,
            }}
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: `1px solid ${C.softLine}` }}
            >
              <div style={{ ...sans, fontSize: 13, fontWeight: 500, color: C.charcoal, lineHeight: 1.3 }}>
                {displayName}
              </div>
              {user?.email && displayName !== user.email && (
                <div style={{ ...sans, fontSize: 11.5, color: C.gray500, lineHeight: 1.3 }}>
                  {user.email}
                </div>
              )}
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="w-full text-left px-4 py-3 transition-colors hover:bg-[#FBFAF7]"
              style={{ ...sans, fontSize: 13, color: C.gray700 }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
