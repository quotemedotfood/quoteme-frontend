import React from 'react';

/** Screen 14 · How was it */
export default function RateIt(vm){
  const { fFb, rateRows, fb, setFb, shareBd, shareBg, toggleShare } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "18px"}}>
<div style={{font: "600 20px var(--font-display)", color: "#fff"}}>How was it?</div>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "5px"}}>Thirty seconds. It's the only way we get better at you.</div>
</div>
<div style={{padding: "18px"}}>
{(rateRows || []).map((r, i) => (
<React.Fragment key={i}>
<div style={{marginBottom: "18px"}}>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)", marginBottom: "8px"}}>{r.label}</div>
<div style={{display: "flex", gap: "6px"}}>
{(r.stars || []).map((st, i) => (
<React.Fragment key={i}>
<button onClick={st.pick} style={{flex: "none", border: "none", background: "transparent", padding: "2px", cursor: "pointer", lineHeight: "0"}}>
<svg width="34" height="34" viewBox="0 0 20 20"><path d="M10 1.7l2.47 5.28 5.53.72-4.1 3.9 1.06 5.7L10 14.6l-4.96 2.7 1.06-5.7-4.1-3.9 5.53-.72z" fill={st.fill} stroke={st.stroke} strokeWidth="1.2" strokeLinejoin="round"></path></svg>
</button>
</React.Fragment>
))}
</div>
</div>
</React.Fragment>
))}
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)", marginBottom: "6px"}}>Anything you want to tell us</div>
<div style={{position: "relative"}}>
<textarea value={fb} onChange={setFb} rows="3" placeholder="the Gevrey was the right call, the Champagne was a stretch on the pâté" style={{width: "100%", boxSizing: "border-box", border: "1px solid var(--pm-rule)", borderRadius: "8px", padding: "11px", font: "400 13px var(--font-body)", resize: "vertical", background: "var(--pm-card)", color: "var(--pm-ink)"}}></textarea>
<button onClick={fFb.mic} style={{position: "absolute", right: "7px", top: "7px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fFb.bd}`, background: fFb.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
</div>
<div style={{font: "500 11.5px var(--font-body)", color: "var(--pm-pearInk)", marginTop: "6px"}}>{fFb.hint}</div>
<button onClick={toggleShare} style={{width: "100%", textAlign: "left", border: `1px solid ${shareBd}`, background: shareBg, borderRadius: "12px", padding: "13px", marginTop: "12px", cursor: "pointer"}}>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>Let Aquitaine see this</div>
<div style={{font: "400 12px/1.5 var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>Anonymous either way. Off means only we see it, and it only shapes what we say to you.</div>
</button>
</div>
</div>
</>
  );
}
