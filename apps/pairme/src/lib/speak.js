// ---------------------------------------------------------------------------
// Shared text-to-speech helper.
//
// Before this file existed, the same
//   const u = new SpeechSynthesisUtterance(text); u.rate = .82; u.pitch = 1;
//   sp.speak(u);
// dance was hand-rolled in four places (state.js's `say()`, plus a local
// copy each in WineList.jsx, TellUsScreen.jsx and EntryScreen.jsx). This is
// the one copy; every speaker button in the app (TheWine, BottleBrief,
// Present via state.js's `say`/per-wine `speak()` closures, and WineList /
// TellUsScreen / EntryScreen directly) calls this.
//
// LANGUAGE (why `lang` still defaults to 'en-US'): our hand-authored
// phonetics (state.js's W table, demoSeed.js's PRONOUNCE map) are ENGLISH
// RESPELLINGS - e.g. "Zhee moh nay" for Gimonnet, not the real French
// pronunciation and not IPA. R1 pinned u.lang='en-US' on every utterance
// because reading a respelling through a French/Italian/etc default voice
// mangles the vowels and rolls Rs that were never meant to roll. R2 (this
// revision) keeps that reasoning but drops the blanket 'en-US': demoSeed.js
// and state.js now carry a `lang` tag PER WINE (its actual origin -
// 'fr-FR' for a Chablis, 'en-US' for a Napa cabernet, etc) and pass it in
// as `opts.lang`; a respelling like "Zhee moh nay" is still written to be
// read BY that language's own voice (fr-FR reads French vowels/Rs the way
// the respelling assumes), it just is not forced to en-US for wines whose
// own phonetic was authored for a different one. Callers with no phonetic
// at all (real/parsed wines, no hand-authored entry) still get the
// 'en-US' default below - mapping every possible wine region to a
// language is a deliberate non-goal here, same R1-stopgap spirit as
// before, just narrower now that the hand-authored set carries its own tag.
//
// VOICE SELECTION (R2, item a): speechSynthesis.getVoices() typically
// returns a mix of REMOTE/cloud voices (voice.localService === false) and
// LOCAL/on-device voices. Remote voices sound dramatically better, but
// need network to render - and offline pairing is this app's whole App
// Store argument (guideline 4.2.3), so a remote voice can only ever be a
// PREFERENCE, never a requirement. pickVoice() below: (1) prefers a REMOTE
// voice whose lang matches the utterance's lang, (2) falls back to ANY
// voice (remote or local) matching that lang, (3) falls back to no voice
// at all (the engine's own default) if nothing matches. Speech itself
// never blocks or throws on step 3 - a diner with no matching voice
// installed still hears the platform default voice read the text; audio
// is always a nice-to-have; this is a preference layered on the language
// tag above, never a gate on whether something gets spoken.
//
// VOICE-LIST GUARD: on some Windows/Android builds,
// speechSynthesis.getVoices() returns [] on the very first call in a page
// session and only populates once the browser fires the async
// 'voiceschanged' event. Calling speak() while the voice list is still
// empty causes some engines to silently drop the utterance - the FIRST tap
// of a session does nothing, and every tap after works fine (because by
// then voices have loaded). speak() below checks getVoices() and, if
// empty, waits for the one 'voiceschanged' event (with a timed fallback in
// case that event never fires) before actually speaking, so the first tap
// is never silently swallowed. Priming getVoices() once at module load
// (below) gives the browser an early nudge to start loading its voice
// list, so by the time a diner actually taps a speaker it usually already
// has one.

let primed = false;

function getSynth() {
  return typeof window !== 'undefined' ? window.speechSynthesis : null;
}

function primeVoices() {
  if (primed) return;
  primed = true;
  const sp = getSynth();
  if (!sp) return;
  try { sp.getVoices(); } catch (e) { /* just a warm-up call, ignore */ }
}

// Fire once at import time (see VOICE-LIST GUARD above).
primeVoices();

/**
 * Pick the best available voice for `lang` (see VOICE SELECTION above).
 * PREFER a remote/cloud voice matching `lang`, then ANY voice matching
 * `lang`, then null (caller leaves `u.voice` unset and the engine falls
 * back to its own platform default). Never throws - a getVoices() that
 * misbehaves just means no voice preference gets applied, not a crash.
 * @param {SpeechSynthesis} sp
 * @param {string} lang
 * @returns {SpeechSynthesisVoice|null}
 */
function pickVoice(sp, lang) {
  try {
    if (!lang || !sp.getVoices) return null;
    const voices = sp.getVoices();
    if (!voices || !voices.length) return null;
    const wanted = String(lang).toLowerCase();
    const wantedBase = wanted.split('-')[0];
    const matches = voices.filter((v) => {
      if (!v || !v.lang) return false;
      const vLang = String(v.lang).toLowerCase();
      return vLang === wanted || vLang.split('-')[0] === wantedBase;
    });
    if (!matches.length) return null;
    // Remote (cloud) voices are the PREFERENCE - they sound dramatically
    // better - but they need network, so a local voice is the FALLBACK,
    // never a hard requirement (offline pairing must still work).
    const remote = matches.find((v) => v.localService === false);
    return remote || matches[0];
  } catch (e) {
    return null;
  }
}

/**
 * Speak `text` aloud. Every call site is responsible for its own
 * hand-authored-phonetic -> raw-label fallback (e.g. `w.speak || w.say ||
 * w.label`); this function just speaks whatever string it is given.
 * @param {string} text
 * @param {{lang?: string, rate?: number, pitch?: number}} [opts]
 */
export function speak(text, opts = {}) {
  if (!text) return;
  const sp = getSynth();
  if (!sp) return;
  try {
    sp.cancel();
    const fire = () => {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = opts.rate != null ? opts.rate : 0.9;
        u.pitch = opts.pitch != null ? opts.pitch : 1;
        u.lang = opts.lang || 'en-US';
        const voice = pickVoice(sp, u.lang);
        if (voice) u.voice = voice;
        sp.speak(u);
      } catch (e) { /* nice-to-have, never a hard requirement */ }
    };
    const voices = sp.getVoices ? sp.getVoices() : null;
    if (voices && voices.length > 0) {
      fire();
      return;
    }
    // Empty voice list: wait for the one 'voiceschanged' event, with a
    // short timed fallback in case this engine never fires it (some don't,
    // even once voices are actually ready).
    let fired = false;
    const onVoicesChanged = () => {
      if (fired) return;
      fired = true;
      if (sp.removeEventListener) sp.removeEventListener('voiceschanged', onVoicesChanged);
      fire();
    };
    if (sp.addEventListener) sp.addEventListener('voiceschanged', onVoicesChanged);
    setTimeout(() => { if (!fired) onVoicesChanged(); }, 300);
  } catch (e) {
    // Speech synthesis is a nice-to-have, never a hard requirement.
  }
}

export default speak;
