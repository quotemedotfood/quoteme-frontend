/**
 * categoryLabel — convert a raw backend category token to a human-readable
 * Title Case display label.
 *
 * The CATEGORY_DISPLAY_LABELS map covers every token currently emitted by
 * MenuIntelligenceService / AlignmentEngine. For tokens not in the map the
 * generic prettifier replaces underscores/hyphens with spaces and Title Cases
 * the result, so no raw snake_case token ever reaches the user.
 *
 * IMPORTANT: filter VALUES and sort keys must still use the raw token — only
 * the displayed text goes through this helper.
 */

export const CATEGORY_DISPLAY_LABELS: Record<string, string> = {
  // Core food categories
  produce: 'Produce',
  proteins: 'Proteins',
  protein: 'Proteins',
  dairy: 'Dairy',
  seafood: 'Seafood',
  poultry: 'Poultry',
  meat: 'Meat',
  meats: 'Meat',
  charcuterie: 'Charcuterie',
  bakery: 'Bakery',
  bread: 'Bread',
  pasta: 'Pasta',
  grains: 'Grains',
  rice: 'Rice',
  legumes: 'Legumes',
  beans: 'Beans',
  nuts: 'Nuts',
  seeds: 'Seeds',
  frozen: 'Frozen',
  canned: 'Canned',
  dry_goods: 'Dry Goods',
  beverages: 'Beverages',
  beverage: 'Beverages',
  // Flavor + sauce
  sauces: 'Sauces',
  sauce: 'Sauces',
  condiments: 'Condiments',
  condiment: 'Condiments',
  dressings: 'Dressings',
  dressing: 'Dressings',
  marinades: 'Marinades',
  marinade: 'Marinades',
  vinegars: 'Vinegars',
  vinegar: 'Vinegars',
  oils: 'Oils',
  oil: 'Oils',
  spices: 'Spices',
  spice: 'Spices',
  herbs: 'Herbs',
  herb: 'Herbs',
  sweeteners: 'Sweeteners',
  sweetener: 'Sweeteners',
  sugar: 'Sugar',
  // Bar / beverage modifiers
  bar_modifier: 'Bar Modifier',
  mixer: 'Mixer',
  mixers: 'Mixers',
  syrup: 'Syrup',
  syrups: 'Syrups',
  bitters: 'Bitters',
  garnish: 'Garnish',
  garnishes: 'Garnishes',
  ice: 'Ice',
  // Packaging / support
  support_item: 'Support Item',
  support_items: 'Support Items',
  packaging: 'Packaging',
  smallwares: 'Smallwares',
  equipment: 'Equipment',
  cleaning: 'Cleaning',
  supplies: 'Supplies',
  supply: 'Supplies',
  chemicals: 'Chemicals',
  // Misc
  cheese: 'Cheese',
  egg: 'Eggs',
  eggs: 'Eggs',
  mushroom: 'Mushrooms',
  mushrooms: 'Mushrooms',
  truffle: 'Truffles',
  truffles: 'Truffles',
  other: 'Other',
  uncategorized: 'Uncategorized',
};

/**
 * Return the display label for a raw category token.
 * Falls back to prettifying unknown tokens (replaces _ and - with spaces,
 * then Title Cases each word).
 */
export function categoryLabel(raw: string): string {
  if (!raw) return '';
  const key = raw.trim().toLowerCase();
  if (CATEGORY_DISPLAY_LABELS[key]) return CATEGORY_DISPLAY_LABELS[key];
  // Generic fallback: replace separators, normalise to lowercase, then Title Case each word.
  // Lowercasing first ensures ALL_CAPS tokens like "DRY_GOODS" become "Dry Goods" not "DRY GOODS".
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
