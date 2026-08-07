import React from 'react';
import { Input } from '../lib/ds';

/** Screen 12 · The wine */
export default function TheWine(vm){
  const { fWhy, offerTitle, offerSub, blankLabel, toggleBlank, presentCount, offers } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "18px"}}>
<div style={{font: "600 20px var(--font-display)", color: "#fff"}}>{offerTitle}</div>
<div style={{font: "400 12.5px/1.5 var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "5px"}}>{offerSub}</div>
</div>
<div style={{padding: "18px"}}>
<button onClick={toggleBlank} style={{width: "100%", textAlign: "left", border: "1px dashed var(--pm-blue)", background: "var(--pm-blueBg)", borderRadius: "10px", padding: "10px 12px", marginBottom: "12px", cursor: "pointer", font: "600 11.5px var(--font-body)", color: "var(--pm-blue)"}}>Demo state: {blankLabel}</button>
<div style={{font: "400 12px var(--font-body)", color: "var(--pm-muted)", marginBottom: "10px"}}>Tap the ones you want. {presentCount}</div>
{(offers || []).map((w, i) => (
<React.Fragment key={i}>
<div style={{border: `${w.bw} solid ${w.bd}`, background: w.bg, borderRadius: "12px", padding: "14px", marginBottom: "12px"}}>
<button onClick={w.pick} style={{display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "0", cursor: "pointer"}}>
<div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px"}}>
<span style={{font: "600 10.5px var(--font-body)", color: w.roleColor, letterSpacing: ".07em", textTransform: "uppercase"}}>{w.role}</span>
<span style={{font: "700 10.5px var(--font-body)", color: "#1F2A44", background: w.chipBg, borderRadius: "999px", padding: "4px 9px"}}>{w.chip}</span>
</div>
<div style={{display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start"}}>
<div>
<div style={{font: "700 15px var(--font-body)", color: "var(--pm-ink)"}}>{w.prod}</div>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-ink)", marginTop: "1px"}}>{w.wine}</div>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>{w.meta}</div>
</div>
<div style={{textAlign: "right", flex: "none"}}>
<div style={{font: "700 14px var(--font-body)", color: "var(--pm-ink)", fontVariantNumeric: "tabular-nums"}}>${w.btl}</div>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", fontVariantNumeric: "tabular-nums"}}>{w.glass}</div>
</div>
</div>
<div style={{font: "400 12.5px/1.65 var(--font-body)", color: "var(--pm-ink)", marginTop: "10px"}}>{w.why}</div>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginTop: "8px"}}>Covers: {w.covers}</div>
<div style={{font: "600 11.5px var(--font-body)", color: w.stockColor, marginTop: "7px"}}>{w.stockNote}</div>
</button>
<div style={{display: "flex", alignItems: "center", gap: "9px", marginTop: "11px", paddingTop: "10px", borderTop: "1px solid var(--pm-rule)"}}>
<button onClick={w.speak} style={{flex: "none", width: "38px", height: "38px", borderRadius: "999px", border: "1.5px solid var(--pm-accent2)", background: "var(--pm-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}} aria-label="Say it out loud">
<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 L6 9 H3 v6 h3 l5 4 Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>
</button>
<div style={{flex: "1"}}>
<div style={{font: "600 10.5px var(--font-body)", color: "var(--pm-pearInk)", letterSpacing: ".06em", textTransform: "uppercase"}}>Say it</div>
<div style={{font: "700 14px var(--font-body)", color: "var(--pm-ink)"}}>{w.say}</div>
</div>
<button onClick={w.open} style={{flex: "none", border: "1px solid var(--pm-rule)", background: "transparent", color: "var(--pm-accent2)", borderRadius: "999px", padding: "9px 13px", font: "600 11.5px var(--font-body)", cursor: "pointer", minHeight: "40px"}}>Brief ›</button>
</div>
</div>
</React.Fragment>
))}
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-blueBg)", borderRadius: "12px", padding: "13px", marginBottom: "12px"}}>
<div style={{font: "600 12px var(--font-body)", color: "var(--pm-muted)"}}>On the list, not in the cellar</div>
<div style={{font: "400 12px/1.6 var(--font-body)", color: "var(--pm-ink)", marginTop: "5px"}}><strong>Simon Bize, Savigny-lès-Beaune $144.</strong> Printed on their list, poured out last night. You'd have asked and been told no. Better you hear it from us.</div>
</div>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "13px", marginBottom: "12px"}}>
<div style={{font: "600 13px var(--font-body)", color: "var(--pm-ink)"}}>None of these?</div>
<div style={{font: "400 12px/1.55 var(--font-body)", color: "var(--pm-muted)", margin: "4px 0 9px"}}>Tell us what's wrong with them and we'll go again. This is the most useful thing you can say to us.</div>
<div style={{position: "relative"}}>
<Input value={fWhy.v} onChange={fWhy.set} placeholder="all too French, and too dear" style={{width: "100%"}}></Input>
<button onClick={fWhy.mic} style={{position: "absolute", right: "5px", top: "5px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fWhy.bd}`, background: fWhy.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
</div>
<div style={{font: "500 11.5px var(--font-body)", color: "var(--pm-pearInk)", marginTop: "6px"}}>{fWhy.hint}</div>
</div>
<div style={{border: "1px solid var(--pm-selBd)", background: "var(--pm-sel)", borderRadius: "12px", padding: "13px", font: "400 12.5px/1.6 var(--font-body)", color: "var(--pm-ink)"}}>One of these is a wine Aquitaine is featuring tonight, and it's marked. You aren't paying more for the suggestion. You should still know which one it is.</div>
</div>
</div>
</>
  );
}
