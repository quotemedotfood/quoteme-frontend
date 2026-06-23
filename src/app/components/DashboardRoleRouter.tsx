// V2 W4 inc 4 — /dashboard role-branching router.
// Moose lock Q3: single URL, role determines render. Chef → ChefDashboardPage;
// everyone else → existing rep dashboard (QuoteMePage).
//
// This component lives at the /dashboard route mount point so the existing
// rep flow keeps reaching QuoteMePage without any change.

import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { QuoteMePage } from '../pages/QuoteMePage';
import { ChefDashboardPage } from '../pages/chef/ChefDashboardPage';
import { RepLayout } from './rep/RepLayout';

export function DashboardRoleRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // RootWrapper already shows a loading shell on initial mount
  }

  if (user?.role === 'distributor_admin') return <Navigate to="/distributor-admin/command-center" replace />;

  // ROOT CAUSE FIX: brand users must never land in the rep/distributor shell.
  // /dashboard is the post-login default; send brand users straight to /brand.
  if (user?.role === 'brand') return <Navigate to="/brand" replace />;

  // Flag A fix: buyer + group_admin inherit chef-side dashboard (Justin doctrine lock).
  // isChefShellUser in ChefShellLayout already treats these roles as chef-chrome users;
  // this aligns content routing to match that chrome decision.
  if (user?.role === 'chef' || user?.role === 'buyer' || user?.role === 'group_admin') {
    return <ChefDashboardPage />;
  }

  // Rep on the shared /dashboard route: wrap in RepLayout so the sidebar is
  // present, matching /rep/* behaviour. RepLayout accepts optional `children`
  // so it doesn't require a router Outlet parent.
  // Rep (and distributor_admin, qm_admin, etc.) on the shared /dashboard route:
  // wrap in RepLayout so the rep sidebar is present, matching /rep/* behaviour.
  // RepLayout accepts optional `children` so it doesn't require a router Outlet.
  if (user?.role === 'rep') {
    return (
      <RepLayout>
        <QuoteMePage />
      </RepLayout>
    );
  }

  return <QuoteMePage />;
}
