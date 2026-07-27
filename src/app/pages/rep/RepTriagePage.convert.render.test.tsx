// RepTriagePage.convert.render.test.tsx
//
// BUG #28: handleConvert was gated only by the `converting` React state,
// which updates on the next render, so a fast double click/tap could re-enter
// handleConvert before that render lands and fire
// convertRepInboundOpportunity() twice for the same opportunity. It is now
// routed through useAsyncMutation's synchronous inFlightRef guard.
//
// Both the desktop and mobile shells render TriageBody (the page renders
// both trees at once and hides one via CSS, which jsdom doesn't honor), so
// each query below is scoped to the desktop shell to avoid ambiguous
// duplicate matches.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '../../contexts/AuthContext';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const { getRepIncomingQuotes, getRepInbound, convertRepInboundOpportunity } = vi.hoisted(() => {
  const inboundOpportunity = {
    kind: 'opportunity' as const,
    id: 'opp-1',
    source: 'website',
    source_label: 'Website',
    payload_type: 'brand_package',
    contact_name: 'Chef Jones',
    contact_email: 'chef@example.com',
    contact_phone: null,
    restaurant_name: 'Test Kitchen',
    status: 'new',
    assigned_rep: null,
    age_days: 0,
    received_at: '2026-01-01T00:00:00Z',
    artifact: null,
    brand_name: 'Acme Brand',
    brand_items: [{ product_name: 'Widget', pack_size: '10/1lb', sku: 'W-1', brand: 'Acme' }],
  };
  return {
    getRepIncomingQuotes: vi.fn(async () => ({ data: [] })),
    getRepInbound: vi.fn(async () => ({ data: [inboundOpportunity] })),
    convertRepInboundOpportunity: vi.fn(async (): Promise<{
      data?: { quote_id: string; line_count: number; matched_lines: number; status: string };
      error?: string;
    }> => ({
      data: { quote_id: 'quote-1', line_count: 1, matched_lines: 1, status: 'preview' },
    })),
  };
});

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    getRepIncomingQuotes,
    getRepInbound,
    convertRepInboundOpportunity,
  };
});

import { RepTriagePage } from './RepTriagePage';

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RepTriagePage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RepTriagePage - convert guard (BUG #28)', () => {
  beforeEach(() => {
    getRepIncomingQuotes.mockClear();
    getRepInbound.mockClear();
    convertRepInboundOpportunity.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('a synchronous double-click on "Build quote" fires convertRepInboundOpportunity exactly once', async () => {
    const gate = deferred<{
      data?: { quote_id: string; line_count: number; matched_lines: number; status: string };
      error?: string;
    }>();
    convertRepInboundOpportunity.mockImplementation(() => gate.promise);

    const { container } = renderPage();

    const desktopShell = container.querySelector('.hidden.md\\:block') as HTMLElement;
    await waitFor(() => {
      expect(within(desktopShell).getAllByText('Build quote').length).toBeGreaterThan(0);
    });

    const button = within(desktopShell).getAllByText('Build quote')[0].closest('button')!;
    fireEvent.click(button);
    fireEvent.click(button);

    expect(convertRepInboundOpportunity).toHaveBeenCalledTimes(1);
    expect(convertRepInboundOpportunity).toHaveBeenCalledWith('opp-1');

    await act(async () => {
      gate.resolve({ data: { quote_id: 'quote-1', line_count: 1, matched_lines: 1, status: 'preview' } });
    });

    expect(convertRepInboundOpportunity).toHaveBeenCalledTimes(1);
  });
});
