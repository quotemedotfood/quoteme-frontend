import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, UserPlus, FileText, UserX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminStats, AdminStats } from '../../services/adminApi';

export function QMAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await getAdminStats();
      if (res.data) setStats(res.data);
      else setError(res.error || 'Failed to load stats');
      setLoading(false);
    }
    load();
  }, []);

  const cards = stats
    ? [
        {
          label: 'Unassigned Quotes',
          value: stats.pending_quotes,
          icon: FileText,
          path: '/qm-admin/signups',
          color: '#7FAEC2',
        },
        {
          label: 'Flagged Reps',
          value: stats.flagged_users,
          icon: AlertTriangle,
          path: '/qm-admin/signups?flagged=true',
          color: '#E5A84B',
        },
        {
          label: 'New Signups (7d)',
          value: stats.new_signups_week,
          icon: UserPlus,
          path: '/qm-admin/signups',
          color: '#7FAEC2',
        },
        {
          label: 'Unassociated Reps',
          value: stats.unassociated_reps,
          icon: UserX,
          path: '/qm-admin/unassociated-reps',
          color: '#E07A5F',
        },
      ]
    : [];

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <h1
        className="text-2xl md:text-3xl font-bold text-[#2A2A2A] mb-1"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Welcome, {user?.first_name || 'Admin'}
      </h1>
      <p className="text-sm text-[#4F4F4F] mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        QuoteMe Admin Dashboard
      </p>

      {loading && <p className="text-sm text-gray-400">Loading stats...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                to={card.path}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <Icon size={18} style={{ color: card.color }} />
                  </div>
                  <span className="text-xs text-[#4F4F4F] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {card.label}
                  </span>
                </div>
                <div className="text-3xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {card.value}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
