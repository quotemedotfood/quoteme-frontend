import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
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
  getAdminBeverages,
  getAdminDistributors,
  BEVERAGE_KINDS,
  BEVERAGE_COLORS,
  type AdminBeverageRow,
  type AdminBeverageSort,
  type AdminDistributor,
} from '../../services/adminApi';
import { AdminEmptyState } from './_adminEmptyState';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';
import { NeedsReviewBadge, colorLabel, kindLabel } from './_beverageLabels';

// BEVERAGES > WINES (Moose, 2026-10-27). The beverage corpus as a QM admin
// list: searched, filtered and sorted server-side (QuoteMe
// Api::V1::Admin::BeveragesController#index), paged like the restaurants list.
// Each column header carries its own filter control, in the row under the
// column names. A sort orders this admin table only; nothing is ranked.

const PER_PAGE = 50;
const SEARCH_DEBOUNCE_MS = 300;

type SortDir = 'asc' | 'desc';

// Every column filter. Strings are what the operator typed or picked; the
// query is built from them in one place (`toQuery`).
export interface BeverageFilters {
  kind: string;
  color: string;
  grape: string;
  country: string;
  region: string;
  /** Producer name, partial and case-insensitive (sent as brand_q). */
  producer: string;
  distributor_id: string;
  min_restaurants: string;
  max_restaurants: string;
  /** '' | 'true' | 'false' */
  needs_review: string;
}

export const EMPTY_FILTERS: BeverageFilters = {
  kind: '',
  color: '',
  grape: '',
  country: '',
  region: '',
  producer: '',
  distributor_id: '',
  min_restaurants: '',
  max_restaurants: '',
  needs_review: '',
};

// Typed text filters wait for the operator to stop typing, so a keystroke is
// not a request. Picked values (selects) apply at once.
const TYPED: Array<keyof BeverageFilters> = ['grape', 'country', 'region', 'producer', 'min_restaurants', 'max_restaurants'];

function wholeNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

