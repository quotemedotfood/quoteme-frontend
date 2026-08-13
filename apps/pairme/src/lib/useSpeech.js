import React from 'react';

/* ============================================================================
 * TEMPORARY DIAGNOSTIC INSTRUMENTATION - PM-MIC
 * ----------------------------------------------------------------------------
 * Added to trace the SpeechRecognition lifecycle for Moose's 12-Aug mic
 * report (mic press does nothing / silently fails on desktop with mic
 * permission already granted). Every lifecycle event logs under the
 * `[PM-MIC]` prefix with a high-resolution timestamp (performance.now(), a
 * single monotonic clock shared with any other `[PM-MIC]` log lines added
 * elsewhere, e.g. App.jsx) so the sequence and any gaps are visible in the
 * console. INSTRUMENTATION ONLY - no behavior is changed by this block.
 * REMOVE this block and every `pmMicLog(`/`pmMicNow(` call site in the same
 * PR that lands the actual mic fix.
 * ========================================================================== */
function pmMicNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}
function pmMicLog(event, detail) {
  try {
    if (typeof console === 'undefined' || typeof console.log !== 'function') return;
    const t = pmMicNow().toFixed(1);
    if (detail !== undefined) console.log(`[PM-MIC] t=${t}ms ${event}`, detail);
    else console.log(`[PM-MIC] t=${t}ms ${event}`);
  } catch {
    /* diagnostic logging must never throw */
  }
}
/* ===================================== end PM-MIC instrumentation header == */

/**
 * Voice input over the Web Speech API (item 3). A diner holding a phone at a
 * table should be able to say what they are having rather than type a
 * restaurant's dishes one thumb at a time.
 *
 * iOS Safari exposes this as `webkitSpeechRecognition` (not the unprefixed
 * name), which is exactly the device we care about, so both are checked.
 * When neither exists the hook reports `supported: false` and does nothing;
 * callers keep their text input as the fallback, so voice is strictly
 * additive and never blocks entry.
 *
 * @param {{onResult?: (transcript: string) => void, onError?: (err: string) => void, lang?: string}} [opts]
 * @returns {{supported: boolean, listening: boolean, start: () => void, stop: () => void}}
 */
export function useSpeech({ onResult, onError, lang = 'en-US' } = {}) {
  const Rec =
    typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const supported = !!Rec;
  const [listening, setListening] = React.useState(false);
  const recRef = React.useRef(null);
  // Keep the latest callbacks without re-creating start/stop (the recognizer
  // fires asynchronously; a stale closure would drop the transcript).
  const cbRef = React.useRef({ onResult, onError });
  cbRef.current = { onResult, onError };

  const stop = React.useCallback(() => {
    // PM-MIC (temporary): stop() call site + whether an instance existed.
    pmMicLog('stop() called', { hadExistingInstance: !!recRef.current });
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    setListening(false);
  }, []);

  const start = React.useCallback(() => {
    // PM-MIC (temporary): start() call site. `hadExistingInstance: true`
    // means recRef.current was already non-null, so the guard below returns
    // early and this press is a silent no-op (a stuck/dead instance whose
    // onend never fired would present exactly this way, with no error).
    pmMicLog('start() called', { supported, hadExistingInstance: !!recRef.current });
    if (!supported || recRef.current) return;
    let rec;
    try {
      rec = new Rec();
    } catch {
      return;
    }
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      pmMicLog('onstart');
    };
    rec.onaudiostart = () => {
      pmMicLog('onaudiostart');
    };
    rec.onspeechstart = () => {
      pmMicLog('onspeechstart');
    };
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0] && r[0].transcript)
        .filter(Boolean)
        .join(' ')
        .trim();
      pmMicLog('onresult', {
        hadTranscript: !!transcript,
        length: transcript.length,
        firstWord: transcript ? transcript.split(' ')[0] : null,
      });
      if (transcript && cbRef.current.onResult) cbRef.current.onResult(transcript);
    };
    rec.onnomatch = () => {
      pmMicLog('onnomatch');
    };
    rec.onerror = (e) => {
      pmMicLog('onerror', { code: e && e.error });
      if (cbRef.current.onError) cbRef.current.onError(e && e.error ? e.error : 'speech_error');
    };
    rec.onend = () => {
      pmMicLog('onend');
      recRef.current = null;
      setListening(false);
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch (err) {
      pmMicLog('start() threw', { message: err && err.message });
      recRef.current = null;
      setListening(false);
    }
  }, [supported, Rec, lang]);

  React.useEffect(() => stop, [stop]);

  return { supported, listening, start, stop };
}
