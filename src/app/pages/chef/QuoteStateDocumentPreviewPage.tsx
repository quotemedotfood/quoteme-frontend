// TEMPORARY visual-sign-off surface for D6 QuoteStateDocument (Item 3).
// Mounts all three states side-by-side with demo data so Moose can verify the
// chrome in a browser. REMOVE (or fold into a real receipt) once Item 4 wires
// QuoteStateDocument into ChefQuoteReceiptPage with live quote data — gated on
// the C3 unify-vs-coexist decision. Route: /chef/_preview/quote-states.

import { QuoteStateDocument, type QuoteDocGroup } from '../../components/chef/QuoteStateDocument';

const DEMO_GROUPS: QuoteDocGroup[] = [
  {
    cat: 'Produce',
    items: [
      { name: 'Heirloom Tomatoes', pack: '10 lb case', qty: 2, unit: 38.0 },
      { name: 'Tuscan Kale', pack: '24 ct', qty: 3, unit: 22.5 },
      { name: 'Shallots', pack: '5 lb', qty: 1, unit: 14.0 },
      { name: 'Meyer Lemons', pack: '40 ct', note: 'seasonal', qty: 1, unit: 28.0 },
      { name: 'Flat-leaf Parsley', pack: '12 bunch', qty: 2, unit: 11.0 },
    ],
  },
  {
    cat: 'Protein',
    items: [
      { name: 'Berkshire Pork Shoulder', pack: 'per lb', qty: 18, unit: 6.25 },
      { name: 'Day-boat Scallops', pack: '10 lb', note: 'U-10', qty: 1, unit: 132.0 },
      { name: 'Whole Branzino', pack: '15 lb case', qty: 2, unit: 86.0 },
      { name: 'Duck Breast', pack: '4 ct', qty: 3, unit: 41.0 },
    ],
  },
  {
    cat: 'Dry Goods',
    items: [
      { name: 'Extra Virgin Olive Oil', pack: '3 L tin', qty: 2, unit: 48.0 },
      { name: 'San Marzano Tomatoes', pack: '6 #10 cans', qty: 1, unit: 52.0 },
      { name: 'Maldon Sea Salt', pack: '12 ct', qty: 1, unit: 64.0 },
      { name: 'Bucatini', pack: '20 × 1 lb', qty: 1, unit: 34.0 },
      { name: 'Arborio Rice', pack: '25 lb', qty: 1, unit: 39.0 },
      { name: 'Sherry Vinegar', pack: '6 × 750 ml', qty: 1, unit: 58.0 },
      { name: 'Marcona Almonds', pack: '5 lb', qty: 1, unit: 72.0 },
      { name: 'Dried Porcini', pack: '1 lb', qty: 1, unit: 96.0 },
      { name: 'Saffron', pack: '5 g', note: 'special order', qty: 1, unit: 44.0 },
    ],
  },
];

const COMMON = {
  restaurant: 'Holloway & Sons',
  forName: 'Daniel Reeves',
  quoteDate: 'May 12, 2026',
  rep: 'Marcus Rivera',
  repPhone: '(518) 555-0143',
  distributorShort: "D'Lisius",
  catalogUpdated: 'Updated May 10, 2026',
  groups: DEMO_GROUPS,
};

const TOTAL_ITEMS = DEMO_GROUPS.reduce((a, g) => a + g.items.length, 0);

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="text-xs mb-2 tracking-widest uppercase"
        style={{ color: '#9E9E9E', fontWeight: 600 }}
      >
        {label}
      </div>
      <div
        className="w-full overflow-hidden rounded-lg"
        style={{ maxWidth: 420, border: '1px solid #E8E8E8' }}
      >
        {children}
      </div>
    </div>
  );
}

export function QuoteStateDocumentPreviewPage() {
  return (
    <div className="min-h-screen px-6 py-10" style={{ background: '#F3F4F6' }}>
      <div className="max-w-6xl mx-auto">
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "'Playfair Display', serif", color: '#2A2A2A' }}
        >
          QuoteStateDocument: D6 preview
        </h1>
        <p className="text-sm mb-8" style={{ color: '#6B7280' }}>
          Temporary visual-sign-off surface. Three document states, same content. Remove once
          wired into ChefQuoteReceiptPage (Item 4, gated on C3).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <Frame label="Preview">
            <QuoteStateDocument state="preview" {...COMMON} totalCount={TOTAL_ITEMS} />
          </Frame>
          <Frame label="Distributor (partial)">
            <QuoteStateDocument
              state="distributor"
              {...COMMON}
              pricedCount={11}
              totalCount={TOTAL_ITEMS}
              lastUpdated="May 25, 2026 · 3:42 PM"
            />
          </Frame>
          <Frame label="Confirmed">
            <QuoteStateDocument state="confirmed" {...COMMON} totalCount={TOTAL_ITEMS} confirmedAt="May 25, 2026" />
          </Frame>
        </div>
      </div>
    </div>
  );
}
