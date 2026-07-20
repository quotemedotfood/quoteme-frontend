import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import { ExternalLink, Bookmark, Home } from 'lucide-react';
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
  getOperationalMemoryLearnings,
  revertOperationalMemoryLearning,
  getAdminDistributors,
  OperationalMemoryLearning,
  AdminDistributor,
} from '../../services/adminApi';

// ─── QMAdminOperationalMemoryLearnings ────────────────────────────────────
// Operational Memory Epic, Lane 2. QM-admin-ONLY read + revert view over
// every promoted memory row (rep tier + distributor "preferred" tier), full
// provenance (which correction taught it, who, when, from which quote,
// which tier). NEVER shown to distributors or reps -- this page lives only
// under the qm-admin shell.
//
// Revert is FUTURE-ONLY: it stops the row from surfacing on any future
// alignment run. It never touches the correction history or any
// already-sent/drafted quote -- quotes are historical documents.

const CORRECTION_TYPE_LABELS: Record<string, string> = {
  wrong_product: 'Wrong product',
  wrong_form: 'Wrong form',
  wrong_pack: 'Wrong pack size',
  not_carried: 'Not carried',
  out_of_stock: 'Out of stock',
  better_fit: 'Better fit',
  rep_preference: 'Rep preference',
  distributor_preference: 'Distributor preference',
  distributor_mandate: 'Distributor mandate',
};

function correctionTypeLabel(type: string | null): string {
  if (!type) return '-';
  return CORRECTION_TYPE_LABELS[type] || type.replace(/_/g, ' ');
}

