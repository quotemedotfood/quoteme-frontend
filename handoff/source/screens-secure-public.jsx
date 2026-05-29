// src/screens-secure-public.jsx
// ─────────────────────────────────────────────────────────────────────────────
// SECURE REP-CATALOG UPLOAD (v4.5) — public-facing surfaces.
//   Surface 3. Tech-person landing page  — token-gated, no auth, no QuoteMe
//              marketing. Rep-colleague voice: "Marcus needs your latest
//              catalog." The person who keeps the catalog drops a file. Done.
//   Surface 4. Chef notification email   — the ONE chef-facing moment, fired at
//              ingestion-complete. Field voice, distributor-warm.
//
// Distinct from screens-rep-catalog-intake.jsx (chef-voice → rep uploads). Here
// the REP forwarded the link to an internal catalog admin, and the framing is
// "your colleague Marcus needs this" — a B2B internal favor, not a sign-up.
// SECURE demo object lives in screens-secure-catalog.jsx.
// ─────────────────────────────────────────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════
// SURFACE 3 — TECH-PERSON LANDING PAGE
// ═════════════════════════════════════════════════════════════════════════════

// The "from Marcus" context block — reads as a forwarded internal request, not
// a product page. Marcus (the colleague) leads; the chef is the reason.
function ForwardedContext({ desktop = false }) {
  return (
    <div>
      <div className="qm-eyebrow" style={{ fontSize: desktop ? 10.5 : 9.5, letterSpacing: ".14em", color: "rgba(60,50,40,.55)" }}>
        CATALOG REQUEST · FORWARDED BY {SECURE.repFirst.toUpperCase()}
      </div>
      <h1
        className="serif ink"
        style={{
          fontWeight: 500, fontSize: desktop ? 30 : 22, lineHeight: 1.18,
          letterSpacing: "-0.012em", marginTop: desktop ? 14 : 10, textWrap: "pretty",
        }}
      >
        {SECURE.repFull} needs your latest{" "}
        <span style={{ fontStyle: "italic" }}>{SECURE.distributor}</span> catalog.
      </h1>
      <p
        className="ink"
        style={{
          fontFamily: "var(--qm-serif)", fontSize: desktop ? 15 : 13.5, lineHeight: 1.62,
          marginTop: desktop ? 20 : 16, textWrap: "pretty",
          paddingLeft: desktop ? 18 : 14, borderLeft: "2px solid var(--qm-charcoal)",
        }}
      >
        He's pricing a quote for {SECURE.restaurant} in {SECURE.restaurantCity}, and the price
        list on file is from {SECURE.catalogHeldFrom}. You're the one who keeps ours current — so he
        sent it your way. A current catalog is all he needs: a PDF, a spreadsheet, even photos of a
        printed sheet.
      </p>
      <div
        style={{
          marginTop: desktop ? 16 : 13,
          fontFamily: "var(--qm-sans)", fontSize: desktop ? 12.5 : 11.5, lineHeight: 1.55,
          color: "var(--qm-gray-700)",
        }}
      >
        {SECURE.repFull} · {SECURE.distributorFull} · {SECURE.repEmail}
      </div>
    </div>
  );
}

