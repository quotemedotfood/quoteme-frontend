/**
 * formatCurrency.ts
 *
 * CANADA-CURRENCY (FE) — single shared money formatter.
 *
 * Replaces ~18 file-local formatters that each hardcoded `currency: 'USD'`
 * (via Intl.NumberFormat) or built `$${...}` / `'$' + ...` template strings.
 * The API returns money as integer cents; this is a pure display-layer
 * consolidation — no FX conversion happens here or anywhere in the FE.
 *
 * Locale is pinned to 'en-US' (not the browser's locale) rather than left
 * undefined/navigator-driven, for two reasons verified against the previous
 * per-file implementations before writing this util:
 *   1. It reproduces the exact USD output the old formatters already
 *      produced — "$1,234.56" (thousands separator, 2 decimals) — so
 *      existing USD users see zero visible change.
 *   2. For non-USD currencies (e.g. CAD) it renders with a disambiguating
 *      prefix — "CA$1,234.56" — rather than a bare "$", which matters here
 *      because a single rep/chef session can show quotes from distributors
 *      in different currencies side by side. (Verified: formatting CAD
 *      under locale 'en-CA' instead produces a bare "$1,234.56" — no
 *      disambiguation — which is why 'en-US' was chosen over "the CAD
 *      distributor's own locale".)
 *
 * Unknown/blank/invalid currency codes fall back to 'USD' rather than
 * throwing (Intl.NumberFormat throws RangeError on an invalid ISO 4217 code).
 */
export function formatCurrency(cents: number, currencyCode?: string | null): string {
  const safeCents = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0;
  const requested = (currencyCode || '').trim().toUpperCase();
  const code = requested || 'USD';

  const format = (currency: string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeCents / 100);

  try {
    return format(code);
  } catch {
    // Unrecognized ISO 4217 code — default to USD rather than throwing.
    return format('USD');
  }
}
