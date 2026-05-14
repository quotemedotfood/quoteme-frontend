// V2 W4 inc 4 — /dashboard role-branching router.
// Moose lock Q3: single URL, role determines render. Chef → ChefDashboardPage;
// everyone else → existing rep dashboard (QuoteMePage).
//
// This component lives at the /dashboard route mount point so the existing
// rep flow keeps reaching QuoteMePage without any change.

import { useAuth } from '../contexts/AuthContext';
import { QuoteMePage } from '../pages/QuoteMePage';
import { ChefDashboardPage } from '../pages/chef/ChefDashboardPage';

export function DashboardRoleRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // RootWrapper already shows a loading shell on initial mount
  }

  if (user?.role === 'chef') {
    return <ChefDashboardPage />;
  }

  return <QuoteMePage />;
}
