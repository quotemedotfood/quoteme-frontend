// @vitest-environment jsdom
// A menu dropped on a /d/:slug page arrives in the Command Center inbound as an
// opportunity whose artifact is a Menu. Its action used to be "Start Quote",
// which navigated to /rep/quotes/new?opportunity_id=..., a route that never
// existed: the :id route caught "new" and the admin landed on
// "We could not load this quote" (100KM, 2026-09-24).
//
// Now the action is "Build Quote". It calls POST .../inbound_opportunities/:id/convert,
// which starts the build (202), and asks the page to refetch so the finished
// quote row replaces the lead. It never navigates to /rep/quotes/new.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

vi.mock('../../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/api')>();
  return { ...actual, convertInboundOpportunity: vi.fn() };
});

import { convertInboundOpportunity, type InboundRow } from '../../../services/api';
import { RoutingTable } from './RoutingTable';

const convertMock = convertInboundOpportunity as unknown as ReturnType<typeof vi.fn>;

function menuDrop(overrides: Partial<InboundRow> = {}): InboundRow {
  return {
    kind: 'opportunity',
    id: 'opp-1',
    source: 'standing_page',
    source_label: 'Cold landing',
    payload_type: 'menu',
    contact_name: 'Chef David',
    contact_email: 'moose+test@tomarket.com',
    contact_phone: null,
    restaurant_name: 'Mercantile TEST',
    status: 'assigned',
    assigned_rep: { id: 'rep-1', name: 'Paul' },
    age_days: 0,
    artifact: { type: 'Menu', id: 'menu-1', name: 'Menu Text' },
    ...overrides,
  } as InboundRow;
}

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="path">{loc.pathname}</div>;
}

function renderTable(rows: InboundRow[], onRefresh = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/distributor-admin/command-center/inbound']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <RoutingTable rows={rows} reps={[]} onForward={vi.fn()} canForward onRefresh={onRefresh} />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
  return onRefresh;
}

describe('RoutingTable: Build Quote on a menu drop', () => {
  beforeEach(() => {
    convertMock.mockReset();
    window.innerWidth = 1280;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('calls convert, shows it building, and never navigates to /rep/quotes/new', async () => {
    convertMock.mockResolvedValue({ data: { status: 'processing', menu_id: 'menu-1' } });
    const onRefresh = renderTable([menuDrop()]);

    fireEvent.click(screen.getByRole('button', { name: 'Build Quote' }));

    await waitFor(() => expect(convertMock).toHaveBeenCalledWith('opp-1'));
    expect(await screen.findByText('Building quote…')).toBeTruthy();
    expect(screen.getByTestId('path').textContent).toBe('/distributor-admin/command-center/inbound');
    expect(screen.getByTestId('path').textContent).not.toContain('/rep/quotes/new');
    expect(onRefresh).toHaveBeenCalled();
  });

  it('is offered even when no rep is assigned yet', () => {
    renderTable([menuDrop({ assigned_rep: null, status: 'new' })]);
    expect(screen.getByRole('button', { name: 'Build Quote' })).toBeTruthy();
    expect(screen.queryByText('Assign first')).toBeNull();
  });

  it('fires once on a double click', async () => {
    let resolve!: (v: unknown) => void;
    convertMock.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderTable([menuDrop()]);

    // Both clicks in ONE act, so no re-render (and no disabled attribute)
    // lands between them. That is the BUG #28 case the in-flight ref exists for.
    const btn = screen.getByRole('button', { name: 'Build Quote' }) as HTMLButtonElement;
    act(() => {
      btn.click();
      btn.click();
    });
    await act(async () => { resolve({ data: { status: 'processing', menu_id: 'menu-1' } }); });

    expect(convertMock).toHaveBeenCalledTimes(1);
  });

  it("shows the server's message and offers Retry when convert is refused", async () => {
    convertMock.mockResolvedValue({ error: 'No active catalog to quote against' });
    renderTable([menuDrop()]);

    fireEvent.click(screen.getByRole('button', { name: 'Build Quote' }));

    expect(await screen.findByText('No active catalog to quote against')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('keeps refetching while building, then stops after 3 minutes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    convertMock.mockResolvedValue({ data: { status: 'processing', menu_id: 'menu-1' } });
    const onRefresh = renderTable([menuDrop()]);

    fireEvent.click(screen.getByRole('button', { name: 'Build Quote' }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));

    await act(async () => { vi.advanceTimersByTime(5_000); });
    expect(onRefresh).toHaveBeenCalledTimes(2);

    await act(async () => { vi.advanceTimersByTime(10 * 60_000); });
    const calls = onRefresh.mock.calls.length;
    expect(calls).toBeLessThanOrEqual(1 + 36);
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(onRefresh.mock.calls.length).toBe(calls);
  });
});
