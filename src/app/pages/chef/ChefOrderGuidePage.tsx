import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import {
  getChefOrderGuide,
  updateOrderGuideItem,
  downloadOrderGuide,
  downloadQuotePdf,
  type OrderGuideResponse,
  type OrderGuideItemResponse,
} from '../../services/api';

// ─── Shared styles ──────────────────────────────────────────────────────────────

const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

// ─── Helpers ────────────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  if (!str) return '';
  if (/[^\x00-\x7F]/.test(str)) return str;
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(
    cents / 100
  );
}

function groupByCategory(items: OrderGuideItemResponse[]): Record<string, OrderGuideItemResponse[]> {
  return items.reduce<Record<string, OrderGuideItemResponse[]>>((acc, item) => {
    const key = item.category || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

// ─── SavingIndicator ────────────────────────────────────────────────────────────

function SavingIndicator({ saving }: { saving: boolean }) {
  return (
    <span
      className="text-[10px] text-[#9E9E9E] transition-opacity duration-300"
      style={{ opacity: saving ? 1 : 0 }}
    >
      saving…
    </span>
  );
}

// ─── OrderGuideRow ──────────────────────────────────────────────────────────────

interface RowProps {
  item: OrderGuideItemResponse;
  orderGuideId: string;
}

function OrderGuideRow({ item, orderGuideId }: RowProps) {
  const [saving, setSaving] = useState(false);
  const debounceRef = { qty: null as ReturnType<typeof setTimeout> | null, par: null as ReturnType<typeof setTimeout> | null };

  const handleChange = useCallback(
    (field: 'quantity' | 'par', raw: string) => {
      const value = raw === '' ? 0 : parseInt(raw, 10);
      if (isNaN(value)) return;

      // Clear existing timer for this field
      const key = field === 'quantity' ? 'qty' : 'par';
      if (debounceRef[key]) clearTimeout(debounceRef[key]!);

      debounceRef[key] = setTimeout(async () => {
        setSaving(true);
        await updateOrderGuideItem(orderGuideId, item.id, { [field]: value });
        setSaving(false);
      }, 800);
    },
    [orderGuideId, item.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const inputClass =
    'w-full text-center text-sm border border-[#E0E0E0] rounded px-1 py-1 bg-white focus:outline-none focus:border-[#E5A84B] ' +
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ' +
    'print:border-transparent print:bg-transparent';

  return (
    <div className="grid grid-cols-12 gap-x-2 items-center py-2 border-b border-[#F5F5F5] last:border-0 print:border-[#E0E0E0]">
      {/* Item # */}
      <div className="col-span-1 hidden sm:block">
        <span className="text-[11px] text-[#9E9E9E]">{item.item_number || '—'}</span>
      </div>

      {/* Brand */}
      <div className="col-span-2 hidden sm:block">
        <span className="text-[11px] text-[#9E9E9E]">{item.brand ? toTitleCase(item.brand) : '—'}</span>
      </div>

      {/* Product description — full width on mobile */}
      <div className="col-span-8 sm:col-span-4">
        <span className="text-sm text-[#2A2A2A] font-medium leading-snug">
          {toTitleCase(item.product_description)}
        </span>
        {/* Mobile-only secondary info */}
        <div className="sm:hidden flex flex-wrap gap-x-3 mt-0.5">
          {item.brand && <span className="text-[11px] text-[#9E9E9E]">{toTitleCase(item.brand)}</span>}
          {item.pack_size && <span className="text-[11px] text-[#9E9E9E]">{item.pack_size}</span>}
        </div>
      </div>

      {/* Pack size */}
      <div className="col-span-2 hidden sm:block">
        <span className="text-[11px] text-[#9E9E9E]">{item.pack_size || '—'}</span>
      </div>

      {/* Qty input */}
      <div className="col-span-2 sm:col-span-1">
        <input
          type="number"
          min={0}
          defaultValue={item.quantity > 0 ? item.quantity : ''}
          placeholder="0"
          className={inputClass}
          onChange={(e) => handleChange('quantity', e.target.value)}
        />
      </div>

      {/* Par input */}
      <div className="col-span-2 sm:col-span-1">
        <input
          type="number"
          min={0}
          defaultValue={item.par > 0 ? item.par : ''}
          placeholder="0"
          className={inputClass}
          onChange={(e) => handleChange('par', e.target.value)}
        />
      </div>

      {/* Saving indicator */}
      <div className="col-span-1 flex justify-center print:hidden">
        <SavingIndicator saving={saving} />
      </div>
    </div>
  );
}

// ─── CategorySection ────────────────────────────────────────────────────────────

interface CategoryProps {
  category: string;
  items: OrderGuideItemResponse[];
  orderGuideId: string;
}

function CategorySection({ category, items, orderGuideId }: CategoryProps) {
  const sorted = [...items].sort((a, b) => a.position - b.position);

  return (
    <section className="mb-8 print:mb-6">
      <h2 className="text-[11px] font-semibold tracking-widest uppercase text-[#9E9E9E] mb-3 border-b border-[#E0E0E0] pb-2">
        {toTitleCase(category)}
      </h2>

      {/* Column headers — hidden on mobile */}
      <div className="grid grid-cols-12 gap-x-2 mb-1 hidden sm:grid">
        <div className="col-span-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#BDBDBD]">Item #</span>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#BDBDBD]">Brand</span>
        </div>
        <div className="col-span-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#BDBDBD]">Product</span>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#BDBDBD]">Pack</span>
        </div>
        <div className="col-span-1 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#BDBDBD]">Qty</span>
        </div>
        <div className="col-span-1 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#BDBDBD]">Par</span>
        </div>
        <div className="col-span-1" />
      </div>

      {sorted.map((item) => (
        <OrderGuideRow key={item.id} item={item} orderGuideId={orderGuideId} />
      ))}
    </section>
  );
}

// ─── NeedsRepRow ─────────────────────────────────────────────────────────────────
// Same debounced PATCH inputs as OrderGuideRow; no order/cart affordances.

function NeedsRepRow({ item, orderGuideId }: RowProps) {
  const [saving, setSaving] = useState(false);
  const debounceRef = { qty: null as ReturnType<typeof setTimeout> | null, par: null as ReturnType<typeof setTimeout> | null };

  const handleChange = useCallback(
    (field: 'quantity' | 'par', raw: string) => {
      const value = raw === '' ? 0 : parseInt(raw, 10);
      if (isNaN(value)) return;

      const key = field === 'quantity' ? 'qty' : 'par';
      if (debounceRef[key]) clearTimeout(debounceRef[key]!);

      debounceRef[key] = setTimeout(async () => {
        setSaving(true);
        await updateOrderGuideItem(orderGuideId, item.id, { [field]: value });
        setSaving(false);
      }, 800);
    },
    [orderGuideId, item.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const inputClass =
    'w-full text-center text-sm border border-[#E0E0E0] rounded px-1 py-1 bg-white focus:outline-none focus:border-[#E5A84B] ' +
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ' +
    'print:border-transparent print:bg-transparent';

  return (
    <div className="grid grid-cols-12 gap-x-2 items-center py-2 border-b border-[#F5F5F5] last:border-0 print:border-[#E0E0E0]">
      {/* Ingredient name — italic, spans item#/brand/description columns */}
      <div className="col-span-9 sm:col-span-7">
        <span className="text-sm text-[#4F4F4F] italic leading-snug">
          {toTitleCase(item.product_description)}
        </span>
      </div>

      {/* Contact Rep badge */}
      <div className="col-span-3 sm:col-span-2 flex items-center">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white whitespace-nowrap print:hidden"
          style={{ backgroundColor: '#F39839' }}
        >
          Contact Rep
        </span>
        {/* Print-friendly text instead of badge */}
        <span className="hidden print:inline text-[10px] text-[#9E9E9E] italic">Contact Rep</span>
      </div>

      {/* Qty input */}
      <div className="col-span-2 sm:col-span-1">
        <input
          type="number"
          min={0}
          defaultValue={item.quantity > 0 ? item.quantity : ''}
          placeholder="0"
          className={inputClass}
          onChange={(e) => handleChange('quantity', e.target.value)}
        />
      </div>

      {/* Par input */}
      <div className="col-span-2 sm:col-span-1">
        <input
          type="number"
          min={0}
          defaultValue={item.par > 0 ? item.par : ''}
          placeholder="0"
          className={inputClass}
          onChange={(e) => handleChange('par', e.target.value)}
        />
      </div>

      {/* Saving indicator */}
      <div className="col-span-1 flex justify-center print:hidden">
        <SavingIndicator saving={saving} />
      </div>
    </div>
  );
}

// ─── NeedsRepSection ─────────────────────────────────────────────────────────────

interface NeedsRepSectionProps {
  items: OrderGuideItemResponse[];
  orderGuideId: string;
}

function NeedsRepSection({ items, orderGuideId }: NeedsRepSectionProps) {
  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => a.position - b.position);

  return (
    // break-before-page ensures a clean page break before this section when printing
    <section className="mb-8 print:mb-6 break-before-page">
      {/* Muted background container */}
      <div className="bg-[#FAFAFA] rounded-lg px-4 py-5 border border-[#F0F0F0]">
        <h2 className="text-[11px] font-semibold tracking-widest uppercase text-[#9E9E9E] mb-3 border-b border-[#E8E8E8] pb-2">
          Handled by Rep
        </h2>

        <p className="text-xs text-[#9E9E9E] mb-4 print:hidden">
          These ingredients were not found in the distributor catalog. Your rep will source them for you.
        </p>

        {/* Column headers */}
        <div className="grid grid-cols-12 gap-x-2 mb-1 hidden sm:grid">
          <div className="col-span-7">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#BDBDBD]">Ingredient</span>
          </div>
          <div className="col-span-2">
            {/* spacer for Contact Rep badge column */}
          </div>
          <div className="col-span-1 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#BDBDBD]">Qty</span>
          </div>
          <div className="col-span-1 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#BDBDBD]">Par</span>
          </div>
          <div className="col-span-1" />
        </div>

        {sorted.map((item) => (
          <NeedsRepRow key={item.id} item={item} orderGuideId={orderGuideId} />
        ))}
      </div>
    </section>
  );
}

// ─── ChefOrderGuidePage ─────────────────────────────────────────────────────────

export function ChefOrderGuidePage() {
  const { id } = useParams<{ id: string }>();
  const [guide, setGuide] = useState<OrderGuideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await getChefOrderGuide(id);
      if (res.data) {
        setGuide(res.data);
      } else {
        setError(res.error || 'Order guide not found');
      }
      setLoading(false);
    })();
  }, [id]);

  const handleDownloadExcel = useCallback(async () => {
    if (!guide) return;
    setDownloading('excel');
    const res = await downloadOrderGuide(guide.quote_id);
    if (res.blob) {
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-guide-${guide.quote_id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloading(null);
  }, [guide]);

  const handleDownloadPdf = useCallback(async () => {
    if (!guide) return;
    setDownloading('pdf');
    const res = await downloadQuotePdf(guide.quote_id);
    if (res.blob) {
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-guide-${guide.quote_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloading(null);
  }, [guide]);

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full border-4 border-[#E0E0E0] border-t-[#E5A84B]"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[#E53E3E] font-medium mb-2">Order guide not found</p>
          <p className="text-[#9E9E9E] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Data ─────────────────────────────────────────────────────────────────────

  // Split items by status: matched items go into category sections, needs_rep items
  // go into the dedicated "Handled by Rep" section below.
  const matchedItems  = guide.items.filter((i) => i.status === 'matched');
  const needsRepItems = guide.items.filter((i) => i.status === 'needs_rep');

  const grouped = groupByCategory(matchedItems);
  const categoryKeys = Object.keys(grouped).sort();

  const effectiveDate = guide.effective_date
    ? new Date(guide.effective_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const minimumOrder = guide.minimum_order_cents ? formatCurrency(guide.minimum_order_cents) : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 print:px-0 print:py-4">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="mb-8 print:mb-6">
          {/* Distributor name — small caps */}
          {guide.distributor?.name && (
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#9E9E9E] mb-1">
              {guide.distributor.name}
            </p>
          )}

          {/* Headline */}
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-3"
            style={headlineStyle}
          >
            Order Guide
          </h1>

          {/* Restaurant + effective date */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
            {guide.restaurant?.name && (
              <span className="text-base font-medium text-[#2A2A2A]">{guide.restaurant.name}</span>
            )}
            {effectiveDate && (
              <span className="text-sm text-[#9E9E9E]">Effective {effectiveDate}</span>
            )}
          </div>

          {/* Rep info */}
          {guide.rep && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-[#4F4F4F]">
              {guide.rep.name && <span>{guide.rep.name}</span>}
              {guide.rep.phone && (
                <a href={`tel:${guide.rep.phone}`} className="text-[#E5A84B] hover:underline">
                  {guide.rep.phone}
                </a>
              )}
              {guide.rep.email && (
                <a href={`mailto:${guide.rep.email}`} className="text-[#E5A84B] hover:underline">
                  {guide.rep.email}
                </a>
              )}
            </div>
          )}

          {/* Order days + minimum */}
          {(guide.order_days || minimumOrder) && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs text-[#9E9E9E]">
              {guide.order_days && <span>Order days: {guide.order_days}</span>}
              {minimumOrder && <span>Minimum order: {minimumOrder}</span>}
            </div>
          )}
        </header>

        {/* ── Action buttons (hidden on print) ───────────────────────────────── */}
        <div className="flex flex-wrap gap-3 mb-8 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-[#E0E0E0] rounded text-sm text-[#4F4F4F] hover:bg-[#FAFAFA] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={downloading === 'excel'}
            className="flex items-center gap-2 px-4 py-2 border border-[#E0E0E0] rounded text-sm text-[#4F4F4F] hover:bg-[#FAFAFA] transition-colors disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading === 'excel' ? 'Downloading…' : 'Download Excel'}
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading === 'pdf'}
            className="flex items-center gap-2 px-4 py-2 border border-[#E0E0E0] rounded text-sm text-[#4F4F4F] hover:bg-[#FAFAFA] transition-colors disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            {downloading === 'pdf' ? 'Downloading…' : 'Download PDF'}
          </button>
        </div>

        {/* ── Matched category sections ───────────────────────────────────────── */}
        {categoryKeys.length === 0 && needsRepItems.length === 0 ? (
          <p className="text-[#9E9E9E] text-sm">No items in this order guide yet.</p>
        ) : (
          categoryKeys.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              items={grouped[cat]}
              orderGuideId={guide.id}
            />
          ))
        )}

        {/* ── Handled by Rep section (only rendered when needsRepItems exist) ── */}
        <NeedsRepSection items={needsRepItems} orderGuideId={guide.id} />
      </div>

      {/* ── Print styles ────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body { background: white; }
          input[type="number"] {
            border: none !important;
            background: transparent !important;
            -webkit-appearance: none;
            -moz-appearance: textfield;
          }
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .break-before-page {
            break-before: page;
          }
        }
      `}</style>
    </div>
  );
}
