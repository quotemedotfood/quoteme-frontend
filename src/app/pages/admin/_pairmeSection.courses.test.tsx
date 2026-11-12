// PairmeSection: PAIR THIS COURSE (Moose, 2026-11-12, Chef Zorba's).
//
// Guards:
//   C1 each course chip carries a "Pair this course" switch, on or off
//   C2 an off course's chip is dimmed with a small "Not paired" label, and
//      its dishes (sent to the QM admin only) are dimmed
//   C3 counts leave an off course's dishes out
//   C4 the switch writes through setCourse with the course and the new
//      value, then reloads; the restaurant admin's own writer is used when
//      passed
//   C5 nothing is crowned on the chips
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const { getAdminRestaurantPairme, setAdminPairmeCourse } = vi.hoisted(() => ({
  getAdminRestaurantPairme: vi.fn(),
  setAdminPairmeCourse: vi.fn(),
}));
vi.mock('../../services/adminApi', () => ({ getAdminRestaurantPairme, setAdminPairmeCourse }));

import { PairmeSection } from './_pairmeSection';

const leg = { wine_id: 'w-1', why: 'Salt and lemon.' };
const wines = [
  { wine_id: 'w-1', producer: 'Gaia', wine_name: 'Assyrtiko', vintage: null, list_source: 'wine_list',
    glass_cents: 1500, bottle_cents: 6000, say: null, say_source: null },
];
const dishes = [
  { dish_id: 'd-1', name: 'Pancakes', course: 'Breakfast Specialties', pairings: [] },
  { dish_id: 'd-2', name: 'Moussaka', course: 'ENTRÉES', pairings: [leg] },
  { dish_id: 'd-3', name: 'Souvlaki', course: 'Entrees', pairings: [leg] },
];
const courses = (breakfastPaired: boolean) => [
  { course: 'Breakfast Specialties', key: 'breakfast specialties', labels: ['Breakfast Specialties'], paired: breakfastPaired, dishes: 1 },
  { course: 'ENTRÉES', key: 'entrees', labels: ['ENTRÉES', 'Entrees'], paired: true, dishes: 2 },
];
const payload = (breakfastPaired: boolean) => ({ venue: { id: 'v1', name: 'Greek Diner' }, wines, pairings: dishes, courses: courses(breakfastPaired) });

const chip = (name: string) =>
  screen.getAllByTestId('pairme-course-chip').find((c) => c.textContent?.includes(name))!;

afterEach(() => {
  cleanup();
  getAdminRestaurantPairme.mockReset();
  setAdminPairmeCourse.mockReset();
});

describe('PairmeSection course switch', () => {
  it('C1 gives each course chip a Pair this course switch', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: payload(true) });
    render(<PairmeSection restaurantId="r1" />);
    const switches = await screen.findAllByRole('switch');
    expect(switches.map((s) => s.getAttribute('aria-label'))).toEqual([
      'Pair this course: Breakfast Specialties',
      'Pair this course: ENTRÉES',
    ]);
    expect(switches.map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'true']);
    // One chip for both printed forms of the same course.
    expect(screen.getAllByTestId('pairme-course-chip')).toHaveLength(2);
  });

  it('C2 dims an off course chip with "Not paired", and dims its dishes', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: payload(false) });
    render(<PairmeSection restaurantId="r1" />);
    await screen.findAllByRole('switch');
    const off = chip('Breakfast Specialties');
    expect(off.className).toContain('opacity-50');
    expect(off.getAttribute('data-paired')).toBe('no');
    expect(off.textContent).toContain('Not paired');
    const on = chip('ENTRÉES');
    expect(on.className).not.toContain('opacity-50');
    expect(on.textContent).not.toContain('Not paired');
    expect(screen.getByRole('switch', { name: 'Pair this course: Breakfast Specialties' }).getAttribute('aria-checked')).toBe('false');

    const rows = screen.getAllByTestId('pairme-dish');
    const pancakes = rows.find((r) => r.textContent?.includes('Pancakes'))!;
    expect(pancakes.className).toContain('opacity-50');
    expect(pancakes.textContent).not.toContain('No wine paired');
    expect(rows.find((r) => r.textContent?.includes('Moussaka'))!.className).not.toContain('opacity-50');
  });

  it('C3 counts leave an off course out', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: payload(true) });
    render(<PairmeSection restaurantId="r1" />);
    await screen.findAllByRole('switch');
    expect(screen.getByTestId('pairme-summary').textContent).toContain('3 dishes paired');
    expect(screen.getByTestId('pairme-summary').textContent).toContain('1 with none');
    cleanup();

    getAdminRestaurantPairme.mockResolvedValue({ data: payload(false) });
    render(<PairmeSection restaurantId="r1" />);
    await screen.findAllByRole('switch');
    const summary = screen.getByTestId('pairme-summary').textContent;
    expect(summary).toContain('2 dishes paired');
    expect(summary).not.toContain('with none');
    expect(summary).toContain('1 course not paired');
  });

  it('C4 the switch writes the course and its new value, then reloads', async () => {
    getAdminRestaurantPairme.mockResolvedValueOnce({ data: payload(true) }).mockResolvedValueOnce({ data: payload(false) });
    setAdminPairmeCourse.mockResolvedValue({ data: { courses: courses(false) } });
    render(<PairmeSection restaurantId="r1" />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Pair this course: Breakfast Specialties' }));
    await waitFor(() => expect(chip('Breakfast Specialties').textContent).toContain('Not paired'));
    expect(setAdminPairmeCourse).toHaveBeenCalledWith('r1', 'Breakfast Specialties', false);
    await waitFor(() => expect(getAdminRestaurantPairme).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('pairme-summary').textContent).toContain('2 dishes paired');
  });

  it('C4 uses the restaurant admin writer when one is passed', async () => {
    const load = vi.fn().mockResolvedValue({ data: payload(false) });
    const own = vi.fn().mockResolvedValue({ data: { courses: courses(true) } });
    render(<PairmeSection restaurantId="r9" load={load} setCourse={own} />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Pair this course: Breakfast Specialties' }));
    await waitFor(() => expect(own).toHaveBeenCalledWith('r9', 'Breakfast Specialties', true));
    expect(setAdminPairmeCourse).not.toHaveBeenCalled();
  });

  it('C5 crowns nothing on the chips', async () => {
    getAdminRestaurantPairme.mockResolvedValue({ data: payload(false) });
    render(<PairmeSection restaurantId="r1" />);
    await screen.findAllByRole('switch');
    for (const c of screen.getAllByTestId('pairme-course-chip')) {
      for (const crown of ['#1', 'Top', 'Best', 'Recommended', 'rank']) expect(c.textContent).not.toContain(crown);
    }
  });
});
