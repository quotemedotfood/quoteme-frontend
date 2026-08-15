/**
 * The phone frame regression Moose caught in Monday's demo: /entry,
 * /tell-us, /login and /wines/list rendered OUTSIDE the 390x800 device
 * shell every onboarding screen mounts into, so opening any of them
 * dropped the phone border and went full desktop width. /operator is the
 * one deliberate exception - it is the restaurant-side desktop surface,
 * not a diner phone screen, and must stay OUT of the shell.
 *
 * This asserts each of the four routes now renders its known content
 * inside an ancestor with the `.pm-phone` class (App.jsx's DeviceFrame/
 * Phone), and that /operator does not.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPairMeApp } from './helpers/renderPairMeApp.jsx';

function assertInsidePhoneFrame(container, node, routeLabel) {
  const frame = container.querySelector('.pm-phone');
  expect(frame, `expected a .pm-phone device frame on ${routeLabel}`).toBeTruthy();
  expect(frame.contains(node), `expected ${routeLabel}'s content to be inside the .pm-phone frame`).toBe(true);
}

describe('Phone frame shell: the four standalone routes mount inside the 390x800 device shell', () => {
  it('/entry (EntryScreen) renders inside the .pm-phone frame', async () => {
    const { container } = renderPairMeApp('/entry');
    const heading = await screen.findByText('Eating out or eating in?');
    assertInsidePhoneFrame(container, heading, '/entry');
  });

  it('/tell-us (TellUsScreen) renders inside the .pm-phone frame', async () => {
    const { container } = renderPairMeApp('/tell-us');
    const heading = await screen.findByText('What we heard');
    assertInsidePhoneFrame(container, heading, '/tell-us');
  });

  it('/login (Login) renders inside the .pm-phone frame', async () => {
    const { container } = renderPairMeApp('/login');
    const subtitle = await screen.findByText('Welcome back. Your taste and history pick up right where you left them.');
    assertInsidePhoneFrame(container, subtitle, '/login');
  });

  it('/wines/list (WineList) renders inside the .pm-phone frame, reached from TheWine', async () => {
    const user = userEvent.setup();
    const { container, getByText, currentPath } = renderPairMeApp('/wines');

    await user.click(getByText('Browse the full list'));
    expect(currentPath()).toBe('/wines/list');

    const heading = await screen.findByText('The full list');
    assertInsidePhoneFrame(container, heading, '/wines/list');
  });

  it('/operator stays OUT of the device shell - it is the restaurant desktop surface, not a phone screen', async () => {
    const { container } = renderPairMeApp('/operator');
    await screen.findByRole('heading', { name: 'Set up your wine pairings' });
    expect(container.querySelector('.pm-phone')).toBeNull();
  });
});
