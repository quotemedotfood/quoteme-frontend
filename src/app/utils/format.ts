const SEED_PREFIX = '[SEED] ';

/**
 * Strips the literal "[SEED] " prefix from a quote label before display.
 * Seed data in the DB is stored with this prefix; it must never appear in the UI.
 * Only strips a leading prefix — a "[SEED]" that appears mid-string is left alone.
 */
export function stripSeedPrefix(label: string | null | undefined): string {
  if (!label) return '';
  return label.startsWith(SEED_PREFIX) ? label.slice(SEED_PREFIX.length) : label;
}

/**
 * Strips a literal "[" "]" wrap fully enclosing a display name before
 * render — e.g. a restaurant name arriving as "[The Grove]" instead of
 * "The Grove". Seen on the chef quote header; the bracket wrap is a data/
 * placeholder artifact, not intended chef-facing copy. Only strips a wrap
 * around the ENTIRE string (leading "[" AND trailing "]"), so a legitimate
 * name that merely contains brackets partway through is left alone.
 */
export function stripBracketWrap(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']') && trimmed.length > 1) {
    return trimmed.slice(1, -1).trim();
  }
  return name;
}

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

/**
 * Normalises the artifact name for cold-landing (standing_page) rows in the
 * CC inbound routing table Items column.
 *
 * After the B-43 BE fix, artifact names are "Menu PDF", "Menu Text",
 * "Order Guide PDF", "Order Guide Text" — returned unchanged.
 *
 * For legacy rows stored before the fix ("Uploaded Menu", "Uploaded Order guide"):
 * strips the "Uploaded " prefix and title-cases the remainder so the display
 * is consistent with new rows ("Menu", "Order Guide").
 *
 * Non-cold-landing rows (source !== "standing_page") pass through unchanged.
 */
/**
 * Canonical date formatter for quote headers and document chrome.
 * Returns short-month format: "Jun 24, 2026".
 * Used across ChefQuoteReceiptPage and QuoteStateDocument to ensure
 * consistent date presentation in all quote-document surfaces.
 */
export function formatQuoteDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Structured-render formatter for matching-engine surfaces.
 *
 * This is the single formatter for structured entries (validation rules,
 * warnings, rejections, change-log rows, training-chat lines). It was
 * extracted from the validation.rules renderer in QMAdminMatchingEngine so
 * every surface renders structured content the same way instead of falling
 * back to raw "[object Object]" text. Do not add a second formatter for
 * these surfaces; extend this one.
 *
 * Behavior:
 * - strings pass through untouched
 * - null/undefined render as empty string
 * - other primitives render via String()
 * - objects render as "type: <best label>" where the label is the first of
 *   ingredient_pattern / canonical_name / sauce_name, falling back to
 *   JSON.stringify of the whole entry (the original stringify fallback)
 *
 * Local malformed-entry fallback: this function never throws. A single bad
 * entry (circular reference, hostile getter, BigInt, ...) degrades to a
 * placeholder string inside its own card; it can never take down the whole
 * list or panel that is mapping over entries.
 */
export function formatStructuredEntry(entry: unknown): string {
  try {
    if (entry === null || entry === undefined) return '';
    if (typeof entry === 'string') return entry;
    if (typeof entry !== 'object') return String(entry);
    const rec = entry as Record<string, unknown>;
    const label = [rec.ingredient_pattern, rec.canonical_name, rec.sauce_name].find(
      (v): v is string => typeof v === 'string' && v.length > 0
    );
    const head = typeof rec.type === 'string' && rec.type.length > 0 ? `${rec.type}: ` : '';
    if (label) return `${head}${label}`;
    const json = JSON.stringify(entry);
    if (typeof json === 'string') return `${head}${json}`;
    return head || '(unrenderable entry)';
  } catch {
    return '(unrenderable entry)';
  }
}

export function formatColdLandingArtifact(
  source: string | null | undefined,
  artifactName: string | null | undefined
): string {
  if (!artifactName) return '';
  if (source !== 'standing_page') return artifactName;

  // Strip legacy "Uploaded " prefix (case-insensitive)
  const legacyStripped = artifactName.replace(/^Uploaded\s+/i, '');

  // Title-case the result so "Order guide" → "Order Guide"
  return legacyStripped.replace(/\b\w+/g, (w) =>
    w.charAt(0).toUpperCase() + w.slice(1)
  );
}
