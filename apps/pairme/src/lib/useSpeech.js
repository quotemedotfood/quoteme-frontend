import React from 'react';

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
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0] && r[0].transcript)
        .filter(Boolean)
        .join(' ')
        .trim();
      if (transcript && cbRef.current.onResult) cbRef.current.onResult(transcript);
    };
    rec.onerror = (e) => {
      if (cbRef.current.onError) cbRef.current.onError(e && e.error ? e.error : 'speech_error');
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
    }
  }, [supported, Rec, lang]);

  React.useEffect(() => stop, [stop]);

  return { supported, listening, start, stop };
}
