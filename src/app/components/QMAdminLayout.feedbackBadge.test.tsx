// The QM admin sidebar's Feedback item carries a RED number: the voice notes
// needing attention, which means not yet reviewed (Moose 2026-11-12). It
// updates when the Feedback page reports a change, and hides at zero.
//
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

const m = vi.hoisted(() => ({ getAdminFeedbackAttentionCount: vi.fn() }));
vi.mock('../services/adminApi', () => m);
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'quoteme_admin' }, isLoading: false, logout: vi.fn() }),
}));

import { QMAdminLayout } from './QMAdminLayout';
import { announceFeedbackChanged } from './admin/FeedbackNavBadge';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

function renderLayout() {
  render(
    <MemoryRouter initialEntries={['/qm-admin']}>
      <Routes>
        <Route path="/qm-admin" element={<QMAdminLayout />} />
      </Routes>
    </MemoryRouter>,
  );
}

function desktopFeedbackLink() {
  return screen.getAllByRole('link', { name: /Feedback/ }).find((a) => a.className.includes('gap-3'))!;
}

describe('QMAdminLayout: Feedback badge', () => {
  it('shows a Feedback item with a red count of notes needing attention', async () => {
    m.getAdminFeedbackAttentionCount.mockResolvedValue({ data: { attention_count: 3 } });
    renderLayout();
    const link = desktopFeedbackLink();
    expect(link.getAttribute('href')).toBe('/qm-admin/feedback');
    const badge = await within(link).findByTestId('feedback-attention-badge');
    expect(badge.textContent).toBe('3');
    expect(badge.className).toContain('bg-[#DC2626]');
  });

  it('updates when the Feedback page reports a new count, and hides at zero', async () => {
    m.getAdminFeedbackAttentionCount.mockResolvedValue({ data: { attention_count: 2 } });
    renderLayout();
    expect((await within(desktopFeedbackLink()).findByTestId('feedback-attention-badge')).textContent).toBe('2');

    act(() => announceFeedbackChanged(1));
    expect(within(desktopFeedbackLink()).getByTestId('feedback-attention-badge').textContent).toBe('1');

    act(() => announceFeedbackChanged(0));
    expect(within(desktopFeedbackLink()).queryByTestId('feedback-attention-badge')).toBeNull();
  });

  it('asks the server again when a change has no count', async () => {
    m.getAdminFeedbackAttentionCount
      .mockResolvedValueOnce({ data: { attention_count: 5 } })
      .mockResolvedValue({ data: { attention_count: 4 } });
    renderLayout();
    expect((await within(desktopFeedbackLink()).findByTestId('feedback-attention-badge')).textContent).toBe('5');
    act(() => announceFeedbackChanged());
    await waitFor(() => expect(within(desktopFeedbackLink()).getByTestId('feedback-attention-badge').textContent).toBe('4'));
  });

  it('shows no number at zero or when the count cannot be read', async () => {
    m.getAdminFeedbackAttentionCount.mockResolvedValue({ error: 'Forbidden', status: 403 });
    renderLayout();
    await waitFor(() => expect(m.getAdminFeedbackAttentionCount).toHaveBeenCalled());
    expect(screen.queryByTestId('feedback-attention-badge')).toBeNull();
  });
});
