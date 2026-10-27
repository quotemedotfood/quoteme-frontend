// QM ADMIN: ONE RESTAURANT LOAD (Moose, 2026-10-24).
//
// Shows one uploaded crawler CSV: its status in words, the dry run report,
// and the two writes, Apply and Revert. The server is the authority on both:
// the buttons follow can_apply / can_revert, the sentence under a disabled
// button is the server's apply_refusal / revert_refusal, and a 409 REFUSED on
// the click itself is shown as the server wrote it.
//
// While a job is working on the batch (dry run, apply, revert) the page asks
// for the batch again every few seconds and stops once the status settles.
//
// MARK AS INTERRUPTED. A deploy can kill the process mid-run and leave a
// batch applying or reverting with nothing behind it, which blocks every
// later apply and revert. The button shows only in those two statuses,
// follows can_mark_interrupted, and shows mark_interrupted_refusal when off.
// It changes the batch's status and nothing else.
//
// READS GET /api/v1/admin/restaurant_load_batches/:id.
// WRITES POST .../:id/apply (optional pair_after_apply), POST .../:id/revert
// and POST .../:id/mark_interrupted.
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Copy } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../components/ui/alert-dialog';
import {
  applyRestaurantLoadBatch,
  getRestaurantLoadBatch,
  markRestaurantLoadBatchInterrupted,
  revertRestaurantLoadBatch,
  type RestaurantLoadBatchDetail,
} from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';
import {
  RESTAURANT_LOAD_POLL_MS,
  formatBytes,
  formatWhen,
  isRestaurantLoadRunning,
  restaurantLoadStatusWords,
} from './_restaurantLoadStatus';

function rowsPhrase(n: number | null | undefined): string {
  if (n == null) return 'every row in this file';
  return `${n} ${n === 1 ? 'row' : 'rows'}`;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-[#2A2A2A] break-words">{children}</dd>
    </div>
  );
}

