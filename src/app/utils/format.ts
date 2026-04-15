export function toTitleCase(str: string): string {
  if (!str) return '';
  // If the string contains non-ASCII characters (e.g. accented culinary terms like
  // "crème fraîche", "jalapeño"), preserve the original casing — title-casing
  // these naively breaks the multi-byte sequences that compose accented characters.
  if (/[^\x00-\x7F]/.test(str)) return str;
  return str.replace(/\b\w+/g, (word) => {
    const lower = word.toLowerCase();
    if (['a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with'].includes(lower)) {
      return lower;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).replace(/^./, (c) => c.toUpperCase());
}

/**
 * Format a product's display name from brand + product fields.
 * Handles cases where:
 * - product already contains the brand (e.g., "Soom Tahini") → show as-is
 * - product equals brand (ingestion fallback case) → show just the value
 * - brand and product are different → show "product" with brand separate
 * - brand or product is missing → show whichever is available
 */
export function formatProductName(product?: string | null, brand?: string | null): string {
  const p = product?.trim() || '';
  const b = brand?.trim() || '';

  if (!p && !b) return '';
  if (!p) return toTitleCase(b);
  if (!b) return toTitleCase(p);

  // If product and brand are the same (ingestion fallback), show once
  if (p.toLowerCase() === b.toLowerCase()) return toTitleCase(p);

  // If product already starts with brand, no need to prepend
  if (p.toLowerCase().startsWith(b.toLowerCase())) return toTitleCase(p);

  // Show brand + product
  return toTitleCase(`${b} ${p}`);
}
