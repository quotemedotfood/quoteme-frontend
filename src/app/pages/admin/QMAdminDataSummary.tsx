import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { getAdminDataSummary, type AdminDataSummary, type DataSummaryList } from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';
import { colorLabel } from './_beverageLabels';
import { SummaryTile } from './_beveragesSummaryStrip';

// DATA SUMMARY, PHASE 1: WINES + COVERAGE (Moose, 2026-10-30). Reader of
// QuoteMe GET /api/v1/admin/data_summary (DataSummary::Report).
//
// Rulings kept here:
// - Market = the city and state in the restaurant's address. Pick a state,
//   then a city; "All" is allowed for both.
// - Counts and facts only. A list is ordered by how many restaurants carry an
//   item; nothing is called the best. Every list says what it was counted
//   against, and the coverage strip on top is the base for every number.
// - No price amounts: glass vs bottle counts rows that print a price.
// - No allergy or dietary content.
// - Wines link to their corpus page by beverage id.

const LIMITS = [10, 25, 50];

function pct(share: number | null | undefined): string {
  if (share == null) return '-';
  return `${Math.round(share * 1000) / 10}%`;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

function marketLabel(state: string, city: string): string {
  if (!state) return 'all markets';
  if (!city) return `all of ${state}`;
  return `${city}, ${state}`;
}

function grapeLabel(g: string): string {
  const s = g.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function CountTable<T>({
  testId,
  title,
  itemHeader,
  list,
  noun,
  renderItem,
  rowKey,
}: {
  testId: string;
  title: string;
  itemHeader: string;
  list: DataSummaryList<T>;
  noun: string;
  renderItem: (item: DataSummaryList<T>['items'][number]) => ReactNode;
  rowKey: (item: DataSummaryList<T>['items'][number]) => string;
}) {
  const d = list.denominator;
  const base = `Counted against ${plural(d.restaurants, 'restaurant')} (${list.basis}) and ${plural(d.list_rows, 'list row')}.`;
  return (
    <section data-testid={testId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <h2 className="text-sm font-semibold text-[#2A2A2A]">{title}</h2>
        <p className="text-xs text-gray-500" data-testid={`${testId}-basis`}>{base}</p>
        {list.items.length > 0 && (
          <p className="text-xs text-gray-400">
            Showing {list.items.length.toLocaleString()} of {plural(list.distinct_total, noun)}.
            {list.rows_without_value ? ` Not counted: ${plural(list.rows_without_value, 'row')} with no ${noun}.` : ''}
          </p>
        )}
      </div>
      {list.items.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-gray-500" data-testid={`${testId}-empty`}>
          {d.list_rows === 0
            ? `Nothing to count yet: no ${list.basis} in this market.`
            : `No ${noun} on the ${plural(d.list_rows, 'list row')} counted here.`}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>{itemHeader}</TableHead>
                <TableHead className="text-right">Carried by</TableHead>
                <TableHead className="text-right">List rows</TableHead>
                <TableHead>Context</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((item) => (
                <TableRow key={rowKey(item)}>
                  <TableCell>{renderItem(item)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{plural(item.restaurants, 'restaurant')}</TableCell>
                  <TableCell className="text-right">{item.list_rows.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {`Carried by ${item.restaurants.toLocaleString()} of ${d.restaurants.toLocaleString()} restaurants (${pct(item.share_of_restaurants)})`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

export function QMAdminDataSummary() {
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [limit, setLimit] = useState(25);
  const [data, setData] = useState<AdminDataSummary | null>(null);
  const [states, setStates] = useState<AdminDataSummary['markets']['states']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    getAdminDataSummary({ state: state || undefined, city: city || undefined, limit }).then((res) => {
      if (!live) return;
      setLoading(false);
      if (res.data) {
        setData(res.data);
        if (res.data.markets?.states?.length) setStates(res.data.markets.states);
      } else {
        setError(res.error || 'The data summary did not load.');
      }
    });
    return () => { live = false; };
  }, [state, city, limit, reload]);

  const market = marketLabel(state, data?.market.city || city);
  const cities = state ? data?.markets.cities ?? [] : [];

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1 className="text-2xl font-bold text-[#2A2A2A] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
        Data summary
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Counts from restaurant wine lists. Market is the city and state in each restaurant's address.
        Every number reads against the coverage strip.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <label className="text-xs text-gray-600">
          State
          <select
            data-testid="ds-state"
            className="block mt-1 border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
            value={state}
            onChange={(e) => { setState(e.target.value); setCity(''); }}
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s.state} value={s.state}>{`${s.state} (${s.restaurants.toLocaleString()})`}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-600">
          City
          <select
            data-testid="ds-city"
            className="block mt-1 border border-gray-300 rounded-md px-2 py-1 text-sm bg-white disabled:bg-gray-100"
            value={city}
            disabled={!state}
            title={state ? undefined : 'Pick a state first'}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">{state ? 'All cities' : 'Pick a state first'}</option>
            {cities.map((c) => (
              <option key={c.city} value={c.city}>{`${c.city} (${c.restaurants.toLocaleString()})`}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-600">
          Rows per list
          <select
            data-testid="ds-limit"
            className="block mt-1 border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {LIMITS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div className="text-sm text-red-600 py-6" data-testid="ds-error">
          {error}{' '}
          <button type="button" className="underline" onClick={() => setReload((n) => n + 1)}>Try again</button>
        </div>
      )}

      {!error && loading && !data && (
        <p className="text-sm text-gray-500 py-6" data-testid="ds-loading">
          Counting restaurants and wine list rows for {market}...
        </p>
      )}

      {!error && data && (
        <SummaryBody data={data} market={market} loading={loading} />
      )}
    </div>
  );
}

function SummaryBody({ data, market, loading }: { data: AdminDataSummary; market: string; loading: boolean }) {
  const c = data.coverage;
  const w = data.wines;
  const gb = w.glass_bottle;
  const ofRestaurants = (n: number) => (c.restaurants ? `${pct(n / c.restaurants)} of restaurants` : undefined);

  return (
    <div className={loading ? 'opacity-60' : undefined} aria-busy={loading}>
      {loading && <p className="text-xs text-gray-400 mb-2" data-testid="ds-refreshing">Updating for {market}...</p>}

      <div data-testid="ds-coverage" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        <SummaryTile testId="ds-tile-restaurants" label="Restaurants" value={c.restaurants}
          title="Active restaurants in this market (test and placeholder rows left out)" />
        <SummaryTile testId="ds-tile-food" label="With a food menu" value={c.with_food_menu}
          detail={ofRestaurants(c.with_food_menu)} />
        <SummaryTile testId="ds-tile-wine-list" label="With a wine list" value={c.with_wine_list}
          detail={ofRestaurants(c.with_wine_list)} />
        <SummaryTile testId="ds-tile-linked-restaurants" label="With rows linked to a wine" value={c.with_linked_wine_rows}
          detail={ofRestaurants(c.with_linked_wine_rows)}
          title="Restaurants with at least one list row linked to a beverage in the corpus" />
        <SummaryTile testId="ds-tile-list-rows" label="Wine list rows" value={c.list_rows} />
        <SummaryTile testId="ds-tile-linked-rows" label="Rows linked to a wine" value={c.linked_rows}
          detail={c.list_rows ? `${pct(c.linked_share)} of rows` : undefined} />
        <SummaryTile testId="ds-tile-unlinked-rows" label="Rows not linked" value={c.unlinked_rows}
          title="Counted here only. An unlinked row is never matched to a wine by its name." />
      </div>

      {c.restaurants === 0 ? (
        <p className="text-sm text-gray-500 py-6" data-testid="ds-empty-market">
          No restaurants on file for {market}. Pick another state or city, or load restaurants for this market first.
        </p>
      ) : c.list_rows === 0 ? (
        <p className="text-sm text-gray-500 py-6" data-testid="ds-no-lists">
          {`${plural(c.restaurants, 'restaurant')} in ${market}, but no wine lists on file yet, so there are no wines to count.`}
        </p>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-[#2A2A2A] mb-2">By the glass and by the bottle</h2>
          <p className="text-xs text-gray-500 mb-2" data-testid="ds-glass-basis">
            {`Rows that print a glass or bottle price, out of ${plural(gb.denominator.list_rows, 'list row')} at ${plural(gb.denominator.restaurants, 'restaurant')}. Counts only, never the amount.`}
          </p>
          <div data-testid="ds-glass-bottle" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
            <SummaryTile testId="ds-tile-glass-only" label="Glass only" value={gb.glass_only} />
            <SummaryTile testId="ds-tile-bottle-only" label="Bottle only" value={gb.bottle_only} />
            <SummaryTile testId="ds-tile-both" label="Glass and bottle" value={gb.both} />
            <SummaryTile testId="ds-tile-neither" label="No price printed" value={gb.neither} />
            <SummaryTile testId="ds-tile-glass-share" label="Rows by the glass" value={gb.glass_only + gb.both}
              detail={`${pct(gb.glass_share)} of rows`} />
            <SummaryTile testId="ds-tile-glass-restaurants" label="Restaurants pouring by the glass"
              value={gb.restaurants_by_the_glass} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <CountTable
              testId="ds-carried"
              title="Wines by number of restaurants carrying them"
              itemHeader="Wine"
              noun="wine"
              list={w.carried}
              rowKey={(i) => i.beverage_id}
              renderItem={(i) => (
                <div>
                  <Link to={`/qm-admin/beverages/wines/${i.beverage_id}`} className="text-[#2F6F8A] hover:underline">
                    {i.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {[i.producer, i.color ? colorLabel(i.color) : null].filter(Boolean).join(' · ') || 'No producer on file'}
                  </p>
                </div>
              )}
            />
            <CountTable
              testId="ds-grapes" title="Grapes" itemHeader="Grape" noun="grape" list={w.grapes}
              rowKey={(i) => i.grape} renderItem={(i) => grapeLabel(i.grape)}
            />
            <CountTable
              testId="ds-colors" title="Colors" itemHeader="Color" noun="wine color" list={w.colors}
              rowKey={(i) => i.color} renderItem={(i) => colorLabel(i.color)}
            />
            <CountTable
              testId="ds-countries" title="Countries" itemHeader="Country" noun="country" list={w.countries}
              rowKey={(i) => i.country} renderItem={(i) => i.country}
            />
            <CountTable
              testId="ds-regions" title="Regions" itemHeader="Region" noun="region" list={w.regions}
              rowKey={(i) => i.region} renderItem={(i) => i.region}
            />
            <CountTable
              testId="ds-producers" title="Producers" itemHeader="Producer" noun="producer" list={w.producers}
              rowKey={(i) => i.producer_id} renderItem={(i) => i.producer}
            />
          </div>
        </>
      )}
      <p className="text-[11px] text-gray-400 mt-4">Counted {new Date(data.generated_at).toLocaleString()}.</p>
    </div>
  );
}

