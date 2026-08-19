/**
 * THE MIC BUTTON MUST NOT RENDER WHEN THE BROWSER CANNOT HEAR.
 *
 * Firefox ships no SpeechRecognition, so before the shared-hook build every
 * one of the 13 mic buttons rendered there and did nothing at all. A dead
 * control is worse than an absent one.
 *
 * This file exists because every OTHER mic test installs a fake
 * SpeechRecognition on window to simulate Chrome or Safari. That makes the
 * supported path well covered and the UNSUPPORTED path covered nowhere: if
 * someone dropped the `micVisible` guard from a screen, no test would fail.
 * jsdom has no SpeechRecognition of its own, so asserting absence here needs
 * no fake at all, only the guarantee that nothing installed one.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

const MIC_PATH_SIGNATURE = 'M5 11a7 7 0 0 0 14 0';

function micCount(container) {
  return Array.from(container.querySelectorAll('svg'))
    .filter((svg) => svg.innerHTML.includes(MIC_PATH_SIGNATURE)).length;
}

beforeEach(() => {
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
});

describe('no Web Speech API means no microphone button', () => {
  const routes = [
    ['/setup/1', 'Q1Knowledge'],
    ['/setup/2', 'Q2Adventure'],
    ['/setup/3', 'Q3Budget'],
    ['/setup/4', 'Q4Taste'],
    ['/setup/5', 'Q5MustKnow'],
    ['/setup/6', 'Q6Summary'],
    ['/venue', 'WhereTo'],
    ['/menu', 'Menu'],
    ['/wines', 'TheWine'],
    ['/rate', 'RateIt'],
  ];

  it.each(routes)('%s (%s) renders no mic button', (path) => {
    const view = renderPairMeApp(path);
    expect(micCount(view.container)).toBe(0);
    view.unmount();
  });

  it('renders the mic again as soon as the API is present', () => {
    // Proves the assertions above are gated on feature detection and not on
    // the buttons having been deleted outright.
    class FakeRecognition {
      start() {}
      stop() { if (this.onend) this.onend(); }
      abort() {}
    }
    window.SpeechRecognition = FakeRecognition;
    const view = renderPairMeApp('/setup/1');
    expect(micCount(view.container)).toBeGreaterThan(0);
    view.unmount();
    delete window.SpeechRecognition;
  });
});
