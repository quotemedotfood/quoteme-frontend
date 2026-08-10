/**
 * useSpeech is the capture behind every mic (entry + field mics). jsdom has no
 * SpeechRecognition, so we inject a fake to prove the hook actually delivers a
 * transcript to onResult and reports supported correctly.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useSpeech } from '../src/lib/useSpeech.js';

let lastRec = null;
class FakeRecognition {
  constructor() { lastRec = this; this.lang = ''; this.onresult = null; this.onerror = null; this.onend = null; }
  start() { this.started = true; }
  stop() { if (this.onend) this.onend(); }
}

function Probe() {
  const s = useSpeech({ onResult: (t) => { document.title = t; } });
  return <button onClick={s.start}>{s.supported ? 'go' : 'nope'}</button>;
}

afterEach(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; lastRec = null; });

describe('useSpeech', () => {
  it('reports unsupported when the browser has no SpeechRecognition', () => {
    render(<Probe />);
    expect(screen.getByRole('button')).toHaveTextContent('nope');
  });

  it('captures a transcript and hands it to onResult', async () => {
    window.SpeechRecognition = FakeRecognition;
    render(<Probe />);
    expect(screen.getByRole('button')).toHaveTextContent('go');
    await act(async () => { screen.getByRole('button').click(); });
    expect(lastRec).not.toBeNull();
    await act(async () => {
      lastRec.onresult({ results: [[{ transcript: 'moules and the steak frites' }]] });
    });
    expect(document.title).toBe('moules and the steak frites');
  });
});
