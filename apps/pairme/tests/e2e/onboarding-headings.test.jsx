/**
 * ONBOARDING HEADINGS, one assertion per step.
 *
 * Regression cover for the state.js off-by-one where the `ob` title table was
 * subscripted by the screen index `s` while its entries were laid out by
 * `step` (= s - 1). Every onboarding screen rendered the NEXT screen's
 * heading, and Q6Summary (s=7) ran off the end of the array and rendered no
 * heading and no subtitle at all.
 *
 * The bug shipped and was visible on the live demo. q1-knowledge-layout.test
 * exercises this exact screen and did not catch it, because it asserts layout
 * and option text and never the heading. So the rule this file encodes is:
 * every onboarding step asserts its own heading string, and the promise
 * callout is checked against the one question it is actually true of.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

/**
 * The contract, in one place. path is the deep link, step is what the
 * "Question N of 6" counter must read, title/sub are the header strings.
 */
const STEPS = [
  {
    step: 1, path: '/setup/1', screen: 'Q1Knowledge',
    title: 'How well do you know wine?',
    // Deliberately no subtitle: the promise callout in the screen body makes
    // the same claim, and two sentences per page means the promise is the two.
    sub: '',
  },
  {
    step: 2, path: '/setup/2', screen: 'Q2Adventure',
    title: 'How adventurous are you feeling?',
    sub: 'You can change this at any table, any night.',
  },
  {
    step: 3, path: '/setup/3', screen: 'Q3Budget',
    title: "What's comfortable tonight?",
    sub: "A floor and a ceiling. We never show you what you didn't ask to see.",
  },
  {
    step: 4, path: '/setup/4', screen: 'Q4Taste',
    title: 'What do you already love?',
    sub: 'Regions, grapes, styles. Whatever comes to mind.',
  },
  {
    step: 5, path: '/setup/5', screen: 'Q5MustKnow',
    title: 'Anything we must know?',
    sub: "This one isn't about taste. We take it seriously.",
  },
  {
    step: 6, path: '/setup/6', screen: 'Q6Summary',
    title: "That's everything.",
    sub: 'Six questions, done. Have a full glass.',
  },
];

/** The callout is only honest above the knowledge question. */
const PROMISE = /This changes how we explain a wine, never which wine we pick/;

describe('onboarding headings', () => {
  it.each(STEPS)(
    'step $step ($screen at $path) renders its own heading, not the next one',
    ({ path, title, sub }) => {
      renderPairMeApp(path);
      expect(screen.getByText(title)).toBeInTheDocument();
      if (sub) expect(screen.getByText(sub)).toBeInTheDocument();
    }
  );

  it.each(STEPS)('step $step counts itself as "Question $step of 6"', ({ path, step }) => {
    renderPairMeApp(path);
    expect(screen.getByText(`Question ${step} of 6 · skippable`)).toBeInTheDocument();
  });

  it('renders no heading belonging to another step', () => {
    // The off-by-one was invisible to a single-screen assertion because each
    // screen did show *a* real heading. Only cross-checking catches it.
    STEPS.forEach(({ path, title }) => {
      const view = renderPairMeApp(path);
      STEPS.filter((o) => o.title !== title).forEach((other) => {
        expect(screen.queryByText(other.title)).not.toBeInTheDocument();
      });
      view.unmount();
    });
  });

  it('Q6Summary has a heading at all (it fell off the end of the table)', () => {
    renderPairMeApp('/setup/6');
    const header = screen.getByText('Question 6 of 6 · skippable').parentElement;
    expect(header.textContent).toContain("That's everything.");
    expect(header.textContent.trim()).not.toBe('Question 6 of 6 · skippable');
  });

  it('carries the explain-not-select promise on Q1 only', () => {
    // The promise is true of the knowledge question and false of the
    // adventurousness question, which is allowed to change what we pour.
    // Printing it beside Q2 would be a claim we do not honour.
    const q1 = renderPairMeApp('/setup/1');
    expect(screen.getByText(PROMISE)).toBeInTheDocument();
    q1.unmount();

    const q2 = renderPairMeApp('/setup/2');
    expect(screen.queryByText(PROMISE)).not.toBeInTheDocument();
    q2.unmount();
  });

  it('fills the glass by step, one sixth per question, full on the last', () => {
    // Same root cause as the headings: the glass filled from raw `s`, so it
    // started at 2/6 on Q1 and emptied to zero on Q6 where s=7 fell outside
    // the guard. Height is 34 * step/6.
    const heights = STEPS.map(({ path }) => {
      const view = renderPairMeApp(path);
      const rect = document.querySelector('svg rect');
      const h = Number(rect.getAttribute('height'));
      view.unmount();
      return h;
    });

    expect(heights[0]).toBeCloseTo(34 / 6, 5);
    expect(heights[5]).toBeCloseTo(34, 5);
    heights.forEach((h, i) => expect(h).toBeCloseTo((34 * (i + 1)) / 6, 5));
    // Strictly increasing: never flat, never draining.
    heights.slice(1).forEach((h, i) => expect(h).toBeGreaterThan(heights[i]));
  });
});

describe('two sentences per page', () => {
  it('Q1 does not say the promise twice', () => {
    // The header subtitle used to read "Be honest. This changes what we say,
    // not what we pour." while the callout below it read "This changes how we
    // explain a wine, never which wine we pick." Same claim, same screen, four
    // sentences where the budget is two. The callout is the protected one.
    renderPairMeApp('/setup/1');
    expect(screen.getByText(PROMISE)).toBeInTheDocument();
    expect(screen.queryByText(/Be honest\. This changes what we say/)).not.toBeInTheDocument();
  });

  it('renders no empty subtitle slot when a step has no subtitle', () => {
    renderPairMeApp('/setup/1');
    const counter = screen.getByText('Question 1 of 6 · skippable');
    const header = counter.parentElement;
    // heading + counter only, no third empty line reserving space.
    expect(header.textContent.trim()).toBe('Question 1 of 6 · skippableHow well do you know wine?');
  });
});
