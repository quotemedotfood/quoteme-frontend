/**
 * BUILD 4: "I don't use any of these" - the last row in Settings >
 * Connections, same card format as the four connector rows, but a REAL
 * control: tapping it records an acknowledgment (state.js's
 * connectionsSkipped) and its own badge reflects selected/not - it never
 * reads "Coming soon" like the actual connectors do.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

describe('Settings > Connections > "I don\'t use any of these"', () => {
  it('renders last in the list, in the same row format, and toggles on tap', async () => {
    const user = userEvent.setup();
    renderPairMeApp('/');

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await screen.findByText('Connections');
    await user.click(screen.getByRole('button', { name: /Link a wine app/i }));

    // Present alongside the four real connectors, Vivino included.
    expect(screen.getByText('CellarTracker')).toBeInTheDocument();
    expect(screen.getByText('Vivino')).toBeInTheDocument();
    const skipRow = screen.getByTestId('connections-skip-row');
    expect(skipRow).toBeInTheDocument();
    expect(skipRow).toHaveTextContent("I don't use any of these");

    // It is a real control (a button), not a disabled fiction, and does not
    // read "Coming soon" like the actual connectors.
    expect(skipRow.tagName).toBe('BUTTON');
    expect(skipRow).toHaveTextContent(/not selected/i);
    expect(skipRow).not.toHaveTextContent(/coming soon/i);
    expect(skipRow).toHaveAttribute('aria-pressed', 'false');

    // Tapping it records the acknowledgment: its own badge flips, and
    // nothing about the real connectors' "Coming soon" rows changes.
    await user.click(skipRow);
    expect(skipRow).toHaveAttribute('aria-pressed', 'true');
    expect(skipRow).toHaveTextContent(/acknowledged/i);
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThanOrEqual(4);

    // Tapping again un-acknowledges it (a real toggle, not one-way).
    await user.click(skipRow);
    expect(skipRow).toHaveAttribute('aria-pressed', 'false');
    expect(skipRow).toHaveTextContent(/not selected/i);
  });

  it('is the LAST row in the Connections list', async () => {
    const user = userEvent.setup();
    renderPairMeApp('/');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await screen.findByText('Connections');
    await user.click(screen.getByRole('button', { name: /Link a wine app/i }));

    const labels = ['CellarTracker', 'Vivino', 'Wine.com', 'Delectable', "I don't use any of these"];
    // DOM order (documentPosition bit 4 = DOCUMENT_POSITION_FOLLOWING) tells
    // us the skip row comes after every real connector, i.e. it is last.
    const nodes = labels.map((l) => screen.getByText(l));
    const skipNode = nodes[nodes.length - 1];
    for (const other of nodes.slice(0, -1)) {
      // eslint-disable-next-line no-bitwise
      expect(other.compareDocumentPosition(skipNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});
