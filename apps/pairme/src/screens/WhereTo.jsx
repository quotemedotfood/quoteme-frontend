import React from 'react';
import { Button, Input } from '../lib/ds';

/** Screen 9 · Where to */
export default function WhereTo(vm){
  const { goMenu, goCamera, fVenue, venueHits, noList, hasList, noListLabel, toggleNoList, showNoListToggle, menu, fEatText, goTellUs } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "18px"}}>
<div style={{font: "600 20px var(--font-display)", color: "#fff"}}>Where are you eating?</div>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "5px"}}>No account, no address book. Just the room you're in.</div>
</div>
<div style={{padding: "18px"}}>
{showNoListToggle ? (<button onClick={toggleNoList} style={{width: "100%", textAlign: "left", border: "1px dashed var(--pm-blue)", background: "var(--pm-blueBg)", borderRadius: "10px", padding: "10px 12px", marginBottom: "12px", cursor: "pointer", font: "600 11.5px var(--font-body)", color: "var(--pm-blue)"}}>Demo state: {noListLabel}</button>) : null}
{hasList ? (<>
<div>
<button onClick={goMenu} style={{width: "100%", textAlign: "left", border: "1.5px solid var(--pm-accent2)", background: "var(--pm-sel)", borderRadius: "12px", padding: "15px", marginBottom: "9px", cursor: "pointer"}}>
<div style={{font: "600 14px var(--font-body)", color: "var(--pm-ink)"}}>Scan the code on your table</div>
<div style={{font: "400 12px var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>Fastest. No typing.</div>
</button>
<button onClick={goCamera} style={{width: "100%", display: "flex", gap: "13px", alignItems: "center", border: "1.5px solid var(--pm-accent2)", background: "var(--pm-card)", borderRadius: "12px", padding: "15px", marginBottom: "10px", cursor: "pointer", textAlign: "left"}}>
<span style={{flex: "none", width: "42px", height: "42px", borderRadius: "999px", background: "#EFB96B", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#1F2A44" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"></path><circle cx="12" cy="13.5" r="3.8"></circle></svg>
</span>
<span>
<span style={{display: "block", font: "600 14px var(--font-body)", color: "var(--pm-ink)"}}>Photograph the menu</span>
<span style={{display: "block", font: "400 12px/1.45 var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>Any menu, anywhere. We read it in about ten seconds.</span>
</span>
</button>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "14px"}}>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)", marginBottom: "9px"}}>Or find it</div>
<div style={{position: "relative"}}>
<Input value={fVenue.v} onChange={fVenue.set} placeholder="start typing" style={{width: "100%"}}></Input>
<button onClick={fVenue.mic} aria-label="Speak instead of typing" style={{position: "absolute", right: "5px", top: "5px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fVenue.bd}`, background: fVenue.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
</div>
{(venueHits || []).map((v, i) => (
<React.Fragment key={i}>
<button onClick={v.go} style={{width: "100%", textAlign: "left", border: "none", borderBottom: "1px solid var(--pm-rule)", background: "transparent", padding: "11px 0", cursor: "pointer", font: `${v.weight} 12.5px var(--font-body)`, color: v.color}}>{v.label}</button>
</React.Fragment>
))}
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginTop: "8px"}}>Type "aqu" to see it come up.</div>
</div>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "14px", marginTop: "10px"}}>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)", marginBottom: "4px"}}>Or what are you eating?</div>
<div style={{font: "400 12px/1.45 var(--font-body)", color: "var(--pm-muted)", marginBottom: "9px"}}>No menu on hand? Type it or tell us, and we will take it from there.</div>
<div style={{position: "relative"}}>
<Input value={fEatText.v} onChange={fEatText.set} placeholder="roast chicken, potatoes, green beans" aria-label="What are you eating" style={{width: "100%"}}></Input>
<button onClick={fEatText.mic} aria-label="Tell us what you are eating" style={{position: "absolute", right: "5px", top: "5px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fEatText.bd}`, background: fEatText.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
</div>
<div style={{marginTop: "10px"}}>
<Button variant="primary" size="md" onClick={goTellUs} disabled={!fEatText.v.trim()} style={{width: "100%", opacity: fEatText.v.trim() ? 1 : 0.55}}>Just tell us here</Button>
</div>
</div>
</div>
</>) : null}
{noList ? (<>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "15px"}}>
<div style={{font: "600 14px var(--font-display)", color: "var(--pm-ink)"}}>Trattoria Bergamo</div>
<div style={{font: "400 12px var(--font-body)", color: "var(--pm-muted)", marginTop: "2px"}}>North End, Boston</div>
<div style={{background: "var(--pm-blueBg)", border: "1px solid var(--pm-blue)", borderRadius: "10px", padding: "12px", marginTop: "12px", font: "400 12.5px/1.6 var(--font-body)", color: "var(--pm-ink)"}}>We don't have their wine list. That's on us, not you. Point your camera at the list and we'll read it, about ten seconds, and it helps the next person here too.</div>
<div style={{marginTop: "12px"}}>
<Button variant="primary" size="md" onClick={goCamera} style={{width: "100%"}}>Photograph the list</Button>
</div>
<div style={{marginTop: "9px"}}>
<Button variant="secondary" size="md" onClick={goMenu} style={{width: "100%"}}>Just tell me what to look for</Button>
</div>
</div>
</>) : null}
</div>
</div>
</>
  );
}
