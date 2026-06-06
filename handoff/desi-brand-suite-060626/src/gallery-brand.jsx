// src/gallery-brand.jsx — Brand Suite · standalone gallery shell.
//
// The BRAND workspace entry (Eighteen/Moose, Jun 6). The full signed-off brand
// flow: role-chooser auth + the 8 destinations (Dashboard · Catalog · Capture ·
// Packages · Notifications · Distributors · Team · Settings) + Profile preview.
// Every surface rides the ONE shell (RoleSidebar desktop / drawer mobile).
// Brands send packages and track status — NO incoming-quotes surface anywhere.
//
// Editable brand surface: src/screens-brand.jsx.

function BrandFrame({ label, children, wide }) {
  return (
    <div className="artboard" style={wide ? { width: 1280 } : {}}>
      <div className="artboard-label">{label}</div>
      {children}
    </div>
  );
}
function BrandSectionHead({ eyebrow, title, children }) {
  return (
    <div className="section-head">
      <div className="qm-eyebrow" style={{ fontSize: 10, color: "rgba(60,50,40,.55)" }}>{eyebrow}</div>
      {title && <h2 className="serif" style={{ fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: "var(--qm-charcoal)", marginTop: 8 }}>{title}</h2>}
      {children && <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(60,50,40,.7)", marginTop: 8, maxWidth: 840 }}>{children}</p>}
    </div>
  );
}

// Mobile artboard via ChefPhoneFlow (free interactive nav through FLOW_ROUTES).
function M({ initial, label }) {
  return (
    <BrandFrame label={label}>
      <ChefPhoneFlow initial={initial} />
    </BrandFrame>
  );
}
// Desktop artboard — render the page component with variant="desktop".
function D({ Comp, label }) {
  const noop = () => {};
  return (
    <BrandFrame label={label} wide>
      <Comp nav={noop} variant="desktop" />
    </BrandFrame>
  );
}

function BrandGallery() {
  const noop = () => {};
  return (
    <div className="gallery">
      <header className="gallery-header">
        <div className="qm-eyebrow" style={{ fontSize: 10, color: "rgba(60,50,40,.55)" }}>QUOTEME · BRAND SUITE · FULL FLOW</div>
        <h1 className="serif" style={{ fontSize: 44, lineHeight: 1.1, fontWeight: 600, color: "var(--qm-charcoal)", marginTop: 10 }}>
          The brand suite.
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(60,50,40,.72)", marginTop: 12, maxWidth: 820 }}>
          The signed-off brand flow, wired on the <b style={{ color: "var(--qm-charcoal)", fontWeight: 500 }}>one shell</b> (left sidebar on desktop, slide-in drawer on mobile — same nav, both).
          Brand-specific nav: <b style={{ color: "var(--qm-charcoal)", fontWeight: 500 }}>Dashboard · Catalog · Capture · Packages · Notifications · Distributors · Team · Settings</b> —
          never the rep nav. <b style={{ color: "var(--qm-charcoal)", fontWeight: 500 }}>Brands send packages and track status; there is no incoming-quotes surface anywhere.</b>{" "}
          Demo brand: <b style={{ color: "var(--qm-charcoal)", fontWeight: 500 }}>Highland Larder Co.</b> (Tessa Hartley), Hudson, NY.
        </p>
        <div className="mt-4 px-4 py-3 rounded-md" style={{ background: "#FFF9F3", border: "1px solid var(--qm-soft-line)", maxWidth: 820 }}>
          <span className="qm-eyebrow" style={{ fontSize: 9.5 }}>READY TO WIRE</span>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(60,50,40,.8)", marginTop: 4 }}>
            Shell + pages export-ready for Claudio. The one shell is <code>NewspaperShell</code> (in <code>src/screens-desktop.jsx</code>); every brand page is a <code>makeBrandPage</code> wrapper that takes
            <code> nav</code> + <code>variant</code>. FLOW_ROUTES carry the <code>brand-*</code> routes. See <code>handoff/BRAND_SHELL_AND_PAGES.md</code>.
          </p>
        </div>
      </header>

      {/* AUTH */}
      <section className="gallery-section">
        <BrandSectionHead eyebrow="AUTH · ROLE CHOOSER" title="Lands a brand into /brand/*.">
          Four live role cards; <b style={{ color: "var(--qm-charcoal)", fontWeight: 500 }}>“I'm a brand”</b> un-greyed with a NEW flag. A role:brand user lands on the brand dashboard — never the rep or distributor shell.
        </BrandSectionHead>
        <div className="section-row">
          <M initial="brand-role-chooser" label="ROLE CHOOSER · MOBILE · tap ‘I'm a brand’" />
          <D Comp={AuthRoleChooserDesktop} label="ROLE CHOOSER · DESKTOP" />
        </div>
      </section>

      {/* DASHBOARD */}
      <section className="gallery-section">
        <BrandSectionHead eyebrow="/brand/dashboard · NO INBOX" title="Catalog status, recent packages, notifications.">
          The brand home. Catalog status tile, recent packages, and the “where your line stands” notification rail. One orange = capture → build a package. No incoming-quotes surface.
        </BrandSectionHead>
        <div className="section-row">
          <M initial="brand-dashboard" label="DASHBOARD · MOBILE · (tap ☰ for the drawer)" />
          <D Comp={BrandDashboard} label="DASHBOARD · DESKTOP" />
        </div>
      </section>

      {/* CATALOG */}
      <section className="gallery-section">
        <BrandSectionHead eyebrow="/brand/catalog" title="The brand's own catalog: view + upload.">
          Brand-scoped version of the distributor catalog page. Products = names + pack specs, never prices (brands don't price).
        </BrandSectionHead>
        <div className="section-row">
          <M initial="brand-catalog" label="CATALOG · MOBILE" />
          <D Comp={BrandCatalog} label="CATALOG · DESKTOP" />
        </div>
      </section>

      {/* CAPTURE */}
      <section className="gallery-section">
        <BrandSectionHead eyebrow="/brand/capture" title="Paste a menu, match against your catalog only.">
          Paste / upload / photo a menu; match it against <b style={{ color: "var(--qm-charcoal)", fontWeight: 500 }}>the brand's catalog only</b>. Run the match to see which products fit, then add them to a package.
        </BrandSectionHead>
        <div className="section-row">
          <M initial="brand-capture" label="CAPTURE · MOBILE · run the match" />
          <D Comp={BrandCapture} label="CAPTURE · DESKTOP" />
        </div>
      </section>

      {/* PACKAGES */}
      <section className="gallery-section">
        <BrandSectionHead eyebrow="/brand/packages" title="Build, select ONE distributor, notify.">
          The packages list (draft / sent) + the builder: pick products, choose a single distributor, and notify. Each package is its own thread.
        </BrandSectionHead>
        <div className="section-row">
          <M initial="brand-packages" label="PACKAGES · MOBILE · list" />
          <M initial="brand-package-build" label="PACKAGE BUILDER · MOBILE · pick + send" />
          <D Comp={BrandPackages} label="PACKAGES · DESKTOP · list" />
        </div>
        <div className="section-row" style={{ marginTop: 36 }}>
          <D Comp={BrandPackageBuilder} label="PACKAGE BUILDER · DESKTOP · products + one distributor" />
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section className="gallery-section">
        <BrandSectionHead eyebrow="/brand/notifications · READ-ONLY" title="Track sent packages + status.">
          Read-only. Each sent package with a Sent → Opened → Loaded → In their catalog stepper. Nothing to action — quotes never come to the brand.
        </BrandSectionHead>
        <div className="section-row">
          <M initial="brand-notifications" label="NOTIFICATIONS · MOBILE" />
          <D Comp={BrandNotifications} label="NOTIFICATIONS · DESKTOP" />
        </div>
      </section>

      {/* DISTRIBUTORS */}
      <section className="gallery-section">
        <BrandSectionHead eyebrow="/brand/distributors" title="Track distributors. Send F3 from the brand.">
          Reuses the chef Distributors-tab design: your distributors (with notify status) + servicing your area. The bring-on nudge sends the F3 secured catalog link from the brand.
        </BrandSectionHead>
        <div className="section-row">
          <M initial="brand-distributors" label="DISTRIBUTORS · MOBILE" />
          <M initial="brand-send-catalog" label="SEND F3 CATALOG LINK · MOBILE" />
          <D Comp={BrandDistributors} label="DISTRIBUTORS · DESKTOP" />
        </div>
      </section>

      {/* TEAM + SETTINGS + PROFILE */}
      <section className="gallery-section">
        <BrandSectionHead eyebrow="/brand/team · /brand/settings · /brand/profile" title="Admin, config, and the public profile.">
          Team (admin invites), Settings (company config that feeds the profile), and the public Profile preview (network-facing, no prices).
        </BrandSectionHead>
        <div className="section-row">
          <M initial="brand-team" label="TEAM · MOBILE · admin" />
          <M initial="brand-settings" label="SETTINGS · MOBILE" />
          <M initial="brand-profile" label="PROFILE PREVIEW · MOBILE" />
        </div>
        <div className="section-row" style={{ marginTop: 36 }}>
          <D Comp={BrandTeam} label="TEAM · DESKTOP" />
          <D Comp={BrandSettings} label="SETTINGS · DESKTOP" />
        </div>
      </section>

      <footer style={{ marginTop: 96, paddingTop: 24, borderTop: "1px solid var(--qm-soft-line)", maxWidth: 820 }}>
        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "rgba(60,50,40,.6)" }}>
          Brand workspace · QuoteMe. The one shell (<code>NewspaperShell</code>) + brand pages (<code>src/screens-brand.jsx</code>) are export-ready —
          see <code>handoff/BRAND_SHELL_AND_PAGES.md</code> for wiring.
        </p>
      </footer>
    </div>
  );
}

const brandRoot = document.getElementById("app");
if (brandRoot) ReactDOM.createRoot(brandRoot).render(<BrandGallery />);
