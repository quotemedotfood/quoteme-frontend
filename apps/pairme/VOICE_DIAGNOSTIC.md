# Voice diagnostic snippet

Nobody in this environment can run real Chrome (headless Chromium has no
`webkitSpeechRecognition` at all), so the actual event sequence, with real
timings and a real error code, has never been captured. This snippet does
that on a real device.

Open a real desktop Chrome tab on `https://demo.pairme.wine`, open DevTools
console, paste the whole block below, press Enter, then tap any field mic
(or type `__pmVoiceProbe.stop()` to end it early). It logs every lifecycle
event with a timestamp relative to when you pasted it, and prints a summary
table on `onend`.

```js
(() => {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) { console.log('[voice-probe] no SpeechRecognition on this browser'); return; }
  const t0 = performance.now();
  const log = [];
  const mark = (event, detail) => {
    const row = { t: +(performance.now() - t0).toFixed(1), event, detail: detail || '' };
    log.push(row);
    console.log(`[voice-probe] t=${row.t}ms ${event}`, detail || '');
  };
  const rec = new Rec();
  rec.lang = 'en-US';
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.onstart = () => mark('onstart');
  rec.onaudiostart = () => mark('onaudiostart');
  rec.onspeechstart = () => mark('onspeechstart');
  rec.onresult = (e) => {
    const last = e.results[e.results.length - 1];
    mark('onresult', { isFinal: last && last.isFinal, transcript: last && last[0] && last[0].transcript });
  };
  rec.onnomatch = () => mark('onnomatch');
  rec.onerror = (e) => mark('onerror', { code: e.error, message: e.message });
  rec.onend = () => { mark('onend'); console.table(log); };
  window.__pmVoiceProbe = rec;
  mark('probe armed, starting now');
  rec.start();
})();
```
