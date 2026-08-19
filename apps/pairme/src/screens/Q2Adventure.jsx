import React from 'react';
import { Input } from '../lib/ds';

/** Screen 4 · Question 2, adventure */
export default function Q2Adventure(vm){
  const { advRows, fAdv } = vm;
  return (
<>
<div style={{padding: "18px"}}>
{(advRows || []).map((a, i) => (
<React.Fragment key={i}>
<button onClick={a.pick} style={{width: "100%", textAlign: "left", display: "flex", gap: "12px", alignItems: "center", border: `1px solid ${a.bd}`, background: a.bg, borderRadius: "12px", padding: "13px", marginBottom: "8px", cursor: "pointer"}}>
<span style={{width: "28px", height: "28px", flex: "none", borderRadius: "999px", background: a.dot, color: "#1F2A44", font: "700 12px var(--font-body)", display: "flex", alignItems: "center", justifyContent: "center"}}>{a.n}</span>
<span style={{font: "500 13.5px/1.4 var(--font-body)", color: "var(--pm-ink)"}}>{a.label}</span>
</button>
</React.Fragment>
))}
<div style={{marginTop: "12px"}}>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginBottom: "6px"}}>Anything we didn't list</div>
<div style={{position: "relative"}}>
<Input value={fAdv.v} onChange={fAdv.set} placeholder="adventurous on white, boring on red" style={{width: "100%"}}></Input>
{fAdv.micVisible ? (
<button onClick={fAdv.mic} aria-label="Speak instead of typing" style={{position: "absolute", right: "5px", top: "5px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fAdv.bd}`, background: fAdv.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
) : null}
</div>
<div style={{font: "500 11.5px var(--font-body)", color: "var(--pm-pearInk)", marginTop: "6px"}}>{fAdv.hint}</div>
</div>
</div>
</>
  );
}
