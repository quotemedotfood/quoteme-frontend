import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** A minimal fake SpeechSynthesis good enough to exercise speak.js's two
 * branches: voices already loaded, and the empty-getVoices()-until-
 * voiceschanged case some Windows/Android builds hit on the first call of
 * a session. */
function makeFakeSynth({ voicesReady, voices: readyVoices }) {
  const listeners = {};
  const defaultReady = readyVoices || [{ name: 'fake-voice' }];
  let voices = voicesReady ? defaultReady : [];
  return {
    spoken: [],
    cancelCalls: 0,
    cancel() { this.cancelCalls += 1; },
    getVoices() { return voices; },
    speak(utterance) { this.spoken.push(utterance); },
    addEventListener(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },
    removeEventListener(evt, fn) {
      if (!listeners[evt]) return;
      listeners[evt] = listeners[evt].filter((f) => f !== fn);
    },
    // Test hook: simulate the browser populating voices then firing the event.
    _resolveVoices() {
      voices = defaultReady;
      (listeners.voiceschanged || []).forEach((fn) => fn());
    },
  };
}

// jsdom implements neither window.speechSynthesis nor the
// SpeechSynthesisUtterance constructor (Web Speech is not part of the DOM
// standard jsdom targets - see tests/e2e/wine-list-browse.test.jsx's own
// "never throws where speechSynthesis is unavailable (jsdom)" case). Stub
// both globally so speak.js's `new SpeechSynthesisUtterance(text)` has
// something to construct; the fake synth below is what actually records
// what got spoken.
class FakeUtterance {
  constructor(text) {
    this.text = text;
  }
}

describe('speak.js', () => {
  let originalSynth;
  let originalUtterance;

  beforeEach(() => {
    originalSynth = window.speechSynthesis;
    originalUtterance = window.SpeechSynthesisUtterance;
    window.SpeechSynthesisUtterance = FakeUtterance;
    global.SpeechSynthesisUtterance = FakeUtterance;
    vi.resetModules();
  });

  afterEach(() => {
    window.speechSynthesis = originalSynth;
    window.SpeechSynthesisUtterance = originalUtterance;
    global.SpeechSynthesisUtterance = originalUtterance;
    vi.useRealTimers();
  });

  it('sets utterance.lang to en-US by default (English respellings, not the source language)', async () => {
    const fake = makeFakeSynth({ voicesReady: true });
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    speak('Zhee moh nay. Blanc de Blancs.');

    expect(fake.spoken).toHaveLength(1);
    expect(fake.spoken[0].text).toBe('Zhee moh nay. Blanc de Blancs.');
    expect(fake.spoken[0].lang).toBe('en-US');
    // R2: rate raised from .82 to .9 - the old rate clipped the end of
    // unfamiliar words.
    expect(fake.spoken[0].rate).toBeCloseTo(0.9);
    expect(fake.spoken[0].pitch).toBe(1);
    expect(fake.cancelCalls).toBeGreaterThanOrEqual(1);
  });

  it('honours an explicit lang override', async () => {
    const fake = makeFakeSynth({ voicesReady: true });
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    speak('Bonjour', { lang: 'fr-FR' });

    expect(fake.spoken[0].lang).toBe('fr-FR');
  });

  it('does nothing for empty/undefined text (never speaks the literal word "undefined")', async () => {
    const fake = makeFakeSynth({ voicesReady: true });
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    speak(undefined);
    speak('');

    expect(fake.spoken).toHaveLength(0);
  });

  it('when getVoices() first returns [], waits for voiceschanged and still speaks (first-tap-of-session guard)', async () => {
    const fake = makeFakeSynth({ voicesReady: false });
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    speak('Vash rohn. Sahn sehr.');
    // Voices are not ready yet: nothing spoken synchronously.
    expect(fake.spoken).toHaveLength(0);

    fake._resolveVoices();

    expect(fake.spoken).toHaveLength(1);
    expect(fake.spoken[0].text).toBe('Vash rohn. Sahn sehr.');
    expect(fake.spoken[0].lang).toBe('en-US');
  });

  it('still speaks via the timed fallback if voiceschanged never fires', async () => {
    vi.useFakeTimers();
    const fake = makeFakeSynth({ voicesReady: false });
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    speak('Fwah yar. Mor gohn.');
    expect(fake.spoken).toHaveLength(0);

    vi.advanceTimersByTime(400);

    expect(fake.spoken).toHaveLength(1);
  });

  it('does not throw when window.speechSynthesis is absent', async () => {
    window.speechSynthesis = undefined;
    const { speak } = await import('./speak.js');
    expect(() => speak('anything')).not.toThrow();
  });
});

