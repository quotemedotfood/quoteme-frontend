import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Store, Truck, Camera } from 'lucide-react';
import { getAdminBeverage, type AdminBeverageShow } from '../../services/adminApi';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';
import { NeedsReviewBadge, colorLabel, kindLabel } from './_beverageLabels';

// ONE BEVERAGE (Moose, 2026-10-27). Reader of QuoteMe
// Api::V1::Admin::BeveragesController#show. Read only for now, the tasting
// note included. `details` is deliberately not rendered: this page carries
// identity, where it is poured, who sells it and where the record came from.

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCents(cents: number | null): string {
  if (cents == null) return '-';
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

const NOTE_SOURCE_LABELS: Record<string, string> = {
  producer_sheet: 'Producer sheet',
  distributor: 'Distributor',
  staff: 'Staff',
  drafted: 'Drafted',
};

// A source reference is a small object the server writes (table, id, owner
// and so on). It is shown as its own key and value pairs, not interpreted.
function SourceRef({ refData }: { refData: Record<string, unknown> }) {
  const entries = Object.entries(refData).filter(([, v]) => v !== null && v !== undefined && v !== '');
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      {entries.map(([k, v]) => (
        <span key={k}>
          <span className="text-gray-400">{k}:</span>{' '}
          <span className="font-mono">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
        </span>
      ))}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-[#2A2A2A] mt-0.5">{children}</dd>
    </div>
  );
}

const dash = <span className="text-gray-300">-</span>;

export function QMAdminBeverageDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AdminBeverageShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    setLoading(true);
    getAdminBeverage(id).then((res) => {
      if (!live) return;
      if (res.data) {
        setData(res.data);
        setError(null);
      } else {
        setError(res.error || 'Not found');
      }
      setLoading(false);
    });
    return () => { live = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-[#7FAEC2] rounded-full animate-spin" />
        Loading...
      </div>
    );
  }
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!data) return null;

  const { beverage: b, restaurants, distributors, pending_wine_matches: pending } = data;

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <Link to="/qm-admin/beverages/wines" className="text-sm text-[#7FAEC2] hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Back to Wines
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {b.name}
          </h1>
          {b.needs_review && <NeedsReviewBadge />}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-gray-500">
          {b.brand ? (
            <Link to={`/qm-admin/brands/${b.brand.id}`} className="text-[#7FAEC2] hover:underline" data-testid="beverage-producer">
              {b.brand.name}
            </Link>
          ) : (
            <span className="text-gray-400">No producer</span>
          )}
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{kindLabel(b.kind)}</span>
          {b.color && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{colorLabel(b.color)}</span>}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Created {formatDate(b.created_at)}{b.created_via ? ` from ${b.created_via}` : ''}, updated {formatDate(b.updated_at)}
        </p>
      </div>

      {/* Identity */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Fact label="Producer">{b.brand?.name || dash}</Fact>
          <Fact label="Kind">{kindLabel(b.kind)}</Fact>
          <Fact label="Colour">{b.color ? colorLabel(b.color) : dash}</Fact>
          <Fact label="Style">{b.style || dash}</Fact>
          <Fact label="Grapes">{b.grapes.length > 0 ? b.grapes.join(', ') : dash}</Fact>
          <Fact label="Country">{b.country || dash}</Fact>
          <Fact label="Region">{b.region || dash}</Fact>
          <Fact label="Appellation">{b.appellation || dash}</Fact>
          <Fact label="Pronunciation"><span data-testid="beverage-pronunciation">{b.pronunciation || dash}</span></Fact>
          <Fact label="Also listed as">{b.aliases.length > 0 ? b.aliases.join(', ') : dash}</Fact>
        </dl>
      </section>

      {/* Tasting note: read only for now. */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Tasting note
        </h2>
        {b.tasting_note ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5" data-testid="beverage-tasting-note">
            <p className="text-sm text-[#2A2A2A] whitespace-pre-line">{b.tasting_note.text}</p>
            <p className="text-xs text-gray-400 mt-2">
              {b.tasting_note.source ? NOTE_SOURCE_LABELS[b.tasting_note.source] ?? b.tasting_note.source : 'Source not recorded'}
              {b.tasting_note.written_at ? `, ${formatDate(b.tasting_note.written_at)}` : ''}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-2">None yet.</p>
        )}
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Store size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{restaurants.length}</div>
            <div className="text-xs text-gray-500">Restaurants pouring it</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Truck size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{distributors.length}</div>
            <div className="text-xs text-gray-500">Distributors selling it</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Camera size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{data.diner_photo_row_count}</div>
            <div className="text-xs text-gray-500">Rows from diner photos</div>
          </div>
        </div>
      </div>

      {/* Restaurants */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Restaurants
        </h2>
        {restaurants.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Not on any restaurant list yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table data-testid="beverage-restaurants">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Restaurant</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>As listed</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead className="text-right">Glass</TableHead>
                    <TableHead className="text-right">Bottle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restaurants.flatMap((r) =>
                    r.rows.map((row, i) => (
                      <TableRow key={row.capture_row_id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {i === 0 ? (
                            r.restaurant_id ? (
                              <Link to={`/qm-admin/restaurants/${r.restaurant_id}`} className="text-[#2A2A2A] hover:text-[#7FAEC2] hover:underline">
                                {r.name || 'Unnamed restaurant'}
                              </Link>
                            ) : (
                              <span className="text-[#2A2A2A]">{r.name || 'Unnamed venue'}</span>
                            )
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {i === 0 ? [r.city, r.state].filter(Boolean).join(', ') || '-' : null}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {[row.producer, row.wine_name, row.vintage].filter(Boolean).join(' ') || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{row.list_section || '-'}</TableCell>
                        <TableCell className="text-sm text-right">{formatCents(row.glass_cents)}</TableCell>
                        <TableCell className="text-sm text-right">{formatCents(row.bottle_cents)}</TableCell>
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      {/* Distributors */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Distributors
        </h2>
        {distributors.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No distributor catalog carries it yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table data-testid="beverage-distributors">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Distributor</TableHead>
                    <TableHead>Item #</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributors.flatMap((d) =>
                    d.products.map((p, i) => (
                      <TableRow key={p.product_id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {i === 0 ? (
                            <Link to={`/qm-admin/distributors/${d.distributor_id}`} className="text-[#2A2A2A] hover:text-[#7FAEC2] hover:underline">
                              {d.name}
                            </Link>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-gray-500">{p.item_number || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-600">{p.product_name || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-500">{p.unit_size || '-'}</TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {p.status || 'unknown'}
                          </span>
                        </TableCell>
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      {/* Pending matches on this beverage */}
      {pending.length > 0 && (
        <section className="mb-8" data-testid="beverage-pending-matches">
          <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Matches waiting for review
          </h2>
          <div className="bg-white border border-amber-200 rounded-xl p-4">
            <ul className="space-y-2">
              {pending.map((m) => (
                <li key={m.id} className="text-sm text-gray-600">
                  <span className="text-xs text-gray-400 font-mono mr-2">{m.source_table}</span>
                  {(m.reasons || []).join('; ') || 'Flagged'}
                </li>
              ))}
            </ul>
            <Link to="/qm-admin/beverages/review-matches" className="inline-block mt-3 text-sm text-[#7FAEC2] hover:underline">
              Open Review matches
            </Link>
          </div>
        </section>
      )}

      {/* Source references */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Source references
        </h2>
        {b.source_refs.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">None recorded.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100" data-testid="beverage-source-refs">
            {b.source_refs.map((ref, i) => (
              <div key={i} className="p-3">
                <SourceRef refData={ref} />
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2 font-mono break-all">Identity key: {b.identity_key}</p>
      </section>
    </div>
  );
}
