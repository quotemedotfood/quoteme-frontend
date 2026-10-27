import { useState, useEffect, useCallback, Fragment } from 'react';
import { Link } from 'react-router';
import { Check, Shuffle, X, Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../../components/ui/alert-dialog';
import {
  getWineMatchSubmissions,
  approveWineMatch,
  relinkWineMatch,
  rejectWineMatch,
  getAdminBeverages,
  type WineMatchSubmission,
  type WineMatchStatus,
  type AdminBeverageRow,
} from '../../services/adminApi';
import { AdminEmptyState } from './_adminEmptyState';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';
import { colorLabel } from './_beverageLabels';

// BEVERAGES > REVIEW MATCHES (Moose, 2026-10-27). The wine match queue:
// every row is a link Beverages::Resolver already made and flagged. Reader and
// writer of QuoteMe Api::V1::Admin::WineMatchSubmissionsController.
//   Approve: the link stands.
//   Relink:  the source row moves to the beverage picked here.
//   Reject:  the source row is unlinked; the submission is archived.
// QM admins only (the layout and the server both enforce it).

const PER_PAGE = 50;
const RELINK_SEARCH_DEBOUNCE_MS = 300;

const STATUS_TABS: Array<{ value: WineMatchStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Rejected' },
];

function formatDate(d: string | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function text(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

// What the flagged row said, in its own words. A list row carries producer,
// wine name and vintage; a catalog product carries its product name and item
// number.
export function sourceSummary(s: WineMatchSubmission): { line: string; detail: string } {
  const raw = s.source_data.raw || {};
  if (s.source_data.source_table === 'products') {
    return {
      line: text(raw.product_name) || text(raw.brand) || 'Catalog product',
      detail: ['Catalog', text(raw.item_number) && `item ${text(raw.item_number)}`, text(raw.unit_size)].filter(Boolean).join(', '),
    };
  }
  const line = [raw.producer, raw.wine_name, raw.vintage].map(text).filter(Boolean).join(' ');
  const where = raw.pairme_capture_id ? 'Diner photo' : 'Restaurant list';
  return {
    line: line || 'List row',
    detail: [where, text(raw.list_section), text(raw.color), text(raw.region)].filter(Boolean).join(', '),
  };
}

export function QMAdminWineMatches() {
  const [status, setStatus] = useState<WineMatchStatus>('pending');
  const [rows, setRows] = useState<WineMatchSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, per_page: PER_PAGE, total_count: 0, total_pages: 0 });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [confirmReject, setConfirmReject] = useState<WineMatchSubmission | null>(null);

  // The relink picker: one open at a time.
  const [relinkFor, setRelinkFor] = useState<string | null>(null);
  const [relinkQuery, setRelinkQuery] = useState('');
  const [relinkResults, setRelinkResults] = useState<AdminBeverageRow[]>([]);
  const [relinkSearching, setRelinkSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getWineMatchSubmissions({ status, page, per_page: PER_PAGE });
    if (res.data) {
      setRows(res.data.rows);
      setMeta({
        page: res.data.page,
        per_page: res.data.per_page,
        total_count: res.data.total_count,
        total_pages: res.data.total_pages,
      });
      setError(null);
    } else {
      setError(res.error || 'Failed to load');
    }
    setLoading(false);
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!relinkFor || relinkQuery.trim().length < 2) {
      setRelinkResults([]);
      return;
    }
    let live = true;
    const timer = setTimeout(async () => {
      setRelinkSearching(true);
      const res = await getAdminBeverages({ page: 1, per_page: 10, q: relinkQuery.trim() });
      if (!live) return;
      setRelinkResults(res.data?.rows ?? []);
      setRelinkSearching(false);
    }, RELINK_SEARCH_DEBOUNCE_MS);
    return () => { live = false; clearTimeout(timer); };
  }, [relinkFor, relinkQuery]);

  // A decided row leaves the pending list; the count follows it.
  function settle(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setMeta((m) => ({ ...m, total_count: Math.max(0, m.total_count - 1) }));
    setRelinkFor((cur) => (cur === id ? null : cur));
  }

  async function act(id: string, call: () => ReturnType<typeof approveWineMatch>) {
    setBusyId(id);
    setRowError((prev) => { const next = { ...prev }; delete next[id]; return next; });
    const res = await call();
    setBusyId(null);
    if (res.data) settle(id);
    else setRowError((prev) => ({ ...prev, [id]: res.error || 'That did not go through' }));
  }

  function openRelink(s: WineMatchSubmission) {
    if (relinkFor === s.id) {
      setRelinkFor(null);
      return;
    }
    setRelinkFor(s.id);
    setRelinkQuery(s.beverage?.name || '');
    setRelinkResults([]);
  }

  const pendingView = status === 'pending';

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1 className="text-2xl font-bold text-[#2A2A2A] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        Review matches
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Links between a list row or catalog product and a beverage that were flagged when they were made.
        Approve keeps the link, Relink moves the row to another beverage, Reject unlinks it.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-5" role="tablist" aria-label="Status">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={status === t.value}
            data-testid={`wine-match-tab-${t.value}`}
            onClick={() => { setStatus(t.value); setPage(1); setRelinkFor(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              status === t.value ? 'bg-[#7FAEC2] text-white' : 'text-[#4F4F4F] bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-2" data-testid="wine-match-count">
          {meta.total_count} {pendingView ? 'waiting' : 'matches'}
        </span>
      </div>

      {loading && <p className="text-sm text-gray-400 py-8">Loading...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}
      {!loading && !error && rows.length === 0 && <AdminEmptyState label="matches" />}

      {!loading && !error && rows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Submitted</TableHead>
                  <TableHead>The row said</TableHead>
                  <TableHead>Linked to</TableHead>
                  <TableHead>Why it was flagged</TableHead>
                  <TableHead className="text-right">{pendingView ? 'Actions' : 'Decision'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => {
                  const src = sourceSummary(s);
                  const reasons = s.source_data.reasons || [];
                  const busy = busyId === s.id;
                  return (
                    <Fragment key={s.id}>
                      <TableRow className="hover:bg-gray-50" data-testid={`wine-match-row-${s.id}`}>
                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">{formatDate(s.submitted_at)}</TableCell>
                        <TableCell>
                          <div className="text-sm text-[#2A2A2A]">{src.line}</div>
                          {src.detail && <div className="text-xs text-gray-400">{src.detail}</div>}
                        </TableCell>
                        <TableCell>
                          {s.beverage ? (
                            <>
                              <Link
                                to={`/qm-admin/beverages/wines/${s.beverage.id}`}
                                className="text-sm font-medium text-[#2A2A2A] hover:text-[#7FAEC2] hover:underline"
                              >
                                {s.beverage.name}
                              </Link>
                              <div className="text-xs text-gray-400">
                                {[s.beverage.brand?.name, s.beverage.color && colorLabel(s.beverage.color)].filter(Boolean).join(', ')}
                              </div>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">Not linked</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {reasons.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-0.5">
                              {reasons.map((r) => <li key={r}>{r}</li>)}
                            </ul>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {pendingView ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-green-700 hover:text-green-800"
                                disabled={busy}
                                aria-label={`Approve the link to ${s.beverage?.name || 'this beverage'}`}
                                data-testid={`wine-match-approve-${s.id}`}
                                onClick={() => act(s.id, () => approveWineMatch(s.id))}
                              >
                                <Check size={14} className="mr-1" /> Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-[#7FAEC2] hover:text-[#6A9AB0]"
                                disabled={busy}
                                aria-expanded={relinkFor === s.id}
                                aria-label={`Relink ${src.line} to another beverage`}
                                data-testid={`wine-match-relink-${s.id}`}
                                onClick={() => openRelink(s)}
                              >
                                <Shuffle size={14} className="mr-1" /> Relink
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-red-600 hover:text-red-700"
                                disabled={busy}
                                aria-label={`Reject the link from ${src.line}`}
                                data-testid={`wine-match-reject-${s.id}`}
                                onClick={() => setConfirmReject(s)}
                              >
                                <X size={14} className="mr-1" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              {s.status === 'archived' ? 'Rejected' : 'Approved'} {formatDate(s.reviewed_at)}
                              {s.source_data.relinked_from && <div>Relinked</div>}
                              {s.review_notes && <div className="text-gray-400">{s.review_notes}</div>}
                            </div>
                          )}
                          {rowError[s.id] && <div className="text-xs text-red-500 mt-1">{rowError[s.id]}</div>}
                        </TableCell>
                      </TableRow>
                      {relinkFor === s.id && (
                        <TableRow className="bg-gray-50" data-testid={`wine-match-relink-panel-${s.id}`}>
                          <TableCell colSpan={5}>
                            <div className="flex flex-col gap-2 max-w-xl">
                              <label className="text-xs text-gray-500" htmlFor={`relink-q-${s.id}`}>
                                Move this row to which beverage?
                              </label>
                              <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                  id={`relink-q-${s.id}`}
                                  value={relinkQuery}
                                  onChange={(e) => setRelinkQuery(e.target.value)}
                                  placeholder="Search name, producer, region..."
                                  className="pl-8"
                                  autoFocus
                                />
                              </div>
                              {relinkSearching && <p className="text-xs text-gray-400">Searching...</p>}
                              {!relinkSearching && relinkQuery.trim().length >= 2 && relinkResults.length === 0 && (
                                <p className="text-xs text-gray-400">No beverages found</p>
                              )}
                              <ul className="divide-y divide-gray-100 bg-white border border-gray-200 rounded-md">
                                {relinkResults
                                  .filter((b) => b.id !== s.beverage?.id)
                                  .map((b) => (
                                    <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2">
                                      <div>
                                        <div className="text-sm text-[#2A2A2A]">{b.name}</div>
                                        <div className="text-xs text-gray-400">
                                          {[b.brand?.name, b.color && colorLabel(b.color), b.region, b.country].filter(Boolean).join(', ')}
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        disabled={busy}
                                        data-testid={`wine-match-relink-to-${b.id}`}
                                        onClick={() => act(s.id, () => relinkWineMatch(s.id, b.id))}
                                      >
                                        Move here
                                      </Button>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {!loading && meta.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-400">
            Showing {(meta.page - 1) * meta.per_page + 1} to{' '}
            {Math.min(meta.page * meta.per_page, meta.total_count)} of {meta.total_count}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <span className="text-xs text-gray-500">
              Page {meta.page} of {meta.total_pages}
            </span>
            <Button variant="outline" size="sm" disabled={meta.page >= meta.total_pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Reject confirm. Reject unlinks the source row from the corpus; the
          row itself stays on its list or catalog. */}
      <AlertDialog open={!!confirmReject} onOpenChange={(open) => { if (!open) setConfirmReject(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Unlink {confirmReject ? sourceSummary(confirmReject).line : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The row stays where it is, with no link to{' '}
              {confirmReject?.beverage?.name || 'a beverage'}. This match moves to Rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              data-testid="wine-match-reject-confirm"
              onClick={() => {
                const target = confirmReject;
                setConfirmReject(null);
                if (target) act(target.id, () => rejectWineMatch(target.id));
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
