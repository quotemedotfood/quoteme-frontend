/**
 * Connections are no longer an onboarding question: Welcome shows no connector
 * pills and no "I don't use any of these" escape hatch. They live in Settings
 * under an expandable "Connections" section, all four labelled "Coming soon"
 * (one label, no special case), visibly disabled, with no fake connection.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

describe('connections moved into Settings', () => {
  it('Welcome no longer asks to connect; Settings > Connections lists all four as Coming soon', async () => {
    const user = userEvent.setup();
    renderPairMeApp('/');

    // Welcome: no connector fiction, no escape hatch, no onboarding connect step.
    expect(screen.queryByText(/bottles we don't have to ask/i)).not.toBeInTheDocument();
    expect(screen.queryByText("I don't use any of these")).not.toBeInTheDocument();

    // Into Settings via the gear, then expand Connections.
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await screen.findByText('Connections');
    await user.click(screen.getByRole('button', { name: /Link a wine app/i }));

    // All four connectors, one label, visibly informational (no "not yet connected").
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('CellarTracker')).toBeInTheDocument();
    expect(screen.getByText('Vivino')).toBeInTheDocument();
    expect(screen.queryByText(/not yet connected/i)).not.toBeInTheDocument();
  });
});
