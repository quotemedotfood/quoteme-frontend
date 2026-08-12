/**
 * Q1Knowledge screen (item-8/9 demo fixes, 2026-08-12):
 *   - both option groups ("Where you are now" / "Where you'd like to be")
 *     render one full-width option per row instead of wrapping into a grid
 *     of pills.
 *   - the option labels read "1. Just point at something" etc (no space
 *     before the period) - a hardcoded-literal fix at the source in
 *     state.js, not a display-only tweak.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

async function goToQ1Knowledge() {
  const user = userEvent.setup();
  renderPairMeApp('/');
  await user.click(screen.getByRole('button', { name: 'Get going' }));
  await screen.findByText('Save your taste');
  // Any signIns button (Apple/Google/email) advances straight to Q1Knowledge,
  // same as the screen's own "Set my taste" CTA - see state.js signIns.pick.
  await user.click(screen.getByRole('button', { name: /Continue with email/i }));
  await screen.findByText('Where you are now');
  return user;
}

describe('Q1Knowledge layout', () => {
  it('both option groups stack full-width, one option per row (no wrap grid)', async () => {
    await goToQ1Knowledge();

    const firstOption = screen.getByRole('button', { name: /^1\. Just point at something$/ });
    const group = firstOption.parentElement;
    expect(group.style.flexDirection).toBe('column');
    expect(group.style.flexWrap).not.toBe('wrap');

    // Every option button in both groups is full-width and left-aligned.
    const allOptionLabels = [
      '1. Just point at something', '2. I know what I like', '3. I read the list', '4. I could write the list',
      'Happy where I am', 'I want to learn more', 'Take me all the way',
    ];
    allOptionLabels.forEach((label) => {
      const btn = screen.getByRole('button', { name: label });
      expect(btn.style.width).toBe('100%');
      expect(btn.style.textAlign).toBe('left');
    });
  });

  it('drops the space before the period in every level option (fixed at the source)', async () => {
    await goToQ1Knowledge();
    expect(screen.getByText('1. Just point at something')).toBeInTheDocument();
    expect(screen.getByText('2. I know what I like')).toBeInTheDocument();
    expect(screen.getByText('3. I read the list')).toBeInTheDocument();
    expect(screen.getByText('4. I could write the list')).toBeInTheDocument();

    expect(screen.queryByText(/1 \. Just point/)).not.toBeInTheDocument();
    expect(screen.queryByText(/2 \. I know/)).not.toBeInTheDocument();
  });
});
