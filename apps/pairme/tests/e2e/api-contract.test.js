/**
 * Profile "delete" step (LANE E requirement), at the contract layer.
 *
 * There is no UI trigger for this today: src/lib/api.js's deleteAccount()
 * export carries its own comment ("Not wired to any screen yet: Desi's
 * Settings screen has no delete-account control. Kept here so it exists
 * once that control lands"), and Settings.jsx (read in full) confirms it -
 * Reading / Sound / Account sections, no delete anywhere. So this file
 * proves the DELETE /v1/account contract endpoint itself is real and ready
 * for Lane A/C to wire a button to. The UI-level click-through is a
 * TODO(A) skip in demo-walk.test.jsx, not here.
 */
import { describe, it, expect } from 'vitest';
import { ensureSession, deleteAccount } from '../../src/lib/api.js';
import { requestLog, TEST_ANON_ID } from './msw/handlers.js';

describe('DELETE /v1/account (profile delete, contract layer)', () => {
  it('succeeds against the mocked contract endpoint once a session exists', async () => {
    await ensureSession();
    await expect(deleteAccount()).resolves.toBeNull(); // 204 -> api.js returns null

    const deleteCalls = requestLog.filter((r) => r.method === 'DELETE' && r.path === '/v1/account');
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0].anon).toBe(TEST_ANON_ID);
  });
});
