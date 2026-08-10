import React from 'react';

/** Screen 19 · Camera */
export default function Camera(vm){
  const { camTitle, camSub, camLines, camShot, camFire, camUpload, camPages, camPageNo, camNote } = vm;
  return (
<>
<div style={{background: "#0D1220", minHeight: "100%", display: "flex", flexDirection: "column"}}>
<div style={{padding: "16px 18px 10px", textAlign: "center"}}>
<div style={{font: "600 17px/1.3 var(--font-display)", color: "#fff"}}>{camTitle}</div>
<div style={{font: "400 12.5px/1.55 var(--font-body)", color: "#9FB3C8", marginTop: "5px"}}>{camSub}</div>
</div>
<div style={{flex: "1", position: "relative", margin: "6px 16px 0", borderRadius: "14px", overflow: "hidden", background: "#161D2E"}}>
<div style={{position: "absolute", inset: "0", padding: "22px 18px", display: "flex", flexDirection: "column", gap: "9px", opacity: ".32"}}>
<div style={{font: "600 11px var(--font-body)", color: "#EFB96B", letterSpacing: ".14em", textTransform: "uppercase"}}>Les Vins</div>
<div style={{height: "1px", background: "#4A5A75"}}></div>
{(camLines || []).map((l, i) => (
<React.Fragment key={i}>
<div style={{display: "flex", justifyContent: "space-between", gap: "12px"}}>
<span style={{height: "8px", borderRadius: "2px", background: "#8FA3BE", width: l.w}}></span>
<span style={{height: "8px", width: "22px", borderRadius: "2px", background: "#6B7E99", flex: "none"}}></span>
</div>
</React.Fragment>
))}
</div>
<div style={{position: "absolute", top: "14px", left: "14px", width: "30px", height: "30px", borderTop: "3px solid #EFB96B", borderLeft: "3px solid #EFB96B", borderRadius: "8px 0 0 0"}}></div>
<div style={{position: "absolute", top: "14px", right: "14px", width: "30px", height: "30px", borderTop: "3px solid #EFB96B", borderRight: "3px solid #EFB96B", borderRadius: "0 8px 0 0"}}></div>
<div style={{position: "absolute", bottom: "14px", left: "14px", width: "30px", height: "30px", borderBottom: "3px solid #EFB96B", borderLeft: "3px solid #EFB96B", borderRadius: "0 0 0 8px"}}></div>
<div style={{position: "absolute", bottom: "14px", right: "14px", width: "30px", height: "30px", borderBottom: "3px solid #EFB96B", borderRight: "3px solid #EFB96B", borderRadius: "0 0 8px 0"}}></div>
{camShot ? (<>
<div style={{position: "absolute", inset: "0", background: "rgba(13,18,32,.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "24px", textAlign: "center"}}>
<div style={{width: "44px", height: "44px", borderRadius: "999px", border: "3px solid #2C3A52", borderTopColor: "#EFB96B", animation: "pmspin 1s linear infinite"}}></div>
<div style={{font: "600 15px var(--font-display)", color: "#fff"}}>Reading the list</div>
<div style={{font: "400 12.5px/1.6 var(--font-body)", color: "#9FB3C8", maxWidth: "230px"}}>38 wines so far. We only need the names and the prices, so this is quicker than it looks.</div>
</div>
</>) : null}
</div>
<div style={{padding: "14px 18px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px"}}>
<button onClick={camUpload} style={{flex: "none", width: "46px", height: "46px", borderRadius: "12px", border: "1.5px solid #3C4B66", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}} aria-label="Choose a photo">
<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9FB3C8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="m4 16 5-5 4 4 3-2 4 4"></path></svg>
</button>
<button onClick={camFire} style={{flex: "none", width: "74px", height: "74px", borderRadius: "999px", border: "4px solid #EFB96B", background: "#0D1220", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}} aria-label="Take the picture">
<span style={{width: "56px", height: "56px", borderRadius: "999px", background: "#EFB96B", display: "block"}}></span>
</button>
<button onClick={camPages} style={{flex: "none", width: "46px", height: "46px", borderRadius: "12px", border: "1.5px solid #3C4B66", background: "transparent", cursor: "pointer", font: "700 12px var(--font-body)", color: "#9FB3C8"}} aria-label="Add another page">+{camPageNo}</button>
</div>
<div style={{padding: "0 18px 20px", font: "400 11.5px/1.6 var(--font-body)", color: "#7C8DA6", textAlign: "center"}}>{camNote}</div>
</div>
</>
  );
}
