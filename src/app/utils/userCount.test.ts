// Users doctrine: the distributor-detail count card must count DISTINCT users
// (admins + reps), not just reps. Marcus on Summit is both admin and rep = 1 user;
// Justin-fish-test1 shows "0 Reps" but has 1 admin → should read 1 User.
import { describe, it, expect } from 'vitest';
import { distinctUserCount } from './userCount';

describe('distinctUserCount — admins + reps, deduped by user_id', () => {
  it('counts a user who is both admin and rep once (Marcus)', () => {
    expect(distinctUserCount([{ user_id: 'm' }], [{ user_id: 'm' }])).toBe(1);
  });

  it('counts an admin with no reps (Justin-fish: 1 admin, 0 reps)', () => {
    expect(distinctUserCount([{ user_id: 'a' }], [])).toBe(1);
  });

  it('counts distinct admins and reps', () => {
    expect(distinctUserCount([{ user_id: 'a' }], [{ user_id: 'r' }])).toBe(2);
  });

  it('handles empty / undefined inputs', () => {
    expect(distinctUserCount([], [])).toBe(0);
    expect(distinctUserCount()).toBe(0);
  });
});
