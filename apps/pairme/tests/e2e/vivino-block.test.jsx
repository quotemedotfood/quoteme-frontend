/**
 * The connect-your-accounts block is honest now: nothing is fake-connected, the
 * services without a usable API read "coming soon", CellarTracker (a real path)
 * reads "not yet connected", the fake "137 bottles" success line is gone, and
 * the prominent escape hatch actually skips the step.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

describe('connect-accounts block (the Vivino block)', () => {
  it('shows honest status, no fake connection, and a working escape hatch', async () => {
    const user = userEvent.setup();
    renderPairMeApp('/');

    // The fiction is gone.
    expect(screen.queryByText(/bottles we don't have to ask/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vivino connected/i)).not.toBeInTheDocument();

    // Honest labels: no-API services are "coming soon", CellarTracker is a real
    // path labelled "not yet connected".
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not yet connected/i)).toBeInTheDocument();

    // The escape hatch is present and actually does something.
    const skip = screen.getByRole('button', { name: "I don't use any of these" });
    await user.click(skip);
    expect(screen.getByText(/Starting fresh/i)).toBeInTheDocument();
  });
});
