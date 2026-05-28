// QuoteStatusPill — chef quote-history lifecycle pill (single source of truth).
//
// Shared by ChefQuotesPage + ChefDashboardPage row renderers. Previously each
// page carried a duplicated local `StatusPill` function; that drift produced
// the "Ordered" copy bug (won + hasOG → Ordered) that conflated "chef built
// an Order Guide" with "chef ordered through QuoteMe" — chefs do NOT order
// through QuoteMe. The hasOG branch is gone; `won` always renders `Accepted`.
//
// Full pill copy + the J1 state vs legacy status migration are tracked in
// Artifacts/CHEF_PILL_COPY_AUDIT.md and are HOLDS pending Justin's lock.
// This component is the single-file change locus once those land.

const sans: React.CSSProperties = { fontFamily: 'var(--qm-sans, "DM Sans", sans-serif)' };

export interface QuoteStatusPillProps {
  status: string;
}

export function getQuoteStatusPillProps(status: string): { label: string; bg: string; color: string } {
  if (status === 'won') return { label: 'Accepted', bg: '#DCFCE7', color: '#166534' };
  if (status === 'pending') return { label: 'Ready', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: '#2A5F6F' };
  if (status === 'sent') return { label: 'Sent', bg: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: '#2A5F6F' };
  if (status === 'draft') return { label: 'Processing', bg: '#FEF3C7', color: '#92400E' };
  if (status === 'expired') return { label: 'Refresh available', bg: '#FEF3C7', color: '#92400E' };
  if (status === 'lost') return { label: 'Closed', bg: '#F3F4F6', color: '#6B7280' };
  return { label: status, bg: '#F3F4F6', color: '#4F4F4F' };
}

export function QuoteStatusPill({ status }: QuoteStatusPillProps) {
  const { label, bg, color } = getQuoteStatusPillProps(status);
  return (
    <span
      className="inline-flex items-center"
      style={{
        ...sans,
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 999,
      }}
    >
      {label}
    </span>
  );
}
