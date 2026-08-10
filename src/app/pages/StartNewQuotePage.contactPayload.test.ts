// Build 2 (FE creation half): the rep's selected contact must travel in the
// createMenu payload so the backend can stamp recipient_email at creation
// time, not only at send time. Previously selectedContactIds was tracked in
// StartNewQuotePage state (checkboxes, auto-select for single-contact
// restaurants) but never placed on the createMenu({...}) request body.
//
// Two things are verified here, at the payload level (not rendered UI):
//   1. resolveContactIdForCreate — the pure selection-resolution rule
//      (primary-among-selected, else first selected, else undefined).
//   2. createMenu (api.ts) actually forwards contact_id in the JSON POST
//      body when present, and omits the key entirely when undefined.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveContactIdForCreate } from './StartNewQuotePage';

describe('resolveContactIdForCreate — Build 2 selection rule', () => {
  const contacts = [
    { id: 'c-1', is_primary: false },
    { id: 'c-2', is_primary: true },
    { id: 'c-3', is_primary: false },
  ];

  it('returns undefined when nothing is selected (open quote)', () => {
    expect(resolveContactIdForCreate([], contacts)).toBeUndefined();
  });

  it('returns the single selected id when only one is selected', () => {
    expect(resolveContactIdForCreate(['c-1'], contacts)).toBe('c-1');
  });

  it('prefers the primary contact among multiple selected ids', () => {
    expect(resolveContactIdForCreate(['c-1', 'c-2', 'c-3'], contacts)).toBe('c-2');
  });

  it('falls back to the first selected id when none of the selected are primary', () => {
    expect(resolveContactIdForCreate(['c-1', 'c-3'], contacts)).toBe('c-1');
  });

  it('ignores a primary contact that was not itself selected', () => {
    // c-2 is primary but not in the selection; must not be substituted in.
    expect(resolveContactIdForCreate(['c-1', 'c-3'], contacts)).toBe('c-1');
  });
});

describe('createMenu (api.ts) — forwards contact_id in the POST body', () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSpy);
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ quote_id: 'quote-123', menu_id: 'menu-123' }),
      headers: { get: () => null },
    });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'quoteme_token' ? 'test-jwt-token' : null),
      setItem: () => undefined,
      removeItem: () => undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('includes contact_id in the body when a contact is selected', async () => {
    const { createMenu } = await import('../services/api');
    await createMenu({
      raw_text: 'TACOS $3',
      name: 'New Quote',
      restaurant_id: 'rest-1',
      contact_id: 'c-2',
    });

    const [, calledOptions] = fetchSpy.mock.calls[0];
    const body = JSON.parse(calledOptions.body);
    expect(body.contact_id).toBe('c-2');
  });

  it('omits contact_id from the body when no contact is selected (open quote)', async () => {
    const { createMenu } = await import('../services/api');
    await createMenu({
      raw_text: 'TACOS $3',
      name: 'New Quote',
      restaurant_id: 'rest-1',
      contact_id: resolveContactIdForCreate([], []),
    });

    const [, calledOptions] = fetchSpy.mock.calls[0];
    const body = JSON.parse(calledOptions.body);
    expect(body.contact_id).toBeUndefined();
    expect('contact_id' in body).toBe(false);
  });
});
