import type { AdminUser } from '../services/adminApi';

/**
 * One name for a user row, used by every admin control that acts on one.
 *
 * Falls back to the email because first_name/last_name are frequently blank on
 * an invited-but-never-completed account, and an unnamed row still has to be
 * tellable apart from its neighbours.
 *
 * Extracted from QMAdminUsers, where it was written "so there is one copy
 * rather than several". A second page needed it, so it lives here now rather
 * than becoming the several it was meant to prevent.
 */
export function userLabel(u: Pick<AdminUser, 'first_name' | 'last_name' | 'email'>): string {
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
}
