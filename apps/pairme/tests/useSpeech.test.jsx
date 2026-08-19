/**
 * useSpeech is the ONE shared hook behind every mic button in the app (13
 * sites, see BUTTON_AUDIT.md). jsdom has no SpeechRecognition, so every test
 * here injects a fake on window to drive the real event lifecycle
 * (onstart/onresult/onerror/onend) and asserts on the hook's own contract:
 * supported / state / message / start / stop.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useSpeech, isSpeechSupported } from '../src/lib/useSpeech.js';

let instances = [];
class FakeRecognition {
  constructor() {
    instances.push(this);
    this.lang = '';
    this.continuous = undefined;
    this.interimResults = undefined;
    this.maxAlternatives = undefined;
    this.onstart = null;
    this.onaudiostart = null;
    this.onspeechstart = null;
    this.onresult = null;
    this.onnomatch = null;
    this.onerror = null;
    this.onend = null;
    this.started = false;
    this.stopped = false;
    this.aborted = false;
  }
  start() { this.started = true; }
  stop() { this.stopped = true; if (this.onend) this.onend(); }
  // Real Chrome fires onend asynchronously after abort(); the fake does NOT
  // call onend itself, which is exactly what exercises teardown() clearing
  // handlers BEFORE calling abort (D3's fix) rather than depending on it.
  abort() { this.aborted = true; }
}

// A single instance is enough for the original two tests (kept exactly as
// they were: unsupported reporting, and a transcript reaching onResult).
let lastRec = null;
class SingleFakeRecognition extends FakeRecognition {
  constructor() { super(); lastRec = this; }
}

function Probe() {
  const s = useSpeech({ onResult: (t) => { document.title = t; } });
  return <button onClick={s.start}>{s.supported ? 'go' : 'nope'}</button>;
}

/** Full probe exposing the hook's whole contract for the new coverage. */
function ProbeFull({ onResult, lang }) {
  const s = useSpeech({ onResult, lang });
  return (
    <div>
      <button onClick={s.start} aria-label="start">start</button>
      <button onClick={s.stop} aria-label="stop">stop</button>
      <div data-testid="state">{s.state}</div>
      <div data-testid="message">{s.message || ''}</div>
      <div data-testid="supported">{String(s.supported)}</div>
    </div>
  );
}

afterEach(() => {
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  lastRec = null;
  instances = [];
});