// R2, item a: voice selection. Remote (cloud) voices sound dramatically
// better but need network - offline pairing is this app's App Store
// argument (guideline 4.2.3) - so a remote voice is a PREFERENCE and a
// local voice (or the platform default) is always a working FALLBACK.
describe('speak.js voice selection (R2, item a)', () => {
  let originalSynthForVoiceTests;

  beforeEach(() => {
    originalSynthForVoiceTests = window.speechSynthesis;
    window.SpeechSynthesisUtterance = FakeUtterance;
    global.SpeechSynthesisUtterance = FakeUtterance;
    vi.resetModules();
  });

  afterEach(() => {
    window.speechSynthesis = originalSynthForVoiceTests;
    window.SpeechSynthesisUtterance = FakeUtterance;
    global.SpeechSynthesisUtterance = FakeUtterance;
    vi.useRealTimers();
  });

  it('selects a remote voice matching lang when one exists, over a local voice in a different lang', async () => {
    const localEnUS = { name: 'local-en', lang: 'en-US', localService: true };
    const remoteFrFR = { name: 'remote-fr', lang: 'fr-FR', localService: false };
    const fake = makeFakeSynth({ voicesReady: true, voices: [localEnUS, remoteFrFR] });
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    speak('Shah blee, premier cru.', { lang: 'fr-FR' });

    expect(fake.spoken).toHaveLength(1);
    expect(fake.spoken[0].voice).toBe(remoteFrFR);
    expect(fake.spoken[0].lang).toBe('fr-FR');
  });

  it('falls back to a local voice matching lang when no remote voice matches', async () => {
    const localFrFR = { name: 'local-fr', lang: 'fr-FR', localService: true };
    const localEnUS = { name: 'local-en', lang: 'en-US', localService: true };
    const fake = makeFakeSynth({ voicesReady: true, voices: [localFrFR, localEnUS] });
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    speak('Shah blee, premier cru.', { lang: 'fr-FR' });

    expect(fake.spoken[0].voice).toBe(localFrFR);
  });

  it('prefers a remote voice matching lang over a local voice that also matches lang', async () => {
    const localFrFR = { name: 'local-fr', lang: 'fr-FR', localService: true };
    const remoteFrFR = { name: 'remote-fr', lang: 'fr-FR', localService: false };
    // Order shouldn't matter - list the local one first.
    const fake = makeFakeSynth({ voicesReady: true, voices: [localFrFR, remoteFrFR] });
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    speak('Shah blee, premier cru.', { lang: 'fr-FR' });

    expect(fake.spoken[0].voice).toBe(remoteFrFR);
  });

  it('never throws and still speaks (with no voice set) when no voice matches lang at all', async () => {
    const localEnUS = { name: 'local-en', lang: 'en-US', localService: true };
    const fake = makeFakeSynth({ voicesReady: true, voices: [localEnUS] });
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    expect(() => speak('Zdravo', { lang: 'sr-RS' })).not.toThrow();
    expect(fake.spoken).toHaveLength(1);
    expect(fake.spoken[0].voice).toBeUndefined();
  });

  it('never throws when getVoices() itself throws (audio is never a hard requirement)', async () => {
    const fake = {
      spoken: [],
      cancel() {},
      getVoices() { throw new Error('boom'); },
      speak(utterance) { this.spoken.push(utterance); },
      addEventListener() {},
      removeEventListener() {},
    };
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    expect(() => speak('anything', { lang: 'fr-FR' })).not.toThrow();
  });

  it('utterance.lang is taken from the passed lang, independent of voice selection', async () => {
    const remoteItIT = { name: 'remote-it', lang: 'it-IT', localService: false };
    const fake = makeFakeSynth({ voicesReady: true, voices: [remoteItIT] });
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    speak('Bah-ROH-loh', { lang: 'it-IT' });

    expect(fake.spoken[0].lang).toBe('it-IT');
    expect(fake.spoken[0].voice).toBe(remoteItIT);
  });

  it('rate defaults to 0.9 regardless of voice selection', async () => {
    const fake = makeFakeSynth({ voicesReady: true, voices: [{ name: 'v', lang: 'en-US', localService: true }] });
    window.speechSynthesis = fake;
    const { speak } = await import('./speak.js');

    speak('anything');

    expect(fake.spoken[0].rate).toBeCloseTo(0.9);
  });
});

describe('shared speak() helper is actually used (no leftover local duplicates)', () => {
  const screensDir = path.join(__dirname, '..', 'screens');
  const files = ['WineList.jsx', 'TellUsScreen.jsx', 'EntryScreen.jsx'];

  it.each(files)('%s has no local `new SpeechSynthesisUtterance(...)`', (file) => {
    const src = fs.readFileSync(path.join(screensDir, file), 'utf8');
    expect(src).not.toMatch(/new SpeechSynthesisUtterance/);
    expect(src).toMatch(/from ['"]\.\.\/lib\/speak\.js['"]/);
  });

  it('state.js has no local `new SpeechSynthesisUtterance(...)` outside its doc comment', () => {
    const src = fs.readFileSync(path.join(__dirname, 'state.js'), 'utf8');
    const codeLines = src
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'));
    expect(codeLines.join('\n')).not.toMatch(/new SpeechSynthesisUtterance/);
    expect(src).toMatch(/from ['"]\.\/speak\.js['"]/);
  });
});
