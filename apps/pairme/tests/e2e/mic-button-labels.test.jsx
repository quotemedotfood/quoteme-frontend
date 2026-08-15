/**
 * Standing rule: every interactive icon button carries a visible label or
 * an aria-label - the glyph is never the sole carrier of meaning
 * (BUTTON_AUDIT.md). 13 microphone SVG buttons exist across the app; 2
 * already had an aria-label (EntryScreen's mic and WhereTo's "or find it"
 * fEatText mic), 11 did not. This asserts every mic button, on every
 * screen that has one, carries a non-empty aria-label.
 *
 * Renders each screen through the real app/router (renderPairMeApp), not
 * in isolation, so this proves the fix in the actual DOM a diner sees, not
 * just that some prop was passed to some component.
 */
import { describe, it, expect } from 'vitest';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

const MIC_PATH_SIGNATURE = 'M5 11a7 7 0 0 0 14 0';

function micButtons(container) {
  return Array.from(container.querySelectorAll('svg'))
    .filter((svg) => svg.innerHTML.includes(MIC_PATH_SIGNATURE))
    .map((svg) => svg.closest('button'));
}

function assertAllMicButtonsLabeled(container, routeLabel) {
  const buttons = micButtons(container);
  expect(buttons.length, `expected at least one mic button on ${routeLabel}`).toBeGreaterThan(0);
  buttons.forEach((button) => {
    expect(button, `mic svg on ${routeLabel} is not inside a <button>`).toBeTruthy();
    const label = button.getAttribute('aria-label');
    expect(Boolean(label && label.trim()), `mic button on ${routeLabel} has no aria-label`).toBe(true);
  });
}

describe('Every microphone icon button carries an aria-label, never the glyph alone', () => {
  const routes = [
    ['/rate', 'RateIt'],
    ['/setup/1', 'Q1Knowledge'],
    ['/setup/2', 'Q2Adventure'],
    ['/setup/3', 'Q3Budget'],
    ['/setup/4', 'Q4Taste'],
    ['/setup/5', 'Q5MustKnow'],
    ['/setup/6', 'Q6Summary'],
    ['/venue', 'WhereTo'],
    ['/menu', 'Menu'],
    ['/wines', 'TheWine'],
    // NOT /entry: EntryScreen's mic only renders when speech.supported is
    // true (Web Speech API), which jsdom never reports, so there is no mic
    // button to find there in this test environment - that screen's own
    // aria-label (already present, untouched by this build) is exercised
    // in tests/e2e/entry-screen*.test.jsx instead.
  ];

  routes.forEach(([path, label]) => {
    it(`${label} (${path}): every mic button on the page has an aria-label`, () => {
      const { container } = renderPairMeApp(path);
      assertAllMicButtonsLabeled(container, label);
    });
  });

  it('Q4Taste (/setup/4) has exactly two mic buttons, both labeled', () => {
    const { container } = renderPairMeApp('/setup/4');
    expect(micButtons(container).length).toBe(2);
    assertAllMicButtonsLabeled(container, 'Q4Taste');
  });

  it('WhereTo (/venue) has exactly two mic buttons, both labeled (one pre-existing, one newly fixed)', () => {
    const { container } = renderPairMeApp('/venue');
    const buttons = micButtons(container);
    expect(buttons.length).toBe(2);
    const labels = buttons.map((b) => b.getAttribute('aria-label')).sort();
    expect(labels).toEqual(['Speak instead of typing', 'Tell us what you are eating']);
  });
});
