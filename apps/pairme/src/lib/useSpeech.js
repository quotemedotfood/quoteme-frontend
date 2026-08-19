import React from 'react';

/**
 * Voice input over the Web Speech API. This is the ONE shared hook behind
 * every mic button in the app (BUTTON_AUDIT.md lists the sites); a fix here
 * is inherited everywhere instead of needing a per-screen patch.
 *
 * iOS Safari exposes this as `webkitSpeechRecognition` (not the unprefixed
 * name), which is exactly the device we care about, so both are checked.
 * When neither exists the hook reports `supported: false` and does nothing;
 * callers feature-detect and hide the mic button entirely rather than
 * rendering a dead one, so voice is strictly additive and never blocks
 * entry (a screen's text input is always the fallback).
 *
 * Networking: recognition ships audio to the browser vendor's own servers to
 * transcribe it (Apple for Safari, Google for Chrome), so a live network
 * connection is required. That is unrelated to PairMe's offline table
 * pairing, which never leaves the device; only voice CAPTURE needs the
 * network, and losing it surfaces as the plain-language `network` message
 * below rather than a silent failure.
 *
 * Four visible states are exposed so a mic that heard nothing still tells
 * the diner something, rather than looking identical to one that is broken:
 *   idle      - not listening, no error.
 *   listening - the recognizer is live, waiting for speech.
 *   heard     - at least one result (interim or final) has come back.
 *   error     - recognition ended in an error; `message` is one plain
 *               language sentence, never a raw API code like `no-speech`.
 *
 * `start()` always builds a fresh recognizer instance. A recognizer is never
 * reused after it ends, and calling `start()` while one is still live (a
 * second field's mic pressed before the first one finished) tears the old
 * one down first rather than no-op'ing, so switching fields mid-listen
 * always works.
 *
 * @param {{onResult?: (transcript: string, isFinal: boolean) => void, lang?: string}} [opts]
 * @returns {{
 *   supported: boolean,
 *   state: 'idle'|'listening'|'heard'|'error',
 *   listening: boolean,
 *   message: string|null,
 *   start: () => void,
 *   stop: () => void,
 * }}
 */

// One short, plain-language sentence per error code (never the raw code
// itself). Covers every code the spec defines; anything unlisted falls back
// to DEFAULT_ERROR_MESSAGE below.
const ERROR_MESSAGES = {
  'not-allowed': 'Turn on microphone access to use voice, or just type it instead.',
  'service-not-allowed': 'Turn on microphone access to use voice, or just type it instead.',
  'no-speech': 'We did not hear anything, try again or type it instead.',
  network: 'Voice needs a network connection, try again or type it instead.',
  'audio-capture': 'We could not find a microphone, type it instead.',
  aborted: 'Voice was interrupted, try again or type it instead.',
};
const DEFAULT_ERROR_MESSAGE = 'We could not hear that, try again or type it instead.';

function messageForError(code) {
  return ERROR_MESSAGES[code] || DEFAULT_ERROR_MESSAGE;
}

/** Same feature-detection the hook itself uses; exported so a caller (the
 * `field()` factory in state.js) can decide whether to render a mic button
 * at all without needing its own SpeechRecognition instance. */
export function isSpeechSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function useSpeech({ onResult, lang = 'en-US' } = {}) {
  const Rec =
    typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const supported = !!Rec;
  const [state, setState] = React.useState('idle');
  const [message, setMessage] = React.useState(null);
  const recRef = React.useRef(null);
  // Keep the latest callback without re-creating start/stop (the recognizer
  // fires asynchronously; a stale closure would drop the transcript).
  const cbRef = React.useRef({ onResult });
  cbRef.current = { onResult };

  // Strip every handler off an instance before discarding it, so a teardown
  // can never fire a stale onresult/onerror/onend into state that belongs to
  // whatever instance replaced it. Without this, our OWN cleanup abort()
  // would itself raise an `aborted` error through the old handlers.
  const teardown = React.useCallback((rec) => {
    if (!rec) return;
    rec.onstart = null;
    rec.onaudiostart = null;
    rec.onspeechstart = null;
    rec.onresult = null;
    rec.onnomatch = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.abort();
    } catch {
      /* already stopped */
    }
  }, []);

  const stop = React.useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    setState('idle');
  }, []);

  const start = React.useCallback(() => {
    if (!supported) return;
    // A fresh instance every press (never reuse one after onend). Switching
    // straight from one field's mic to another's lands here with
    // recRef.current still set to the first field's instance; tear it down
    // instead of no-op'ing, or the second field's mic would silently do
    // nothing (this was D3).
    if (recRef.current) teardown(recRef.current);

    let rec;
    try {
      rec = new Rec();
    } catch {
      setState('error');
      setMessage(DEFAULT_ERROR_MESSAGE);
      return;
    }
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const startIdx = typeof e.resultIndex === 'number' ? e.resultIndex : 0;
      let transcript = '';
      let isFinal = false;
      for (let i = startIdx; i < e.results.length; i++) {
        const result = e.results[i];
        const alt = result && result[0];
        if (!alt || !alt.transcript) continue;
        transcript = transcript ? `${transcript} ${alt.transcript}` : alt.transcript;
        if (result.isFinal) isFinal = true;
      }
      transcript = transcript.trim();
      if (!transcript) return;
      setState('heard');
      if (cbRef.current.onResult) cbRef.current.onResult(transcript, isFinal);
    };
    rec.onerror = (e) => {
      setMessage(messageForError(e && e.error));
      setState('error');
    };
    rec.onend = () => {
      recRef.current = null;
      setState((s) => (s === 'error' ? s : 'idle'));
    };
    recRef.current = rec;
    setMessage(null);
    setState('listening');
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setState('error');
      setMessage(DEFAULT_ERROR_MESSAGE);
    }
  }, [supported, Rec, lang, teardown]);

  React.useEffect(() => () => teardown(recRef.current), [teardown]);

  return {
    supported,
    state,
    listening: state === 'listening' || state === 'heard',
    message,
    start,
    stop,
  };
}
