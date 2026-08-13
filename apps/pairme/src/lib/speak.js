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
// LANGUAGE (why `lang` defaults to 'en-US'): our hand-authored phonetics
// (state.js's W table, demoSeed.js's PRONOUNCE map) are ENGLISH
// RESPELLINGS - e.g. "Zhee moh nay" for Gimonnet, not the real French
// pronunciation and not IPA. They are written on the assumption an ENGLISH
// voice reads them. Some devices pick speechSynthesis's default voice from
// page/OS locale, and if that default voice is French/Italian/etc, reading
// an English respelling through it mangles the vowels and rolls Rs that
// were never meant to roll - that is the exact failure this guards
// against. Setting `u.lang = 'en-US'` explicitly on every utterance pins
// English pronunciation rules regardless of device default. A future
// "native-language TTS" route (reading the real French/Italian
// pronunciation with a matching voice) is a deliberate non-goal here - this
// is the R1 stopgap.
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
        u.rate = opts.rate != null ? opts.rate : 0.82;
        u.pitch = opts.pitch != null ? opts.pitch : 1;
        u.lang = opts.lang || 'en-US';
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
