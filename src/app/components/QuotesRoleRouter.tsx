// QuotesRoleRouter — bare /quotes redirect dispatcher.
//
// /quotes is intentionally kept as a stable external-facing URL (bookmarks,
// email links, etc.). This component reads the user's role and immediately
// redirects to the canonical role-scoped path:
//
//   chef  → /chef/quotes
//   all other roles → /rep/quotes
//
// Component internals do NOT change — only routing + link/navigate paths.

import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

export function QuotesRoleRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (user?.role === 'chef') {
    return <Navigate to="/chef/quotes" replace />;
  }

  return <Navigate to="/rep/quotes" replace />;
}
