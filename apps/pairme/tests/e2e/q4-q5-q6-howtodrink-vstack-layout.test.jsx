/**
 * App-wide RULE (following item-8/9 demo fixes, see q1-knowledge-layout.test.jsx):
 * every SELECTABLE option group renders one option per row, full width,
 * column direction - never a wrapping grid of pills. This spec covers the
 * remaining converted groups: Q4Taste (love/rather-not), Q6Summary
 * (relationship-to-you), and HowToDrink
 * (who's-at-the-table guests). It does NOT touch Q6Summary's summary-rows
 * list (a display list, already stacked, not a selectable option group) or
 * HowToDrink's modes/subs/scopes (modes is a fixed 2-across segmented
 * toggle by design; subs/scopes are already width:100% stacked).
 *
 * These screens are reachable by a direct route (syncFromRoute just sets
 * `s` to whatever screenIndex the route carries - see routes.jsx +
 * state.js's syncFromRoute), so each spec renders straight at its path
 * rather than walking the whole onboarding flow.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

function expectColumnGroup(sampleButtonLabel) {
  const btn = screen.getByRole('button', { name: sampleButtonLabel });
  const group = btn.parentElement;
  expect(group.style.flexDirection).toBe('column');
  expect(group.style.flexWrap).not.toBe('wrap');
  expect(btn.style.width).toBe('100%');
  expect(btn.style.textAlign).toBe('left');
}

describe('Q4Taste layout (/setup/4)', () => {
  it('both Love and Rather-not groups stack full-width, one option per row', async () => {
    renderPairMeApp('/setup/4');
    await screen.findByText('Love');
    await screen.findByText('Rather not');

    expectColumnGroup('Burgundy');
    expectColumnGroup('heavy oak');

    // every option in both groups is full-width/left-aligned, not just the sample
    ['Burgundy', 'Loire whites', 'Beaujolais', 'Champagne', 'Rhone syrah', 'Barolo',
      'Rioja', 'German riesling', 'Napa cabernet', 'orange wine', 'rose all year', 'sherry',
    ].forEach((label) => {
      const btn = screen.getByRole('button', { name: label });
      expect(btn.style.width).toBe('100%');
      expect(btn.style.textAlign).toBe('left');
    });
    ['heavy oak', 'very tannic', 'sweet', 'high alcohol', 'funky or natural',
      'big California reds', 'bubbles',
    ].forEach((label) => {
      const btn = screen.getByRole('button', { name: label });
      expect(btn.style.width).toBe('100%');
      expect(btn.style.textAlign).toBe('left');
    });
  });
  it('offers one neutral not-drinking toggle with no reason choices', async () => {
    renderPairMeApp('/setup/4');
    const toggle = await screen.findByRole('button', { name: 'Not drinking tonight' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByRole('button', { name: 'Not drinking tonight' })).toHaveLength(1);
  });
});

describe('Q6Summary layout (/setup/5)', () => {
  it('the "who they are to you" relationship group stacks full-width, one option per row', async () => {
    renderPairMeApp('/setup/5');
    await screen.findByText('Who they are to you');

    expectColumnGroup('partner');

    ['partner', 'friend', 'parent', 'sibling', 'colleague', 'the boss'].forEach((label) => {
      const btn = screen.getByRole('button', { name: label });
      expect(btn.style.width).toBe('100%');
      expect(btn.style.textAlign).toBe('left');
    });
  });

  it('leaves the summary rows list untouched (a display list, not a selectable group)', async () => {
    renderPairMeApp('/setup/5');
    await screen.findByText('Who they are to you');
    // The summary rows are plain key/value spans, not buttons - there is no
    // option group here to convert, and this asserts we did not add one.
    expect(screen.queryByRole('button', { name: /^Where /i })).not.toBeInTheDocument();
  });
});

describe('HowToDrink layout (/direction)', () => {
  it("the who's-at-the-table guests group stacks full-width, one option per row", async () => {
    renderPairMeApp('/direction');
    await screen.findByText("Who's at the table?");

    expectColumnGroup('Just me');

    ['Just me', '+ Sarah', '+ Guest'].forEach((label) => {
      const btn = screen.getByRole('button', { name: label });
      expect(btn.style.width).toBe('100%');
      expect(btn.style.textAlign).toBe('left');
    });
  });

  it('leaves the Glass/Bottle segmented toggle as a fixed 2-across row (not stacked)', async () => {
    renderPairMeApp('/direction');
    await screen.findByText('Glass or bottle');
    const glassBtn = screen.getByText('By the glass').closest('button');
    const modesGroup = glassBtn.parentElement;
    expect(modesGroup.style.flexDirection).not.toBe('column');
    // modes buttons use flex:"1" (not width:100%) - this is the fixed
    // 2-across segmented control the RULE explicitly excludes.
    expect(glassBtn.style.width).not.toBe('100%');
  });
});
