/**
 * The header keeps only the logo on scroll DOWN: Log in and the gear fade out,
 * and return on scroll UP. The logo (and the status clock) always stay.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PairMeApp from '../../src/routes.jsx';

function scrollBody(to) {
  // The scroll body is the flex-1 overflow container that wraps the screen.
  const body = document.querySelector('div[style*="overflow-y: auto"], div[style*="overflowY"]')
    || [...document.querySelectorAll('div')].find((d) => d.style && d.style.overflowY === 'auto');
  Object.defineProperty(body, 'scrollTop', { value: to, configurable: true });
  fireEvent.scroll(body);
}

describe('header scroll behaviour', () => {
  it('the logo stays; Log in + gear hide on scroll down and return on scroll up', () => {
    render(<MemoryRouter initialEntries={['/']}><PairMeApp /></MemoryRouter>);
    const controls = screen.getByTestId('header-controls');
    const logo = screen.getByAltText('PairMe');

    expect(controls).toHaveAttribute('aria-hidden', 'false');
    expect(logo).toBeInTheDocument();

    scrollBody(120); // down
    expect(controls).toHaveAttribute('aria-hidden', 'true');
    expect(logo).toBeInTheDocument(); // logo still there

    scrollBody(40); // up
    expect(controls).toHaveAttribute('aria-hidden', 'false');
  });

  it('the Settings control is the gear alone, with no "Settings" word', () => {
    render(<MemoryRouter initialEntries={['/']}><PairMeApp /></MemoryRouter>);
    const gear = screen.getByRole('button', { name: 'Settings' });
    expect(gear).toBeInTheDocument();
    expect(gear.textContent.trim()).toBe(''); // icon only, no label text
  });
});
