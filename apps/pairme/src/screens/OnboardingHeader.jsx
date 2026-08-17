import React from 'react';

/** Shared header for screens 3 to 8. Rendered by <Phone> when vm.onboarding is true. */
export default function OnboardingHeader(vm){
  const { step, obTitle, obSub, glassY, glassH, skip } = vm;
  return (
<>
<div style={{background: "var(--pm-chrome)", padding: "16px 18px 18px", display: "flex", gap: "14px", alignItems: "flex-start"}}>
<div style={{flex: "1"}}>
<div style={{font: "600 11.5px var(--font-body)", color: "#EFB96B", letterSpacing: ".06em", textTransform: "uppercase"}}>Question {step} of 6 · skippable</div>
<div style={{font: "600 20px/1.3 var(--font-display)", color: "#fff", marginTop: "5px"}}>{obTitle}</div>
{obSub ? (
<div style={{font: "400 12.5px/1.55 var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "7px"}}>{obSub}</div>
) : null}
</div>
<div style={{flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "7px", width: "78px"}}>
<svg width="38" height="60" viewBox="0 0 34 54" style={{overflow: "visible"}}>
<defs><clipPath id="pmbowl"><path d="M5.5 4 L28.5 4 L25.5 27 Q17 39 8.5 27 Z"></path></clipPath></defs>
<g clipPath="url(#pmbowl)">
<rect x="0" y={glassY} width="34" height={glassH} fill="#EFB96B" style={{transition: "y .42s cubic-bezier(.2,.8,.2,1),height .42s cubic-bezier(.2,.8,.2,1)"}}></rect>
<rect x="0" y={glassY} width="34" height="1.6" fill="#FFE0AE" style={{transition: "y .42s cubic-bezier(.2,.8,.2,1)"}}></rect>
</g>
<path d="M5.5 4 L28.5 4 L25.5 27 Q17 39 8.5 27 Z" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round"></path>
<path d="M9.5 7 L11.5 24" fill="none" stroke="#fff" strokeWidth="1" opacity=".45"></path>
<line x1="17" y1="37" x2="17" y2="47" stroke="#fff" strokeWidth="1.4"></line>
<path d="M10 48.5 Q17 51 24 48.5" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"></path>
</svg>
<button onClick={skip} style={{border: "1.5px solid #EFB96B", background: "transparent", color: "#EFB96B", borderRadius: "999px", padding: "8px 12px", font: "600 12px var(--font-body)", cursor: "pointer", width: "100%"}}>Skip</button>
</div>
</div>
</>
  );
}
