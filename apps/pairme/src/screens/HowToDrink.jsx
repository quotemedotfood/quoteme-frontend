import React from 'react';

/** Screen 11 · How to drink */
export default function HowToDrink(vm){
  const { chosen, dishCount, modes, showSub, subLabel, subs, showScope, scopes, dirSummary, guests, conflict, resolutions, guestDrawer } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "18px"}}>
<div style={{font: "600 20px var(--font-display)", color: "#fff"}}>How do you want to drink?</div>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "5px"}}>{dishCount} dishes. There's no wrong answer here.</div>
</div>
<div style={{padding: "18px"}}>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "10px", padding: "11px", marginBottom: "14px"}}>
{(chosen || []).map((c, i) => (
<React.Fragment key={i}>
<div style={{display: "flex", justifyContent: "space-between", gap: "10px", padding: "2px 0", font: "400 11.5px var(--font-body)", color: "var(--pm-muted)"}}>
<span>{c.n}</span><span>{c.sec}</span>
</div>
</React.Fragment>
))}
</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "8px"}}>Glass or bottle</div>
<div style={{display: "flex", gap: "9px"}}>
{(modes || []).map((m, i) => (
<React.Fragment key={i}>
<button onClick={m.pick} style={{flex: "1", textAlign: "left", border: `1.5px solid ${m.bd}`, background: m.bg, borderRadius: "12px", padding: "14px 13px", cursor: "pointer"}}>
<div style={{font: "600 14px var(--font-body)", color: "var(--pm-ink)"}}>{m.h}</div>
<div style={{font: "400 11.5px/1.45 var(--font-body)", color: "var(--pm-muted)", marginTop: "4px"}}>{m.b}</div>
</button>
</React.Fragment>
))}
</div>
{showSub ? (<>
<div style={{borderLeft: "2px solid #EFB96B", paddingLeft: "12px", marginTop: "14px"}}>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "8px"}}>{subLabel}</div>
{(subs || []).map((o, i) => (
<React.Fragment key={i}>
<button onClick={o.pick} style={{width: "100%", textAlign: "left", border: `1px solid ${o.bd}`, background: o.bg, borderRadius: "12px", padding: "13px", marginBottom: "8px", cursor: "pointer"}}>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>{o.h}</div>
<div style={{font: "400 12px/1.5 var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>{o.b}</div>
<div style={{font: "500 11.5px var(--font-body)", color: "var(--pm-blue)", marginTop: "5px"}}>{o.t}</div>
</button>
</React.Fragment>
))}
{showScope ? (<>
<div style={{borderLeft: "2px solid #EFB96B", paddingLeft: "12px"}}>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "8px"}}>One bottle for what</div>
{(scopes || []).map((o, i) => (
<React.Fragment key={i}>
<button onClick={o.pick} style={{width: "100%", textAlign: "left", border: `1px solid ${o.bd}`, background: o.bg, borderRadius: "12px", padding: "12px", marginBottom: "8px", cursor: "pointer"}}>
<div style={{font: "600 13px var(--font-body)", color: "var(--pm-ink)"}}>{o.h}</div>
<div style={{font: "400 11.5px/1.45 var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>{o.b}</div>
</button>
</React.Fragment>
))}
</div>
</>) : null}
</div>
</>) : null}
<div style={{font: "400 12px/1.6 var(--font-body)", color: "var(--pm-muted)", margin: "12px 0 4px"}}>{dirSummary}</div>
<div style={{border: "1px solid var(--pm-selBd)", background: "var(--pm-sel)", borderRadius: "12px", padding: "13px", marginTop: "10px"}}>
<div style={{font: "600 13px var(--font-body)", color: "var(--pm-ink)"}}>Who's at the table?</div>
<div style={{font: "400 12px/1.55 var(--font-body)", color: "var(--pm-muted)", marginTop: "4px"}}>Right now we're using your taste alone. Add the people you're with and we'll find wine that works for all of you, not just for whoever is holding the phone.</div>
<div style={{display: "flex", gap: "7px", flexWrap: "wrap", marginTop: "10px"}}>
{(guests || []).map((g, i) => (
<React.Fragment key={i}>
<button onClick={g.pick} style={{border: `1px solid ${g.bd}`, background: g.bg, color: "var(--pm-ink)", borderRadius: "999px", padding: "9px 13px", font: "500 12px var(--font-body)", cursor: "pointer", minHeight: "40px"}}>{g.label}</button>
</React.Fragment>
))}
</div>
{conflict ? (<>
<div style={{borderTop: "1px solid var(--pm-selBd)", marginTop: "12px", paddingTop: "11px"}}>
<div style={{font: "600 12.5px var(--font-body)", color: "var(--pm-ink)"}}>You two don't agree, and that's fine</div>
<div style={{font: "400 12px/1.55 var(--font-body)", color: "var(--pm-muted)", marginTop: "4px"}}>You love Champagne. Sarah doesn't drink bubbles. Somebody has to lose a round, so you pick who.</div>
<div style={{display: "flex", flexDirection: "column", gap: "6px", marginTop: "9px"}}>
{(resolutions || []).map((r, i) => (
<React.Fragment key={i}>
<button onClick={r.pick} style={{textAlign: "left", border: `1px solid ${r.bd}`, background: r.bg, borderRadius: "9px", padding: "10px", cursor: "pointer", font: "500 12px var(--font-body)", color: "var(--pm-ink)"}}>{r.label}</button>
</React.Fragment>
))}
</div>
</div>
</>) : null}
</div>
</div>
</div>
{guestDrawer && guestDrawer.open ? (
<div onClick={guestDrawer.close} style={{position: "fixed", inset: "0", background: "rgba(15,20,30,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50}}>
<div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add a guest" style={{width: "100%", maxWidth: "390px", background: "var(--pm-card)", borderTopLeftRadius: "18px", borderTopRightRadius: "18px", padding: "18px 16px 22px", boxShadow: "0 -10px 30px -12px rgba(15,20,30,.5)"}}>
<div style={{width: "38px", height: "4px", borderRadius: "999px", background: "var(--pm-rule)", margin: "0 auto 14px"}}></div>
<div style={{font: "700 16px var(--font-display)", color: "var(--pm-ink)"}}>Add a guest</div>
<div style={{font: "400 12.5px/1.55 var(--font-body)", color: "var(--pm-muted)", margin: "4px 0 14px"}}>We'll find wine that works for both of you, not just whoever is holding the phone.</div>
{(guestDrawer.choices || []).map((c, i) => (
<button key={i} onClick={c.pick} style={{width: "100%", textAlign: "left", cursor: "pointer", borderRadius: "12px", padding: "13px", marginBottom: "9px", border: `1.5px solid ${c.primary ? "var(--pm-chrome)" : "var(--pm-rule)"}`, background: c.primary ? "var(--pm-sel)" : "var(--pm-card)"}}>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>{c.h}</div>
<div style={{font: "400 12px/1.5 var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>{c.b}</div>
</button>
))}
{guestDrawer.note ? (<div style={{font: "500 11.5px var(--font-body)", color: "var(--pm-pearInk)", marginTop: "4px"}}>{guestDrawer.note}</div>) : null}
</div>
</div>
) : null}
</>
  );
}