describe('useSpeech', () => {
  it('reports unsupported when the browser has no SpeechRecognition', () => {
    render(<Probe />);
    expect(screen.getByRole('button')).toHaveTextContent('nope');
  });

  it('captures a transcript and hands it to onResult', async () => {
    window.SpeechRecognition = SingleFakeRecognition;
    render(<Probe />);
    expect(screen.getByRole('button')).toHaveTextContent('go');
    await act(async () => { screen.getByRole('button').click(); });
    expect(lastRec).not.toBeNull();
    await act(async () => {
      lastRec.onresult({ results: [[{ transcript: 'moules and the steak frites' }]] });
    });
    expect(document.title).toBe('moules and the steak frites');
  });

  describe('isSpeechSupported (D4 - feature detection shared with state.js field())', () => {
    it('is false with neither SpeechRecognition nor webkitSpeechRecognition', () => {
      expect(isSpeechSupported()).toBe(false);
    });
    it('is true with the unprefixed name', () => {
      window.SpeechRecognition = FakeRecognition;
      expect(isSpeechSupported()).toBe(true);
    });
    it('is true with only the webkit-prefixed name (iOS Safari)', () => {
      window.webkitSpeechRecognition = FakeRecognition;
      expect(isSpeechSupported()).toBe(true);
    });
  });

  describe('R1 - continuous/interimResults set explicitly on every instance', () => {
    it('sets continuous: false and interimResults: true (not left as defaults)', async () => {
      window.SpeechRecognition = FakeRecognition;
      render(<ProbeFull onResult={() => {}} />);
      await act(async () => { screen.getByRole('button', { name: 'start' }).click(); });
      expect(instances).toHaveLength(1);
      expect(instances[0].continuous).toBe(false);
      expect(instances[0].interimResults).toBe(true);
      expect(instances[0].maxAlternatives).toBe(1);
    });
  });

  describe('R2 - a fresh recognizer instance per press', () => {
    it('builds a brand new instance after a natural onend, never reusing the old one', async () => {
      window.SpeechRecognition = FakeRecognition;
      render(<ProbeFull onResult={() => {}} />);
      const startBtn = screen.getByRole('button', { name: 'start' });
      await act(async () => { startBtn.click(); });
      const first = instances[0];
      await act(async () => { first.onend(); });
      await act(async () => { startBtn.click(); });
      expect(instances).toHaveLength(2);
      expect(instances[1]).not.toBe(first);
    });

    it('D3: switching straight to a second press mid-listen tears the first instance down and starts a fresh one (pre-fix this silently no-op\'d)', async () => {
      window.SpeechRecognition = FakeRecognition;
      render(<ProbeFull onResult={() => {}} />);
      const startBtn = screen.getByRole('button', { name: 'start' });
      // Field A's mic pressed.
      await act(async () => { startBtn.click(); });
      const first = instances[0];
      expect(first.aborted).toBe(false);
      expect(screen.getByTestId('state').textContent).toBe('listening');
      // Field B's mic pressed before field A's ever ended.
      await act(async () => { startBtn.click(); });
      expect(instances).toHaveLength(2);
      expect(instances[1]).not.toBe(first);
      // The old instance was torn down: aborted, and its handlers cleared
      // first so its own abort() can never smuggle a stray event into the
      // new instance's state.
      expect(first.aborted).toBe(true);
      expect(first.onend).toBeNull();
      expect(first.onerror).toBeNull();
      expect(first.onresult).toBeNull();
      // The new (second) instance is the one now live.
      expect(screen.getByTestId('state').textContent).toBe('listening');
    });
  });

  describe('R3 - four visible states transition correctly', () => {
    it('idle -> listening -> heard -> idle (after a final result ends the utterance)', async () => {
      window.SpeechRecognition = FakeRecognition;
      const onResult = vi.fn();
      render(<ProbeFull onResult={onResult} />);
      expect(screen.getByTestId('state').textContent).toBe('idle');
      await act(async () => { screen.getByRole('button', { name: 'start' }).click(); });
      expect(screen.getByTestId('state').textContent).toBe('listening');
      const rec = instances[0];
      // Interim result: heard something, but not final yet.
      await act(async () => {
        rec.onresult({ resultIndex: 0, results: [{ 0: { transcript: 'roast chick' }, isFinal: false }] });
      });
      expect(screen.getByTestId('state').textContent).toBe('heard');
      expect(onResult).toHaveBeenCalledWith('roast chick', false);
      // Final result, then the recognizer's own onend (continuous:false ends
      // automatically after a final result in the real API).
      await act(async () => {
        rec.onresult({ resultIndex: 0, results: [{ 0: { transcript: 'roast chicken' }, isFinal: true } ] });
      });
      expect(onResult).toHaveBeenCalledWith('roast chicken', true);
      await act(async () => { rec.onend(); });
      expect(screen.getByTestId('state').textContent).toBe('idle');
    });

    it('listening -> error, and stays in error through onend (does not get clobbered back to idle)', async () => {
      window.SpeechRecognition = FakeRecognition;
      render(<ProbeFull onResult={() => {}} />);
      await act(async () => { screen.getByRole('button', { name: 'start' }).click(); });
      const rec = instances[0];
      await act(async () => { rec.onerror({ error: 'no-speech' }); });
      expect(screen.getByTestId('state').textContent).toBe('error');
      await act(async () => { rec.onend(); });
      expect(screen.getByTestId('state').textContent).toBe('error');
    });

    it('stop() while listening returns to idle and discards the instance', async () => {
      window.SpeechRecognition = FakeRecognition;
      render(<ProbeFull onResult={() => {}} />);
      await act(async () => { screen.getByRole('button', { name: 'start' }).click(); });
      expect(screen.getByTestId('state').textContent).toBe('listening');
      await act(async () => { screen.getByRole('button', { name: 'stop' }).click(); });
      expect(screen.getByTestId('state').textContent).toBe('idle');
    });
  });

  describe('R6 - every error code maps to one plain-language sentence, never the raw code', () => {
    const CASES = [
      ['not-allowed', 'Turn on microphone access to use voice, or just type it instead.'],
      ['service-not-allowed', 'Turn on microphone access to use voice, or just type it instead.'],
      ['no-speech', 'We did not hear anything, try again or type it instead.'],
      ['network', 'Voice needs a network connection, try again or type it instead.'],
      ['audio-capture', 'We could not find a microphone, type it instead.'],
      ['aborted', 'Voice was interrupted, try again or type it instead.'],
      ['some-unrecognized-code', 'We could not hear that, try again or type it instead.'],
    ];

    it.each(CASES)('code %s -> %s', async (code, expected) => {
      window.SpeechRecognition = FakeRecognition;
      render(<ProbeFull onResult={() => {}} />);
      await act(async () => { screen.getByRole('button', { name: 'start' }).click(); });
      const rec = instances[0];
      await act(async () => { rec.onerror({ error: code }); });
      expect(screen.getByTestId('state').textContent).toBe('error');
      expect(screen.getByTestId('message').textContent).toBe(expected);
      // The raw hyphenated code itself (as opposed to an ordinary English
      // word the message may legitimately contain, e.g. "network") must
      // never reach the screen.
      if (code.includes('-')) {
        expect(screen.getByTestId('message').textContent).not.toContain(code);
      }
    });
  });
});
