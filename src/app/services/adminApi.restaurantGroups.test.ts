// RESTAURANT GROUPS: the body the backend reads. RestaurantGroupsController
// takes params[:name] / params[:status] at the top level; a restaurant_group
// wrapper made every create fail with "param is missing or the value is empty
// or invalid: name" (Moose's walk, 2026-10-11).
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAdminRestaurantGroup, updateAdminRestaurantGroup } from './adminApi';

const sent: Array<{ url: string; method?: string; body: any }> = [];
afterEach(() => { vi.unstubAllGlobals(); sent.length = 0; });

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    sent.push({ url, method: init.method, body: init.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ id: 'g1', name: "Seth's group", status: 'active' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }));
}

describe('restaurant group requests', () => {
  it('create sends name and status at the top level', async () => {
    stubFetch();
    await createAdminRestaurantGroup({ name: "Seth's group", status: 'active' });
    expect(sent[0].method).toBe('POST');
    expect(sent[0].url).toMatch(/\/api\/v1\/restaurant_groups$/);
    expect(sent[0].body).toEqual({ name: "Seth's group", status: 'active' });
  });

  it('update sends its fields at the top level', async () => {
    stubFetch();
    await updateAdminRestaurantGroup('g1', { name: 'Renamed' });
    expect(sent[0].method).toBe('PATCH');
    expect(sent[0].body).toEqual({ name: 'Renamed' });
  });
});
