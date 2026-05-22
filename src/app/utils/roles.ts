/** Returns true if the role is a buyer-lane role (buyer, group_admin, or chef).
 *  Chef included so LocationProvider fetches locations for multi-location chef
 *  accounts (paid tier value prop). */
export function isBuyerRole(role?: string | null): boolean {
  return role === 'buyer' || role === 'group_admin' || role === 'chef';
}
