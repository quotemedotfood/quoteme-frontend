/**
 * Proves TheWine.jsx's own (deliberately minimal) insertion actually wires
 * an offering's tableActive/glassActive/housePickActive/ourPickActive/
 * proteinIcons fields into a WineCardIcons row per card - not just that
 * WineCardIcons works in isolation (see tests/wine-card-icons.test.jsx) or
 * that the gate math is right (see src/lib/wineCardIconGate.test.js).
 *
 * Renders TheWine directly with a hand-built `vm`, the same shape
 * lib/state.js's usePairMe() hook returns and the only thing TheWine.jsx's
 * default export destructures - no router, no full app walk needed.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import TheWine from '../src/screens/TheWine.jsx';

function baseVm(offers) {
  return {
    fWhy: { v: '', set: () => {}, mic: () => {}, bd: '', bg: '', hint: '' },
    offerTitle: 'Your wine',
    offerSub: 'Tap the ones you want to present.',
    blankLabel: '',
    toggleBlank: () => {},
    showBlankToggle: false,
    presentCount: 'None chosen yet, we\'ll present the first one',
    offers,
    compromiseNote: null,
    blockedNote: null,
    showFormatTabs: false,
    formatTabs: [],
    showCoverage: false,
    coverageTitle: null,
    coverage: [],
    showFeatured: false,
    featured: [],
    goWineList: null,
  };
}

function offer(overrides) {
  return {
    role: 'House suggestion', roleColor: '#000', prod: 'Test Producer', wine: 'Test Wine', meta: 'test . Test, France',
    say: 'test', btl: 100, glass: '$20 glass', why: 'A test reason.', covers: 'Everything', coversChips: [],
    bd: '#000', bw: '1px', bg: '#fff', chip: 'tap to add', chipBg: '#fff', pick: () => {}, speak: () => {}, open: null,
    stockColor: '#000', stockNote: 'On the list tonight.',
    tableActive: false, glassActive: false, housePickActive: false, ourPickActive: false, proteinIcons: [],
    ...overrides,
  };
}

describe('TheWine <-> WineCardIcons wiring', () => {
  it('renders one WineCardIcons row per offering card', () => {
    const vm = baseVm([offer({}), offer({})]);
    render(<TheWine {...vm} />);
    expect(screen.getAllByTestId('wine-card-icons')).toHaveLength(2);
  });

  it('an offering flagged tableActive:true renders its table icon lit and tappable', () => {
    const vm = baseVm([offer({ tableActive: true })]);
    render(<TheWine {...vm} />);
    const tableBtn = screen.getByTestId('wine-icon-table');
    expect(tableBtn).not.toBeDisabled();
    fireEvent.click(tableBtn);
    expect(screen.getByTestId('wine-icon-explainer-table')).toHaveTextContent('Works with everything your table ordered.');
  });

  it('an offering with tableActive:false (today\'s honest reality, see wineCardIconGate.test.js) renders the table icon dark', () => {
    const vm = baseVm([offer({ tableActive: false })]);
    render(<TheWine {...vm} />);
    expect(screen.getByTestId('wine-icon-table')).toBeDisabled();
  });

  it('wires housePickActive/ourPickActive/glassActive independently per card', () => {
    const vm = baseVm([offer({ housePickActive: true, ourPickActive: false, glassActive: false })]);
    render(<TheWine {...vm} />);
    expect(screen.getByTestId('wine-icon-house')).not.toBeDisabled();
    expect(screen.getByTestId('wine-icon-ourPick')).toBeDisabled();
    expect(screen.getByTestId('wine-icon-glass')).toBeDisabled();
  });

  it('wires proteinIcons through so it renders nothing when absent and the right icon when present', () => {
    const withProtein = baseVm([
      offer({ proteinIcons: [{ key: 'fish', emoji: '\u{1F41F}', label: 'Fish', explainer: 'Pairs with your sole.' }] }),
    ]);
    const { container } = render(<TheWine {...withProtein} />);
    const proteinBtn = screen.getByTestId('wine-icon-protein-fish-0');
    fireEvent.click(proteinBtn);
    expect(screen.getByTestId('wine-icon-explainer-protein-fish-0')).toHaveTextContent('Pairs with your sole.');

    const withoutProtein = baseVm([offer({ proteinIcons: [] })]);
    const { container: c2 } = render(<TheWine {...withoutProtein} />);
    expect(c2.querySelectorAll('[data-testid^="wine-icon-protein-"]').length).toBe(0);
  });
});
