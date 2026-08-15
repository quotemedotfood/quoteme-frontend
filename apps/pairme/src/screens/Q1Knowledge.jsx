import React from 'react';
import { Input } from '../lib/ds';

/** Screen 3 · Question 1, knowledge */
export default function Q1Knowledge(vm){
  const { levelPills, wantPills, fLevel } = vm;
  return (
<>
<div style={{padding: "18px"}}>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "9px"}}>Where you are now</div>
<div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
{(levelPills || []).map((p, i) => (
<React.Fragment key={i}>
<button onClick={p.pick} style={{width: "100%", textAlign: "left", border: `1px solid ${p.bd}`, background: p.bg, color: "var(--pm-ink)", borderRadius: "999px", padding: "10px 14px", font: "500 12.5px var(--font-body)", cursor: "pointer", minHeight: "40px"}}>{p.label}</button>
</React.Fragment>
))}
</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 0 9px"}}>Where you'd like to be</div>
<div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
{(wantPills || []).map((p, i) => (
<React.Fragment key={i}>
<button onClick={p.pick} style={{width: "100%", textAlign: "left", border: `1px solid ${p.bd}`, background: p.bg, color: "var(--pm-ink)", borderRadius: "999px", padding: "10px 14px", font: "500 12.5px var(--font-body)", cursor: "pointer", minHeight: "40px"}}>{p.label}</button>
</React.Fragment>
))}
</div>
<div style={{background: "var(--pm-sel)", border: "1px solid var(--pm-selBd)", borderRadius: "12px", padding: "12px", marginTop: "16px", font: "400 12.5px/1.6 var(--font-body)", color: "var(--pm-ink)"}}>This changes how we explain a wine, never which wine we pick. Nobody gets a worse bottle for admitting they'd rather just point at something.</div>
<div style={{marginTop: "14px"}}>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginBottom: "6px"}}>Anything we didn't list</div>
<div style={{position: "relative"}}>
<Input value={fLevel.v} onChange={fLevel.set} placeholder="I know beer, not wine" style={{width: "100%"}}></Input>
<button onClick={fLevel.mic} aria-label="Speak instead of typing" style={{position: "absolute", right: "5px", top: "5px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fLevel.bd}`, background: fLevel.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
</div>
<div style={{font: "500 11.5px var(--font-body)", color: "var(--pm-pearInk)", marginTop: "6px"}}>{fLevel.hint}</div>
</div>
</div>
</>
  );
}
