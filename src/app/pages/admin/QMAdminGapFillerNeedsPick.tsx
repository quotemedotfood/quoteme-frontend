import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import {
  getGapFillerNeedsPick,
  getGapFillerNeedsPickQuotes,
  getAdminDistributors,
  GapFillerNeedPick,
  GapFillerSourceQuote,
  AdminDistributor,
} from '../../services/adminApi';

const MISS_REASON_LABELS: Record<string, string> = {
  clean_miss: 'Clean miss',
  no_candidates: 'No candidates',
  below_floor: 'Below floor',
  category_blocked: 'Category blocked',
  format_blocked: 'Format blocked',
  identity_locked: 'Identity locked',
  ambiguous: 'Ambiguous',
};

function missReasonLabel(reason: string): string {
  return MISS_REASON_LABELS[reason] || reason.replace(/_/g, ' ');
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

interface MissReasonChipsProps {
  missReasons: Record<string, number>;
}

function MissReasonChips({ missReasons }: MissReasonChipsProps) {
  const entries = Object.entries(missReasons || {}).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([reason, count]) => (
        <Badge key={reason} variant="outline" className="text-[10px] border-gray-200 text-[#4F4F4F] bg-gray-50">
          {missReasonLabel(reason)} · {count}
        </Badge>
      ))}
    </div>
  );
}

interface DrillDownPanelProps {
  row: GapFillerNeedPick;
}

function DrillDownPanel({ row }: DrillDownPanelProps) {
  const [quotes, setQuotes] = useState<GapFillerSourceQuote[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getGapFillerNeedsPickQuotes(row.drill_down_token).then((res) => {
      if (cancelled) return;
      if (res.data) setQuotes(res.data.quotes);
      else setError(res.error || 'Failed to load source quotes');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [row.drill_down_token]);

  return (
    <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
      <TableCell colSpan={6} className="p-0">
        <div className="px-6 py-4">
          {loading && <p className="text-xs text-gray-400 py-2">Loading source quotes...</p>}
          {error && <p className="text-xs text-red-500 py-2">{error}</p>}
          {!loading && !error && quotes && quotes.length === 0 && (
            <p className="text-xs text-gray-400 py-2">No source quotes found for this component.</p>
          )}
          {!loading && !error && quotes && quotes.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs">Quote</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Restaurant</TableHead>
                    <TableHead className="text-xs">Rep</TableHead>
                    <TableHead className="text-xs">Miss Reason</TableHead>
                    <TableHead className="text-xs">Occurred</TableHead>
                    <TableHead className="text-xs text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((q) => (
                    <TableRow key={`${q.quote_id}-${q.occurred_at}`} className="hover:bg-gray-50">
                      <TableCell className="text-xs font-mono text-[#2A2A2A]">{q.quote_id}</TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                          {q.quote_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{q.restaurant_name}</TableCell>
                      <TableCell className="text-xs text-gray-600">{q.rep_email}</TableCell>
                      <TableCell className="text-xs text-gray-600">{missReasonLabel(q.miss_reason)}</TableCell>
                      <TableCell className="text-xs text-gray-500">{formatDateTime(q.occurred_at)}</TableCell>
                      <TableCell className="text-right">
                        {/* P0: old triage view (/rep/quotes/:id) deleted — route
                            into the canonical quote-build flow instead. Uses the
                            ?quoteId= query form (not state) since this opens in a
                            new tab. */}
                        <Link
                          to={`/map-ingredients?quoteId=${q.quote_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#7FAEC2] hover:underline"
                        >
                          Open <ExternalLink size={11} />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function QMAdminGapFillerNeedsPick() {
  const [rows, setRows] = useState<GapFillerNeedPick[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distributors, setDistributors] = useState<AdminDistributor[]>([]);
  const [distributorFilter, setDistributorFilter] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async (distributorId: string) => {
    setLoading(true);
    setError(null);
    const res = await getGapFillerNeedsPick(distributorId ? { distributor_id: distributorId } : undefined);
    if (res.data) {
      setRows(res.data.needs_pick);
      setCount(res.data.count);
    } else {
      setError(res.error || 'Failed to load unmatched components');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(distributorFilter);
  }, [distributorFilter, load]);

  useEffect(() => {
    getAdminDistributors().then((res) => {
      if (res.data) setDistributors(res.data);
    });
  }, []);

  const distributorOptions = useMemo(
    () => [...distributors].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [distributors]
  );

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const rowKey = (row: GapFillerNeedPick) => `${row.distributor_id}::${row.canonical_key}`;

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <div className="flex items-center justify-between mb-2">
        <h1
          className="text-2xl font-bold text-[#2A2A2A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Needs Your Pick
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Components the matching engine could not confidently resolve on live quotes. Pick the
        right catalog product once and it applies to every future occurrence.
      </p>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <label htmlFor="distributor-filter" className="text-xs text-gray-500">Distributor</label>
          <select
            id="distributor-filter"
            value={distributorFilter}
            onChange={(e) => setDistributorFilter(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-1 focus:ring-[#7FAEC2]"
          >
            <option value="">All distributors</option>
            {distributorOptions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-gray-400 ml-auto">{count} unmatched component{count !== 1 ? 's' : ''}</span>
      </div>

      {loading && <p className="text-sm text-gray-400 py-8">Loading unmatched components...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No unmatched components yet</p>
          <p className="text-sm mt-1">Every component on recent quotes matched confidently.</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Distributor</TableHead>
                  <TableHead className="text-right">Occurrences</TableHead>
                  <TableHead>Miss Reasons</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const key = rowKey(row);
                  const isOpen = expanded.has(key);
                  return (
                    <Fragment key={key}>
                      <TableRow
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleExpanded(key)}
                      >
                        <TableCell>
                          {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-[#2A2A2A]">{row.component_name}</span>
                          <span className="block text-xs text-gray-400 font-mono">{row.canonical_key}</span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{row.distributor_name}</TableCell>
                        <TableCell className="text-sm text-right font-semibold text-[#2A2A2A]">{row.occurrence_count}</TableCell>
                        <TableCell><MissReasonChips missReasons={row.miss_reasons} /></TableCell>
                        <TableCell className="text-sm text-gray-500">{formatDate(row.last_seen)}</TableCell>
                      </TableRow>
                      {isOpen && <DrillDownPanel row={row} />}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
