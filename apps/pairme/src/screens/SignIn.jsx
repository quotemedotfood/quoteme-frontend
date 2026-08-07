import React from 'react';

/** Screen 2 · Sign in */
export default function SignIn(vm){
  const { alt, signIns, signInVivino, signInNote, history } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "34px 22px 26px", textAlign: "center"}}>
<img src="assets/logo-mark-inverse.svg" alt="" style={{width: "44px", height: "44px"}} />
<div style={{font: "600 22px var(--font-display)", color: "#fff", marginTop: "12px"}}>Save your taste</div>
<div style={{font: "400 13px/1.6 var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "6px", maxWidth: "250px", marginLeft: "auto", marginRight: "auto"}}>So it follows you to the next restaurant. Takes one tap.</div>
</div>
<div style={{padding: "20px 18px"}}>
<div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
{(signIns || []).map((p, i) => (
<React.Fragment key={i}>
<button onClick={p.pick} style={{width: "100%", display: "flex", alignItems: "center", gap: "12px", border: `1.5px solid ${p.bd}`, background: p.bg, borderRadius: "999px", padding: "14px 18px", cursor: "pointer", minHeight: "52px"}}>
<span style={{flex: "none", width: "22px", display: "flex", justifyContent: "center"}}>{p.icon}</span>
<span style={{font: "600 14.5px var(--font-body)", color: p.fg}}>{p.label}</span>
</button>
</React.Fragment>
))}
</div>
<div style={{display: "flex", alignItems: "center", gap: "10px", margin: "18px 0"}}>
<span style={{flex: "1", height: "1px", background: "var(--pm-rule)"}}></span>
<span style={{font: "500 11px var(--font-body)", color: "var(--pm-muted)"}}>or bring your history with you</span>
<span style={{flex: "1", height: "1px", background: "var(--pm-rule)"}}></span>
</div>
<button onClick={signInVivino} style={{width: "100%", display: "flex", alignItems: "center", gap: "12px", border: "1.5px solid var(--pm-selBd)", background: "var(--pm-sel)", borderRadius: "999px", padding: "14px 18px", cursor: "pointer", minHeight: "52px"}}>
<span style={{flex: "none", width: "22px", textAlign: "center", font: "700 15px var(--font-display)", color: "var(--pm-ink)"}}>V</span>
<div style={{textAlign: "left"}}>
<div style={{font: "600 14.5px var(--font-body)", color: "var(--pm-ink)"}}>Continue with Vivino</div>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginTop: "1px"}}>Brings your ratings across</div>
</div>
</button>
<div style={{font: "400 11.5px/1.6 var(--font-body)", color: "var(--pm-muted)", marginTop: "16px"}}>{signInNote}</div>
</div>
</div>
</>
  );
}
