import React from 'react';
import { Button, Input } from '../lib/ds';

/** Screen 8 · Question 6, that's it */
export default function Q6Summary(vm){
  const { relPills, fGuestName, summary, addDiner, addDinerNote } = vm;
  return (
<>
<div style={{padding: "18px"}}>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "14px", marginBottom: "14px"}}>
{(summary || []).map((row, i) => (
<React.Fragment key={i}>
<div style={{display: "flex", justifyContent: "space-between", gap: "14px", padding: "8px 0", borderBottom: "1px solid var(--pm-rule)"}}>
<span style={{font: "400 12px var(--font-body)", color: "var(--pm-muted)", flex: "none"}}>{row.k}</span>
<span style={{font: "500 12px/1.45 var(--font-body)", color: "var(--pm-ink)", textAlign: "right"}}>{row.v}</span>
</div>
</React.Fragment>
))}
</div>
<div style={{border: "1px solid var(--pm-selBd)", background: "var(--pm-sel)", borderRadius: "12px", padding: "14px"}}>
<div style={{font: "600 14px var(--font-body)", color: "var(--pm-ink)"}}>Add a diner</div>
<div style={{font: "400 12px/1.55 var(--font-body)", color: "var(--pm-muted)", margin: "4px 0 11px"}}>Whoever you eat with most. Tell us who they are and we'll walk them through the same six questions. Their taste gets its own profile, so you can order for them later.</div>
<div style={{position: "relative"}}>
<Input value={fGuestName.v} onChange={fGuestName.set} placeholder="Their name" style={{width: "100%"}}></Input>
<button onClick={fGuestName.mic} style={{position: "absolute", right: "5px", top: "5px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fGuestName.bd}`, background: fGuestName.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "14px 0 8px"}}>Who they are to you</div>
<div style={{display: "flex", flexWrap: "wrap", gap: "7px"}}>
{(relPills || []).map((p, i) => (
<React.Fragment key={i}>
<button onClick={p.pick} style={{border: `1px solid ${p.bd}`, background: p.bg, color: "var(--pm-ink)", borderRadius: "999px", padding: "9px 13px", font: "500 12px var(--font-body)", cursor: "pointer", minHeight: "40px"}}>{p.label}</button>
</React.Fragment>
))}
</div>
<div style={{marginTop: "12px"}}>
<Button variant="secondary" size="md" onClick={addDiner} style={{width: "100%"}}>Add diner</Button>
</div>
<div style={{font: "400 11.5px/1.55 var(--font-body)", color: "var(--pm-muted)", marginTop: "8px"}}>{addDinerNote}</div>
</div>
</div>
</>
  );
}
