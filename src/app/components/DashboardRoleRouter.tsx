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

  if (user?.role === 'distributor_admin') return <Navigate to="/distributor-admin/" replace />;

  if (user?.role === 'chef') {
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
