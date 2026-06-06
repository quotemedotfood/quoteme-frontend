// src/screens-profiles.jsx — Profile pages, all roles + Distributor Settings
// redesign (Eighteen/Moose, Jun 6).
//
// Profiles are the NETWORK-FACING detail view of an account. OTHERS view them
// (a chef views a distributor; a brand views a distributor). They are NOT the
// account's own Settings page. Each profile is a self-contained card/page so a
// future Network directory can compose it cleanly.
//
// CROSS-CUTTING DOCTRINE (held in code below):
//   • New newspaper aesthetic, ONE shell, mobile-first.
//   • Logo + links standard on every profile.
//   • NO PRICING on any profile shown to another party. Distributor profile is
//     the emphatic case: ZERO catalog/product prices, none, not even zeros.
//     (Delivery POLICY the brief explicitly enumerates — states, cut-offs,
//     minimum order, payment terms — is account policy, not catalog pricing,
//     and is shown. A standing footer states the pricing rule outright.)
//   • Rep contact is CONDITIONAL: name always; contact only if the viewer is
//     logged in AND the rep has opted to publicize. Default = name only.
//   • Distributor profile shows brands carried as NAMES + LOGOS only — never
//     their products, never any catalog representation.
//   • Placeholder copy where Justin's language isn't locked.
//
// Settings ≠ Profile: Settings is the account's own config (it FEEDS the
// profile); the profile is the network-facing view. DistributorSettings below
// is the redesigned own-config surface.
// ─────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// Shared profile primitives
// ═════════════════════════════════════════════════════════════════════════════

// Monogram logo tile — stands in for an uploaded logo everywhere one would sit.
function ProfileMark({ mono, size = 56, radius, dark = true, accent }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 serif"
      style={{
        width: size, height: size,
        borderRadius: radius != null ? radius : Math.round(size * 0.2),
        background: accent ? accent : (dark ? "#1F1A14" : "var(--qm-warm-paper)"),
        color: dark || accent ? "#FBFAF7" : "var(--qm-charcoal)",
        border: dark || accent ? "none" : "1px solid var(--qm-soft-line)",
        fontWeight: 600, fontSize: size * 0.38, lineHeight: 1, letterSpacing: "-.01em",
      }}
      aria-hidden="true"
    >
      {mono}
    </span>
  );
}

// Link row — website / handles. Standard on every profile.
function ProfileLinks({ links = [], desktop = false }) {
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
      {links.map((l, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 ink-soft" style={{ fontSize: desktop ? 12.5 : 12 }}>
          <Icon name={l.icon || "link"} size={13} color="var(--qm-gray-500)" />
          <span className="underline underline-offset-2">{l.label}</span>
        </span>
      ))}
    </div>
  );
}

// Profile header — logo + name + kind eyebrow + location + links. Reads like the
// masthead of a network directory entry.
function ProfileHeader({ mono, name, kind, location, links, accent, desktop = false, est }) {
  return (
    <div className="flex items-start gap-4">
      <ProfileMark mono={mono} size={desktop ? 64 : 52} accent={accent} />
      <div className="min-w-0 flex-1">
        <div className="qm-eyebrow" style={{ fontSize: desktop ? 10.5 : 10 }}>{kind}</div>
        <h1 className="serif font-semibold ink mt-1" style={{ fontSize: desktop ? 32 : 24, lineHeight: 1.1, letterSpacing: "-.01em" }}>{name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 ink-faint" style={{ fontSize: desktop ? 13 : 12 }}>
          {location && <span className="inline-flex items-center gap-1"><Icon name="map-pin" size={12} color="var(--qm-gray-400)" /> {location}</span>}
          {est && <span className="num">· Est. {est}</span>}
        </div>
        <ProfileLinks links={links} desktop={desktop} />
      </div>
    </div>
  );
}

// Section block — eyebrow + thick rule + content (the document rhythm).
function ProfileSection({ title, count, note, children, desktop = false }) {
  return (
    <div className={desktop ? "mt-8" : "mt-7"}>
      <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
        <span>{title}</span>
        {count != null && <span className="ink-faint" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 400 }}>{count}</span>}
      </div>
      {note && <div className="mt-1 text-[11.5px] ink-faint leading-snug" style={{ maxWidth: 360 }}>{note}</div>}
      <div className="mt-2 doc-divider-thick" />
      {children}
    </div>
  );
}

