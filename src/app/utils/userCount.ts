// Users doctrine: a distributor's user count is the number of DISTINCT users across
// its admins and reps. A user who is both (e.g. Marcus on Summit) counts once.
export function distinctUserCount(
  admins: Array<{ user_id: string }> = [],
  reps: Array<{ user_id: string }> = [],
): number {
  return new Set([
    ...admins.map((a) => a.user_id),
    ...reps.map((r) => r.user_id),
  ]).size;
}
