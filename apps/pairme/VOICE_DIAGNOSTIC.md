# Voice diagnostic snippet

Nobody in this environment can run real Chrome (headless Chromium has no
`webkitSpeechRecognition` at all), so the actual event sequence, with real
timings and a real error code, has never been captured. This snippet does
that on a real device.

Open a real desktop Chrome tab on `https://demo.pairme.wine`, open DevTools
console, paste the whole block below and press Enter. It starts listening
immediately on its OWN recognizer, so just SPEAK. Do not tap a field mic
while it runs: that would start a second recognizer competing with this one
and the trace would show you the conflict rather than the bug.

Say a few words, then stop talking and wait. Chrome ends the utterance by
itself after a pause, which is the moment `onend` fires and the summary
table prints. To cut it short instead, type `__pmVoiceProbe.stop()`.

Every event is logged with a timestamp relative to when you pasted it.

WHAT TO SEND BACK: the whole console output, including the table. The two
things we most need are the `onerror` code, if one fires, and whether
`onaudiostart` ever arrives. If `onstart` fires but `onaudiostart` never
does, the browser never got the microphone. If neither fires, the recognizer
never started at all.

RUN IT TWICE: once accepting the microphone permission prompt, and once
denying it. The denial path is the one that currently fails silently in the
app, so its error code is the single most useful line of output.

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
