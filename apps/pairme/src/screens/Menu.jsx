import React from 'react';
import { Input } from '../lib/ds';

/** Screen 9 · The menu */
export default function Menu(vm){
  const { fUnread, jumps, menu, venueName } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "18px"}}>
<div style={{font: "600 20px var(--font-display)", color: "#fff"}}>{venueName}</div>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "5px"}}>Their menu tonight. Tap everything the table is having.</div>
</div>
<div className="pm-scroll-hide" style={{position: "sticky", top: "0", zIndex: "3", background: "var(--pm-page)", borderBottom: "1px solid var(--pm-rule)", padding: "10px 14px", display: "flex", gap: "7px", overflowX: "auto"}}>
{(jumps || []).map((j, i) => (
<React.Fragment key={i}>
<button onClick={j.go} style={{flex: "none", border: "1px solid var(--pm-rule)", background: "var(--pm-card)", color: "var(--pm-ink)", borderRadius: "999px", padding: "7px 13px", font: "600 11.5px var(--font-body)", cursor: "pointer", whiteSpace: "nowrap"}}>{j.name}</button>
</React.Fragment>
))}
</div>
<div style={{padding: "16px 18px 0"}}>
{(menu || []).map((sec, i) => (
<React.Fragment key={i}>
<div ref={sec.ref} style={{marginBottom: "16px"}}>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "8px"}}>{sec.name}</div>
{(sec.dishes || []).map((d, i) => (
<React.Fragment key={i}>
<button onClick={d.toggle} style={{width: "100%", textAlign: "left", border: `1px solid ${d.bd}`, background: d.bg, borderRadius: "10px", padding: "11px", marginBottom: "7px", cursor: "pointer"}}>
<div style={{display: "flex", justifyContent: "space-between", gap: "10px"}}>
<span style={{fontFamily: "var(--font-body)", fontWeight: "var(--pm-weight)", fontSize: "var(--pm-dish)", color: "var(--pm-ink)"}}>{d.n}</span>
<span style={{font: "400 var(--pm-desc) var(--font-body)", color: "var(--pm-muted)", flex: "none", fontVariantNumeric: "tabular-nums"}}>{d.price}</span>
</div>
<div style={{fontFamily: "var(--font-body)", fontWeight: "400", fontSize: "var(--pm-desc)", lineHeight: "1.45", color: "var(--pm-muted)", marginTop: "3px"}}>{d.d}</div>
</button>
</React.Fragment>
))}
</div>
</React.Fragment>
))}
<div style={{border: "1px solid var(--pm-blue)", background: "var(--pm-blueBg)", borderRadius: "10px", padding: "12px", marginBottom: "14px"}}>
<div style={{font: "600 12.5px var(--font-body)", color: "var(--pm-ink)"}}>One line we couldn't read</div>
<div style={{font: "400 12px/1.5 var(--font-body)", color: "var(--pm-muted)", marginTop: "4px", fontStyle: "italic"}}>"Pavé de b…f, sauce ...rdelaise". The print ran into the fold.</div>
<div style={{display: "flex", gap: "8px", alignItems: "center", marginTop: "9px"}}>
<Input value={fUnread.v} onChange={fUnread.set} placeholder="type or say what it reads" style={{width: "100%"}}></Input>
{fUnread.micVisible ? (
<button onClick={fUnread.mic} aria-label="Speak instead of typing" style={{position: "absolute", right: "5px", top: "5px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fUnread.bd}`, background: fUnread.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
) : null}
</div>
{fUnread.hint ? (<div style={{font: "500 11.5px var(--font-body)", color: "var(--pm-pearInk)", marginTop: "7px"}}>{fUnread.hint}</div>) : null}
<div style={{font: "400 11px var(--font-body)", color: "var(--pm-muted)", marginTop: "7px"}}>Or ignore this. We'll pair the rest and tell you we skipped one.</div>
</div>
</div>
</div>
</>
  );
}
