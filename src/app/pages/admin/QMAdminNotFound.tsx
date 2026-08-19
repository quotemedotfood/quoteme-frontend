// P0 route/shell guard, item 2: role-aware 404 recovery for /qm-admin/*.
//
// Before this route existed, /qm-admin/definitely-not-a-route matched NOTHING
// in the router, bubbled to the root errorElement (ErrorPage), and its
// "Return to Dashboard" hard-routed to /dashboard, which rendered the rep
// shell (QuoteMePage inside RootLayout) with cached quote history for a
// QM admin. This catch-all keeps admin failure paths INSIDE /qm-admin: it is
// a child of QMAdminLayout, so the admin shell persists and no other shell's
// cached state ever mounts, even briefly.
//
// NOTE: the bad-URL 404 is a deterministic TRIGGER for the historical
// wrong-shell class, not its root cause. Do not treat this guard as the
// root-cause fix for shell selection; see ErrorPage.tsx and
// DashboardRoleRouter.tsx for the companion guards.

import { useNavigate, useLocation } from 'react-router';
import { Button } from '../../components/ui/button';
import { SearchX } from 'lucide-react';

export function QMAdminNotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <SearchX className="w-7 h-7 text-[#7FAEC2]" />
        </div>
        <h1 className="text-xl font-semibold text-[#2A2A2A] mb-2">Admin page not found</h1>
        <p className="text-sm text-gray-500 mb-1">
          There is no admin page at this address.
        </p>
        <p className="text-xs text-gray-400 font-mono mb-6 break-all">{location.pathname}</p>
        <Button
          className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
          onClick={() => navigate('/qm-admin')}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