export function QMAdminBeverages() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminBeverageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<BeverageFilters>(EMPTY_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<BeverageFilters>(EMPTY_FILTERS);
  const [sortField, setSortField] = useState<AdminBeverageSort>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, per_page: PER_PAGE, total_count: 0, total_pages: 0 });

  // Option list for the distributor header filter. The producer filter is a
  // search box (brand_q): GET /admin/brands lists companies, never producers.
  const [distributors, setDistributors] = useState<AdminDistributor[]>([]);

  useEffect(() => {
    getAdminDistributors().then((res) => { if (res.data) setDistributors(res.data); });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters]);

  // Selects apply now; typed boxes apply after the debounce.
  const applied = useMemo<BeverageFilters>(() => {
    const next = { ...filters };
    for (const key of TYPED) next[key] = debouncedFilters[key];
    return next;
  }, [filters, debouncedFilters]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    const res = await getAdminBeverages({
      page,
      per_page: PER_PAGE,
      q: debouncedSearch || undefined,
      sort: sortField,
      dir: sortDir,
      kind: applied.kind || undefined,
      color: applied.color || undefined,
      grape: applied.grape || undefined,
      country: applied.country || undefined,
      region: applied.region || undefined,
      brand_q: applied.producer || undefined,
      distributor_id: applied.distributor_id || undefined,
      min_restaurants: wholeNumber(applied.min_restaurants),
      max_restaurants: wholeNumber(applied.max_restaurants),
      needs_review: applied.needs_review === '' ? undefined : applied.needs_review === 'true',
    });
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
  }, [page, debouncedSearch, sortField, sortDir, applied]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const setFilter = (key: keyof BeverageFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const anyFilter = search !== '' || Object.values(filters).some((v) => v !== '');
  const clearAll = () => {
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const toggleSort = (field: AdminBeverageSort) => {
    setPage(1);
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: AdminBeverageSort }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const SortHead = ({ field, label, className = '' }: { field: AdminBeverageSort; label: string; className?: string }) => (
    <TableHead
      className={`cursor-pointer ${className}`}
      onClick={() => toggleSort(field)}
      aria-sort={sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      data-testid={`sort-${field}`}
    >
      <div className="flex items-center gap-1">{label} <SortIcon field={field} /></div>
    </TableHead>
  );

  const filterBox = 'w-full min-w-[6rem] border border-gray-200 rounded-md px-2 py-1 text-xs font-normal bg-white';

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1 className="text-2xl font-bold text-[#2A2A2A] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
        Wines
      </h1>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div data-testid="beverages-search" className="relative basis-full sm:basis-auto sm:flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, producer, region, appellation..."
            className="pl-9"
          />
        </div>
        {anyFilter && (
          <Button variant="ghost" size="sm" onClick={clearAll} data-testid="beverages-clear-filters" className="text-xs text-[#7FAEC2]">
            <X size={14} className="mr-1" /> Clear filters
          </Button>
        )}
        <span className="text-xs text-gray-400" data-testid="beverages-count">
          {meta.total_count} beverages
          {meta.total_pages > 1 && ` (page ${meta.page} of ${meta.total_pages})`}
        </span>
      </div>

      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!error && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <SortHead field="name" label="Name" />
                  <SortHead field="brand" label="Producer" />
                  <SortHead field="kind" label="Kind" />
                  <SortHead field="color" label="Colour" />
                  <TableHead>Grapes</TableHead>
                  <SortHead field="country" label="Country" />
                  <SortHead field="region" label="Region" />
                  <SortHead field="distributor_count" label="Distributors" className="text-right" />
                  <SortHead field="restaurant_count" label="Restaurants" className="text-right" />
                  <TableHead>Review</TableHead>
                </TableRow>
                {/* One filter control per column, directly under its header. */}
                <TableRow className="bg-gray-50" data-testid="beverages-filter-row">
                  <TableHead className="py-2" />
                  <TableHead className="py-2">
                    <input
                      aria-label="Filter by producer"
                      data-testid="filter-producer"
                      value={filters.producer}
                      onChange={(e) => setFilter('producer', e.target.value)}
                      placeholder="Any producer"
                      className={filterBox}
                    />
                  </TableHead>
                  <TableHead className="py-2">
                    <select
                      aria-label="Filter by kind"
                      data-testid="filter-kind"
                      value={filters.kind}
                      onChange={(e) => setFilter('kind', e.target.value)}
                      className={filterBox}
                    >
                      <option value="">All</option>
                      {BEVERAGE_KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
                    </select>
                  </TableHead>
                  <TableHead className="py-2">
                    <select
                      aria-label="Filter by colour"
                      data-testid="filter-color"
                      value={filters.color}
                      onChange={(e) => setFilter('color', e.target.value)}
                      className={filterBox}
                    >
                      <option value="">All</option>
                      {BEVERAGE_COLORS.map((c) => <option key={c} value={c}>{colorLabel(c)}</option>)}
                    </select>
                  </TableHead>
                  <TableHead className="py-2">
                    <input
                      aria-label="Filter by grape"
                      data-testid="filter-grape"
                      value={filters.grape}
                      onChange={(e) => setFilter('grape', e.target.value)}
                      placeholder="Any grape"
                      className={filterBox}
                    />
                  </TableHead>
                  <TableHead className="py-2">
                    <input
                      aria-label="Filter by country"
                      data-testid="filter-country"
                      value={filters.country}
                      onChange={(e) => setFilter('country', e.target.value)}
                      placeholder="Any country"
                      className={filterBox}
                    />
                  </TableHead>
                  <TableHead className="py-2">
                    <input
                      aria-label="Filter by region"
                      data-testid="filter-region"
                      value={filters.region}
                      onChange={(e) => setFilter('region', e.target.value)}
                      placeholder="Any region"
                      className={filterBox}
                    />
                  </TableHead>
                  <TableHead className="py-2">
                    <select
                      aria-label="Filter by distributor"
                      data-testid="filter-distributor"
                      value={filters.distributor_id}
                      onChange={(e) => setFilter('distributor_id', e.target.value)}
                      className={filterBox}
                    >
                      <option value="">All</option>
                      {distributors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </TableHead>
                  <TableHead className="py-2">
                    <div className="flex items-center gap-1">
                      <input
                        aria-label="Restaurants at least"
                        data-testid="filter-min-restaurants"
                        type="number"
                        min={0}
                        value={filters.min_restaurants}
                        onChange={(e) => setFilter('min_restaurants', e.target.value)}
                        placeholder="Min"
                        className={`${filterBox} min-w-[3.5rem]`}
                      />
                      <input
                        aria-label="Restaurants at most"
                        data-testid="filter-max-restaurants"
                        type="number"
                        min={0}
                        value={filters.max_restaurants}
                        onChange={(e) => setFilter('max_restaurants', e.target.value)}
                        placeholder="Max"
                        className={`${filterBox} min-w-[3.5rem]`}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="py-2">
                    <select
                      aria-label="Filter by needs review"
                      data-testid="filter-needs-review"
                      value={filters.needs_review}
                      onChange={(e) => setFilter('needs_review', e.target.value)}
                      className={filterBox}
                    >
                      <option value="">All</option>
                      <option value="true">Needs review</option>
                      <option value="false">Reviewed</option>
                    </select>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && rows.map((b) => (
                  <TableRow
                    key={b.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    data-testid={`beverage-row-${b.id}`}
                    onClick={() => navigate(`/qm-admin/beverages/wines/${b.id}`)}
                  >
                    <TableCell className="font-medium">
                      <Link
                        to={`/qm-admin/beverages/wines/${b.id}`}
                        className="text-[#2A2A2A] hover:text-[#7FAEC2] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {b.name}
                      </Link>
                      {b.appellation && <div className="text-xs text-gray-400">{b.appellation}</div>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{b.brand?.name || <span className="text-gray-300">-</span>}</TableCell>
                    <TableCell className="text-sm text-gray-600">{kindLabel(b.kind)}</TableCell>
                    <TableCell className="text-sm text-gray-600">{b.color ? colorLabel(b.color) : <span className="text-gray-300">-</span>}</TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[14rem] truncate" title={b.grapes.join(', ') || undefined}>
                      {b.grapes.length > 0 ? b.grapes.join(', ') : <span className="text-gray-300">-</span>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{b.country || <span className="text-gray-300">-</span>}</TableCell>
                    <TableCell className="text-sm text-gray-600">{b.region || <span className="text-gray-300">-</span>}</TableCell>
                    <TableCell className="text-sm text-right">{b.distributor_count}</TableCell>
                    <TableCell className="text-sm text-right">{b.restaurant_count}</TableCell>
                    <TableCell>{b.needs_review ? <NeedsReviewBadge /> : <span className="text-gray-300">-</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {loading && <p className="text-sm text-gray-400 py-8 px-4">Loading...</p>}
          {!loading && rows.length === 0 && <AdminEmptyState label="beverages" />}
        </div>
      )}

      {!loading && meta.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-400">
            Showing {(meta.page - 1) * meta.per_page + 1} to{' '}
            {Math.min(meta.page * meta.per_page, meta.total_count)} of {meta.total_count}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-gray-500">
              Page {meta.page} of {meta.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
