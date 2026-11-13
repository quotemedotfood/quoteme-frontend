// THE MEP INTRO QUEUE (MEP platform part B): every MEP's starred people,
// with the account and the MEP to ask.
//
// @vitest-environment jsdom
import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const m = vi.hoisted(() => ({ getMepIntroQueue: vi.fn() }));
vi.mock('../../services/adminApi', () => m);

import { QMAdminMepIntroQueue } from './QMAdminMepIntroQueue';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('Q1 lists who can make which intro, with the account and the MEP to ask', async () => {
  m.getMepIntroQueue.mockResolvedValue({ data: [{
    id: 'p3', first_name: 'Ana', last_name: 'Ruiz', linkedin_url: 'https://www.linkedin.com/in/ana-ruiz', company: 'The Crawford',
    position: 'GM', connected_on: null, starred: true, linked_account: { account_type: 'hotel', id: 'h1', name: 'The Crawford' },
    starred_at: '2026-11-13T20:00:00Z', mep: { id: 'm1', name: 'Kirk Jorgensen' },
  }] });
  render(<MemoryRouter><QMAdminMepIntroQueue /></MemoryRouter>);
  const row = await screen.findByTestId('intro-queue-row');
  expect(row.textContent).toContain('Ana Ruiz · GM at The Crawford');
  expect(row.textContent).toContain('The Crawford · Hotel');
  expect(screen.getByRole('link', { name: 'Kirk Jorgensen' }).getAttribute('href')).toBe('/qm-admin/meps/m1/people');
});

it('Q1 says so when nobody is starred', async () => {
  m.getMepIntroQueue.mockResolvedValue({ data: [] });
  render(<MemoryRouter><QMAdminMepIntroQueue /></MemoryRouter>);
  expect(await screen.findByText('No starred people yet.')).toBeTruthy();
});
