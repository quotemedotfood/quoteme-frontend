/**
 * OperatorPage (/operator) smoke walk: paste a menu against the bundled
 * demo wine list -> build pairings -> confirm + push one, remove another ->
 * the diner preview shows only the confirmed one, with the disclosed
 * "Featured tonight" mark on the pushed pick -> the QR section renders the
 * /t/:code target URL. No BE call anywhere in this walk (OperatorPage.jsx is
 * all client-side; MSW's onUnhandledRequest: 'error' in tests/setup.js would
 * fail this test immediately if it tried to reach the network).
 */
import { describe, it, expect } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

const MENU = [
  'MAINS',
  '',
  'Sole meuniere 38',
  'sole, snap pea, potato, lemon',
  '',
  'Mystery botanical surprise',
].join('\n');

function reviewSection() {
  return screen.getByRole('heading', { name: '3. Review each dish' }).closest('section');
}

describe('OperatorPage (/operator): paste -> build -> review -> confirm/push/remove -> guest preview', () => {
  it('renders the route without throwing and walks the whole flow', async () => {
    const user = userEvent.setup();
    renderPairMeApp('/operator');

    expect(screen.getByRole('heading', { name: 'Set up your wine pairings' })).toBeInTheDocument();

    // Demo wine list is the default seeded pick; just build against it.
    const menuBox = screen.getByLabelText('Paste your menu');
    await user.click(menuBox);
    await user.paste(MENU);
    await user.click(screen.getByRole('button', { name: 'Build pairings' }));

    await screen.findByRole('heading', { name: '3. Review each dish' });
    const review = within(reviewSection());
    expect(review.getByText('Sole meuniere')).toBeInTheDocument();
    // The unresolved dish shows the honest fallback note, not a silent drop.
    expect(review.getByText('Mystery botanical surprise')).toBeInTheDocument();
    expect(review.getAllByText(/We could not read any ingredients for this dish/).length).toBeGreaterThan(0);

    // Confirm the first ranked pick for the first dish, then push it.
    const confirmButtons = review.getAllByRole('button', { name: 'Confirm' });
    await user.click(confirmButtons[0]);
    const pushChecks = review.getAllByRole('checkbox', { name: /Push to guest \(disclosed\)/ });
    await user.click(pushChecks[0]);

    // Remove the SECOND ranked pick for the first dish (index 1, not the
    // slot0 we just confirmed+pushed above) - never shows to a guest.
    const removeButtons = review.getAllByRole('button', { name: 'Remove' });
    await user.click(removeButtons[1]);
    expect(review.getAllByRole('button', { name: 'Bring back' }).length).toBeGreaterThan(0);

    // Guest preview: only the confirmed pairing, marked as disclosed/featured.
    const previewHeading = screen.getByRole('heading', { name: 'What a guest would see' });
    const preview = within(previewHeading.closest('section'));
    expect(preview.getByText('With the sole meuniere')).toBeInTheDocument();
    expect(preview.getByText('Featured tonight')).toBeInTheDocument();
    expect(preview.getByText(/We disclose this to the guest|The venue chose to feature this wine tonight/)).toBeInTheDocument();

    // QR section: enter a venue code, see the /t/:code target URL and the
    // honest "no qr lib yet" note, never a silently broken image tag.
    await user.type(screen.getByLabelText('Venue code'), 'aquitaine-01');
    expect(screen.getByText('https://demo.pairme.wine/t/aquitaine-01')).toBeInTheDocument();
    expect(screen.getByText('QR code renders here once a qr lib is added.')).toBeInTheDocument();
  });

  it('supports uploading a .txt menu instead of pasting', async () => {
    const user = userEvent.setup();
    renderPairMeApp('/operator');
    const file = new File(['Caesar salad\nromaine, parmesan, anchovy dressing'], 'menu.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText('Upload a menu file');
    await user.upload(fileInput, file);
    const buildButton = screen.getByRole('button', { name: 'Build pairings' });
    await waitFor(() => expect(buildButton).not.toBeDisabled());
    await user.click(buildButton);
    const review = within(reviewSection());
    expect(review.getByText('Caesar salad')).toBeInTheDocument();
  });
});
