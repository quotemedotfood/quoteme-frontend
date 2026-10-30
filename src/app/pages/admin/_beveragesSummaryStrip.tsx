import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getAdminBeverageSummary, type AdminBeverageSummary } from '../../services/adminApi';

// BEVERAGES SUMMARY STRIP (Moose, 2026-10-28). Small count tiles at the top of
// Beverages > Wines. Reader of QuoteMe GET /api/v1/admin/beverages/summary
// (Api::V1::Admin::BeveragesController#summary). A tile whose count matches a
// Wines list filter sets that filter when clicked; "Waiting for review" opens
// Review matches. The rest are counts only. Nothing here ranks a wine.

/**
 * Estate Brands' distributor id, from the deploy config
 * (VITE_ESTATE_DISTRIBUTOR_ID). Unset: the Estate tile is hidden and no id is
 * sent.
 */
export const ESTATE_DISTRIBUTOR_ID: string = (import.meta.env.VITE_ESTATE_DISTRIBUTOR_ID || '').trim();

/** A filter patch for the Wines list (keys of BeverageFilters). */
export type SummaryFilter = Partial<{
  kind: string;
  distributor_id: string;
  min_restaurants: string;
}>;

interface Tile {
  id: string;
  label: string;
  value: number;
  /** Sets Wines list filters when clicked. */
  filter?: SummaryFilter;
  /** Navigates when clicked. */
  to?: string;
  title?: string;
}

function tilesFor(s: AdminBeverageSummary, estateId: string): Tile[] {
  const kind = (k: string) => s.by_kind?.[k] ?? 0;
  const tiles: Tile[] = [
    { id: 'wine', label: 'Wines', value: kind('wine'), filter: { kind: 'wine' } },
    { id: 'beer', label: 'Beer', value: kind('beer'), filter: { kind: 'beer' } },
    { id: 'sake', label: 'Sake', value: kind('sake'), filter: { kind: 'sake' } },
    { id: 'spirit', label: 'Spirits', value: kind('spirit'), filter: { kind: 'spirit' } },
    { id: 'producers', label: 'Producers', value: s.producers },
    {
      id: 'distributors', label: 'Distributors with a catalog', value: s.distributors_with_catalog,
      title: 'Distributors with at least one active product linked to a beverage',
    },
    { id: 'restaurants', label: 'Restaurants carrying', value: s.restaurants_carrying },
    {
      id: 'from-lists', label: 'Wines from restaurant lists', value: s.wines_from_restaurant_lists,
      filter: { kind: 'wine', min_restaurants: '1' },
    },
    { id: 'from-catalogs', label: 'Wines from distributor catalogs', value: s.wines_from_distributor_catalogs },
  ];
  if (estateId && s.estate_wines != null) {
    tiles.push({ id: 'estate', label: 'Estate wines', value: s.estate_wines, filter: { kind: 'wine', distributor_id: estateId } });
  }
  tiles.push(
    { id: 'review', label: 'Waiting for review', value: s.waiting_for_review, to: '/qm-admin/beverages/review-matches' },
    {
      id: 'confirmed', label: 'Confirmed links', value: s.distributor_restaurant_links?.confirmed ?? 0,
      title: 'Distributor and restaurant links a person made',
    },
    {
      id: 'inferred', label: 'Inferred links', value: s.distributor_restaurant_links?.inferred ?? 0,
      title: 'Distributor and restaurant links read from a shared wine, not confirmed',
    },
    { id: 'added', label: 'Added this week', value: s.added_this_week, title: 'Beverages added in the last 7 days' },
    { id: 'missing-grape', label: 'Wines missing grape', value: s.missing?.grape ?? 0 },
    { id: 'missing-vintage', label: 'List rows missing vintage', value: s.missing?.vintage_list_rows ?? 0,
      title: 'Restaurant list rows linked to a wine that print no vintage' },
    { id: 'missing-note', label: 'Wines missing tasting note', value: s.missing?.tasting_note ?? 0 },
  );
  return tiles;
}

/**
 * One count tile. Shared by this strip and the Data summary coverage strip
 * (QMAdminDataSummary), so the two read alike. `value` null shows a dash;
 * `detail` is a short second line under the label (e.g. "75% of rows").
 */
export function SummaryTile({
  testId,
  label,
  value,
  title,
  detail,
  onClick,
}: {
  testId: string;
  label: string;
  value: number | null;
  title?: string;
  detail?: string;
  onClick?: () => void;
}) {
  const tileBase = 'bg-white border border-gray-200 rounded-lg px-3 py-2 text-left';
  const body = (
    <>
      <p className="text-lg font-bold text-[#2A2A2A] leading-tight">{value == null ? '-' : value.toLocaleString()}</p>
      <p className="text-xs text-[#4F4F4F]">{label}</p>
      {detail && <p className="text-[11px] text-gray-400">{detail}</p>}
    </>
  );
  if (!onClick) {
    return <div data-testid={testId} className={tileBase} title={title}>{body}</div>;
  }
  return (
    <button
      type="button"
      data-testid={testId}
      title={title}
      className={`${tileBase} cursor-pointer hover:border-[#7FAEC2] hover:bg-gray-50`}
      onClick={onClick}
    >
      {body}
    </button>
  );
}

export function BeveragesSummaryStrip({
  onFilter,
  estateDistributorId = ESTATE_DISTRIBUTOR_ID,
}: {
  onFilter: (patch: SummaryFilter) => void;
  estateDistributorId?: string;
}) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AdminBeverageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getAdminBeverageSummary(estateDistributorId || undefined).then((res) => {
      if (!live) return;
      if (res.data) setSummary(res.data);
      else setError(res.error || 'Failed to load the summary');
    });
    return () => { live = false; };
  }, [estateDistributorId]);

  if (error) return <p className="text-xs text-red-500 mb-4" data-testid="beverages-summary-error">{error}</p>;
  if (!summary) return null;

  return (
    <div data-testid="beverages-summary" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
      {tilesFor(summary, estateDistributorId).map((t) => (
        <SummaryTile
          key={t.id}
          testId={`summary-tile-${t.id}`}
          label={t.label}
          value={t.value}
          title={t.title}
          onClick={t.filter || t.to ? () => (t.to ? navigate(t.to) : onFilter(t.filter!)) : undefined}
        />
      ))}
    </div>
  );
}
