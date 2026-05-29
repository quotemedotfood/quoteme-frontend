// src/screens-stack-drawer.jsx
// ─────────────────────────────────────────────────────────────────────────────
// STACK PRODUCT DRAWER — cell-scoped, read-only product detail.
// Desi ask (May 29). The chef clicks a product NAME inside a Stack cell to dive
// into that distributor's specific offering: full description, SKU, origin,
// pack size(s), price.
//
// Scope locks (Justin / Desi, May 29):
//   • CELL-SCOPED. One distributor's offering of one item. Row-scoped and
//     column-scoped detail are BACKLOGGED (told Opus) — not first.
//   • READ-ONLY. No "swap this match" action here — that lives in the Rep Flow
//     already; we don't duplicate it. (Backlogged with Opus.)
//   • MULTIPLE PACK SIZES are accommodated now even though most catalogs won't
//     carry them for a while — the drawer is built ready.
//   • Price shows by default; when a price is absent it renders "$—" (the one
//     place an em-dash is allowed in a price slot, per Justin). A distributor
//     that doesn't carry the item at all stays the whole-cell "—" upstream.
//
// Chrome: desktop = right-side drawer (shared rhythm with StackAddDrawer);
// mobile = bottom sheet. variant="drawer" | "sheet".
// Data is shared across V1 (screens-stack.jsx) and V2 (screens-stack-v2.jsx)
// via window.STACK_ROWS, so this one component serves both.
// ─────────────────────────────────────────────────────────────────────────────

// Price slot formatter — money() when known, "$—" when carried-but-unpriced.
const priceOrDash = (p) => (p == null ? "$—" : money(p));

// Per-offering enrichment, keyed by the distributor's product name (offering.name).
// Anything not enriched degrades gracefully to the cell's own {name, pack, price}.
// `packs` demonstrates the multi-pack-ready shape; most have a single entry.
const STACK_PRODUCT_DETAIL = {
  "Hudson Valley Yellow Cheddar, raw milk": {
    desc: "Bandage-wrapped raw-milk cheddar aged in Hudson Valley cellars. Dense, crumbly paste with a long, brothy finish — holds its edge on a board and melts clean for service.",
    sku: "DL-CHE-0042", origin: "Ghent, NY", brand: "Hudson Valley Creamery", unit: "per lb", updated: "May 8, 2026",
    packs: [
      { label: "5 lb wheel", price: 42.50, sku: "DL-CHE-0042" },
      { label: "Half wheel · 2.5 lb", price: 22.75, sku: "DL-CHE-0042H" },
      { label: "Cut to order · per lb", price: 9.40, sku: "DL-CHE-0042C" },
    ],
  },
  "Branzino, whole dressed, Mediterranean": {
    desc: "Whole dressed Mediterranean sea bass, scaled and gutted, head-on. Sweet, delicate white flesh — the house whole-roast fish. Landed and shipped on ice, 2–3 day turns.",
    sku: "DL-SEA-0112", origin: "Aegean (Greece / Türkiye)", brand: "D'Lisius Catch", unit: "per lb",
    updated: "May 8, 2026",
    packs: [
      { label: "1–1.5 lb avg, each", price: 14.25, sku: "DL-SEA-0112" },
      { label: "Case · 20 lb (≈14–16 fish)", price: 13.10, sku: "DL-SEA-0112C" },
    ],
  },
  "Berkshire pork shoulder, skin-on": {
    desc: "Skin-on bone-in Berkshire (Kurobuta) shoulder. Heavy marbling, deep color — built for long braises, porchetta, and house charcuterie.",
    sku: "DL-MEA-0211", origin: "Beeler's, IA", brand: "Berkshire heritage", unit: "per lb", updated: "May 8, 2026",
    packs: [{ label: "8–10 lb avg, each", price: 78.50, sku: "DL-MEA-0211" }],
  },
  "Prosciutto di Parma, 18-mo, sliced": {
    desc: "DOP Prosciutto di Parma, aged 18 months, machine-sliced and interleaved. Silky, nutty, faintly sweet. Ready for the plate or the panino station.",
    sku: "DL-CHA-0307", origin: "Parma, Italy (DOP)", brand: "Consorzio del Prosciutto", unit: "per lb",
    updated: "May 8, 2026",
    packs: [
      { label: "1 lb, sliced", price: 28.95, sku: "DL-CHA-0307" },
      { label: "Whole boneless leg · ~15 lb", price: 19.80, sku: "DL-CHA-0307W" },
    ],
  },
  "Tellicherry peppercorns, single-origin": {
    desc: "Single-origin Tellicherry black peppercorns, late-harvest and extra-bold grade. Bright, citrus-forward heat — mill-side staple.",
    sku: "DL-SPI-0501", origin: "Malabar Coast, India", brand: "—", unit: "per lb", updated: "May 8, 2026",
    packs: [{ label: "1 lb", price: 18.40, sku: "DL-SPI-0501" }],
  },
  "Meyer lemons, California": {
    desc: "Thin-skinned Meyer lemons — lower acid, floral, faintly sweet. Good for curds, vinaigrettes, and preserved-lemon batches.",
    sku: "DL-PRO-0620", origin: "Central Valley, CA", brand: "—", unit: "per case", updated: "May 8, 2026",
    packs: [
      { label: "35 lb case", price: 58.50, sku: "DL-PRO-0620" },
      { label: "Half case · 18 lb", price: 31.00, sku: "DL-PRO-0620H" },
    ],
  },
  "Late Treviso, local Hudson Valley grow": {
    desc: "Late-season Treviso radicchio from a Hudson Valley grower — tight, tapered heads, deep burgundy. Bitter edge mellows on the grill.",
    sku: null, origin: "Hudson Valley, NY", brand: "Local grower co-op", unit: "per case", updated: "Apr 30, 2026",
    // Unaffiliated distributor, catalog carries the item but no price loaded yet.
    packs: [{ label: "12 ct case", price: null, sku: null }],
  },
};

