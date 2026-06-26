import { describe, it, expect } from 'vitest';
import { laneSource } from './helpLane';

describe('laneSource', () => {
  it('appends -sidebar to the lane', () => {
    expect(laneSource('chef')).toBe('chef-sidebar');
    expect(laneSource('rep')).toBe('rep-sidebar');
    expect(laneSource('cc')).toBe('cc-sidebar');
    expect(laneSource('brand')).toBe('brand-sidebar');
  });
});
