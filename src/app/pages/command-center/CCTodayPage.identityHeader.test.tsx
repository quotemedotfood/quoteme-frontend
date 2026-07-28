// CCTodayPage.identityHeader.test.tsx
//
// Constitution XV (intuitive: identity obvious) + XXII (design: meaningful
// header, not buried). The Board's landing header now carries the
// distributor identity ("THE BOARD · [DISTRIBUTOR] · [DAY]") instead of
// leaving it only in the sidebar footer. Reuses the getDistributorHome
// payload already fetched by this page -- no new network call.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const {
  getDistributorHome,
  getCommandCenterInbound,
  getDistributorAdminReps,
  getCommandCenterUnassigned,
  getCommandCenterQuotes,
  getCommandCenterRepActivity,
} = vi.hoisted(() => ({
  getDistributorHome: vi.fn(),
  getCommandCenterInbound: vi.fn(),
  getDistributorAdminReps: vi.fn(),
  getCommandCenterUnassigned: vi.fn(),
  getCommandCenterQuotes: vi.fn(),
  getCommandCenterRepActivity: vi.fn(),
}));

vi.mock('../../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/api')>();
  return {
    ...actual,
    getDistributorHome,
    getCommandCenterInbound,
    getDistributorAdminReps,
    getCommandCenterUnassigned,
    getCommandCenterQuotes,
    getCommandCenterRepActivity,
  };
});

import { CCTodayPage } from './CCTodayPage';

function mockEmptyBoardData() {
  getCommandCenterInbound.mockResolvedValue({ data: [] });
  getDistributorAdminReps.mockResolvedValue({ data: [] });
  getCommandCenterUnassigned.mockResolvedValue({ data: { items: [], reps: [] } });
  getCommandCenterQuotes.mockResolvedValue({ data: [] });
  getCommandCenterRepActivity.mockResolvedValue({ data: [] });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/distributor-admin/command-center']}>
      <CCTodayPage />
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CCTodayPage: board header identity', () => {
  it('shows the distributor name alongside the board label in the header', async () => {
    mockEmptyBoardData();
    getDistributorHome.mockResolvedValue({
      data: {
        distributor_name: 'The Fish Guys',
        has_catalog: true,
        catalog_product_count: 42,
        rep_count: 3,
        quote_count: 10,
        slug: 'the-fish-guys',
      },
    });

    renderPage();

    expect(await screen.findByText('The Fish Guys')).toBeInTheDocument();
    expect(screen.getByText('THE BOARD')).toBeInTheDocument();
  });

  it('falls back to just the board label and day when the distributor name is missing', async () => {
    mockEmptyBoardData();
    getDistributorHome.mockResolvedValue({
      data: {
        distributor_name: '',
        has_catalog: true,
        catalog_product_count: 0,
        rep_count: 0,
        quote_count: 0,
        slug: null,
      },
    });

    renderPage();

    expect(await screen.findByText('THE BOARD')).toBeInTheDocument();
    expect(screen.queryByTestId('board-distributor-identity')).not.toBeInTheDocument();
  });
});
