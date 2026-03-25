/** Returns true if the role is a buyer-lane role (buyer or group_admin). */
export function isBuyerRole(role?: string | null): boolean {
  return role === 'buyer' || role === 'group_admin';
}