// Rep row — name ALWAYS; contact ONLY IF viewer logged in AND rep opted in.
// Otherwise a quiet, non-dead-end "Reach via QuoteMe" line. (Doctrine.)
function ProfileRepRow({ rep, viewerLoggedIn }) {
  const showContact = viewerLoggedIn && rep.publicize && (rep.email || rep.phone);
  return (
    <div className="doc-divider py-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[13.5px] ink leading-snug">{rep.name}</div>
        {rep.territory && <div className="text-[11.5px] ink-faint leading-snug">{rep.territory}</div>}
      </div>
      <div className="text-right shrink-0">
        {showContact ? (
          <>
            {rep.email && <a href={`mailto:${rep.email}`} className="block text-[11.5px] underline ink-soft leading-snug">{rep.email}</a>}
            {rep.phone && <div className="text-[11.5px] ink-faint num leading-snug">{rep.phone}</div>}
          </>
        ) : (
          <span className="text-[11px] ink-faint leading-snug inline-flex items-center gap-1">
            <Icon name="lock" size={11} color="var(--qm-gray-400)" />
            {viewerLoggedIn ? "Contact not shared" : "Sign in to reach"}
          </span>
        )}
      </div>
    </div>
  );
}

// Brand-carried chip — NAME + LOGO ONLY. No products, no catalog. (Doctrine.)
function CarriedBrandChip({ name, mono }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 doc-divider">
      <ProfileMark mono={mono} size={32} radius={7} />
      <span className="text-[13px] ink leading-snug">{name}</span>
    </div>
  );
}

// Standing footer that states the pricing rule outright on a distributor profile.
function NoPricingFooter({ desktop = false }) {
  return (
    <div className="mt-8 flex items-start gap-3" style={{ borderTop: "1px solid var(--qm-soft-line)", paddingTop: 14 }}>
      <Icon name="shield" size={15} color="var(--accent)" style={{ marginTop: 1 }} />
      <div className="ink-soft leading-relaxed" style={{ fontSize: desktop ? 12 : 11.5, maxWidth: 460 }}>
        <b className="ink">Prices are never shown here.</b> A distributor's catalog and pricing stay private —
        they appear only inside a quote a chef has asked for. Nothing on this page reflects what anything costs.
      </div>
    </div>
  );
}

// Viewer chrome for the gallery — a profile is viewed FROM inside someone else's
// app, so we frame it with a slim "viewing as" bar, not a full owner shell.
function ProfileViewerFrameMobile({ viewerNote, children }) {
  return (
    <PhoneShell>
      <div className="flex items-center gap-2 px-4 py-3 border-b hairline bg-white" style={{ flex: "0 0 auto" }}>
        <button className="w-8 h-8 -ml-1 rounded-md flex items-center justify-center hover:bg-gray-50" aria-label="Back">
          <Icon name="arrow-left" size={18} color="var(--qm-charcoal)" />
        </button>
        <span className="text-[12px] ink-faint truncate">{viewerNote}</span>
      </div>
      <div className="scroller px-5 pt-5 pb-8">{children}</div>
    </PhoneShell>
  );
}

