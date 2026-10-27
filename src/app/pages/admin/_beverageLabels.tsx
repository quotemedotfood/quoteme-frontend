// Shared words for the Beverages admin pages (Wines list, wine detail, review
// matches). The server holds closed lowercase vocabularies for kind and colour
// (QuoteMe Beverages::Vocabulary); these are their display forms.

const KIND_LABELS: Record<string, string> = {
  wine: 'Wine',
  beer: 'Beer',
  sake: 'Sake',
  spirit: 'Spirit',
  cider: 'Cider',
  other: 'Other',
};

const COLOR_LABELS: Record<string, string> = {
  red: 'Red',
  white: 'White',
  rose: 'Rosé',
  sparkling: 'Sparkling',
  orange: 'Orange',
  dessert: 'Dessert',
  fortified: 'Fortified',
};

export function kindLabel(kind: string | null | undefined): string {
  if (!kind) return '-';
  return KIND_LABELS[kind] ?? kind;
}

export function colorLabel(color: string | null | undefined): string {
  if (!color) return '-';
  return COLOR_LABELS[color] ?? color;
}

export function NeedsReviewBadge() {
  return (
    <span
      data-testid="needs-review-badge"
      className="inline-block px-2 py-0.5 rounded text-xs font-medium border bg-amber-50 text-amber-800 border-amber-300"
      title="A link to this beverage was flagged. Check it under Review matches."
    >
      Needs review
    </span>
  );
}