// Dedicated drop zone for v4.5 — CTA sends back to the colleague (Marcus),
// optional note instead of a contact form (the uploader is internal, not a lead).
function CatalogDropZoneV45({ desktop = false, onSend }) {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [note, setNote] = useState("");
  const [hover, setHover] = useState(false);
  const hasFile = !!fileName;

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault(); setHover(false);
          const f = e.dataTransfer?.files?.[0];
          if (f) {
            setFileName(f.name);
            setFileSize(f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`);
          }
        }}
        onClick={() => { if (!hasFile) { setFileName(SECURE.sampleFile); setFileSize("1.4 MB"); } }}
        role="button"
        aria-label={hasFile ? "Replace catalog file" : "Drop catalog file"}
        style={{
          marginTop: desktop ? 28 : 22, padding: desktop ? "38px 32px" : "30px 22px", textAlign: "center",
          background: hasFile ? "rgba(127,174,194,.05)" : (hover ? "rgba(43,43,43,.025)" : "rgba(255,255,255,.55)"),
          border: hasFile ? "1px solid var(--accent)" : `1.5px dashed ${hover ? "var(--qm-charcoal)" : "rgba(60,50,40,.32)"}`,
          borderRadius: 6, transition: "background .15s ease, border-color .15s ease", cursor: "pointer",
        }}
      >
        {hasFile ? (
          <>
            <div className="inline-flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 999, background: "#fff", border: "1px solid var(--accent)", margin: "0 auto" }}>
              <Icon name="check" size={16} color="var(--accent)" />
            </div>
            <div className="serif ink" style={{ fontSize: desktop ? 15.5 : 14, marginTop: 12, fontWeight: 500, lineHeight: 1.3 }}>{fileName}</div>
            <div className="ink-soft" style={{ fontSize: 11.5, marginTop: 4 }}>{fileSize} · ready to send</div>
            <button
              onClick={(e) => { e.stopPropagation(); setFileName(""); setFileSize(""); }}
              style={{ marginTop: 12, fontSize: 11.5, color: "var(--qm-charcoal)", textDecoration: "underline", textUnderlineOffset: 2, background: "transparent" }}
            >Use a different file</button>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 999, background: "#fff", border: "1px solid var(--qm-soft-line)", margin: "0 auto" }}>
              <Icon name="upload" size={16} color="var(--qm-charcoal)" />
            </div>
            <div className="serif ink" style={{ fontSize: desktop ? 16 : 14.5, marginTop: 14, fontWeight: 500, lineHeight: 1.3 }}>Drop the catalog here</div>
            <div className="ink-soft" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>PDF, spreadsheet, or photos of a printed price list.</div>
            <div className="ink-faint" style={{ fontSize: 11, marginTop: 14, lineHeight: 1.5, fontFamily: "var(--qm-serif)", fontStyle: "italic" }}>or tap to browse</div>
          </>
        )}
      </div>

      {/* Optional note — to the colleague, not a contact-capture form. */}
      <div style={{ marginTop: desktop ? 26 : 20 }}>
        <div className="qm-eyebrow" style={{ fontSize: 9.5, letterSpacing: ".14em", color: "rgba(60,50,40,.55)" }}>
          ANYTHING {SECURE.repFirst.toUpperCase()} SHOULD KNOW · OPTIONAL
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={desktop ? 3 : 2}
          placeholder="e.g. seafood prices update again Monday — I'll resend if you want to wait."
          style={{
            width: "100%", marginTop: 10, padding: "11px 13px", fontSize: 13.5, fontFamily: "var(--qm-sans)",
            background: "#fff", border: "1px solid var(--qm-soft-line)", borderRadius: 4,
            color: "var(--qm-charcoal)", outline: "none", resize: "none", lineHeight: 1.45,
          }}
        />
      </div>

      {/* One orange. Sends it back to Marcus. */}
      <button
        onClick={() => onSend?.()}
        disabled={!hasFile}
        className="qm-btn qm-btn-orange"
        style={{
          marginTop: desktop ? 26 : 20, width: "100%", padding: desktop ? "14px 20px" : "13px 18px",
          fontSize: desktop ? 14.5 : 13.5, fontWeight: 500, color: "#fff",
          background: hasFile ? "var(--qm-orange)" : "rgba(60,50,40,.18)", border: "none", borderRadius: 4,
          cursor: hasFile ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <Icon name="arrow-right" size={14} color="#fff" /> Send it to {SECURE.repFirst}
      </button>
      {!hasFile && (
        <div className="ink-faint italic" style={{ fontSize: 11, marginTop: 8, textAlign: "center", fontFamily: "var(--qm-serif)", lineHeight: 1.45 }}>
          Drop the catalog first.
        </div>
      )}
    </div>
  );
}

// Incidental footer — the uploader may never have heard of QuoteMe. Low contrast.
function V45Footnote({ desktop = false }) {
  return (
    <div style={{ marginTop: desktop ? 40 : 30, paddingTop: desktop ? 18 : 15, borderTop: "1px solid var(--qm-soft-line)" }}>
      <p className="ink-soft" style={{ fontSize: desktop ? 11.5 : 10.5, lineHeight: 1.6, maxWidth: 460, fontFamily: "var(--qm-serif)", fontStyle: "italic" }}>
        Your catalog stays private. Only {SECURE.repFull}'s customer sees these prices, and they're never
        shared with other distributors.
      </p>
      <div style={{ marginTop: desktop ? 13 : 11, display: "flex", alignItems: "center", gap: 6, fontSize: 10, letterSpacing: ".12em", color: "rgba(60,50,40,.45)", textTransform: "uppercase", fontFamily: "var(--qm-sans)" }}>
        <span>Sent through</span>
        <span style={{ color: "var(--qm-charcoal)", letterSpacing: ".08em" }}>QuoteMe</span>
        <span>· catalog intake</span>
      </div>
    </div>
  );
}

// Sent confirmation block.
function V45Sent({ desktop = false }) {
  return (
    <div style={{ marginTop: desktop ? 32 : 26, padding: desktop ? "30px 32px" : "22px 20px", background: "rgba(127,174,194,.06)", border: "1px solid var(--accent)", borderRadius: 6 }}>
      <div className="inline-flex items-center justify-center" style={{ width: desktop ? 36 : 32, height: desktop ? 36 : 32, borderRadius: 999, background: "#fff", border: "1px solid var(--accent)" }}>
        <Icon name="check" size={desktop ? 16 : 15} color="var(--accent)" />
      </div>
      <div className="serif ink" style={{ fontSize: desktop ? 19 : 16, fontWeight: 500, marginTop: desktop ? 14 : 12, lineHeight: 1.3 }}>
        Sent to {SECURE.repFirst}. Thank you.
      </div>
      <p className="ink-soft" style={{ fontSize: desktop ? 13.5 : 12.5, lineHeight: 1.62, marginTop: desktop ? 10 : 8, maxWidth: 460 }}>
        {SECURE.repFirst} will get this, and {SECURE.restaurant} will be quoting against your catalog
        within the hour. You can close this page.
      </p>
      <div className="ink-faint num" style={{ fontSize: desktop ? 12 : 11, marginTop: desktop ? 18 : 14, lineHeight: 1.5 }}>
        {SECURE.sampleFile} · 1.4&nbsp;MB · sent just now
      </div>
    </div>
  );
}

// Expired token (7-day single-use, Q8). Mirrors chef expired-magic-link recovery.
// Warm, no error-red, one clear path to a fresh link.
function V45Expired({ desktop = false }) {
  return (
    <div>
      <div className="qm-eyebrow" style={{ fontSize: desktop ? 10.5 : 9.5, letterSpacing: ".14em", color: "rgba(60,50,40,.55)" }}>
        CATALOG REQUEST · FORWARDED BY {SECURE.repFirst.toUpperCase()}
      </div>
      <h1 className="serif ink" style={{ fontWeight: 500, fontSize: desktop ? 28 : 21, lineHeight: 1.18, marginTop: desktop ? 14 : 10, textWrap: "pretty" }}>
        This link has expired.
      </h1>
      <p className="ink" style={{ fontFamily: "var(--qm-serif)", fontSize: desktop ? 15 : 13.5, lineHeight: 1.62, marginTop: desktop ? 18 : 14, maxWidth: 460, paddingLeft: desktop ? 18 : 14, borderLeft: "2px solid var(--qm-charcoal)" }}>
        Catalog links are good for seven days, then they close on their own. {SECURE.repFirst} can send a
        fresh one in a couple of taps — the new link will work just like this one.
      </p>
      <a
        href={`mailto:${SECURE.repEmail}?subject=${encodeURIComponent("Catalog link expired — can you resend?")}`}
        className="qm-btn qm-btn-orange"
        style={{ marginTop: desktop ? 26 : 20, padding: desktop ? "13px 18px" : "12px 16px", fontSize: desktop ? 14 : 13, textDecoration: "none" }}
      >
        <Icon name="mail" size={15} color="#fff" /> Ask {SECURE.repFirst} for a fresh link
      </a>
      <div className="ink-faint leading-snug mt-3" style={{ fontSize: desktop ? 11.5 : 10.5, maxWidth: 460 }}>
        Nothing was lost. Once you have the new link, drop the catalog and you're done.
      </div>
    </div>
  );
}

// Mobile — bare document on cream, no app chrome (token-gated public page).
function TechLandingMobile({ nav = noopNav, state = "idle" }) {
  return (
    <PhoneShell>
      <div className="scroller" style={{ background: "var(--qm-cream, #FFF9F3)", height: "100%" }}>
        <div style={{ padding: "32px 22px 40px" }}>
          {state === "expired" ? (
            <>
              <V45Expired />
              <V45Footnote />
            </>
          ) : (
            <>
              <ForwardedContext />
              <div style={{ marginTop: 24, borderTop: "1px solid var(--qm-soft-line)" }} />
              {state === "sent"
                ? <V45Sent />
                : <CatalogDropZoneV45 onSend={() => nav("secure-tech-sent")} />}
              <V45Footnote />
            </>
          )}
        </div>
      </div>
    </PhoneShell>
  );
}

// Desktop — centered single column on cream, reads like letterhead on a desk.
function TechLandingDesktop({ nav = noopNav, state = "idle" }) {
  return (
    <div style={{ background: "var(--qm-cream, #FFF9F3)", minHeight: 760, padding: "64px 0 88px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 40px" }}>
        {state === "expired" ? (
          <>
            <V45Expired desktop />
            <V45Footnote desktop />
          </>
        ) : (
          <>
            <ForwardedContext desktop />
            <div style={{ marginTop: 34, borderTop: "1px solid var(--qm-soft-line)" }} />
            {state === "sent"
              ? <V45Sent desktop />
              : <CatalogDropZoneV45 desktop onSend={() => {}} />}
            <V45Footnote desktop />
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SURFACE 4 — CHEF NOTIFICATION EMAIL
// The ONE chef-facing moment, fired at ingestion-complete. Field voice,
// distributor-warm, mirrors the chef magic-link email posture. Rendered inside
// a light mail-client frame so it reads unmistakably as an email, not a screen.
// ═════════════════════════════════════════════════════════════════════════════

function ChefCatalogEmail({ desktop = false }) {
  const pad = desktop ? 40 : 26;
  return (
    <div style={{ background: "#fff", maxWidth: desktop ? 600 : 390, margin: "0 auto", fontFamily: "var(--qm-sans)" }}>
      {/* Mail header — from / subject, like an inbox open-view */}
      <div style={{ padding: `${desktop ? 24 : 18}px ${pad}px`, borderBottom: "1px solid var(--qm-soft-line)" }}>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center shrink-0" style={{ width: desktop ? 40 : 34, height: desktop ? 40 : 34, borderRadius: 999, background: "var(--qm-cream)", border: "1px solid var(--qm-soft-line)" }}>
            <QuoteMeWordmark variant="square" height={desktop ? 22 : 19} />
          </span>
          <div className="min-w-0">
            <div className="ink" style={{ fontSize: desktop ? 14 : 13, fontWeight: 600 }}>QuoteMe</div>
            <div className="ink-faint" style={{ fontSize: desktop ? 12 : 11 }}>hello@quoteme.co · to {SECURE.chefFull.toLowerCase().replace(" ", ".")}@…</div>
          </div>
          <div className="ink-faint num ml-auto" style={{ fontSize: desktop ? 11.5 : 10.5 }}>now</div>
        </div>
        <div className="serif ink" style={{ fontSize: desktop ? 19 : 16, fontWeight: 600, marginTop: desktop ? 14 : 11, lineHeight: 1.25, letterSpacing: "-.01em" }}>
          {SECURE.repFirst} sent over {SECURE.distributor}'s latest catalog
        </div>
      </div>

      {/* Body — the chef's voice posture: short, operational, no marketing. */}
      <div style={{ padding: `${desktop ? 30 : 22}px ${pad}px ${desktop ? 34 : 26}px` }}>
        <p className="ink" style={{ fontSize: desktop ? 15.5 : 14.5, lineHeight: 1.6, fontFamily: "var(--qm-serif)" }}>
          {SECURE.chefFirst} —
        </p>
        <p className="ink" style={{ fontSize: desktop ? 14.5 : 13.5, lineHeight: 1.7, marginTop: desktop ? 14 : 12, maxWidth: 480 }}>
          {SECURE.repFirst} had {SECURE.distributorFull}'s current price list loaded for you. It's in
          and ready — your quotes price against it now, including the{" "}
          <span className="ink" style={{ fontWeight: 600 }}>{SECURE.quoteNo}</span> you had going.
        </p>

        {/* Quiet catalog metadata slip — document feel */}
        <div style={{ marginTop: desktop ? 20 : 16, padding: desktop ? "14px 16px" : "12px 14px", background: "var(--qm-warm-paper)", border: "1px solid var(--qm-soft-line)", borderRadius: "var(--qm-radius-md)" }}>
          <div className="flex items-center gap-2.5">
            <Icon name="check-circle-2" size={desktop ? 16 : 15} color="var(--accent)" />
            <div className="min-w-0">
              <div className="ink leading-snug" style={{ fontSize: desktop ? 13.5 : 12.5, fontWeight: 500 }}>
                {SECURE.distributorFull} · catalog live
              </div>
              <div className="ink-faint num leading-snug" style={{ fontSize: desktop ? 11.5 : 11 }}>
                Updated today, from {SECURE.repFirst}'s team
              </div>
            </div>
          </div>
        </div>

        <a
          href="#"
          className="qm-btn qm-btn-orange"
          style={{ marginTop: desktop ? 22 : 18, padding: desktop ? "13px 20px" : "12px 18px", fontSize: desktop ? 14.5 : 13.5, textDecoration: "none" }}
        >
          Pick up {SECURE.quoteNo} <Icon name="arrow-right" size={15} color="#fff" />
        </a>

        <p className="ink-soft" style={{ fontSize: desktop ? 13 : 12.5, lineHeight: 1.6, marginTop: desktop ? 22 : 18, fontFamily: "var(--qm-serif)", fontStyle: "italic" }}>
          That's the only note you'll get about this — no need to watch for updates.
        </p>
        <p className="ink-faint" style={{ fontSize: desktop ? 12.5 : 11.5, lineHeight: 1.5, marginTop: desktop ? 16 : 13 }}>
          — QuoteMe
        </p>
      </div>

      {/* Email footer — quiet */}
      <div style={{ padding: `${desktop ? 16 : 13}px ${pad}px`, borderTop: "1px solid var(--qm-soft-line)", background: "var(--qm-cream)" }}>
        <div className="ink-faint" style={{ fontSize: desktop ? 11 : 10, lineHeight: 1.5 }}>
          You're getting this because {SECURE.restaurant} asked {SECURE.repFirst} for an updated catalog.
        </div>
      </div>
    </div>
  );
}

// Mobile — email shown inside a phone, light mail-app strip on top.
function ChefCatalogEmailMobile() {
  return (
    <PhoneShell>
      <div className="flex items-center gap-2 px-5 py-2.5 border-b hairline" style={{ background: "var(--qm-cream)" }}>
        <Icon name="chevron-left" size={15} color="var(--qm-gray-500)" />
        <Icon name="inbox" size={14} color="var(--qm-gray-500)" />
        <span className="ink-soft" style={{ fontSize: 12 }}>Inbox</span>
        <span className="ink-faint ml-auto" style={{ fontSize: 11 }}>Mail</span>
      </div>
      <div className="scroller" style={{ background: "#fff" }}>
        <ChefCatalogEmail />
      </div>
    </PhoneShell>
  );
}

// Desktop — email rendered inside a simple mail-client window for context.
function ChefCatalogEmailDesktop() {
  return (
    <div style={{ background: "#F2F0EA", padding: "40px", minHeight: 560 }}>
      <div style={{ maxWidth: 600, margin: "0 auto", border: "1px solid var(--qm-soft-line)", borderRadius: "var(--qm-radius-xl)", overflow: "hidden", boxShadow: "var(--qm-shadow-md)" }}>
        <ChefCatalogEmail desktop />
      </div>
    </div>
  );
}

// FLOW_ROUTES registration
if (typeof FLOW_ROUTES !== "undefined") {
  FLOW_ROUTES["secure-tech"]          = { component: "TechLandingMobile" };
  FLOW_ROUTES["secure-tech-sent"]     = { component: "TechLandingMobile", props: { state: "sent" } };
  FLOW_ROUTES["secure-tech-expired"]  = { component: "TechLandingMobile", props: { state: "expired" } };
  FLOW_ROUTES["secure-email"]         = { component: "ChefCatalogEmailMobile" };
}

Object.assign(window, {
  ForwardedContext, CatalogDropZoneV45, V45Footnote, V45Sent, V45Expired,
  TechLandingMobile, TechLandingDesktop,
  ChefCatalogEmail, ChefCatalogEmailMobile, ChefCatalogEmailDesktop,
});