function ProfileViewerFrameDesktop({ viewerNote, children, maxWidth = 720 }) {
  return (
    <div className="desktop" style={{ background: "var(--qm-warm-paper)", minHeight: 720 }}>
      <div className="flex items-center gap-2 px-8 py-3.5 border-b hairline" style={{ background: "#fff" }}>
        <button className="w-8 h-8 -ml-1 rounded-md flex items-center justify-center hover:bg-gray-50" aria-label="Back">
          <Icon name="arrow-left" size={18} color="var(--qm-charcoal)" />
        </button>
        <span className="text-[12.5px] ink-faint">{viewerNote}</span>
      </div>
      <div style={{ padding: "40px 40px 64px" }}>
        <div className="bg-white border hairline rounded-xl" style={{ maxWidth, margin: "0 auto", padding: "40px 40px 36px", boxShadow: "var(--qm-shadow-md)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Demo data — restaurant + distributor (brand reuses BRAND_* from screens-brand)
// ═════════════════════════════════════════════════════════════════════════════
const RESTAURANT_PROFILE = {
  mono: "H&S", name: "Holloway & Sons", kind: "RESTAURANT · SEASONAL AMERICAN", city: "Hudson, NY", est: "2014",
  links: [{ icon: "globe", label: "hollowayandsons.com" }, { icon: "at-sign", label: "@hollowayandsons" }],
  details: [
    { label: "Cuisine",      value: "Seasonal American, wood-fire" },
    { label: "Service",      value: "Dinner Tue–Sun · brunch weekends" },
    { label: "Neighborhood", value: "Warren Street, Hudson" },
    { label: "Seats",        value: "64 dining · 18 bar" },
  ],
  locations: [
    { name: "Holloway & Sons",       city: "Hudson, NY",    role: "Flagship" },
    { name: "Holloway & Sons · Annex", city: "Hudson, NY",  role: "Private events" },
    { name: "Holloway Catering",     city: "Rhinebeck, NY", role: "Off-site" },
  ],
  chefs: [
    { name: "Daniel Reeves",  role: "Head chef · owner" },
    { name: "Marta Quintero", role: "Sous chef" },
    { name: "Wei Tanaka",     role: "Pastry" },
  ],
};

const DISTRIBUTOR_PROFILE = {
  mono: "DL", name: "D'Lisius Distribution Co.", short: "D'Lisius", kind: "DISTRIBUTOR · BROADLINE", city: "Albany, NY", est: "1998",
  links: [{ icon: "globe", label: "dlisius.co" }, { icon: "phone", label: "(518) 555-0100" }],
  statesServed: ["New York", "Massachusetts", "Connecticut", "Vermont"],
  delivery: [
    { label: "Delivery days",  value: "Mon · Wed · Fri" },
    { label: "Order cut-off",  value: "3:00 PM, day before delivery" },
    { label: "Minimum order",  value: "$250 per delivery" },
    { label: "Payment terms",  value: "Net 30 · approved accounts" },
  ],
  brandsCarried: [
    { name: "Highland Larder Co.",    mono: "HL" },
    { name: "Ironwood Coffee Roasters", mono: "IC" },
    { name: "Saltbox Seafood",        mono: "SS" },
    { name: "Verdant Greens",         mono: "VG" },
    { name: "Cobble Hill Creamery",   mono: "CC" },
    { name: "Wells & Drum Spirits",   mono: "WD" },
    { name: "Anvil Bakehouse",        mono: "AB" },
    { name: "Tannery Run Beef",       mono: "TR" },
  ],
  reps: [
    { name: "Marcus Rivera", territory: "Hudson Valley · Capital District", email: "marcus@dlisius.co", phone: "(518) 555-0143", publicize: true  },
    { name: "Lena Park",     territory: "NYC metro · Westchester",          email: "lena@dlisius.co",   phone: "(518) 555-0151", publicize: false },
    { name: "Owen Brandt",   territory: "Berkshires · Western MA",          email: null,                phone: null,             publicize: false },
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. BRAND PROFILE — reps · products (names+specs, NO prices) · distributors
//    worked with · logo · links.
// ═════════════════════════════════════════════════════════════════════════════
function BrandProfileBody({ desktop = false, viewerLoggedIn = true }) {
  return (
    <div>
      <ProfileHeader
        mono={BRAND_DEMO.mono} name={BRAND_DEMO.brand} kind={`BRAND · ${BRAND_DEMO.category.toUpperCase()}`}
        location={BRAND_DEMO.city} est={BRAND_DEMO.founded} desktop={desktop}
        links={[{ icon: "globe", label: BRAND_DEMO.site }, { icon: "at-sign", label: "@highlandlarder" }]}
      />

      <div className={desktop ? "mt-2 grid grid-cols-2 gap-x-10" : ""}>
        {/* PRODUCTS — names + specs only, never prices */}
        <div>
          <ProfileSection title="PRODUCTS" count={BRAND_PRODUCTS.length} note="Names and pack specs. Prices live only inside a quote." desktop={desktop}>
            {BRAND_PRODUCTS.map((p, i) => (
              <div key={i} className="doc-divider py-2.5 flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] ink leading-snug">{p.name}</div>
                  <div className="text-[11px] ink-faint num leading-snug">{p.spec}</div>
                </div>
                <span className="qm-pill shrink-0" style={{ background: "var(--qm-warm-paper)", color: "var(--qm-gray-700)", border: "1px solid var(--qm-soft-line)", fontSize: 9.5, padding: "1px 7px" }}>{p.tag}</span>
              </div>
            ))}
          </ProfileSection>
        </div>

        <div>
          {/* REPS — the brand's own. Conditional contact. */}
          <ProfileSection title="REPS" count={BRAND_REPS.length} desktop={desktop}>
            {BRAND_REPS.map((r, i) => <ProfileRepRow key={i} rep={r} viewerLoggedIn={viewerLoggedIn} />)}
          </ProfileSection>

          {/* DISTRIBUTORS WORKED WITH */}
          <ProfileSection title="DISTRIBUTORS THEY WORK WITH" count={BRAND_DISTRIBUTORS.length} desktop={desktop}>
            {BRAND_DISTRIBUTORS.map((d, i) => (
              <div key={i} className="doc-divider py-2.5 flex items-center gap-2.5">
                <ProfileMark mono={d.short.slice(0, 2).toUpperCase()} size={30} radius={7} dark={false} />
                <div className="min-w-0">
                  <div className="text-[12.5px] ink leading-snug">{d.short}</div>
                  <div className="text-[11px] ink-faint leading-snug">{d.region}</div>
                </div>
              </div>
            ))}
          </ProfileSection>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. RESTAURANT PROFILE — locations · chefs · details · logo.
// ═════════════════════════════════════════════════════════════════════════════
function RestaurantProfileBody({ desktop = false }) {
  const P = RESTAURANT_PROFILE;
  return (
    <div>
      <ProfileHeader mono={P.mono} name={P.name} kind={P.kind} location={P.city} est={P.est} desktop={desktop} links={P.links} />

      <div className={desktop ? "mt-2 grid grid-cols-2 gap-x-10" : ""}>
        <div>
          <ProfileSection title="DETAILS" desktop={desktop}>
            {P.details.map((d, i) => (
              <div key={i} className="doc-divider py-2.5 flex items-baseline justify-between gap-3">
                <span className="qm-eyebrow" style={{ fontSize: 9 }}>{d.label}</span>
                <span className="text-[12.5px] ink leading-snug text-right">{d.value}</span>
              </div>
            ))}
          </ProfileSection>

          <ProfileSection title="LOCATIONS" count={P.locations.length} desktop={desktop}>
            {P.locations.map((l, i) => (
              <div key={i} className="doc-divider py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="serif text-[14px] font-medium ink leading-snug">{l.name}</div>
                  <div className="text-[11.5px] ink-faint leading-snug">{l.city}</div>
                </div>
                <span className="qm-pill shrink-0" style={{ background: "var(--qm-warm-paper)", color: "var(--qm-gray-700)", border: "1px solid var(--qm-soft-line)", fontSize: 9.5, padding: "1px 8px" }}>{l.role}</span>
              </div>
            ))}
          </ProfileSection>
        </div>

        <div>
          <ProfileSection title="CHEFS" count={P.chefs.length} desktop={desktop}>
            {P.chefs.map((c, i) => (
              <div key={i} className="doc-divider py-3 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full flex items-center justify-center border hairline shrink-0" style={{ background: "var(--qm-warm-paper)" }}>
                  <span className="serif text-[11px] font-semibold ink">{c.name.split(" ").map(s => s[0]).join("")}</span>
                </span>
                <div className="min-w-0">
                  <div className="text-[13.5px] ink leading-snug">{c.name}</div>
                  <div className="text-[11.5px] ink-faint leading-snug">{c.role}</div>
                </div>
              </div>
            ))}
          </ProfileSection>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. DISTRIBUTOR PROFILE — the most rule-bound. Brands carried (names+logos
//    only) · ZERO prices · delivery details · reps (conditional contact).
// ═════════════════════════════════════════════════════════════════════════════
function DistributorProfileBody({ desktop = false, viewerLoggedIn = true }) {
  const P = DISTRIBUTOR_PROFILE;
  return (
    <div>
      <ProfileHeader mono={P.mono} name={P.name} kind={P.kind} location={P.city} est={P.est} desktop={desktop} links={P.links} />

      {/* DELIVERY — states served + policy. Account policy, not catalog pricing. */}
      <ProfileSection title="DELIVERY" desktop={desktop}>
        <div className="py-3 doc-divider">
          <div className="qm-eyebrow" style={{ fontSize: 9 }}>STATES SERVED</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {P.statesServed.map((s, i) => (
              <span key={i} className="qm-pill" style={{ background: "var(--qm-warm-paper)", color: "var(--qm-charcoal)", border: "1px solid var(--qm-soft-line)", fontSize: 11, padding: "2px 9px" }}>{s}</span>
            ))}
          </div>
        </div>
        {P.delivery.map((d, i) => (
          <div key={i} className="doc-divider py-2.5 flex items-baseline justify-between gap-3">
            <span className="qm-eyebrow" style={{ fontSize: 9 }}>{d.label}</span>
            <span className="text-[12.5px] ink num leading-snug text-right">{d.value}</span>
          </div>
        ))}
      </ProfileSection>

      <div className={desktop ? "grid grid-cols-2 gap-x-10" : ""}>
        {/* BRANDS CARRIED — names + logos ONLY. Never products / catalog. */}
        <div>
          <ProfileSection title="BRANDS CARRIED" count={P.brandsCarried.length} note="Names and logos only — never their products or prices." desktop={desktop}>
            {P.brandsCarried.map((b, i) => <CarriedBrandChip key={i} name={b.name} mono={b.mono} />)}
          </ProfileSection>
        </div>

        {/* REPS — name always, contact conditional */}
        <div>
          <ProfileSection title="REPS" count={P.reps.length} note="Contact shows only when you're signed in and the rep has chosen to share it." desktop={desktop}>
            {P.reps.map((r, i) => <ProfileRepRow key={i} rep={r} viewerLoggedIn={viewerLoggedIn} />)}
          </ProfileSection>
        </div>
      </div>

      <NoPricingFooter desktop={desktop} />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Profile page assemblies (mobile + desktop) for the gallery.
// ═════════════════════════════════════════════════════════════════════════════
function BrandProfileMobile({ viewerLoggedIn = true }) {
  return <ProfileViewerFrameMobile viewerNote="A distributor is viewing this brand"><BrandProfileBody viewerLoggedIn={viewerLoggedIn} /></ProfileViewerFrameMobile>;
}
function BrandProfileDesktop({ viewerLoggedIn = true }) {
  return <ProfileViewerFrameDesktop viewerNote="A distributor is viewing this brand" maxWidth={760}><BrandProfileBody desktop viewerLoggedIn={viewerLoggedIn} /></ProfileViewerFrameDesktop>;
}
function RestaurantProfileMobile() {
  return <ProfileViewerFrameMobile viewerNote="A rep is viewing this restaurant"><RestaurantProfileBody /></ProfileViewerFrameMobile>;
}
function RestaurantProfileDesktop() {
  return <ProfileViewerFrameDesktop viewerNote="A rep is viewing this restaurant" maxWidth={760}><RestaurantProfileBody desktop /></ProfileViewerFrameDesktop>;
}
function DistributorProfileMobile({ viewerLoggedIn = true }) {
  return <ProfileViewerFrameMobile viewerNote="A chef is viewing this distributor"><DistributorProfileBody viewerLoggedIn={viewerLoggedIn} /></ProfileViewerFrameMobile>;
}
function DistributorProfileDesktop({ viewerLoggedIn = true }) {
  return <ProfileViewerFrameDesktop viewerNote="A chef is viewing this distributor" maxWidth={760}><DistributorProfileBody desktop viewerLoggedIn={viewerLoggedIn} /></ProfileViewerFrameDesktop>;
}

Object.assign(window, {
  ProfileMark, ProfileLinks, ProfileHeader, ProfileSection, ProfileRepRow, CarriedBrandChip, NoPricingFooter,
  ProfileViewerFrameMobile, ProfileViewerFrameDesktop,
  RESTAURANT_PROFILE, DISTRIBUTOR_PROFILE,
  BrandProfileBody, RestaurantProfileBody, DistributorProfileBody,
  BrandProfileMobile, BrandProfileDesktop,
  RestaurantProfileMobile, RestaurantProfileDesktop,
  DistributorProfileMobile, DistributorProfileDesktop,
});