// Striped placeholder for the product shot (no hand-drawn imagery).
function StackProductImage({ height = 150 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height, borderRadius: "var(--qm-radius-md)", border: "1px solid var(--qm-soft-line)",
        background: "repeating-linear-gradient(45deg, rgba(60,50,40,.05) 0 10px, rgba(60,50,40,.02) 10px 20px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <span style={{ fontFamily: "var(--qm-mono, ui-monospace, monospace)", fontSize: 10.5, letterSpacing: ".08em", color: "rgba(60,50,40,.42)", textTransform: "uppercase" }}>
        product shot
      </span>
    </div>
  );
}

// A small labeled fact (SKU / origin / unit).
function DetailFact({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div className="qm-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div className="ink mt-0.5 leading-snug" style={{ fontSize: 12.5 }}>{value}</div>
    </div>
  );
}

// Shared body for both chrome variants.
function StackProductBody({ offering, chefItem, distributor }) {
  const detail = STACK_PRODUCT_DETAIL[offering.name] || {};
  const packs = (detail.packs && detail.packs.length)
    ? detail.packs
    : [{ label: offering.pack, price: offering.price, sku: detail.sku }];
  // The pack the cell shows is the first one (cell default).
  const defaultLabel = packs[0] && packs[0].label;
  const multi = packs.length > 1;

  return (
    <div>
      {/* Identity */}
      <div className="qm-eyebrow" style={{ fontSize: 10, letterSpacing: ".14em" }}>
        {distributor ? distributor.short : "Distributor"}
        {distributor && distributor.status === "unaffiliated" && (
          <span className="ink-faint" style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none" }}> · no rep yet</span>
        )}
      </div>
      <h2 className="serif font-semibold ink mt-1.5" style={{ fontSize: 22, lineHeight: 1.18, textWrap: "pretty" }}>
        {offering.name}
      </h2>
      <div className="ink-soft mt-1 leading-snug" style={{ fontSize: 12.5 }}>
        Your line: <span className="ink">{chefItem}</span>
      </div>

      <div className="mt-4"><StackProductImage /></div>

      {detail.desc && (
        <p className="ink leading-relaxed mt-4" style={{ fontSize: 13.5, fontFamily: "var(--qm-serif)" }}>
          {detail.desc}
        </p>
      )}

      {/* Facts */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <DetailFact label="SKU" value={detail.sku || (packs[0] && packs[0].sku) || "—"} />
        <DetailFact label="ORIGIN" value={detail.origin} />
        <DetailFact label="BRAND" value={detail.brand} />
        <DetailFact label="SOLD BY" value={detail.unit} />
      </div>

      {/* Pack sizes + prices */}
      <div className="mt-5">
        <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
          <span>{multi ? "PACK SIZES" : "PACK"}</span>
          {multi && <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>{packs.length} options</span>}
        </div>
        <div className="mt-2 doc-divider-thick" />
        {packs.map((p, i) => (
          <div key={i} className="doc-divider py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="ink leading-snug" style={{ fontSize: 13 }}>{p.label}</div>
              <div className="flex items-center gap-2 mt-0.5">
                {p.sku && <span className="ink-faint num leading-snug" style={{ fontSize: 10.5 }}>{p.sku}</span>}
                {i === 0 && multi && (
                  <span className="qm-pill" style={{ background: "var(--qm-warm-paper)", color: "var(--qm-gray-700)", border: "1px solid var(--qm-soft-line)", fontSize: 9, padding: "1px 6px" }}>
                    shown in stack
                  </span>
                )}
              </div>
            </div>
            <div className="num shrink-0 ink" style={{ fontSize: 15, fontWeight: 500 }}>{priceOrDash(p.price)}</div>
          </div>
        ))}
      </div>

      {/* Provenance footnote — distributor name carries the signal, never catalog name. */}
      <div className="mt-5 flex items-start gap-2 text-[11.5px] ink-faint leading-relaxed">
        <Icon name="info" size={13} color="var(--accent)" style={{ marginTop: 1 }} />
        <div>
          From {distributor ? distributor.short : "this distributor"}'s catalog{detail.updated ? ", updated " + detail.updated : ""}.
          {packs.some((p) => p.price == null) && " Prices we don't have yet show as $—."}
        </div>
      </div>
    </div>
  );
}

// The drawer / sheet shell.
function StackProductDrawer({ open, onClose, offering, chefItem, distributor, variant = "drawer" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !offering) return null;
  const sheet = variant === "sheet";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={offering.name}
      style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", justifyContent: sheet ? "center" : "flex-end", alignItems: sheet ? "flex-end" : "stretch" }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{ position: "absolute", inset: 0, background: "rgba(43,43,43,.32)", border: "none", cursor: "default" }}
      />
      <div
        style={{
          position: "relative",
          width: sheet ? "100%" : "min(480px, 92vw)",
          maxHeight: sheet ? "88%" : "100%",
          height: sheet ? "auto" : "100%",
          background: "#fff",
          borderLeft: sheet ? "none" : "1px solid var(--qm-soft-line)",
          borderTopLeftRadius: sheet ? 18 : 0,
          borderTopRightRadius: sheet ? 18 : 0,
          boxShadow: sheet ? "0 -16px 40px rgba(43,43,43,.16)" : "-20px 0 40px rgba(43,43,43,.10)",
          display: "flex", flexDirection: "column",
          animation: sheet ? "qmSheetUp .24s cubic-bezier(.2,.7,.2,1)" : "qmProdDrawerIn .22s cubic-bezier(.2,.7,.2,1)",
        }}
      >
        {sheet && (
          <div style={{ paddingTop: 8, display: "flex", justifyContent: "center" }}>
            <span style={{ width: 38, height: 4, borderRadius: 999, background: "var(--qm-soft-line)" }} />
          </div>
        )}
        {/* Close affordance */}
        <div className="flex items-center justify-end" style={{ padding: sheet ? "4px 16px 0" : "14px 16px 0" }}>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-50"
            aria-label="Close" title="Close (Esc)"
          >
            <Icon name="x" size={16} color="var(--qm-charcoal)" />
          </button>
        </div>
        <div className="flex-1 overflow-auto" style={{ padding: sheet ? "4px 22px 28px" : "0 28px 28px" }}>
          <StackProductBody offering={offering} chefItem={chefItem} distributor={distributor} />
        </div>
        <style>{`
          @keyframes qmProdDrawerIn { from { transform: translateX(24px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
          @keyframes qmSheetUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        `}</style>
      </div>
    </div>
  );
}

Object.assign(window, {
  priceOrDash, STACK_PRODUCT_DETAIL,
  StackProductImage, StackProductBody, StackProductDrawer,
});
