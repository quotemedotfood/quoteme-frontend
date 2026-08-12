import React from 'react';
import { Button } from '../lib/ds';

/** Screen 18 · Settings */
export default function Settings(vm){
  const { goSignIn, menu, settingRows, demoSpeak, acctTitle, acctSub, acctAction, connections, connectionsOpen, toggleConnections } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "18px"}}>
<div style={{font: "600 20px var(--font-display)", color: "#fff"}}>Settings</div>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "5px"}}>Read it your way. Nothing here changes what we pick.</div>
</div>
<div style={{padding: "18px"}}>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "9px"}}>Reading</div>
{(settingRows || []).map((r, i) => (
<React.Fragment key={i}>
<button onClick={r.pick} style={{width: "100%", textAlign: "left", border: `1px solid ${r.bd}`, background: r.bg, borderRadius: "12px", padding: "14px", marginBottom: "9px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px"}}>
<div>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>{r.label}</div>
<div style={{font: "400 12px/1.55 var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>{r.sub}</div>
</div>
<span style={{flex: "none", width: "46px", height: "27px", borderRadius: "999px", background: r.trackBg, border: `1.5px solid ${r.trackBd}`, position: "relative", display: "block"}}>
<span style={{position: "absolute", top: "2px", left: r.knobX, width: "19px", height: "19px", borderRadius: "999px", background: r.knobBg, transition: "left .18s cubic-bezier(.2,.8,.2,1)"}}></span>
</span>
</button>
</React.Fragment>
))}
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "10px", padding: "12px", font: "400 12px/1.65 var(--font-body)", color: "var(--pm-muted)"}}>High contrast also raises the menu's type size. We would rather you read the dish than admire the layout.</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "22px 0 9px"}}>Sound</div>
<button onClick={demoSpeak} style={{width: "100%", textAlign: "left", border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px"}}>
<div>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>Test the voice</div>
<div style={{font: "400 12px/1.55 var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>Plays through your earpiece if you have one in.</div>
</div>
<span style={{flex: "none", width: "40px", height: "40px", borderRadius: "999px", border: "1.5px solid var(--pm-accent2)", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 L6 9 H3 v6 h3 l5 4 Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 5.5a9 9 0 0 1 0 13"></path></svg>
</span>
</button>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "22px 0 9px"}}>Connections</div>
<button onClick={toggleConnections} aria-expanded={connectionsOpen} style={{width: "100%", textAlign: "left", border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px"}}>
<div>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>Link a wine app</div>
<div style={{font: "400 12px/1.55 var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>Read your ratings and cellar, so we know you sooner. Optional, and never first.</div>
</div>
<span style={{flex: "none", font: "700 15px var(--font-body)", color: "var(--pm-muted)"}}>{connectionsOpen ? "−" : "+"}</span>
</button>
{connectionsOpen ? (
<div style={{marginTop: "8px"}}>
{(connections || []).map((c, i) => (
<React.Fragment key={i}>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-sunken)", borderRadius: "12px", padding: "12px 13px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px"}}>
<div>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>{c.label}</div>
<div style={{font: "400 11.5px/1.5 var(--font-body)", color: "var(--pm-muted)", marginTop: "2px"}}>{c.sub}</div>
</div>
<span style={{flex: "none", border: "1px solid var(--pm-rule)", background: "var(--pm-card)", color: "var(--pm-muted)", borderRadius: "999px", padding: "8px 13px", font: "600 11px var(--font-body)", textTransform: "uppercase", letterSpacing: ".04em"}}>{c.status}</span>
</div>
</React.Fragment>
))}
<div style={{font: "400 11.5px/1.6 var(--font-body)", color: "var(--pm-muted)", padding: "2px"}}>Nothing connects yet. When these land we'll read only your ratings and cellar, never post anything, and let you disconnect and delete what we pulled in.</div>
</div>
) : null}
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "22px 0 9px"}}>Account</div>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "14px"}}>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>{acctTitle}</div>
<div style={{font: "400 12px/1.6 var(--font-body)", color: "var(--pm-muted)", margin: "3px 0 11px"}}>{acctSub}</div>
<Button variant="secondary" size="md" onClick={goSignIn} style={{width: "100%"}}>{acctAction}</Button>
</div>
</div>
</div>
</>
  );
}
