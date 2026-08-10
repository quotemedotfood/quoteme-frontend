import React from 'react';

/** Screen 15 · Your profile */
export default function YourProfile(vm){
  const { dietLine, connections, shareTable, shareNote, myLikes, myNots, historyCount, history, friends,
    deleteAccountLabel, deleteAccountSub, deleteAccount, cancelDelete, showCancelDelete, deleteDone } = vm;
  return (
<>
<div>
<div style={{background: "var(--pm-chrome)", padding: "20px 18px"}}>
<div style={{display: "flex", gap: "14px", alignItems: "center"}}>
<div style={{flex: "none", width: "52px", height: "52px", borderRadius: "999px", background: "#EFB96B", color: "#1F2A44", font: "700 20px var(--font-display)", display: "flex", alignItems: "center", justifyContent: "center"}}>M</div>
<div>
<div style={{font: "600 20px var(--font-display)", color: "#fff"}}>Moose</div>
<div style={{font: "400 12.5px var(--font-body)", color: "var(--pm-chromeSub)", marginTop: "2px"}}>Boston · 11 tables with us</div>
</div>
</div>
</div>
<div style={{padding: "18px"}}>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "9px"}}>What you like</div>
<div style={{display: "flex", flexWrap: "wrap", gap: "7px"}}>
{(myLikes || []).map((t, i) => (
<React.Fragment key={i}>
<span style={{border: "1px solid var(--pm-selBd)", background: "var(--pm-sel)", color: "var(--pm-ink)", borderRadius: "999px", padding: "8px 13px", font: "500 12px var(--font-body)"}}>{t}</span>
</React.Fragment>
))}
</div>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "18px 0 9px"}}>What you'd rather not</div>
<div style={{display: "flex", flexWrap: "wrap", gap: "7px"}}>
{(myNots || []).map((t, i) => (
<React.Fragment key={i}>
<span style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", color: "var(--pm-muted)", borderRadius: "999px", padding: "8px 13px", font: "500 12px var(--font-body)", textDecoration: "line-through"}}>{t}</span>
</React.Fragment>
))}
</div>
<div style={{border: "1px solid var(--pm-warnBd)", background: "var(--pm-warnBg)", borderRadius: "10px", padding: "11px", marginTop: "14px", font: "600 12.5px var(--font-body)", color: "var(--pm-ink)"}}>Allergies on file: {dietLine}</div>
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "10px", padding: "12px", marginTop: "12px", font: "400 12.5px/1.65 var(--font-body)", color: "var(--pm-muted)"}}>You lean toward Loire whites and lighter reds. Four of your last five were French. We're not going to pretend that's a coincidence.</div>
<div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "22px 0 4px"}}>
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase"}}>Your history</div>
<span style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)"}}>{historyCount}</span>
</div>
{(history || []).map((h, i) => (
<React.Fragment key={i}>
<button onClick={h.open} style={{width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottom: "1px solid var(--pm-rule)", display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", padding: "11px 0", cursor: "pointer"}}>
<div>
<div style={{font: "500 13.5px var(--font-body)", color: "var(--pm-ink)"}}>{h.w}</div>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginTop: "2px"}}>{h.where}</div>
<div style={{font: "400 11.5px/1.5 var(--font-body)", color: "var(--pm-muted)", marginTop: "3px", fontStyle: "italic"}}>{h.dish}</div>
</div>
<div style={{display: "flex", gap: "3px", flex: "none", alignItems: "center"}}>
{(h.stars || []).map((st, i) => (
<React.Fragment key={i}>
<svg width="15" height="15" viewBox="0 0 20 20"><path d="M10 1.7l2.47 5.28 5.53.72-4.1 3.9 1.06 5.7L10 14.6l-4.96 2.7 1.06-5.7-4.1-3.9 5.53-.72z" fill={st.fill} stroke={st.stroke} strokeWidth="1.4" strokeLinejoin="round"></path></svg>
</React.Fragment>
))}
<span style={{font: "600 16px var(--font-body)", color: "var(--pm-muted)", marginLeft: "5px"}}>›</span>
</div>
</button>
</React.Fragment>
))}
<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "22px 0 9px"}}>Connected accounts</div>
{(connections || []).map((c, i) => (
<React.Fragment key={i}>
<div style={{border: `1px solid ${c.bd}`, background: c.bg, borderRadius: "12px", padding: "12px 13px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px"}}>
<div>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>{c.label}</div>
<div style={{font: "400 11.5px/1.5 var(--font-body)", color: "var(--pm-muted)", marginTop: "2px"}}>{c.sub}</div>
</div>
<button onClick={c.pick} style={{flex: "none", border: "1.5px solid var(--pm-accent2)", background: "transparent", color: "var(--pm-accent2)", borderRadius: "999px", padding: "9px 14px", font: "600 11.5px var(--font-body)", cursor: "pointer", minHeight: "40px"}}>{c.action}</button>
</div>
</React.Fragment>
))}
<div style={{border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "10px", padding: "12px", font: "400 12px/1.65 var(--font-body)", color: "var(--pm-muted)"}}>We read ratings and cellar contents, nothing else. We never post anything, and disconnecting deletes what we pulled in.</div>
<div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", margin: "22px 0 9px"}}>
<span style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase"}}>Your table</span>
<button onClick={shareTable} style={{border: "1.5px solid var(--pm-accent2)", background: "transparent", color: "var(--pm-accent2)", borderRadius: "999px", padding: "8px 14px", font: "600 11.5px var(--font-body)", cursor: "pointer", minHeight: "40px", display: "flex", alignItems: "center", gap: "6px"}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4"></path><path d="M8 7.5 12 3.5l4 4"></path><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"></path></svg>
<span>Share</span>
</button>
</div>
<div style={{font: "400 11.5px/1.6 var(--font-body)", color: "var(--pm-muted)", marginBottom: "10px"}}>{shareNote}</div>
{(friends || []).map((fr, i) => (
<React.Fragment key={i}>
<button onClick={fr.go} style={{width: "100%", textAlign: "left", border: "1px solid var(--pm-rule)", background: "var(--pm-card)", borderRadius: "12px", padding: "13px", marginBottom: "8px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px"}}>
<div style={{display: "flex", gap: "11px", alignItems: "center"}}>
<span style={{flex: "none", width: "36px", height: "36px", borderRadius: "999px", background: "var(--pm-sel)", border: "1px solid var(--pm-selBd)", color: "var(--pm-ink)", font: "700 14px var(--font-display)", display: "flex", alignItems: "center", justifyContent: "center"}}>{fr.initial}</span>
<div>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>{fr.name}</div>
<div style={{font: "400 11.5px var(--font-body)", color: "var(--pm-muted)", marginTop: "2px"}}>{fr.sub}</div>
</div>
</div>
<span style={{font: "600 18px var(--font-body)", color: "var(--pm-muted)", flex: "none"}}>›</span>
</button>
</React.Fragment>
))}
<div style={{border: "1px solid var(--pm-selBd)", background: "var(--pm-sel)", borderRadius: "12px", padding: "13px", marginTop: "6px", font: "400 12.5px/1.6 var(--font-body)", color: "var(--pm-ink)"}}>Your taste isn't a setting you finish. Every rating moves it a little, and you can read exactly what we think we know about you, right here.</div>

<div style={{font: "600 var(--pm-sec) var(--font-body)", color: "var(--pm-muted)", letterSpacing: ".08em", textTransform: "uppercase", margin: "22px 0 9px"}}>Account</div>
<div style={{border: "1px solid var(--pm-warnBd)", background: "var(--pm-warnBg)", borderRadius: "12px", padding: "14px"}}>
<div style={{font: "600 13.5px var(--font-body)", color: "var(--pm-ink)"}}>{deleteDone ? "Account deleted" : "Delete account"}</div>
<div style={{font: "400 12px/1.55 var(--font-body)", color: "var(--pm-muted)", margin: "3px 0 11px"}}>{deleteAccountSub}</div>
{!deleteDone ? (
<div style={{display: "flex", gap: "8px"}}>
<button onClick={deleteAccount} style={{flex: "1", border: "1.5px solid var(--pm-warnBd)", background: "transparent", color: "var(--pm-warnInk)", borderRadius: "999px", padding: "12px", font: "600 13px var(--font-body)", cursor: "pointer", minHeight: "44px"}}>{deleteAccountLabel}</button>
{showCancelDelete ? (
<button onClick={cancelDelete} style={{flex: "none", border: "1px solid var(--pm-rule)", background: "var(--pm-card)", color: "var(--pm-ink)", borderRadius: "999px", padding: "12px 16px", font: "600 13px var(--font-body)", cursor: "pointer", minHeight: "44px"}}>Cancel</button>
) : null}
</div>
) : null}
</div>
</div>
</div>
</>
  );
}
