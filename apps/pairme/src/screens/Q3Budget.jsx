import React from 'react';
import { Input } from '../lib/ds';

/** Screen 5 · Question 3, budget */
export default function Q3Budget(vm){
  const { step, fBudget, bMin, bMax, bMaxLabel, setBMin, setBMax, bLeft, bRight, bumps, bumpNote } = vm;
  return (
<>
<div style={{padding: "22px 18px 18px"}}>
<div style={{textAlign: "center", marginBottom: "16px"}}>
<span style={{font: "700 34px var(--font-display)", color: "var(--pm-ink)", fontVariantNumeric: "tabular-nums"}}>${bMin}</span>
<span style={{font: "400 15px var(--font-body)", color: "var(--pm-muted)"}}> to </span>
<span style={{font: "700 34px var(--font-display)", color: "var(--pm-ink)", fontVariantNumeric: "tabular-nums"}}>${bMaxLabel}</span>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-muted)", marginTop: "4px"}}>a bottle, where you're comfortable</div>
</div>
<div style={{position: "relative", height: "22px", margin: "0 6px 4px"}}>
<div style={{position: "absolute", left: "0", right: "0", top: "9px", height: "5px", borderRadius: "3px", background: "var(--pm-rule)"}}></div>
<div style={{position: "absolute", top: "9px", height: "5px", borderRadius: "3px", background: "#EFB96B", left: bLeft, right: bRight}}></div>
<div style={{position: "absolute", top: "2px", width: "19px", height: "19px", borderRadius: "999px", background: "var(--pm-card)", border: "2.5px solid var(--pm-accent2)", left: bLeft, transform: "translateX(-9px)"}}></div>
<div style={{position: "absolute", top: "2px", width: "19px", height: "19px", borderRadius: "999px", background: "var(--pm-card)", border: "2.5px solid var(--pm-accent2)", right: bRight, transform: "translateX(9px)"}}></div>
</div>
<div style={{display: "flex", justifyContent: "space-between", font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", margin: "0 6px 14px"}}><span>$20</span><span>$400+</span></div>
<div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
<div>
<div style={{font: "600 11.5px var(--font-body)", color: "var(--pm-muted)", marginBottom: "3px"}}>Least you'd spend</div>
<input type="range" min="20" max="400" step="10" value={bMin} onChange={setBMin} style={{width: "100%"}} />
</div>
<div>
<div style={{font: "600 11.5px var(--font-body)", color: "var(--pm-muted)", marginBottom: "3px"}}>Most you'd spend</div>
<input type="range" min="20" max="400" step="10" value={bMax} onChange={setBMax} style={{width: "100%"}} />
</div>
</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 0 8px"}}>If tonight is a celebration</div>
<div style={{display: "flex", gap: "8px"}}>
{(bumps || []).map((b, i) => (
<React.Fragment key={i}>
<button onClick={b.pick} style={{flex: "1", border: `1.5px solid ${b.bd}`, background: b.bg, borderRadius: "12px", padding: "12px 6px", cursor: "pointer", textAlign: "center"}}>
<div style={{font: "700 15px var(--font-body)", color: "var(--pm-ink)"}}>{b.pct}</div>
<div style={{font: "400 11px var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>to ${b.to}</div>
</button>
</React.Fragment>
))}
</div>
<div style={{font: "400 12px/1.6 var(--font-body)", color: "var(--pm-muted)", marginTop: "9px"}}>{bumpNote}</div>
<div style={{marginTop: "14px"}}>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginBottom: "6px"}}>Anything we didn't list</div>
<div style={{position: "relative"}}>
<Input value={fBudget.v} onChange={fBudget.set} placeholder="under $60 on a Tuesday" style={{width: "100%"}}></Input>
<button onClick={fBudget.mic} style={{position: "absolute", right: "5px", top: "5px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fBudget.bd}`, background: fBudget.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
</div>
<div style={{font: "500 11.5px var(--font-body)", color: "var(--pm-pearInk)", marginTop: "6px"}}>{fBudget.hint}</div>
</div>
</div>
</>
  );
}
