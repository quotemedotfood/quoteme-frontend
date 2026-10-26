// Shared by the restaurant load list and detail pages (QM admin).
//
// Status words, not codes, on screen (Moose's brief for this page). The codes
// are RestaurantLoadBatch::STATUSES in QuoteMe #588. An unknown code is shown
// with its underscores turned into spaces rather than hidden, so a status the
// server adds later is still visible.
import type { RestaurantLoadBatch } from '../../services/adminApi';

const STATUS_WORDS: Record<string, string> = {
  uploaded: 'Uploaded, dry run queued',
  dry_running: 'Dry run in progress',
  dry_run_done: 'Dry run finished',
  dry_run_failed: 'Dry run failed',
  applying: 'Writing to production',
  applied: 'Loaded',
  apply_failed: 'Load stopped with an error',
  reverting: 'Reverting',
  reverted: 'Reverted',
  revert_failed: 'Revert failed',
};

export function restaurantLoadStatusWords(status: string): string {
  return STATUS_WORDS[status] ?? status.replace(/_/g, ' ');
}

// Statuses a job is still working on, so the page keeps asking. `uploaded` is
// included because the server queues the dry run on upload; without it a page
// opened straight after an upload would never see the dry run start.
export const RESTAURANT_LOAD_RUNNING_STATUSES: readonly string[] = [
  'uploaded',
  'dry_running',
  'applying',
  'reverting',
];

export function isRestaurantLoadRunning(status: string): boolean {
  return RESTAURANT_LOAD_RUNNING_STATUSES.includes(status);
}

export const RESTAURANT_LOAD_POLL_MS = 4000;

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatBytes(n: number | null | undefined): string {
  if (n == null) return '-';
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function whoEmail(b: Pick<RestaurantLoadBatch, 'requested_by'>): string {
  return b.requested_by?.email ?? '-';
}

// Shown only after an upload comes back 413. The limit belongs to Railway's
// proxy in front of the API and is not published, so the copy does not name a
// number.
export const UPLOAD_TOO_LARGE_NOTE =
  'The server refused this file as too large. Railway limits the size of a request and the exact limit is not known. Split the CSV into smaller files and upload each one.';
