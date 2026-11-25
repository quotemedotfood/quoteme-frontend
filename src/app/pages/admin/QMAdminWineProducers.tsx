// QM admin Wine producers (Moose 2026-11-23, QuoteMe #1042). The producer rows
// of brands, which the Brands page does not list (it shows companies that log
// in). Moose ticks "Everywhere" on a brand a shopper finds in any Colorado
// grocery or chain liquor store, and checks the list here. No rank: yes or no.
//
// Reads GET /api/v1/admin/wine_producers (?q, ?everywhere, ?page).
// Writes PATCH /api/v1/admin/wine_producers/:id { everywhere }.
import { useEffect, useRef, useState } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  getAdminWineProducers,
  setAdminWineProducerEverywhere,
  AdminWineProducer,
} from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';

type Show = 'all' | 'yes' | 'no';
const SHOW_LABELS: Record<Show, string> = { all: 'All', yes: 'Everywhere', no: 'Not everywhere' };

export function QMAdminWineProducers() {
  const [rows, setRows] = useState<AdminWineProducer[]>([]);
  const [total, setTotal] = useState(0);
  const [everywhereTotal, setEverywhereTotal] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [show, setShow] = useState<Show>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const call = useRef(0);

  async function load(nextPage = page) {
    const mine = ++call.current;
    setLoading(true);
    const res = await getAdminWineProducers({ q, everywhere: show, page: nextPage });
    if (mine !== call.current) return; // a newer search answered first
    setLoading(false);
    if (res.data) {
      setRows(res.data.producers);
      setTotal(res.data.total);
      setEverywhereTotal(res.data.everywhere_total);
      setPerPage(res.data.per_page);
      setError(null);
    } else {
      setError(res.error || 'Failed to load');
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(1); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, show]);

  async function toggle(p: AdminWineProducer) {
    if (saving) return;
    setSaving(p.id);
    setRowError(null);
    const res = await setAdminWineProducerEverywhere(p.id, !p.everywhere);
    setSaving(null);
    if (res.data) {
      const next = res.data;
      setRows((rs) => rs.map((r) => (r.id === next.id ? next : r)));
      setEverywhereTotal((n) => n + (next.everywhere ? 1 : -1));
    } else {
      setRowError(`${p.name}: ${res.error || 'not saved'}`);
    }
  }

  const pages = Math.max(1, Math.ceil(total / perPage));
  const go = (n: number) => { setPage(n); load(n); };

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1 className="text-2xl font-bold text-[#2A2A2A] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        Wine producers
      </h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Every wine brand in our corpus. Tick <strong>Everywhere</strong> on a brand a shopper finds in any Colorado grocery or chain liquor store. Stores and companies that log in are on the Brands and Retail pages, not here.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search wine producers…"
          aria-label="Search wine producers"
          className="max-w-xs"
        />
        <div className="flex gap-1" role="group" aria-label="Show">
          {(Object.keys(SHOW_LABELS) as Show[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={show === s ? 'default' : 'outline'}
              aria-pressed={show === s}
              className={show === s ? 'bg-[#7FAEC2] hover:bg-[#6a9aae] text-white h-8 text-xs' : 'h-8 text-xs'}
              onClick={() => setShow(s)}
            >
              {SHOW_LABELS[s]}
            </Button>
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-auto" data-testid="wine-producers-counts">
          {total.toLocaleString()} shown · {everywhereTotal.toLocaleString()} ticked everywhere
        </span>
      </div>

      {rowError && <p role="alert" className="text-xs text-red-500 mb-2">{rowError}</p>}
      {error && <p className="text-sm text-red-500 py-4" role="alert">{error}</p>}
      {loading && rows.length === 0 && <p className="text-sm text-gray-400 py-8">Loading…</p>}
      {!loading && !error && rows.length === 0 && <p className="text-sm text-gray-400 py-8">No wine producers match.</p>}

      {rows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto max-w-3xl">
          <table className="w-full text-sm" data-testid="wine-producers">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs w-28">Everywhere</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Name</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs">Wines</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Id</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={p.everywhere}
                      disabled={saving === p.id}
                      onChange={() => toggle(p)}
                      aria-label={`Everywhere: ${p.name}`}
                      className="h-4 w-4 accent-[#7FAEC2]"
                    />
                  </td>
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2 text-right">{p.wines.toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">{p.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page <= 1 || loading} onClick={() => go(page - 1)}>Previous</Button>
          <span>Page {page} of {pages}</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page >= pages || loading} onClick={() => go(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
