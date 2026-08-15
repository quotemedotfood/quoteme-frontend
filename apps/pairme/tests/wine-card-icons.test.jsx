/**
 * Component-level tests for screens/WineCardIcons.jsx, rendered directly
 * (no full app / no router) so these stay decoupled from the rest of the
 * PairMe walk. See lib/wineCardIconGate.test.js for the pure gate-logic
 * tests this component's props are computed from.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import WineCardIcons from '../src/screens/WineCardIcons.jsx';

const ALL_DARK = { tableActive: false, glassActive: false, housePickActive: false, ourPickActive: false, proteinIcons: [] };
const ALL_LIT = { tableActive: true, glassActive: true, housePickActive: true, ourPickActive: true, proteinIcons: [] };

describe('WineCardIcons: persistent slots (table/glass/house/ourPick)', () => {
  it('always renders all four slots, dark or lit', () => {
    render(<WineCardIcons {...ALL_DARK} />);
    for (const id of ['table', 'glass', 'house', 'ourPick']) {
      expect(screen.getByTestId(`wine-icon-${id}`)).toBeInTheDocument();
    }
  });

  it('renders each icon lit only when its own condition holds, and dark when it does not', () => {
    render(<WineCardIcons tableActive glassActive={false} housePickActive={false} ourPickActive={false} proteinIcons={[]} />);
    expect(screen.getByTestId('wine-icon-table')).not.toBeDisabled();
    expect(screen.getByTestId('wine-icon-glass')).toBeDisabled();
    expect(screen.getByTestId('wine-icon-house')).toBeDisabled();
    expect(screen.getByTestId('wine-icon-ourPick')).toBeDisabled();
  });

  it('the table icon does not light on today\'s demo data (proven in lib/wineCardIconGate.test.js); this only proves the dark rendering itself', () => {
    render(<WineCardIcons {...ALL_DARK} />);
    const tableBtn = screen.getByTestId('wine-icon-table');
    expect(tableBtn).toBeDisabled();
    expect(tableBtn.getAttribute('aria-label')).toMatch(/not applicable/i);
  });

  it('a dark icon is not tappable: clicking it never reveals an explainer', () => {
    render(<WineCardIcons {...ALL_DARK} />);
    fireEvent.click(screen.getByTestId('wine-icon-table'));
    expect(screen.queryByTestId('wine-icon-explainer-table')).not.toBeInTheDocument();
  });

  it('tapping a lit icon reveals its explainer, with the exact required copy', () => {
    render(<WineCardIcons {...ALL_LIT} />);
    expect(screen.queryByTestId('wine-icon-explainer-table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wine-icon-table'));
    expect(screen.getByTestId('wine-icon-explainer-table')).toHaveTextContent('Works with everything your table ordered.');

    fireEvent.click(screen.getByTestId('wine-icon-glass'));
    expect(screen.getByTestId('wine-icon-explainer-glass')).toHaveTextContent('You can order this by the glass.');

    fireEvent.click(screen.getByTestId('wine-icon-house'));
    expect(screen.getByTestId('wine-icon-explainer-house')).toHaveTextContent('The restaurant recommends this with your dish.');

    fireEvent.click(screen.getByTestId('wine-icon-ourPick'));
    expect(screen.getByTestId('wine-icon-explainer-ourPick')).toHaveTextContent('Our pick for what you ordered.');
  });

  it('tapping again hides the explainer (toggle behaviour)', () => {
    render(<WineCardIcons {...ALL_LIT} />);
    const tableBtn = screen.getByTestId('wine-icon-table');
    fireEvent.click(tableBtn);
    expect(screen.getByTestId('wine-icon-explainer-table')).toBeInTheDocument();
    fireEvent.click(tableBtn);
    expect(screen.queryByTestId('wine-icon-explainer-table')).not.toBeInTheDocument();
  });

  it('hover never reveals the explainer - only tap does (hover does not exist on a phone)', () => {
    render(<WineCardIcons {...ALL_LIT} />);
    const tableBtn = screen.getByTestId('wine-icon-table');
    fireEvent.mouseOver(tableBtn);
    fireEvent.mouseEnter(tableBtn);
    expect(screen.queryByTestId('wine-icon-explainer-table')).not.toBeInTheDocument();
    // Same element, a real tap (click) still works afterwards.
    fireEvent.click(tableBtn);
    expect(screen.getByTestId('wine-icon-explainer-table')).toBeInTheDocument();
  });

  it('every persistent icon carries both a visible text label and an aria-label', () => {
    const { container } = render(<WineCardIcons {...ALL_DARK} />);
    for (const id of ['table', 'glass', 'house', 'ourPick']) {
      const btn = screen.getByTestId(`wine-icon-${id}`);
      expect(btn.getAttribute('aria-label')).toBeTruthy();
      // The visible label sits in a sibling <span> inside the same wrapper.
      const wrapper = btn.parentElement;
      const visibleLabel = within(wrapper).getAllByText(/table wine|by the glass|house pick|our pick/i);
      expect(visibleLabel.length).toBeGreaterThan(0);
    }
  });
});

describe('WineCardIcons: protein slot (icon 3)', () => {
  it('renders nothing at all when proteinIcons is absent or empty - no dark placeholder', () => {
    const { container: c1 } = render(<WineCardIcons {...ALL_DARK} proteinIcons={undefined} />);
    expect(c1.querySelectorAll('[data-testid^="wine-icon-protein-"]').length).toBe(0);
    const { container: c2 } = render(<WineCardIcons {...ALL_DARK} proteinIcons={[]} />);
    expect(c2.querySelectorAll('[data-testid^="wine-icon-protein-"]').length).toBe(0);
  });

  it('renders one lit, tappable icon per resolved protein match, with a visible label and aria-label', () => {
    render(
      <WineCardIcons
        {...ALL_DARK}
        proteinIcons={[{ key: 'beef', emoji: '\u{1F969}', label: 'Beef', explainer: 'Pairs with your rib eye.' }]}
      />
    );
    const btn = screen.getByTestId('wine-icon-protein-beef-0');
    expect(btn).not.toBeDisabled();
    expect(btn.getAttribute('aria-label')).toMatch(/beef/i);
    expect(within(btn.parentElement).getByText('Beef')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.getByTestId('wine-icon-explainer-protein-beef-0')).toHaveTextContent('Pairs with your rib eye.');
  });

  it('renders multiple protein icons when several are matched', () => {
    render(
      <WineCardIcons
        {...ALL_DARK}
        proteinIcons={[
          { key: 'beef', emoji: '\u{1F969}', label: 'Beef', explainer: 'Pairs with your surf and turf.' },
          { key: 'lobster', emoji: '\u{1F99E}', label: 'Lobster', explainer: 'Pairs with your surf and turf.' },
        ]}
      />
    );
    expect(screen.getByTestId('wine-icon-protein-beef-0')).toBeInTheDocument();
    expect(screen.getByTestId('wine-icon-protein-lobster-1')).toBeInTheDocument();
  });
});
