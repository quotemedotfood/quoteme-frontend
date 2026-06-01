// src/screens-secure-catalog.jsx
// ─────────────────────────────────────────────────────────────────────────────
// SECURE REP-CATALOG UPLOAD (v4.5) — the highest-signal catalog path.
// Scope: SECURE_REP_CATALOG_UPLOAD_SCOPE.md (Moose + Justin locks, May 28).
//
// This is NOT the existing screens-rep-catalog-intake.jsx flow. That one is
// chef-voice → the REP uploads. This v4.5 flow is the trust anchor:
//   chef asks rep → rep generates a FORWARDABLE link → rep forwards it to their
//   own internal catalog admin / tech person → THAT person uploads → chef gets
//   ONE email when the catalog is live.
//
// Four surfaces (this file: 1 + 2; screens-secure-public.jsx: 3 + 4):
//   1. Chef entry point   — orange "Ask Marcus for the latest catalog" in the
//                           Distributors tab, on a Connected distributor whose
//                           catalog is the catalog-thin / needs-refresh sub-state
//                           (Opus Q7). One orange per tab; Discovery demotes.
//   2. Rep generate+forward — contextual on a quote blocked-on-catalog. Generate
//                           a link, forward it (copy / email), then watch status.
//
// Doctrine landings:
//   • Field voice. Banned: AI / platform / activate / sign up / streamline / etc.
//   • Continuation of an existing rep relationship, not acquisition software.
//   • Sacred Orange = ONE primary action per surface.
//   • Chef is notified ONCE, at ingestion-complete (Surface 4). Nowhere else.
// ─────────────────────────────────────────────────────────────────────────────

const SECURE = {
  // Canonical demo data (CLAUDE.md). The chef asks his real rep for a refreshed
  // catalog: D'Lisius is Connected, but the copy we hold is from February.
  repFull:        "Marcus Rivera",
  repFirst:       "Marcus",
  repEmail:       "marcus@dlisius.co",
  distributor:    "D'Lisius",
  distributorFull:"D'Lisius Distribution Co.",
  chefFirst:      "Daniel",
  chefFull:       "Daniel Reeves",
  restaurant:     "Holloway & Sons",
  restaurantCity: "Hudson, NY",
  quoteNo:        "Q-1042",
  // The catalog we currently hold for D'Lisius — months old, hence the ask.
  catalogHeldFrom:"Feb 3, 2026",
  // The forwardable link (token survives forwarding; 7-day single-use, Q8).
  link:           "quoteme.co/c/8FK2-QX9D",
  // The internal person the rep forwards to (rep may not even know exactly who).
  catalogAdmin:   "Priya Shah",
  sampleFile:     "DLisius_Spring_2026_Master.pdf",
};

// ═════════════════════════════════════════════════════════════════════════════
// SURFACE 1 — CHEF ENTRY POINT
// Lives in the Distributors tab. Renders the YOUR DISTRIBUTORS section with the
// real D'Lisius row in its catalog-thin sub-state: still "Connected", but the
// catalog we hold is stale, so the row carries the one orange CTA on the tab.
// ═════════════════════════════════════════════════════════════════════════════

