// V2 chef topbar — wordmark + ChefBadgePill (replaces initials circle).
//
// ChefBadgePill has three states:
//   single   — Chef [First Name] ▾  (1 location)
//   multi    — Chef [First Name] · [Current Location] ▾  (2+ locations)
//   group    — Chef [First Name] ▾  (role === 'group_admin')
//
// Clicking the pill opens ChefAccountDrawer (slides from right).
// Mounted by RootLayout when user?.role === 'chef' | 'buyer' | 'group_admin'.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useLocation2 } from '../contexts/LocationContext';
import { ChefBadgePill } from './chef/ChefBadgePill';
import { ChefAccountDrawer } from './chef/ChefAccountDrawer';
import type { ChefType } from './chef/ChefBadgePill';

const C = {
  softLine: '#E8E8E8',
} as const;

function resolveChefType(role: string | undefined, isMultiLocation: boolean): ChefType {
  if (role === 'group_admin') return 'group';
  if (isMultiLocation) return 'multi';
  return 'single';
}

export function ChefTopbar() {
  const { user, logout } = useAuth();
  const { isMultiLocation, locations, selectedLocation, setSelectedLocationId } = useLocation2();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const firstName = (user as { first_name?: string } | null)?.first_name || '';
  const lastName = (user as { last_name?: string } | null)?.last_name || '';
  const email = user?.email || '';
  const phone = (user as { phone?: string } | null)?.phone || undefined;

  const chefType = resolveChefType(user?.role, isMultiLocation);

  function handleSignOut() {
    logout();
    setDrawerOpen(false);
    sessionStorage.removeItem('chef_recent_quote_id');
    navigate('/', { replace: true });
  }

  return (
    <>
      {/* Track 7: masthead logo removed. The sidebar lockup (post-Track-2)
          is sufficient brand presence on chef pages — the top-strip
          wordmark was a duplicate. justify-end keeps the ChefBadgePill
          right-aligned now that it's the only child. */}
      <div
        className="flex items-center justify-end px-5 py-3 bg-white"
        style={{ borderBottom: `1px solid ${C.softLine}`, flexShrink: 0 }}
      >
        <ChefBadgePill
          firstName={firstName || email.split('@')[0] || 'Chef'}
          chefType={chefType}
          currentLocationName={
            chefType === 'multi' ? (selectedLocation?.name ?? undefined) : undefined
          }
          onClick={() => setDrawerOpen(true)}
        />
      </div>

      <ChefAccountDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chefType={chefType}
        firstName={firstName}
        lastName={lastName}
        email={email}
        phone={phone}
        locations={locations}
        currentLocationId={selectedLocation?.id}
        onSelectLocation={(id) => {
          setSelectedLocationId(id);
          setDrawerOpen(false);
        }}
        onAddLocation={() => {
          setDrawerOpen(false);
          navigate('/dashboard', { state: { activeTab: 'settings' } });
        }}
        onSignOut={handleSignOut}
        onNavigate={(dest) => {
          setDrawerOpen(false);
          navigate('/dashboard', { state: { activeTab: 'settings' } });
        }}
      />
    </>
  );
}
