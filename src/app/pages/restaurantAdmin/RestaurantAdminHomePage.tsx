// THE RESTAURANT ADMIN'S HOME.
//
// Before this a restaurant admin had nowhere to land (routeByRole had no case
// for the role and sent it to /start-new-quote). Moose, 2026-10-13: the flow
// URL and QR code should be "prominent in their dashboard". So they come
// first, one card per restaurant this person runs.
//
// Reads GET /api/v1/restaurant_admin/home. pairme_flow is null until the
// pairings are made; the page says so in words instead of showing a code
// that would land a guest on an empty page.
//
// Below the card, once paired (Moose, 2026-10-13): the same pairings the QM
// admin sees, stamped with when they were last updated, and what guests were
// shown, with the time.
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { PairmeFlowCard } from '../../components/PairmeFlowCard';
import { getRestaurantAdminHome, getRestaurantAdminPairme, RestaurantAdminHome } from '../../services/adminApi';
import { PairmeSection } from '../admin/_pairmeSection';
import { GuestPresentations } from './GuestPresentations';

export function RestaurantAdminHomePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<RestaurantAdminHome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isRestaurantAdmin = user?.role === 'restaurant_admin';

  useEffect(() => {
    if (!isRestaurantAdmin) return;
    let live = true;
    getRestaurantAdminHome().then((res) => {
      if (!live) return;
      if (res.data) setData(res.data);
      else setError(res.error || 'Could not load your restaurants');
    });
    return () => {
      live = false;
    };
  }, [isRestaurantAdmin]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!isRestaurantAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {data?.user.first_name ? `Welcome, ${data.user.first_name}` : 'Welcome'}
          </h1>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/auth');
            }}
            className="text-sm text-[#4F4F4F] hover:underline"
          >
            Sign out
          </button>
        </div>

        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
        {!data && !error && <p className="text-sm text-gray-400">Loading…</p>}
        {data && data.restaurants.length === 0 && (
          <p className="text-sm text-[#4F4F4F]" data-testid="ra-no-restaurants">
            No restaurant is linked to your account yet. Reply to your welcome email and we will sort it out.
          </p>
        )}

        {data?.restaurants.map((r) => (
          <div key={r.id} className="mb-8" data-testid="ra-restaurant">
            <p className="text-sm text-[#4F4F4F] mb-2">
              <span className="font-medium text-[#2A2A2A]">{r.name}</span>
              {[r.city, r.state].filter(Boolean).length > 0 && `, ${[r.city, r.state].filter(Boolean).join(', ')}`}
            </p>
            {r.pairme_flow ? (
              <>
                <PairmeFlowCard flow={r.pairme_flow} />
                <PairmeSection restaurantId={r.id} load={getRestaurantAdminPairme} title="Pairings your guests are offered" />
                <GuestPresentations restaurantId={r.id} />
              </>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-[#4F4F4F]" data-testid="ra-flow-pending">
                Your PairMe link and QR code will appear here as soon as your pairings are ready.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
