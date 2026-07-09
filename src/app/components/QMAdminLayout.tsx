import { Link, Outlet, useLocation, Navigate, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Building2,
  UserX,
  UtensilsCrossed,
  Landmark,
  Radio,
  Tag,
  Cpu,
  Activity,
  ShieldCheck,
  Layers,
  BrainCircuit,
  Target,
  ChefHat,
  Kanban,
  LogOut,
} from 'lucide-react';
import logoSquare from '/src/assets/e549e7d27b183e98e791f43494c715b8cc6ce7e9.png';
import { useAuth } from '../contexts/AuthContext';
import { isImpersonating } from '../utils/impersonate';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/qm-admin' },
  { icon: UserPlus, label: 'Signups', path: '/qm-admin/signups' },
  { icon: Users, label: 'Users', path: '/qm-admin/users' },
  { icon: Building2, label: 'Distributors', path: '/qm-admin/distributors' },
  { icon: UserX, label: 'Unassociated', path: '/qm-admin/unassociated-reps' },
  { icon: UtensilsCrossed, label: 'Restaurants', path: '/qm-admin/restaurants' },
  { icon: Landmark, label: 'Restaurant Groups', path: '/qm-admin/restaurant-groups' },
  { icon: ChefHat, label: 'Chefs', path: '/qm-admin/chefs' },
  { icon: Cpu, label: 'Matching', path: '/qm-admin/matching-engine' },
  { icon: Tag, label: 'Brands', path: '/qm-admin/brands' },
  { icon: ShieldCheck, label: 'Ingestion Rules', path: '/qm-admin/brand-rules' },
  { icon: Layers, label: 'Cluster Labels', path: '/qm-admin/cluster-labels' },
  { icon: BrainCircuit, label: 'Gap Filler', path: '/qm-admin/knowledge-gap-filler' },
  { icon: Target, label: 'Needs Your Pick', path: '/qm-admin/needs-your-pick' },
  { icon: Kanban, label: 'Product Pipeline', path: '/qm-admin/product-pipeline' },
  { icon: Radio, label: 'Command', path: '/qm-admin/conference-command' },
  { icon: Activity, label: 'Health', path: '/qm-admin/health' },
];

export function QMAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading, logout } = useAuth();

  function handleSignOut() {
    logout();
    navigate('/auth', { replace: true });
  }

  // B-178: Render a spinner while auth hydrates instead of returning null.
  // On a hard direct-URL navigation, the auth guard evaluates before the /me
  // round-trip resolves. Returning null causes a blank screen and, when the
  // request fails transiently, the subsequent render with user=null flashes a
  // redirect to /auth. The spinner holds the layout stable during hydration,
  // matching the RootLayout pattern from B-129.
  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: '#F9FAFB' }}
      >
        <div
          className="w-10 h-10 rounded-full border-4 border-[#E8E8E8] border-t-[#7FAEC2]"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!user || user.role !== 'quoteme_admin') return <Navigate to="/auth" replace />;

  // P0: during an impersonated session, suppress the QM-admin outer rail entirely
  // so the impersonated distributor/rep sees only their own (inner) sidebar — the
  // admin chrome must not leak into what a live distributor like Fish Guys sees.
  const impersonating = isImpersonating();

  const isActive = (path: string) => {
    if (path === '/qm-admin') return location.pathname === '/qm-admin' || location.pathname === '/qm-admin/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar — suppressed during impersonation (P0) */}
      {!impersonating && (
      <div className="hidden md:flex w-56 bg-white border-r border-gray-200 flex-col h-screen flex-shrink-0">
        <div className="p-4 flex items-center gap-3 border-b border-gray-200">
          <img src={logoSquare} alt="QuoteME" className="w-10 h-10 object-contain" />
          <div>
            <div className="text-sm font-semibold text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>QuoteMe</div>
            <div className="text-xs text-[#7FAEC2] font-medium">Admin</div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-[#7FAEC2]/10 text-[#7FAEC2] font-medium'
                    : 'text-[#4F4F4F] hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 flex flex-col gap-3">
          <Link to="/dashboard" className="text-xs text-[#4F4F4F] hover:text-[#7FAEC2] transition-colors">
            ← Rep Dashboard
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs text-[#4F4F4F] hover:text-[#DC2626] transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
      )}

      {/* Mobile Top Nav — suppressed during impersonation (P0) */}
      {!impersonating && (
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">
          <img src={logoSquare} alt="QM" className="w-7 h-7 flex-shrink-0" />
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active ? 'bg-[#7FAEC2] text-white' : 'text-[#4F4F4F] bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="pt-14 md:pt-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
