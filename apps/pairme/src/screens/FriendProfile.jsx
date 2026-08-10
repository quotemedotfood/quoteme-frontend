import React from 'react';
import { Button } from '../lib/ds';

/** Screen 16 · A friend */
export default function FriendProfile(vm){
  const { sarahLikes, sarahNots, sarahHistory } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "20px 18px"}}>
<div style={{display: "flex", gap: "14px", alignItems: "center"}}>
<div style={{flex: "none", width: "52px", height: "52px", borderRadius: "999px", background: "#EFB96B", color: "#1F2A44", font: "700 20px var(--font-display)", display: "flex", alignItems: "center", justifyContent: "center"}}>S</div>
<div>
<div style={{font: "600 20px var(--font-display)", color: "#fff"}}>Sarah</div>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "2px"}}>partner · at 7 of your tables</div>
</div>
</div>
</div>
<div style={{padding: "18px"}}>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "13px", font: "400 12.5px/1.65 var(--font-body)", color: "var(--pm-ink)"}}>She answered the six herself, so this is her taste and not your guess at it. Order for her with confidence.</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "18px 0 9px"}}>What Sarah likes</div>
<div style={{display: "flex", flexWrap: "wrap", gap: "7px"}}>
{(sarahLikes || []).map((t, i) => (
<React.Fragment key={i}>
<span style={{border: "1px solid var(--pm-selBd)", background: "var(--pm-sel)", color: "var(--pm-ink)", borderRadius: "999px", padding: "8px 13px", font: "500 12px var(--font-body)"}}>{t}</span>
</React.Fragment>
))}
</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "18px 0 9px"}}>Never, she's told us twice</div>
<div style={{display: "flex", flexWrap: "wrap", gap: "7px"}}>
{(sarahNots || []).map((t, i) => (
<React.Fragment key={i}>
<span style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", color: "var(--pm-muted)", borderRadius: "999px", padding: "8px 13px", font: "500 12px var(--font-body)", textDecoration: "line-through"}}>{t}</span>
</React.Fragment>
))}
</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "22px 0 4px"}}>Bottles she rated well</div>
{(sarahHistory || []).map((h, i) => (
<React.Fragment key={i}>
<div style={{display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--pm-rule)"}}>
<div>
<div style={{font: "500 13.5px var(--font-body)", color: "var(--pm-ink)"}}>{h.w}</div>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginTop: "2px"}}>{h.where}</div>
</div>
<div style={{display: "flex", gap: "3px", flex: "none"}}>
{(h.stars || []).map((st, i) => (
<React.Fragment key={i}>
<svg width="15" height="15" viewBox="0 0 20 20"><path d="M10 1.7l2.47 5.28 5.53.72-4.1 3.9 1.06 5.7L10 14.6l-4.96 2.7 1.06-5.7-4.1-3.9 5.53-.72z" fill={st.fill} stroke={st.stroke} strokeWidth="1.4" strokeLinejoin="round"></path></svg>
</React.Fragment>
))}
</div>
</div>
</React.Fragment>
))}
<div style={{border: "1.5px solid var(--pm-selBd)", background: "var(--pm-sel)", borderRadius: "12px", padding: "14px", marginTop: "16px"}}>
<div style={{font: "600 14px var(--font-display)", color: "var(--pm-ink)"}}>Send her a bottle</div>
<div style={{font: "400 12.5px/1.6 var(--font-body)", color: "var(--pm-muted)", margin: "4px 0 11px"}}>She gave the Huet five stars twice. A shop near her has it, and a wine that turns up on a Tuesday for no reason is a better gift than one that turns up on a birthday.</div>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "10px", padding: "12px"}}>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>Domaine Huet, Vouvray Sec Le Mont</div>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginTop: "2px"}}>chenin blanc · Loire · $42 retail</div>
</div>
<div style={{marginTop: "11px"}}>
<Button variant="secondary" size="md" style={{width: "100%"}}>Send as a gift</Button>
</div>
<div style={{font: "400 11px/1.55 var(--font-body)", color: "var(--pm-muted)", marginTop: "8px"}}>Handled by a licensed shop in her state. We pass along the pick and take nothing on it.</div>
</div>
</div>
</div>
</>
  );
}
