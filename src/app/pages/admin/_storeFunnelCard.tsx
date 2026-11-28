// A STORE'S PAIRIT FUNNEL on its QM admin page (Moose 2026-11-28, approved
// 11-25; Assemblage's funnel counts, PR 3). How many visits reach each step
// of the flow, so Moose sees where shoppers fall out: the five steps as a
// row of numbers with the percent kept from each step to the next, a range
// (Today, 7 days, 30 days), and a by-day table. Counts only, nothing ranked.
//
// Writer: the PairIt flow (Cork, PR 2) through POST /v1/pairit/steps into
// pairit_step_counts (Cellar, PR 1). Reader: this card, through
// GET /api/v1/admin/retail_locations/:id/funnel. Read only: nothing here writes.
import { useEffect, useState } from 'react';
import {
  getAdminRetailLocationFunnel,
  AdminStoreFunnel,
  AdminStoreFunnelDay,
  FUNNEL_STEPS,
  FunnelStep,
} from '../../services/adminApi';

export const STEP_LABELS: Record<FunnelStep, string> = {
  opened: 'Opened',
  started: 'Started',
  understood: 'Dishes read back',
  picks: 'Saw picks',
  presented: 'Presented',
};

const RANGES = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
] as const;
type RangeKey = typeof RANGES[number]['key'];

/** YYYY-MM-DD, n days before a YYYY-MM-DD. Plain date math, no time zone. */
export function daysBefore(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - n));
  return t.toISOString().slice(0, 10);
}

/** The percent of the step before that reached this one, or null when the step before had none. */
export function kept(prev: number, next: number): number | null {
  if (prev <= 0) return null;
  return Math.round((next / prev) * 100);
}

const count = (day: AdminStoreFunnelDay, step: FunnelStep) => day[step] ?? 0;

export function totals(days: AdminStoreFunnelDay[]): Record<FunnelStep, number> {
  const t = { opened: 0, started: 0, understood: 0, picks: 0, presented: 0 };
  for (const d of days) for (const s of FUNNEL_STEPS) t[s] += count(d, s);
  return t;
}

/** "Nov 21" for a YYYY-MM-DD, read as a calendar date. */
function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function StoreFunnelCard({ storeId, card, heading }: { storeId: string; card: string; heading: string }) {
  const [range, setRange] = useState<RangeKey>('today');
  // The store's today, as the server answered it. Until then the first read
  // asks for the store's today with no dates.
  const [today, setToday] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<AdminStoreFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    const span = RANGES.find((r) => r.key === range)!.days;
    const ask = today && span > 1
      ? getAdminRetailLocationFunnel(storeId, daysBefore(today, span - 1), today)
      : getAdminRetailLocationFunnel(storeId);
    ask.then((res) => {
      if (!live) return;
      setLoading(false);
      if (res.data) {
        setFunnel(res.data);
        if (!today) setToday(res.data.today);
      } else {
        setError(res.error || 'Could not load the funnel.');
      }
    });
    return () => { live = false; };
    // today is read inside, but only set from the first answer; asking again
    // when it lands would read the same range twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, range]);

  const sum = funnel ? totals(funnel.days) : null;
  const days = funnel
    ? funnel.days.filter((d) => FUNNEL_STEPS.some((s) => count(d, s) > 0)).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  return (
    <div className={card} data-testid="store-funnel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={heading}>Funnel</p>
        <div className="flex gap-1" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={range === r.key}
              onClick={() => setRange(r.key)}
              className={`text-xs px-2 py-1 rounded border ${range === r.key ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-200'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500">
        How many visits reached each step of PairIt. Counts only, with no personal data.
      </p>

      {loading && !funnel ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-xs text-red-500" role="alert">{error}</p>
      ) : sum ? (
        <>
          <ol className="grid grid-cols-5 gap-2 text-center" data-testid="funnel-steps">
            {FUNNEL_STEPS.map((s, i) => {
              const pct = i > 0 ? kept(sum[FUNNEL_STEPS[i - 1]], sum[s]) : null;
              return (
                <li key={s} className="rounded border border-gray-100 px-1 py-2" data-testid={`funnel-step-${s}`}>
                  <p className="text-lg font-semibold text-gray-900">{sum[s]}</p>
                  <p className="text-[11px] text-gray-600">{STEP_LABELS[s]}</p>
                  {i > 0 && (
                    <p className="text-[11px] text-gray-500" data-testid={`funnel-kept-${s}`}>
                      {pct === null ? 'no visits before' : `${pct}% kept`}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {days.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="funnel-days">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-1 pr-2 font-medium">Day</th>
                    {FUNNEL_STEPS.map((s) => (
                      <th key={s} className="py-1 px-2 font-medium text-right">{STEP_LABELS[s]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.date} className="border-t border-gray-100" data-testid="funnel-day">
                      <td className="py-1 pr-2 text-gray-800">{dayLabel(d.date)}</td>
                      {FUNNEL_STEPS.map((s) => (
                        <td key={s} className="py-1 px-2 text-right text-gray-800">{count(d, s)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No visits in this range.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
