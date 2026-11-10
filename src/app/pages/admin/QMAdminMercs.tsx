// QM admin Mercs list (Mercs + Hotels, step 2). A merc is a market expansion
// partner. Reads GET /api/v1/admin/mercs (name, email, last sign-in). The
// Send sign-in link button is the ONLY way a merc gets an email:
// POST /api/v1/admin/mercs/:id/send_sign_in_link, one press, one email.
// Mercs are added by the backend's mercs:add task, not from this page.
import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { getAdminMercs, sendMercSignInLink, AdminMerc } from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';

/** Last sign-in as a short date and time, or "Never". */
export function lastSignInLabel(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function QMAdminMercs() {
  const [mercs, setMercs] = useState<AdminMerc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [notice, setNotice] = useState<Record<string, { ok: boolean; text: string }>>({});

  useEffect(() => {
    let live = true;
    getAdminMercs().then((res) => {
      if (!live) return;
      if (res.data) setMercs(res.data);
      else setError(res.error || 'Failed to load');
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  async function handleSend(m: AdminMerc) {
    if (sending) return;
    if (!window.confirm(`Email ${m.name} a sign-in link at ${m.email}?`)) return;
    setSending(m.id);
    const res = await sendMercSignInLink(m.id);
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
        Mercs
      </h1>

      {loading && <p className="text-sm text-gray-400 py-8">Loading…</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && mercs.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No mercs yet.</p>
        </div>
      )}

      {mercs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead className="text-right">Sign-in link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mercs.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-sm text-gray-600">{m.email}</TableCell>
                  <TableCell className="text-sm text-gray-600">{lastSignInLabel(m.last_login_at)}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
