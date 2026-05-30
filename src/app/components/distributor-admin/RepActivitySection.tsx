import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { getCommandCenterRepActivity } from '../../services/api';
import type { RepActivityRow } from '../../services/api';

// Local relative-time helper. No shared util exists in this codebase;
// the same pattern is used inline in NotificationBell.tsx.
function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const DM_SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const PLAYFAIR: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };
const TABULAR: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export function RepActivitySection() {
  const [rows, setRows] = useState<RepActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCommandCenterRepActivity().then((res) => {
      if (!cancelled && res.data) setRows(res.data);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <section>
      {/* Section heading */}
      <h2
        className="text-xl font-semibold text-[#2A2A2A] mb-4"
        style={PLAYFAIR}
      >
        Rep Activity
      </h2>

      {loading ? (
        /* Skeleton — matches animate-pulse pattern from ui/skeleton.tsx */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 bg-gray-200 animate-pulse rounded-md w-32" />
                <div className="h-4 bg-gray-200 animate-pulse rounded-md w-12 ml-auto" />
                <div className="h-4 bg-gray-200 animate-pulse rounded-md w-12" />
                <div className="h-4 bg-gray-200 animate-pulse rounded-md w-12" />
                <div className="h-4 bg-gray-200 animate-pulse rounded-md w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        /* Empty state — field voice, not an error */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-12 text-center">
          <p className="text-sm text-gray-400" style={DM_SANS}>
            No rep activity yet.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th
                  className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3"
                  style={DM_SANS}
                >
                  Rep
                </th>
                <th
                  className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3"
                  style={DM_SANS}
                >
                  Created
                </th>
                <th
                  className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3 hidden sm:table-cell"
                  style={DM_SANS}
                >
                  Sent
                </th>
                <th
                  className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3 hidden md:table-cell"
                  style={DM_SANS}
                >
                  Accepted
                </th>
                <th
                  className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3"
                  style={DM_SANS}
                >
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || '—';
                return (
                  <tr
                    key={row.user_id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        to="/distributor-admin/reps"
                        className="text-sm text-[#2A2A2A] hover:text-[#4F4F4F] underline-offset-2 hover:underline"
                        style={DM_SANS}
                      >
                        {name}
                      </Link>
                    </td>
                    <td
                      className="px-6 py-4 text-right text-sm text-[#2A2A2A]"
                      style={{ ...DM_SANS, ...TABULAR }}
                    >
                      {row.quotes_created}
                    </td>
                    <td
                      className="px-6 py-4 text-right text-sm text-[#2A2A2A] hidden sm:table-cell"
                      style={{ ...DM_SANS, ...TABULAR }}
                    >
                      {row.quotes_sent}
                    </td>
                    <td
                      className="px-6 py-4 text-right text-sm text-[#2A2A2A] hidden md:table-cell"
                      style={{ ...DM_SANS, ...TABULAR }}
                    >
                      {row.quotes_accepted}
                    </td>
                    <td
                      className="px-6 py-4 text-right text-sm text-gray-400"
                      style={{ ...DM_SANS, ...TABULAR }}
                    >
                      {row.last_activity_at ? timeAgo(row.last_activity_at) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
