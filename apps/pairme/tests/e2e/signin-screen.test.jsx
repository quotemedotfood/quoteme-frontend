/**
 * SignIn screen (item-1/2/3/7 demo fixes, 2026-08-12):
 *   - the auth logo points at a real asset (public/brand/pear-mark-inverse.svg),
 *     not the 404ing "assets/logo-mark-inverse.svg" relative path.
 *   - Apple/Google/email keep their approved copy, now with real brand-mark
 *     icons instead of letter stand-ins.
 *   - the Vivino row + "or bring your history with you" divider are gone
 *     (Vivino already lives in Settings > Connections, see
 *     vivino-block.test.jsx).
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

async function goToSignIn() {
  const user = userEvent.setup();
  renderPairMeApp('/');
  await user.click(screen.getByRole('button', { name: 'Get going' }));
  await screen.findByText('Save your taste');
  return user;
}

describe('SignIn screen', () => {
  it('the logo points at the real asset, not the 404ing relative path', async () => {
    await goToSignIn();
    // Both the chrome header logo and SignIn's own logo render alt="PairMe";
    // SignIn's is the one with the inverse mark, sized for the dark chrome.
    const logos = screen.getAllByAltText('PairMe');
    const authLogo = logos.find((img) => img.getAttribute('src') === '/brand/pear-mark-inverse.svg');
    expect(authLogo).toBeTruthy();
    expect(authLogo.getAttribute('src')).not.toBe('assets/logo-mark-inverse.svg');
  });

  it('still offers Apple, Google, and email, with no Vivino row and no history divider', async () => {
    await goToSignIn();
    expect(screen.getByRole('button', { name: /Continue with Apple/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with email/i })).toBeInTheDocument();

    expect(screen.queryByText(/Continue with Vivino/i)).not.toBeInTheDocument();
    expect(screen.queryByText('or bring your history with you')).not.toBeInTheDocument();
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
  });

  it('keeps the sign-in note', async () => {
    await goToSignIn();
    expect(screen.getByText(/No password, ever\./i)).toBeInTheDocument();
  });
});
