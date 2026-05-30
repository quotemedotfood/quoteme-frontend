// CCToday — landing board placeholder.
// The full Today dispatch board (3 reads: needs an owner · going cold · moving)
// is a later unit. This placeholder redirects to the quotes ledger which is the
// launch-critical slice.

import { Navigate } from 'react-router';

export function CCTodayPage() {
  return <Navigate to="/distributor-admin/command-center/quotes" replace />;
}
