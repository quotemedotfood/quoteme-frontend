import React from 'react';

/** Screen 1 · Welcome */
export default function Welcome(vm){
  const { connectPills, connectNote, skipConnect, connectSkipped } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "56px 24px 44px", textAlign: "center"}}>
<div style={{font: "700 42px var(--font-display)", color: "#EFB96B", letterSpacing: "-.02em"}}>PairMe</div>
<div style={{font: "400 15px/1.5 var(--font-body)", color: "#fff", marginTop: "10px"}}>Know what to order. Every time.</div>
<div style={{font: "400 13.5px/1.6 var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "20px", maxWidth: "250px", marginLeft: "auto", marginRight: "auto"}}>Nobody should feel stupid reading a wine list. That includes you, tonight.</div>
</div>
<div style={{padding: "20px 18px 8px"}}>
<div style={{font: "400 13px/1.7 var(--font-body)", color: "var(--pm-muted)"}}>Six questions that get to the bottom of what you actually reach for. Skip them all and you still get a real pick, it'll just be less yours.</div>
<div style={{border: "1px solid var(--pm-selBd)", background: "var(--pm-sel)", borderRadius: "12px", padding: "14px", marginTop: "16px"}}>
<div style={{font: "600 14px var(--font-display)", color: "var(--pm-ink)"}}>Do you keep your wine anywhere else?</div>
<div style={{font: "400 12.5px/1.6 var(--font-body)", color: "var(--pm-muted)", margin: "4px 0 11px"}}>If you've been rating bottles for years, we'd rather read that than make you type it again. Connect one and we'll know you before the first question.</div>
<div style={{display: "flex", flexWrap: "wrap", gap: "7px"}}>
{(connectPills || []).map((c, i) => (
<React.Fragment key={i}>
<span aria-disabled="true" style={{border: "1px dashed var(--pm-rule)", background: "var(--pm-sunken)", color: "var(--pm-muted)", borderRadius: "999px", padding: "9px 13px", font: "500 12px var(--font-body)", minHeight: "40px", display: "inline-flex", alignItems: "center", gap: "6px"}}>
<span>{c.label}</span>
<span style={{font: "600 10px var(--font-body)", color: "var(--pm-muted)", textTransform: "uppercase", letterSpacing: ".04em"}}>{c.note}</span>
</span>
</React.Fragment>
))}
</div>
<button onClick={skipConnect} style={{width: "100%", marginTop: "12px", border: `1.5px solid var(--pm-chrome)`, background: "var(--pm-sel)", color: "var(--pm-ink)", borderRadius: "12px", padding: "13px", font: "700 13.5px var(--font-body)", cursor: "pointer", minHeight: "48px"}}>I don't use any of these</button>
<div style={{font: "500 12px/1.6 var(--font-body)", color: "var(--pm-pearInk)", marginTop: "10px"}}>{connectNote}</div>
</div>
</div>
</div>
</>
  );
}
