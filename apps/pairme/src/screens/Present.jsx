import React from 'react';

/** Screen 13 · Present */
export default function Present(vm){
  const { foodRows, handoff, hasDiet, dietLine } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "16px 18px"}}>
<div style={{font: "600 18px var(--font-display)", color: "#fff"}}>Present</div>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "4px"}}>Read it out, or hold it up. Nothing has been ordered.</div>
</div>
<div style={{padding: "16px 14px 8px"}}>
<div style={{border: "2.5px solid var(--pm-accent2)", background: "var(--pm-card)", borderRadius: "14px", overflow: "hidden"}}>
<div style={{background: "var(--pm-chrome)", padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
<span style={{font: "700 13px var(--font-body)", color: "#fff", letterSpacing: ".1em", textTransform: "uppercase"}}>For the table</span>
<span style={{font: "600 12px var(--font-body)", color: "#FFCC7D"}}>Table 12 · 8:40</span>
</div>
<div style={{padding: "16px"}}>
<div style={{font: "600 12px var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: "8px"}}>Food</div>
{(foodRows || []).map((f, i) => (
<React.Fragment key={i}>
<div style={{display: "flex", justifyContent: "space-between", gap: "12px", padding: "6px 0", borderBottom: "1px solid var(--pm-rule)"}}>
<span style={{font: "500 16px/1.3 var(--font-body)", color: "var(--pm-ink)"}}>{f.n}</span>
<span style={{font: "400 14px var(--font-body)", color: "var(--pm-muted)", flex: "none"}}>{f.sec}</span>
</div>
</React.Fragment>
))}
{hasDiet ? (<>
<div style={{border: "2px solid var(--pm-warnBd)", background: "var(--pm-warnBg)", borderRadius: "10px", padding: "13px", marginTop: "14px"}}>
<div style={{font: "700 13px var(--font-body)", color: "var(--pm-warnInk)", letterSpacing: ".06em", textTransform: "uppercase"}}>Please tell them</div>
<div style={{font: "700 19px/1.3 var(--font-body)", color: "var(--pm-ink)", marginTop: "5px"}}>{dietLine}</div>
</div>
</>) : null}
<div style={{font: "600 12px var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".06em", textTransform: "uppercase", margin: "20px 0 10px"}}>Wine</div>
{(handoff || []).map((h, i) => (
<React.Fragment key={i}>
<div style={{marginBottom: "18px"}}>
<div style={{font: "600 11.5px var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".06em", textTransform: "uppercase"}}>{h.label}</div>
<div style={{font: "700 26px/1.15 var(--font-body)", color: "var(--pm-ink)", marginTop: "5px", letterSpacing: "-.01em"}}>{h.prod}</div>
<div style={{font: "500 20px/1.25 var(--font-body)", color: "var(--pm-ink)", marginTop: "3px"}}>{h.wine}</div>
<div style={{font: "400 15px var(--font-body)", color: "var(--pm-muted)", marginTop: "5px"}}>{h.meta}</div>
<div style={{background: "var(--pm-sel)", border: "1px solid var(--pm-selBd)", borderRadius: "10px", padding: "12px", marginTop: "9px", display: "flex", gap: "12px", alignItems: "center"}}>
<button onClick={h.speak} style={{flex: "none", width: "52px", height: "52px", borderRadius: "999px", border: "2.5px solid var(--pm-accent2)", background: "var(--pm-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}} aria-label="Say it out loud">
<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 L6 9 H3 v6 h3 l5 4 Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>
</button>
<div style={{flex: "1"}}>
<div style={{font: "600 11px var(--font-body)", color: "var(--pm-pearInk)", letterSpacing: ".07em", textTransform: "uppercase"}}>Say it like this</div>
<div style={{font: "700 20px/1.25 var(--font-body)", color: "var(--pm-ink)", marginTop: "3px"}}>{h.say}</div>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>{h.tip}</div>
</div>
</div>
{h.compromise ? (
<div style={{font: "400 12px/1.55 var(--font-body)", color: "var(--pm-warnInk)", marginTop: "8px"}}>One bottle, so it gives a little ground: {h.compromise}</div>
) : null}
</div>
</React.Fragment>
))}
<div style={{font: "400 12px/1.6 var(--font-body)", color: "var(--pm-muted)", borderTop: "1px solid var(--pm-rule)", paddingTop: "11px"}}>Tap the speaker and we'll say it in your ear. Repeat it, or just hold the phone up. Suggested by PairMe, not an order.</div>
</div>
</div>
</div>
</div>
</>
  );
}