// The operational sub-line + orange CTA that attaches to a connected-but-thin
// distributor row. Pulled out so mobile + desktop share copy.
function RequestCatalogCallout({ desktop = false, onAsk }) {
  return (
    <div
      className="mt-3"
      style={{
        background: "var(--qm-warm-paper)",
        border: "1px solid var(--qm-soft-line)",
        borderLeft: "3px solid var(--qm-charcoal)",
        borderRadius: "var(--qm-radius-md)",
        padding: desktop ? "14px 16px" : "12px 13px",
      }}
    >
      <div className="flex items-start gap-2">
        <Icon name="clock" size={desktop ? 15 : 14} color="var(--qm-gray-700)" style={{ marginTop: 1 }} />
        <div className="ink-soft leading-snug" style={{ fontSize: desktop ? 12.5 : 11.5 }}>
          The catalog we have for {SECURE.distributor} is from {SECURE.catalogHeldFrom}. Prices have
          probably moved since.
        </div>
      </div>
      <button
        onClick={onAsk}
        className="qm-btn qm-btn-orange qm-btn-full mt-3"
        style={{ padding: desktop ? "12px 16px" : "11px 14px", fontSize: desktop ? 14 : 13 }}
      >
        Ask {SECURE.repFirst} for the latest catalog
        <Icon name="arrow-right" size={14} color="#fff" />
      </button>
      <div className="ink-faint leading-snug mt-2" style={{ fontSize: desktop ? 11.5 : 10.5 }}>
        We'll send {SECURE.repFirst} a link he can pass to whoever keeps {SECURE.distributor}'s catalog
        current. You'll hear from us once it's loaded — nothing to chase in the meantime.
      </div>
    </div>
  );
}

