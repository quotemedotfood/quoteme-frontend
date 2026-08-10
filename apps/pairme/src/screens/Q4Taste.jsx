import React from 'react';
import { Input } from '../lib/ds';

/** Screen 6 · Question 4, taste */
export default function Q4Taste(vm){
  const { lovePills, notPills, fLove, fNot } = vm;
  return (
<>
<div style={{padding: "18px"}}>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "9px"}}>Love</div>
<div style={{display: "flex", flexWrap: "wrap", gap: "8px"}}>
{(lovePills || []).map((p, i) => (
<React.Fragment key={i}>
<button onClick={p.pick} style={{border: `1px solid ${p.bd}`, background: p.bg, color: "var(--pm-ink)", borderRadius: "999px", padding: "10px 14px", font: "500 12.5px var(--font-body)", cursor: "pointer", minHeight: "40px"}}>{p.label}</button>
</React.Fragment>
))}
</div>
<div style={{marginTop: "12px"}}>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginBottom: "6px"}}>Anything we didn't list</div>
<div style={{position: "relative"}}>
<Input value={fLove.v} onChange={fLove.set} placeholder="Chablis, and anything from the Jura" style={{width: "100%"}}></Input>
<button onClick={fLove.mic} style={{position: "absolute", right: "5px", top: "5px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fLove.bd}`, background: fLove.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
</div>
</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 0 9px"}}>Rather not</div>
<div style={{display: "flex", flexWrap: "wrap", gap: "8px"}}>
{(notPills || []).map((p, i) => (
<React.Fragment key={i}>
<button onClick={p.pick} style={{border: `1px solid ${p.bd}`, background: p.bg, color: "var(--pm-ink)", borderRadius: "999px", padding: "10px 14px", font: "500 12.5px var(--font-body)", cursor: "pointer", minHeight: "40px"}}>{p.label}</button>
</React.Fragment>
))}
</div>
<div style={{marginTop: "12px"}}>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginBottom: "6px"}}>Anything we didn't list</div>
<div style={{position: "relative"}}>
<Input value={fNot.v} onChange={fNot.set} placeholder="anything that tastes like vanilla" style={{width: "100%"}}></Input>
<button onClick={fNot.mic} style={{position: "absolute", right: "5px", top: "5px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fNot.bd}`, background: fNot.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
</div>
<div style={{font: "500 11.5px var(--font-body)", color: "var(--pm-pearInk)", marginTop: "6px"}}>{fNot.hint}</div>
</div>
</div>
</>
  );
}
