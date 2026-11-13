// QM admin MEPs list (MEPs + Hotels, step 2). An MEP is a market expansion
// partner. Reads GET /api/v1/admin/meps (name, email, last sign-in). The
// Send sign-in link button is the ONLY way an MEP gets an email:
// POST /api/v1/admin/meps/:id/send_sign_in_link, one press, one email.
// MEPs are added by the backend's meps:add task, not from this page.
// Stars (MEP platform, part A, Moose 2026-11-13): each MEP's starred
// accounts, from GET /api/v1/admin/meps/:id/stars, opened per row.
import { Fragment, useEffect, useState } from 'react';
import { Mail, Star } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { getAdminMeps, sendMepSignInLink, getAdminMepStars, AdminMep, AdminMepStar } from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';

/** Last sign-in as a short date and time, or "Never". */
export function lastSignInLabel(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const STAR_TYPE_LABEL: Record<AdminMepStar['account_type'], string> = {
  hotel: 'Hotel',
  restaurant_group: 'Restaurant group',
  restaurant: 'Restaurant',
};

export function QMAdminMeps() {
  const [meps, setMeps] = useState<AdminMep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [notice, setNotice] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [openStars, setOpenStars] = useState<string | null>(null);
  const [stars, setStars] = useState<Record<string, AdminMepStar[] | { error: string }>>({});

  async function toggleStars(m: AdminMep) {
    if (openStars === m.id) {
      setOpenStars(null);
      return;
    }
    setOpenStars(m.id);
    const res = await getAdminMepStars(m.id);
    setStars((s) => ({ ...s, [m.id]: res.data ?? { error: res.error || 'Failed to load' } }));
  }

  useEffect(() => {
    let live = true;
    getAdminMeps().then((res) => {
      if (!live) return;
      if (res.data) setMeps(res.data);
      else setError(res.error || 'Failed to load');
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  async function handleSend(m: AdminMep) {
    if (sending) return;
    if (!window.confirm(`Email ${m.name} a sign-in link at ${m.email}?`)) return;
    setSending(m.id);
    const res = await sendMepSignInLink(m.id);
    setSending(null);
    setNotice((n) => ({
      ...n,
      [m.id]: res.data
        ? { ok: true, text: `Sent to ${res.data.email}` }
        : { ok: false, text: res.error || 'Not sent' },
    }));
  }

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1
        className="text-2xl font-bold text-[#2A2A2A] mb-6"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        MEPs
      </h1>
      <p className="-mt-4 mb-6 text-sm">
        <a href="/qm-admin/mep-intros" className="text-[#7FAEC2] hover:underline">Intro queue</a>
      </p>

      {loading && <p className="text-sm text-gray-400 py-8">Loading…</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && meps.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No MEPs yet.</p>
        </div>
      )}

      {meps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead>Stars</TableHead>
                <TableHead className="text-right">Sign-in link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meps.map((m) => (
                <Fragment key={m.id}>
                <TableRow>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-sm text-gray-600">{m.email}</TableCell>
                  <TableCell className="text-sm text-gray-600">{lastSignInLabel(m.last_login_at)}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => toggleStars(m)}
                      aria-expanded={openStars === m.id}
                      className="text-sm text-[#7FAEC2] hover:underline flex items-center gap-1"
                    >
                      <Star size={14} />
                      {openStars === m.id ? 'Hide stars' : 'Show stars'}
                    </button>
                    <a href={`/qm-admin/meps/${m.id}/people`} className="text-sm text-[#7FAEC2] hover:underline">
                      People
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <Button
                        onClick={() => handleSend(m)}
                        disabled={sending !== null || m.status !== 'active'}
                        className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white flex items-center gap-1.5"
                      >
                        <Mail size={15} />
                        {sending === m.id ? 'Sending…' : 'Send sign-in link'}
                      </Button>
                      {notice[m.id] && (
                        <span
                          role={notice[m.id].ok ? 'status' : 'alert'}
                          className={`text-xs ${notice[m.id].ok ? 'text-green-700' : 'text-red-500'}`}
                        >
                          {notice[m.id].text}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                {openStars === m.id && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-gray-50" data-testid="mep-stars">
                      <MepStarList value={stars[m.id]} />
                    </TableCell>
                  </TableRow>
                )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function MepStarList({ value }: { value: AdminMepStar[] | { error: string } | undefined }) {
  if (!value) return <p className="text-sm text-gray-400">Loading…</p>;
  if (!Array.isArray(value)) return <p className="text-sm text-red-500">{value.error}</p>;
  if (value.length === 0) return <p className="text-sm text-gray-500">No stars yet.</p>;
  return (
    <ul className="space-y-1">
      {value.map((s) => (
        <li key={`${s.account_type}:${s.id}`} className="text-sm text-[#2A2A2A]">
          <span className="font-medium">{s.name ?? 'Removed account'}</span>
          <span className="text-gray-500">
            {` · ${STAR_TYPE_LABEL[s.account_type]}`}
            {[s.city, s.state].filter(Boolean).length > 0 ? ` · ${[s.city, s.state].filter(Boolean).join(', ')}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}
