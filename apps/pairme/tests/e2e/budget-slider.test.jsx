/**
 * The two dots ARE the control: a real two-handle range slider, keyboard
 * operable, with no explainer sliders underneath. (Founder ruling from the demo
 * walk: a control that looks interactive must BE interactive.)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Q3Budget from '../../src/screens/Q3Budget.jsx';

function makeVm(over = {}) {
  return {
    fBudget: { v: '', set: () => {}, mic: () => {}, bd: '#ccc', bg: '#fff', hint: '' },
    bMin: 60, bMax: 140, bMaxLabel: 140, bFloor: 20, bCeil: 400, bStep: 10,
    setBMin: vi.fn(), setBMax: vi.fn(),
    bumps: [], bumpNote: '',
    ...over,
  };
}

describe('Q3Budget two-handle range slider', () => {
  it('renders two draggable handles and NO explainer range inputs', () => {
    const { container } = render(<Q3Budget {...makeVm()} />);
    expect(screen.getAllByRole('slider')).toHaveLength(2);
    // the old explainer <input type="range"> sliders are gone
    expect(container.querySelectorAll('input[type="range"]').length).toBe(0);
  });

  it('arrow keys on the low handle move it by the step, via setBMin', () => {
    const vm = makeVm();
    render(<Q3Budget {...vm} />);
    const low = screen.getByRole('slider', { name: 'Least you would spend' });
    fireEvent.keyDown(low, { key: 'ArrowRight' });
    expect(vm.setBMin).toHaveBeenCalledWith(70); // 60 + step 10
    fireEvent.keyDown(low, { key: 'ArrowLeft' });
    expect(vm.setBMin).toHaveBeenCalledWith(50);
  });

  it('arrow keys on the high handle move it via setBMax; Home/End jump to bounds', () => {
    const vm = makeVm();
    render(<Q3Budget {...vm} />);
    const high = screen.getByRole('slider', { name: 'Most you would spend' });
    fireEvent.keyDown(high, { key: 'ArrowRight' });
    expect(vm.setBMax).toHaveBeenCalledWith(150);
    fireEvent.keyDown(high, { key: 'End' });
    expect(vm.setBMax).toHaveBeenCalledWith(400);
    fireEvent.keyDown(high, { key: 'Home' });
    expect(vm.setBMax).toHaveBeenCalledWith(20);
  });

  it('each handle exposes its live dollar value for a screen reader', () => {
    render(<Q3Budget {...makeVm()} />);
    expect(screen.getByRole('slider', { name: 'Least you would spend' })).toHaveAttribute('aria-valuenow', '60');
    expect(screen.getByRole('slider', { name: 'Most you would spend' })).toHaveAttribute('aria-valuenow', '140');
  });
});
