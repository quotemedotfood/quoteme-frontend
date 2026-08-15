import React from 'react';
import { Input } from '../lib/ds';

/**
 * A real two-handle range slider. Both handles drag (pointer + touch), the low
 * handle cannot cross the high handle, each handle has a 44px touch target and a
 * live dollar label above it, and it is keyboard operable (arrows / Home / End).
 * This IS the control - there are no explainer sliders underneath any more.
 */
function RangeSlider({ min, max, step, lo, hi, onLo, onHi, loLabel, hiLabel }) {
  const trackRef = React.useRef(null);
  const pct = (v) => ((v - min) / (max - min)) * 100;
  const valueFromClientX = (clientX) => {
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return null;
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return min + frac * (max - min);
  };
  const startDrag = (which) => (e) => {
    e.preventDefault();
    const move = (ev) => {
      const v = valueFromClientX(ev.clientX);
      if (v == null) return;
      (which === 'lo' ? onLo : onHi)(v);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const onKey = (which) => (e) => {
    const cur = which === 'lo' ? lo : hi;
    const set = which === 'lo' ? onLo : onHi;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(cur - step); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(cur + step); }
    else if (e.key === 'Home') { e.preventDefault(); set(min); }
    else if (e.key === 'End') { e.preventDefault(); set(max); }
  };
  const handle = (which, v, label) => (
    <React.Fragment>
      <div style={{ position: 'absolute', left: `${pct(v)}%`, top: '-22px', transform: 'translateX(-50%)', font: '700 12px var(--font-body)', color: 'var(--pm-ink)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{label}</div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={which === 'lo' ? 'Least you would spend' : 'Most you would spend'}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={v}
        aria-valuetext={label}
        onPointerDown={startDrag(which)}
        onKeyDown={onKey(which)}
        style={{
          position: 'absolute', left: `${pct(v)}%`, top: '50%',
          width: '44px', height: '44px', transform: 'translate(-50%, -50%)',
          touchAction: 'none', cursor: 'grab', zIndex: which === 'lo' ? 3 : 2,
          background: 'radial-gradient(circle at center, var(--pm-card) 0 9px, var(--pm-accent2) 9px 11.5px, transparent 12px)',
        }}
      />
    </React.Fragment>
  );
  return (
    <div ref={trackRef} style={{ position: 'relative', height: '44px', margin: '0 8px' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '5px', transform: 'translateY(-50%)', borderRadius: '3px', background: 'var(--pm-rule)' }}></div>
      <div style={{ position: 'absolute', top: '50%', height: '5px', transform: 'translateY(-50%)', borderRadius: '3px', background: '#EFB96B', left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}></div>
      {handle('lo', lo, loLabel)}
      {handle('hi', hi, hiLabel)}
    </div>
  );
}

/** Screen 5 · Question 3, budget */
export default function Q3Budget(vm){
  const { fBudget, bMin, bMax, bMaxLabel, bFloor, bCeil, bStep, setBMin, setBMax, bumps, bumpNote } = vm;
  return (
<>
<div style={{padding: "22px 18px 18px"}}>
<div style={{textAlign: "center", marginBottom: "16px"}}>
<span style={{font: "700 34px var(--font-display)", color: "var(--pm-ink)", fontVariantNumeric: "tabular-nums"}}>${bMin}</span>
<span style={{font: "400 15px var(--font-body)", color: "var(--pm-muted)"}}> to </span>
<span style={{font: "700 34px var(--font-display)", color: "var(--pm-ink)", fontVariantNumeric: "tabular-nums"}}>${bMaxLabel}</span>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-muted)", marginTop: "4px"}}>a bottle, where you're comfortable. Drag either end.</div>
</div>
<div style={{margin: "26px 0 8px"}}>
<RangeSlider min={bFloor} max={bCeil} step={bStep} lo={bMin} hi={bMax} onLo={setBMin} onHi={setBMax} loLabel={"$" + bMin} hiLabel={"$" + bMaxLabel} />
</div>
<div style={{display: "flex", justifyContent: "space-between", font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", margin: "0 8px 14px"}}><span>${bFloor}</span><span>${bCeil}+</span></div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "20px 0 8px"}}>If tonight is a celebration</div>
<div style={{display: "flex", gap: "8px"}}>
{(bumps || []).map((b, i) => (
<React.Fragment key={i}>
<button onClick={b.pick} style={{flex: "1", border: `1.5px solid ${b.bd}`, background: b.bg, borderRadius: "12px", padding: "12px 6px", cursor: "pointer", textAlign: "center"}}>
<div style={{font: "700 15px var(--font-body)", color: "var(--pm-ink)"}}>{b.pct}</div>
<div style={{font: "400 11px var(--font-body)", color: "var(--pm-muted)", marginTop: "3px"}}>to ${b.to}</div>
</button>
</React.Fragment>
))}
</div>
<div style={{font: "400 12px/1.6 var(--font-body)", color: "var(--pm-muted)", marginTop: "9px"}}>{bumpNote}</div>
<div style={{marginTop: "14px"}}>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginBottom: "6px"}}>Anything we didn't list</div>
<div style={{position: "relative"}}>
<Input value={fBudget.v} onChange={fBudget.set} placeholder="under $60 on a Tuesday" style={{width: "100%"}}></Input>
<button onClick={fBudget.mic} aria-label="Speak instead of typing" style={{position: "absolute", right: "5px", top: "5px", width: "34px", height: "34px", borderRadius: "999px", border: `1.5px solid ${fBudget.bd}`, background: fBudget.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pm-ink)" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0"></path><line x1="12" y1="18" x2="12" y2="22"></line></svg>
</button>
</div>
<div style={{font: "500 11.5px var(--font-body)", color: "var(--pm-pearInk)", marginTop: "6px"}}>{fBudget.hint}</div>
</div>
</div>
</>
  );
}