// The post-ask confirmation that replaces the callout once the chef taps.
function RequestCatalogAsked({ desktop = false, status = "requested" }) {
  return (
    <div
      className="mt-3"
      style={{
        background: "rgba(127,174,194,.06)",
        border: "1px solid var(--accent)",
        borderRadius: "var(--qm-radius-md)",
        padding: desktop ? "14px 16px" : "12px 13px",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center justify-center"
          style={{ width: 22, height: 22, borderRadius: 999, background: "#fff", border: "1px solid var(--accent)" }}
        >
          <Icon name="check" size={12} color="var(--accent)" />
        </span>
        <div className="serif ink" style={{ fontSize: desktop ? 15 : 14, fontWeight: 500 }}>
          {SECURE.repFirst} is on it.
        </div>
      </div>
      <div className="ink-soft leading-snug mt-2" style={{ fontSize: desktop ? 12.5 : 11.5 }}>
        We sent {SECURE.repFirst} a link for {SECURE.distributor}'s latest catalog. You'll get one note
        from us when it's loaded and ready to quote against.
      </div>
      {/* Drop-Zone status progression (Ask 3) — the chef watches the catalog land. */}
      <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--qm-soft-line)" }}>
        <DropStatusStepper status={status} desktop={desktop} />
      </div>
      <div className="ink-faint leading-snug mt-3 num" style={{ fontSize: desktop ? 11 : 10.5 }}>
        Asked just now · {SECURE.distributor}
      </div>
    </div>
  );
}

// A single YOUR-DISTRIBUTORS row (mobile), matching ChefDistributorsTab styling.
function ChefDistRow({ short, name, rep, repPhone, lastQuote, quoteCount, status, children }) {
  return (
    <div className="doc-divider py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="serif text-[15px] font-medium ink leading-snug">{short}</div>
          <div className="text-[11.5px] ink-faint leading-snug">{name}</div>
        </div>
        <CatalogStatusBadge status={status} />
      </div>
      <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
        <div className="min-w-0">
          <div className="qm-eyebrow" style={{ fontSize: 9 }}>REP</div>
          <div className="text-[12.5px] ink mt-0.5 leading-snug">{rep}</div>
          <div className="text-[11.5px] ink-faint num leading-snug">{repPhone}</div>
        </div>
        <div className="text-right">
          <div className="qm-eyebrow" style={{ fontSize: 9 }}>LAST QUOTE</div>
          <div className="text-[12.5px] ink mt-0.5 num leading-snug">{lastQuote}</div>
          <div className="text-[11px] ink-faint num leading-snug">{quoteCount} total</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function SecureChefEntryMobile({ nav = noopNav, asked: askedInit = false }) {
  const [asked, setAsked] = useState(askedInit);
  return (
    <PhoneShell>
      <MobileTopBar restaurant={SECURE.restaurant} />
      <div className="scroller px-5 pt-5 pb-6">
        <div>
          <div className="serif font-semibold ink" style={{ fontSize: 24, lineHeight: 1.15 }}>
            Distributors
          </div>
          <p className="mt-1 text-[12.5px] ink-faint">
            Who you've quoted with, and who else is servicing {SECURE.restaurantCity}.
          </p>
        </div>

        {/* SECTION 1 · YOUR DISTRIBUTORS */}
        <div className="mt-6">
          <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
            <span>YOUR DISTRIBUTORS</span>
            <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>2</span>
          </div>
          <div className="mt-2 doc-divider-thick" />

          {/* D'Lisius — Connected, but catalog-thin → carries the one orange */}
          <ChefDistRow
            short={SECURE.distributor}
            name={SECURE.distributorFull}
            rep={SECURE.repFull}
            repPhone="(518) 555-0143"
            lastQuote="May 12, 2026"
            quoteCount={7}
            status="connected"
          >
            {asked
              ? <RequestCatalogAsked />
              : <RequestCatalogCallout onAsk={() => setAsked(true)} />}
          </ChefDistRow>

          {/* A second, healthy distributor for contrast — no CTA */}
          <ChefDistRow
            short="Hudson Provisions"
            name="Hudson Valley Provisions"
            rep="Anna Mireles"
            repPhone="(518) 555-0207"
            lastQuote="Apr 22, 2026"
            quoteCount={2}
            status="uploaded"
          />
        </div>

        {/* Discovery — demoted to text per Opus Q7 (Request-catalog takes the tab's orange) */}
        <div className="mt-7 flex items-start gap-3 text-[11.5px] ink-soft"
             style={{ borderTop: "1px solid var(--qm-soft-line)", paddingTop: 12 }}>
          <Icon name="send" size={14} color="var(--accent)" />
          <div className="leading-relaxed">
            On paid, you can also <button className="underline ink">send this menu to another distributor</button> servicing {SECURE.restaurantCity}.
          </div>
        </div>
      </div>
      <ChefTabBar active="distributors" nav={nav} />
    </PhoneShell>
  );
}

// Desktop derivative — same row, inside the chef Newspaper sidebar shell.
function SecureChefEntryDesktop({ nav = noopNav, asked: askedInit = false, initialMode = "open" }) {
  const [asked, setAsked] = useState(askedInit);
  return (
    <ChefTabDesktopShell active="distributors" nav={nav} initialMode={initialMode}>
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: 32, lineHeight: 1.1 }}>Distributors</h1>
        <p className="mt-2 text-[14px] ink-soft leading-relaxed" style={{ maxWidth: 560 }}>
          Who you've quoted with, and who else is servicing {SECURE.restaurantCity}.
        </p>
      </div>

      <div className="mt-7" style={{ maxWidth: 640 }}>
        <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
          <span>YOUR DISTRIBUTORS</span>
          <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>2</span>
        </div>
        <div className="mt-2 doc-divider-thick" />

        <div className="doc-divider py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="serif text-[17px] font-medium ink leading-snug">{SECURE.distributor}</div>
              <div className="text-[12.5px] ink-faint leading-snug">{SECURE.distributorFull}</div>
              <div className="text-[12px] ink-soft num leading-snug mt-1">
                {SECURE.repFull} · (518) 555-0143 · 7 quotes · last May 12, 2026
              </div>
            </div>
            <CatalogStatusBadge status="connected" />
          </div>
          <div style={{ maxWidth: 420 }}>
            {asked
              ? <RequestCatalogAsked desktop />
              : <RequestCatalogCallout desktop onAsk={() => setAsked(true)} />}
          </div>
        </div>

        <div className="doc-divider py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="serif text-[17px] font-medium ink leading-snug">Hudson Provisions</div>
              <div className="text-[12.5px] ink-faint leading-snug">Hudson Valley Provisions</div>
              <div className="text-[12px] ink-soft num leading-snug mt-1">
                Anna Mireles · (518) 555-0207 · 2 quotes · last Apr 22, 2026
              </div>
            </div>
            <CatalogStatusBadge status="uploaded" />
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 text-[12.5px] ink-soft"
             style={{ borderTop: "1px solid var(--qm-soft-line)", paddingTop: 14, maxWidth: 560 }}>
          <Icon name="send" size={15} color="var(--accent)" />
          <div className="leading-relaxed">
            On paid, you can also <button className="underline ink">send this menu to another distributor</button> servicing {SECURE.restaurantCity}.
          </div>
        </div>
      </div>
    </ChefTabDesktopShell>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SURFACE 2 — THE EMAIL MARCUS (THE REP) RECEIVES
// Re-corrected flow (Moose lock, May 29): the CHEF generates the forwardable
// link — the ask IS the link. The rep no longer needs an app screen to mint
// one; he just forwards. So the old rep generate+forward screen is gone,
// replaced by the email Marcus gets. He forwards it (or copies the link to
// text it) to whoever keeps the catalog current. One fewer step to a catalog.
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// DROP-ZONE STATUS VOCABULARY (Ask 3) — the single ordered pipeline the chef
// watches on their distributor row. Engineering wires to these exact keys +
// strings (see handoff/SECURE_DROP_ZONE_STATUS.md). Off-track states
// (expired / stalled) live in the one-pager, not the happy-path stepper.
// ─────────────────────────────────────────────────────────────────────────────
const DROP_STATUS = [
  { key: "requested", label: "Requested",          short: "Requested", chefSub: "Asked " + SECURE.repFirst + " — he passes it to whoever keeps the catalog current." },
  { key: "uploading", label: "Coming in",           short: "Coming in", chefSub: SECURE.repFirst + "'s team is sending the catalog over now." },
  { key: "loading",   label: "Loading it in",       short: "Loading",   chefSub: "Reading the catalog and matching it to your menu." },
  { key: "live",      label: "Live in your Stack",  short: "Live",      chefSub: "Updated and ready — your quotes price against it now." },
];

// Compact horizontal status stepper for the chef-side distributor row.
function DropStatusStepper({ status = "requested", desktop = false }) {
  const at = Math.max(0, DROP_STATUS.findIndex((s) => s.key === status));
  const cur = DROP_STATUS[at];
  return (
    <div>
      <div className="flex items-center">
        {DROP_STATUS.map((s, i) => {
          const complete = i < at, active = i === at;
          const dotBg = complete ? "var(--accent)" : active ? "var(--qm-orange)" : "#fff";
          const dotBorder = complete ? "var(--accent)" : active ? "var(--qm-orange)" : "var(--qm-soft-line)";
          return (
            <React.Fragment key={s.key}>
              <span className="inline-flex items-center justify-center shrink-0" style={{ width: 13, height: 13, borderRadius: 999, background: dotBg, border: "1.5px solid " + dotBorder }}>
                {complete && <Icon name="check" size={8} color="#fff" />}
                {active && <span style={{ width: 4, height: 4, borderRadius: 999, background: "#fff" }} />}
              </span>
              {i < DROP_STATUS.length - 1 && <span style={{ flex: 1, height: 1.5, background: complete ? "var(--accent)" : "var(--qm-soft-line)", margin: "0 5px" }} />}
            </React.Fragment>
          );
        })}
      </div>
      <div className="flex items-baseline justify-between mt-2">
        <span className="ink leading-snug" style={{ fontSize: desktop ? 12 : 11.5, fontWeight: 600 }}>{cur.label}</span>
        <span className="ink-faint num leading-snug" style={{ fontSize: desktop ? 10.5 : 10 }}>step {at + 1} of {DROP_STATUS.length}</span>
      </div>
      <div className="ink-soft leading-snug mt-0.5" style={{ fontSize: desktop ? 11.5 : 11 }}>{cur.chefSub}</div>
    </div>
  );
}

// The email Marcus receives. Distributor-warm, field voice; he forwards it or
// copies the link (S2: copy yes, read/edit no). Mirrors the chef-email posture.
function RepCatalogEmail({ desktop = false }) {
  const [copied, setCopied] = useState(false);
  const pad = desktop ? 40 : 26;
  return (
    <div style={{ background: "#fff", maxWidth: desktop ? 600 : 390, margin: "0 auto", fontFamily: "var(--qm-sans)" }}>
      <div style={{ padding: (desktop ? 24 : 18) + "px " + pad + "px", borderBottom: "1px solid var(--qm-soft-line)" }}>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center shrink-0" style={{ width: desktop ? 40 : 34, height: desktop ? 40 : 34, borderRadius: 999, background: "var(--qm-cream)", border: "1px solid var(--qm-soft-line)" }}>
            <QuoteMeWordmark variant="square" height={desktop ? 22 : 19} />
          </span>
          <div className="min-w-0">
            <div className="ink" style={{ fontSize: desktop ? 14 : 13, fontWeight: 600 }}>QuoteMe</div>
            <div className="ink-faint" style={{ fontSize: desktop ? 12 : 11 }}>hello@quoteme.co · to {SECURE.repEmail}</div>
          </div>
          <div className="ink-faint num ml-auto" style={{ fontSize: desktop ? 11.5 : 10.5 }}>now</div>
        </div>
        <div className="serif ink" style={{ fontSize: desktop ? 19 : 16, fontWeight: 600, marginTop: desktop ? 14 : 11, lineHeight: 1.25, letterSpacing: "-.01em" }}>
          {SECURE.chefFull} asked for your latest {SECURE.distributor} catalog
        </div>
      </div>
      <div style={{ padding: (desktop ? 30 : 22) + "px " + pad + "px " + (desktop ? 34 : 26) + "px" }}>
        <p className="ink" style={{ fontSize: desktop ? 15.5 : 14.5, lineHeight: 1.6, fontFamily: "var(--qm-serif)" }}>{SECURE.repFirst} —</p>
        <p className="ink" style={{ fontSize: desktop ? 14.5 : 13.5, lineHeight: 1.7, marginTop: desktop ? 14 : 12, maxWidth: 480 }}>
          {SECURE.chefFull} over at {SECURE.restaurant} is pricing a menu and needs your current {SECURE.distributorFull} price list. Don't dig it up yourself — pass this to whoever keeps your catalog up to date. They drop the file, and {SECURE.chefFirst} is quoting against it within the hour.
        </p>
        <div style={{ marginTop: desktop ? 20 : 16 }}>
          <div className="qm-eyebrow" style={{ fontSize: 9.5 }}>FORWARD THIS LINK</div>
          <div className="flex items-center gap-2 mt-2" style={{ background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)", borderRadius: "var(--qm-radius-md)", padding: desktop ? "10px 10px 10px 14px" : "9px 9px 9px 12px" }}>
            <Icon name="link-2" size={14} color="var(--qm-gray-500)" />
            <span className="num ink truncate" style={{ fontSize: desktop ? 13.5 : 12.5, flex: 1 }}>{SECURE.link}</span>
            <button onClick={() => setCopied(true)} className="qm-btn qm-btn-outline" style={{ padding: "7px 11px", fontSize: 12, gap: 6 }}>
              <Icon name={copied ? "check" : "copy"} size={13} color={copied ? "var(--accent)" : "var(--qm-charcoal)"} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="ink-soft leading-snug mt-2.5" style={{ fontSize: desktop ? 12.5 : 11.5, maxWidth: 480 }}>
            Forward this email, or copy the link to text it over. It works no matter who opens it — no QuoteMe account needed.
          </p>
        </div>
        <a href="#" className="qm-btn qm-btn-orange" style={{ marginTop: desktop ? 22 : 18, padding: desktop ? "13px 20px" : "12px 18px", fontSize: desktop ? 14.5 : 13.5, textDecoration: "none" }}>
          <Icon name="forward" size={15} color="#fff" /> Forward to your catalog team
        </a>
        <p className="ink-soft" style={{ fontSize: desktop ? 13 : 12.5, lineHeight: 1.6, marginTop: desktop ? 22 : 18, fontFamily: "var(--qm-serif)", fontStyle: "italic" }}>
          The link is good for 7 days. {SECURE.chefFirst} sees these prices only — they're never shared with other distributors.
        </p>
        <p className="ink-faint" style={{ fontSize: desktop ? 12.5 : 11.5, lineHeight: 1.5, marginTop: desktop ? 16 : 13 }}>— QuoteMe</p>
      </div>
      <div style={{ padding: (desktop ? 16 : 13) + "px " + pad + "px", borderTop: "1px solid var(--qm-soft-line)", background: "var(--qm-cream)" }}>
        <div className="ink-faint" style={{ fontSize: desktop ? 11 : 10, lineHeight: 1.5 }}>
          You're getting this because {SECURE.chefFull} at {SECURE.restaurant} asked for an updated catalog from {SECURE.distributor}.
        </div>
      </div>
    </div>
  );
}

function RepCatalogEmailMobile() {
  return (
    <PhoneShell>
      <div className="flex items-center gap-2 px-5 py-2.5 border-b hairline" style={{ background: "var(--qm-cream)" }}>
        <Icon name="chevron-left" size={15} color="var(--qm-gray-500)" />
        <Icon name="inbox" size={14} color="var(--qm-gray-500)" />
        <span className="ink-soft" style={{ fontSize: 12 }}>Inbox</span>
        <span className="ink-faint ml-auto" style={{ fontSize: 11 }}>Mail</span>
      </div>
      <div className="scroller" style={{ background: "#fff" }}>
        <RepCatalogEmail />
      </div>
    </PhoneShell>
  );
}

function RepCatalogEmailDesktop() {
  return (
    <div style={{ background: "#F2F0EA", padding: "40px", minHeight: 560 }}>
      <div style={{ maxWidth: 600, margin: "0 auto", border: "1px solid var(--qm-soft-line)", borderRadius: "var(--qm-radius-xl)", overflow: "hidden", boxShadow: "var(--qm-shadow-md)" }}>
        <RepCatalogEmail desktop />
      </div>
      <div className="text-center mt-3" style={{ fontSize: 11, color: "rgba(60,50,40,.45)" }}>
        Replaces the old rep app-screen · the chef minted the link, Marcus just forwards this
      </div>
    </div>
  );
}

// Standalone stepper showcase for the gallery (Ask 3 status vocab, all states).
function DropStatusShowcase() {
  const states = ["requested", "uploading", "loading", "live"];
  return (
    <div style={{ background: "#fff", padding: "28px 30px", maxWidth: 460, margin: "0 auto" }}>
      <div className="qm-eyebrow" style={{ fontSize: 10 }}>SECURE DROP-ZONE STATUS · CHEF-FACING</div>
      <div className="serif ink mt-1" style={{ fontSize: 18, fontWeight: 600 }}>How the catalog lands</div>
      <div className="mt-5 flex flex-col gap-5">
        {states.map((st) => (
          <div key={st} style={{ border: "1px solid var(--qm-soft-line)", borderRadius: "var(--qm-radius-md)", padding: "14px 16px", background: "rgba(127,174,194,.05)" }}>
            <DropStatusStepper status={st} desktop />
          </div>
        ))}
      </div>
    </div>
  );
}

// FLOW_ROUTES registration
if (typeof FLOW_ROUTES !== "undefined") {
  FLOW_ROUTES["secure-chef-entry"]       = { component: "SecureChefEntryMobile" };
  FLOW_ROUTES["secure-chef-entry-asked"] = { component: "SecureChefEntryMobile", props: { asked: true } };
  FLOW_ROUTES["rep-email"]               = { component: "RepCatalogEmailMobile" };
}

Object.assign(window, {
  SECURE, DROP_STATUS, DropStatusStepper, DropStatusShowcase,
  RequestCatalogCallout, RequestCatalogAsked, ChefDistRow,
  SecureChefEntryMobile, SecureChefEntryDesktop,
  RepCatalogEmail, RepCatalogEmailMobile, RepCatalogEmailDesktop,
});