function formatDateTime(d: string | null | undefined): string {
  if (!d) return '-';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function TierBadge({ tier }: { tier: 'rep' | 'preferred' }) {
  if (tier === 'rep') {
    return (
      <Badge variant="outline" className="text-[10px] border-gray-200 text-[#2A2A2A] bg-gray-50 gap-1">
        <Bookmark size={10} /> Rep
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] border-gray-200 text-[#2A2A2A] bg-gray-50 gap-1">
      <Home size={10} /> Distributor
    </Badge>
  );
}

// Operational Memory Epic, Lane 2 revision (Ruling 2): mandate vs preference,
// with attribution. Only meaningful for tier "preferred" -- row.tier "rep"
// always passes signalType: null and renders "-".
function SignalTypeBadge({
  signalType,
  mandateReason,
  mandateSetBy,
}: {
  signalType: 'mandate' | 'preference' | null;
  mandateReason: string | null;
  mandateSetBy: { id: string; name: string; email: string } | null;
}) {
  if (!signalType) return <span className="text-gray-300">-</span>;

  if (signalType === 'mandate') {
    const hover = mandateSetBy
      ? `Set by ${mandateSetBy.name}${mandateReason ? `: ${mandateReason}` : ''}.`
      : mandateReason || 'Distributor mandate.';
    return (
      <Badge
        variant="outline"
        className="text-[10px] border-amber-200 text-amber-800 bg-amber-50"
        title={hover}
        aria-label={hover}
      >
        Mandate
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-[10px] border-gray-200 text-[#2A2A2A] bg-gray-50">
      Preference
    </Badge>
  );
}

export function QMAdminOperationalMemoryLearnings() {
  const [rows, setRows] = useState<OperationalMemoryLearning[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distributors, setDistributors] = useState<AdminDistributor[]>([]);
  const [distributorFilter, setDistributorFilter] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<'' | 'rep' | 'preferred'>('');
  const [signalTypeFilter, setSignalTypeFilter] = useState<'' | 'mandate' | 'preference'>('');
  const [includeReverted, setIncludeReverted] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [revertError, setRevertError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getOperationalMemoryLearnings({
      distributor_id: distributorFilter || undefined,
      tier: tierFilter || undefined,
      signal_type: signalTypeFilter || undefined,
      include_reverted: includeReverted,
    });
    if (res.data) {
      setRows(res.data.learnings);
      setCount(res.data.count);
    } else {
      setError(res.error || 'Failed to load learnings');
    }
    setLoading(false);
  }, [distributorFilter, tierFilter, signalTypeFilter, includeReverted]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getAdminDistributors().then((res) => {
      if (res.data) setDistributors(res.data);
    });
  }, []);

  const distributorOptions = useMemo(
    () => [...distributors].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [distributors]
  );

  async function handleRevert(row: OperationalMemoryLearning) {
    setRevertingId(row.id);
    setRevertError(null);
    const res = await revertOperationalMemoryLearning(row.id);
    setRevertingId(null);
    if (res.error) {
      setRevertError(res.error);
      return;
    }
    load();
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <div className="flex items-center justify-between mb-2">
        <h1
          className="text-2xl font-bold text-[#2A2A2A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Memory Learnings
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Every rep and distributor preference the system has remembered, with full provenance.
        Not shown to distributors. Revert stops a row from surfacing on future quotes only; it
        never changes a quote that was already sent or drafted.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <label htmlFor="learnings-distributor-filter" className="text-xs text-gray-500">Distributor</label>
          <select
            id="learnings-distributor-filter"
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

        <div className="flex items-center gap-2">
          <label htmlFor="learnings-tier-filter" className="text-xs text-gray-500">Tier</label>
          <select
            id="learnings-tier-filter"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as '' | 'rep' | 'preferred')}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-1 focus:ring-[#7FAEC2]"
          >
            <option value="">All tiers</option>
            <option value="rep">Rep</option>
            <option value="preferred">Distributor</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="learnings-signal-filter" className="text-xs text-gray-500">Signal</label>
          <select
            id="learnings-signal-filter"
            value={signalTypeFilter}
            onChange={(e) => setSignalTypeFilter(e.target.value as '' | 'mandate' | 'preference')}
            className="border border-gray-200 rounded px-2 py-1.5 text-sm text-[#2A2A2A] bg-white focus:outline-none focus:ring-1 focus:ring-[#7FAEC2]"
          >
            <option value="">All signals</option>
            <option value="mandate">Mandate</option>
            <option value="preference">Preference</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={includeReverted}
            onChange={(e) => setIncludeReverted(e.target.checked)}
          />
          Include reverted
        </label>

        <span className="text-xs text-gray-400 ml-auto">{count} learning{count !== 1 ? 's' : ''}</span>
      </div>

      {revertError && <p className="text-sm text-red-500 mb-3">{revertError}</p>}

      {loading && <p className="text-sm text-gray-400 py-8">Loading learnings...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && rows.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No learnings yet</p>
          <p className="text-sm mt-1">Nothing has been promoted to memory yet.</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Tier</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Taught by</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    <TableCell><TierBadge tier={row.tier} /></TableCell>
                    <TableCell>
                      <SignalTypeBadge
                        signalType={row.distributor_signal_type}
                        mandateReason={row.mandate_reason}
                        mandateSetBy={row.mandate_set_by}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-[#2A2A2A]">{row.canonical_key}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {row.product ? (
                        <>
                          <span className="block">{row.product.name}</span>
                          <span className="block text-xs text-gray-400">{row.product.brand} &middot; {row.product.item_number}</span>
                        </>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {row.tier === 'rep' && row.rep ? row.rep.name : row.tier === 'preferred' && row.distributor ? row.distributor.name : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {row.provenance.promoted_by ? row.provenance.promoted_by.name : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {correctionTypeLabel(row.provenance.correction_type)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDateTime(row.provenance.promoted_at)}
                      {row.provenance.quote_id && (
                        <Link
                          to={`/map-ingredients?quoteId=${row.provenance.quote_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 ml-2 text-xs text-[#7FAEC2] hover:underline"
                        >
                          Quote <ExternalLink size={10} />
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.active ? (
                        row.stale_at ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-200 text-amber-800 bg-amber-50"
                            title="This item left the assortment; the engine ran normal matching in its place and quietly told the rep."
                          >
                            Stale since {formatDateTime(row.stale_at)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-green-200 text-green-700 bg-green-50">Active</Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-500 bg-gray-50">
                          Reverted {formatDateTime(row.reverted_at)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.active && (
                        <button
                          type="button"
                          onClick={() => handleRevert(row)}
                          disabled={revertingId === row.id}
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 bg-transparent border-none cursor-pointer"
                        >
                          {revertingId === row.id ? 'Reverting...' : 'Revert'}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