// A report is the loader's printed output, up to 1 to 2 MB of text. Collapsed
// by default so the page does not lay out two megabytes on open.
export function ReportBlock({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('Copied');
    } catch {
      setCopied('Copy did not work in this browser. Open the report and select the text.');
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-[#2A2A2A]">{title}</h2>
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? `Hide ${title.toLowerCase()}` : `Show ${title.toLowerCase()}`}
        </Button>
        <Button variant="outline" size="sm" onClick={copy} aria-label={`Copy ${title.toLowerCase()}`}>
          <Copy size={14} className="mr-1" />
          Copy
        </Button>
        {copied && <span className="text-xs text-gray-500">{copied}</span>}
      </div>
      {open && (
        <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre rounded-md bg-gray-50 border border-gray-100 p-3 text-xs font-mono text-[#2A2A2A]">
          {text}
        </pre>
      )}
    </section>
  );
}

function pairReportWords(report: Record<string, unknown> | null): string | null {
  if (!report) return null;
  if (typeof report.error === 'string') return `Pairing did not queue: ${report.error}`;
  if (report.switch_on === false) {
    return typeof report.note === 'string' ? report.note : 'Pairing is switched off on this server; nothing was queued.';
  }
  if (typeof report.queued === 'number') {
    const total = typeof report.restaurants === 'number' ? ` of ${report.restaurants}` : '';
    return `${report.queued}${total} restaurants queued for pairing.`;
  }
  return null;
}

export function QMAdminRestaurantLoadDetail({ pollMs = RESTAURANT_LOAD_POLL_MS }: { pollMs?: number } = {}) {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<RestaurantLoadBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Bumped after every fetch so the poll effect re-arms even when the status
  // did not change between two answers.
  const [fetchCount, setFetchCount] = useState(0);

  const [pairAfter, setPairAfter] = useState(false);
  const [confirm, setConfirm] = useState<'apply' | 'revert' | 'interrupt' | null>(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await getRestaurantLoadBatch(id);
    if (res.data) {
      setBatch(res.data.restaurant_load_batch);
      setLoadError(null);
    } else {
      setLoadError(res.error || 'Failed to load');
    }
    setLoading(false);
    setFetchCount((n) => n + 1);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const running = batch ? isRestaurantLoadRunning(batch.status) : false;
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(load, pollMs);
    return () => clearTimeout(timer);
  }, [running, fetchCount, load, pollMs]);

  const runAction = async (kind: 'apply' | 'revert' | 'interrupt') => {
    if (!batch) return;
    setConfirm(null);
    setActing(true);
    setActionError(null);
    const res =
      kind === 'apply'
        ? await applyRestaurantLoadBatch(batch.id, { pairAfterApply: pairAfter })
        : kind === 'revert'
          ? await revertRestaurantLoadBatch(batch.id)
          : await markRestaurantLoadBatchInterrupted(batch.id);
    setActing(false);
    if (res.error) {
      setActionError(res.error);
    }
    // Either way, read the batch again: on success the status is now applying
    // or reverting and polling starts; on a refusal the server's reasons and
    // buttons may have changed since this page last asked.
    await load();
  };

  if (loading) {
    return (
      <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
        <p className="text-sm text-gray-400 py-8">Loading...</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
        <BackLink />
        <p className="text-sm text-red-500 py-8">{loadError || 'This load was not found.'}</p>
      </div>
    );
  }

  const counts = batch.ledger_counts;
  const pairWords = pairReportWords(batch.pair_report);
  const filename = batch.filename || 'this file';
  // Only these two statuses can be left behind by a killed run.
  const stuckWriting = batch.status === 'applying' || batch.status === 'reverting';

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <BackLink />
      <h1
        className="text-2xl font-bold text-[#2A2A2A] mb-2 break-words"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {batch.filename || 'Unnamed file'}
      </h1>
      <p className="text-sm mb-6" data-testid="restaurant-load-status">
        <span className="text-gray-500">Status: </span>
        <span className="font-medium text-[#2A2A2A]">{restaurantLoadStatusWords(batch.status)}</span>
        {running && <span className="text-gray-400"> (checking every few seconds)</span>}
      </p>
      {loadError && <p className="text-sm text-red-500 mb-4">Could not refresh: {loadError}</p>}

      {batch.error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 whitespace-pre-wrap">
          {batch.error}
        </div>
      )}

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <Fact label="Rows">{batch.row_count ?? '-'}</Fact>
        <Fact label="File size">{formatBytes(batch.byte_size)}</Fact>
        <Fact label="Uploaded by">{batch.requested_by?.email ?? '-'}</Fact>
        <Fact label="Uploaded">{formatWhen(batch.created_at)}</Fact>
        <Fact label="Loaded by">{batch.applied_by?.email ?? '-'}</Fact>
        <Fact label="Load started">{formatWhen(batch.apply_started_at)}</Fact>
        <Fact label="Reverted by">{batch.reverted_by?.email ?? '-'}</Fact>
        <Fact label="Last job finished">{formatWhen(batch.finished_at)}</Fact>
        <Fact label="Restaurants">
          {counts ? `${counts.restaurants_created} created, ${counts.restaurants_updated} updated` : '-'}
        </Fact>
        <Fact label="Menus">
          {counts ? `${counts.menus_created} created, ${counts.menus_updated} updated` : '-'}
        </Fact>
        <Fact label="Pair after loading">{batch.pair_after_apply ? 'Yes' : 'No'}</Fact>
        <Fact label="Pairing">{pairWords ?? '-'}</Fact>
      </dl>

      <section className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-[#2A2A2A] mb-3">Load into production</h2>
        <label className="flex items-center gap-2 text-sm text-[#4F4F4F] mb-3">
          <input
            type="checkbox"
            checked={pairAfter}
            onChange={(e) => setPairAfter(e.target.checked)}
            disabled={!batch.can_apply || acting}
          />
          Pair these restaurants after loading
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => { setActionError(null); setConfirm('apply'); }}
            disabled={!batch.can_apply || acting}
            className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white"
          >
            Apply
          </Button>
          <Button
            variant="outline"
            onClick={() => { setActionError(null); setConfirm('revert'); }}
            disabled={!batch.can_revert || acting}
          >
            Revert
          </Button>
          {acting && <span className="text-xs text-gray-500">Sending...</span>}
        </div>
        {!batch.can_apply && batch.apply_refusal && (
          <p className="mt-3 text-xs text-gray-500" data-testid="apply-refusal">
            Apply is not available: {batch.apply_refusal}
          </p>
        )}
        {!batch.can_revert && batch.revert_refusal && (
          <p className="mt-1 text-xs text-gray-500" data-testid="revert-refusal">
            Revert is not available: {batch.revert_refusal}
          </p>
        )}
        {actionError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {actionError}
          </p>
        )}
      </section>

      {stuckWriting && (
        <section className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-[#2A2A2A] mb-1">Stuck on this status?</h2>
          <p className="text-xs text-gray-500 mb-3">
            If a restart stopped this run, the batch stays here and blocks every other load and
            revert until it is marked interrupted.
          </p>
          <Button
            variant="outline"
            onClick={() => { setActionError(null); setConfirm('interrupt'); }}
            disabled={!batch.can_mark_interrupted || acting}
          >
            Mark as interrupted
          </Button>
          {!batch.can_mark_interrupted && batch.mark_interrupted_refusal && (
            <p className="mt-3 text-xs text-gray-500" data-testid="mark-interrupted-refusal">
              Mark as interrupted is not available: {batch.mark_interrupted_refusal}
            </p>
          )}
        </section>
      )}

      {batch.dry_run_report && <ReportBlock title="Dry run report" text={batch.dry_run_report} />}
      {batch.apply_report && <ReportBlock title="Load report" text={batch.apply_report} />}
      {batch.revert_report && <ReportBlock title="Revert report" text={batch.revert_report} />}

      <AlertDialog open={confirm === 'apply'} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Write {rowsPhrase(batch.row_count)} to production?</AlertDialogTitle>
            <AlertDialogDescription>
              This writes {rowsPhrase(batch.row_count)} from {filename} into the production database,
              creating and updating live restaurants and menus.
              {pairAfter
                ? ' When the load finishes, the restaurants it created or updated are queued for pairing.'
                : ' Nothing is paired afterwards.'}{' '}
              It can be reverted from this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => runAction('apply')}>
              Write to production
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm === 'revert'} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert this load in production?</AlertDialogTitle>
            <AlertDialogDescription>
              This undoes what {filename} wrote to the production database
              {counts
                ? `: ${counts.restaurants_created} restaurants and ${counts.menus_created} menus it created are removed, and ${counts.restaurants_updated} restaurants and ${counts.menus_updated} menus it updated go back to their earlier values.`
                : '.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => runAction('revert')}
            >
              Revert in production
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm === 'interrupt'} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this {batch.status === 'reverting' ? 'revert' : 'load'} as interrupted?</AlertDialogTitle>
            <AlertDialogDescription>
              This only unblocks the queue so another load or revert can run. It does not undo
              anything: rows this run already wrote to production stay as they are. They can be
              reverted from this page afterwards if the revert ledger covers them, which it does
              for every row that committed: each row is recorded as it is written, even in a run
              stopped outright.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => runAction('interrupt')}>
              Unblock the queue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/qm-admin/restaurant-loads"
      className="inline-flex items-center gap-1 text-xs text-[#4F4F4F] hover:text-[#7FAEC2] mb-4"
    >
      <ArrowLeft size={14} />
      All restaurant loads
    </Link>
  );
}
