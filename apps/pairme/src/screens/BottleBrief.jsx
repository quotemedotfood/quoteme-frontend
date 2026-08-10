import React from 'react';

/** Screen 17 · Bottle brief */
export default function BottleBrief(vm){
  const { bb, history } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "20px 18px 22px"}}>
<div style={{font: "600 10.5px var(--font-body)", color: "#EFB96B", letterSpacing: ".09em", textTransform: "uppercase"}}>Bottle brief</div>
<div style={{font: "700 25px/1.2 var(--font-display)", color: "#fff", marginTop: "7px"}}>{bb.prod}</div>
<div style={{font: "400 16px/1.3 var(--font-body)", color: "#fff", marginTop: "3px"}}>{bb.wine}</div>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "6px"}}>{bb.meta}</div>
</div>
<div style={{padding: "16px 18px"}}>
<div style={{background: "var(--pm-sel)", border: "1px solid var(--pm-selBd)", borderRadius: "12px", padding: "12px", display: "flex", gap: "12px", alignItems: "center"}}>
<button onClick={bb.speak} style={{flex: "none", width: "48px", height: "48px", borderRadius: "999px", border: "2px solid var(--pm-accent2)", background: "var(--pm-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}} aria-label="Say it out loud">
<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 L6 9 H3 v6 h3 l5 4 Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>
</button>
<div style={{flex: "1"}}>
<div style={{font: "600 10.5px var(--font-body)", color: "var(--pm-pearInk)", letterSpacing: ".07em", textTransform: "uppercase"}}>Say it like this</div>
<div style={{font: "700 19px/1.25 var(--font-body)", color: "var(--pm-ink)", marginTop: "3px"}}>{bb.say}</div>
<div style={{font: "400 12px var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>{bb.tip}</div>
</div>
</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 0 8px"}}>What it means</div>
<div style={{font: "400 13.5px/1.75 var(--font-body)", color: "var(--pm-ink)"}}>{bb.means}</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 0 8px"}}>What it tastes like</div>
<div style={{display: "flex", flexWrap: "wrap", gap: "7px"}}>
{(bb.notes || []).map((n, i) => (
<React.Fragment key={i}>
<span style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", color: "var(--pm-ink)", borderRadius: "999px", padding: "8px 13px", font: "500 12px var(--font-body)"}}>{n}</span>
</React.Fragment>
))}
</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 0 8px"}}>Why it works with your food</div>
<div style={{font: "400 13.5px/1.75 var(--font-body)", color: "var(--pm-ink)"}}>{bb.why}</div>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "13px", marginTop: "16px"}}>
<div style={{font: "600 13px var(--font-body)", color: "var(--pm-ink)"}}>If you like this</div>
<div style={{font: "400 12.5px/1.65 var(--font-body)", color: "var(--pm-muted)", marginTop: "4px"}}>{bb.bridge}</div>
</div>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "13px", marginTop: "10px"}}>
<div style={{font: "600 13px var(--font-body)", color: "var(--pm-ink)"}}>Your history with it</div>
<div style={{font: "400 12.5px/1.65 var(--font-body)", color: "var(--pm-muted)", marginTop: "4px"}}>{bb.yours}</div>
</div>
<div style={{display: "flex", gap: "9px", marginTop: "14px"}}>
<button onClick={bb.share} style={{flex: "1", border: "1.5px solid var(--pm-accent2)", background: "transparent", color: "var(--pm-accent2)", borderRadius: "999px", padding: "13px", font: "600 13px var(--font-body)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4"></path><path d="M8 7.5 12 3.5l4 4"></path><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"></path></svg>
<span>Share</span>
</button>
<button onClick={bb.save} style={{flex: "1", border: "1.5px solid var(--pm-accent2)", background: bb.savedBg, color: "var(--pm-accent2)", borderRadius: "999px", padding: "13px", font: "600 13px var(--font-body)", cursor: "pointer"}}>{bb.savedLabel}</button>
</div>
<div style={{font: "400 11.5px/1.6 var(--font-body)", color: "var(--pm-muted)", marginTop: "9px"}}>{bb.shareNote}</div>
</div>
</div>
</>
  );
}
