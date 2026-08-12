import React from 'react';

/** Screen 1 · Welcome */
export default function Welcome(){
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "56px 24px 44px", textAlign: "center"}}>
<img src="/brand/pear-mark.svg" alt="PairMe" style={{height: "48px", width: "auto", display: "block", marginLeft: "auto", marginRight: "auto"}} />
<div style={{font: "400 15px/1.5 var(--font-body)", color: "#fff", marginTop: "10px"}}>Know what to order. Every time.</div>
<div style={{font: "400 13.5px/1.6 var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "20px", maxWidth: "250px", marginLeft: "auto", marginRight: "auto"}}>Nobody should feel stupid reading a wine list. That includes you, tonight.</div>
</div>
<div style={{padding: "20px 18px 8px"}}>
<div style={{font: "400 13px/1.7 var(--font-body)", color: "var(--pm-muted)"}}>Six questions that get to the bottom of what you actually reach for. Skip them all and you still get a real pick, it'll just be less yours.</div>
<div style={{font: "400 12.5px/1.7 var(--font-body)", color: "var(--pm-muted)", marginTop: "12px"}}>Already keep your wine in an app? You can link it later under the gear, Connections. It is never the first thing we ask.</div>
</div>
</div>
</>
  );
}
