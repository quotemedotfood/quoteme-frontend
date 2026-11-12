// QM admin Feedback: the diners' voice notes, newest first as the server
// sends them, with a player while a recording is kept, Mark reviewed, and
// Delete audio behind a confirm (Moose 2026-11-12: kept recordings are
// deleted by hand). Every change tells the sidebar badge the new count.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({
  getAdminFeedbackMemos: vi.fn(),
  reviewAdminFeedbackMemo: vi.fn(),
  deleteAdminFeedbackAudio: vi.fn(),
  getAdminFeedbackAttentionCount: vi.fn(),
}));
vi.mock('../../services/adminApi', () => m);

import { QMAdminFeedback } from './QMAdminFeedback';
import { FEEDBACK_CHANGED_EVENT } from '../../components/admin/FeedbackNavBadge';

afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); });

const memo = (id: string, extra: Record<string, unknown> = {}) => ({
  id, text: `Words ${id}`, transcript_source: 'server', screen: '/v/jacks-on-pearl-denver/menu',
  restaurant: { id: 'r1', name: "Jack's on Pearl" }, share: 'restaurant', duration_ms: 4000,
  created_at: '2026-11-12T20:15:00Z', recorded_at: '2026-11-12T20:14:58Z', transcription_state: 'done',
  transcription_error: null, reviewed_at: null, audio_deleted_at: null,
  audio_url: `https://api.example/rails/active_storage/blobs/redirect/x/${id}.webm`, ...extra,
});

function page(memos: ReturnType<typeof memo>[], attention = memos.filter((x) => !x.reviewed_at).length) {
  return { data: { memos, page: 1, per_page: 50, total: memos.length, attention_count: attention } };
}

function counts() {
  const seen: Array<number | undefined> = [];
  const on = (e: Event) => seen.push((e as CustomEvent).detail?.attentionCount);
  window.addEventListener(FEEDBACK_CHANGED_EVENT, on);
  return { seen, stop: () => window.removeEventListener(FEEDBACK_CHANGED_EVENT, on) };
}

describe('QMAdminFeedback', () => {
  it('lists the notes in the order sent, with words, restaurant, share and a player when audio is kept', async () => {
    m.getAdminFeedbackMemos.mockResolvedValue(page([
      memo('a'),
      memo('b', { share: 'none', restaurant: null, audio_url: null, audio_deleted_at: '2026-11-12T20:16:00Z' }),
      memo('c', { text: null, transcription_state: 'failed', transcription_error: 'Could not read the recording', reviewed_at: '2026-11-12T21:00:00Z' }),
    ]));
    render(<QMAdminFeedback />);
    const rows = await screen.findAllByTestId(/feedback-row-/);
    expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual(['feedback-row-a', 'feedback-row-b', 'feedback-row-c']);

    expect(rows[0].textContent).toContain('Words a');
    expect(rows[0].textContent).toContain("Jack's on Pearl");
    expect(rows[0].textContent).toContain('Share: Restaurant');
    const player = rows[0].querySelector('audio');
    expect(player).not.toBeNull();
    expect(player!.getAttribute('src')).toContain('/a.webm');
    expect(within(rows[0]).getByText('Mark reviewed')).toBeTruthy();
    expect(within(rows[0]).getByText('Delete audio')).toBeTruthy();

    expect(rows[1].querySelector('audio')).toBeNull();
    expect(rows[1].textContent).toContain('Recording deleted.');
    expect(rows[1].textContent).toContain('Share: Only us');
    expect(within(rows[1]).queryByText('Delete audio')).toBeNull();

    expect(rows[2].textContent).toContain('Could not read the recording');
    expect(within(rows[2]).queryByText('Mark reviewed')).toBeNull();
  });

  it('marks a note reviewed and tells the badge the new count', async () => {
    m.getAdminFeedbackMemos.mockResolvedValue(page([memo('a'), memo('b')]));
    m.reviewAdminFeedbackMemo.mockResolvedValue({ data: { memo: memo('a', { reviewed_at: '2026-11-12T21:00:00Z' }), attention_count: 1 } });
    const c = counts();
    render(<QMAdminFeedback />);
    const row = await screen.findByTestId('feedback-row-a');
    await waitFor(() => expect(c.seen).toContain(2));
    fireEvent.click(within(row).getByText('Mark reviewed'));
    await waitFor(() => expect(m.reviewAdminFeedbackMemo).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(within(screen.getByTestId('feedback-row-a')).queryByText('Mark reviewed')).toBeNull());
    expect(c.seen[c.seen.length - 1]).toBe(1);
    c.stop();
  });

  it('deletes kept audio only after a confirm, and keeps the words', async () => {
    m.getAdminFeedbackMemos.mockResolvedValue(page([memo('a')]));
    m.deleteAdminFeedbackAudio.mockResolvedValue({
      data: { memo: memo('a', { audio_url: null, audio_deleted_at: '2026-11-12T21:05:00Z' }), attention_count: 1 },
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<QMAdminFeedback />);
    const row = await screen.findByTestId('feedback-row-a');

    fireEvent.click(within(row).getByText('Delete audio'));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(m.deleteAdminFeedbackAudio).not.toHaveBeenCalled();

    fireEvent.click(within(row).getByText('Delete audio'));
    await waitFor(() => expect(m.deleteAdminFeedbackAudio).toHaveBeenCalledWith('a'));
    await waitFor(() => expect(screen.getByTestId('feedback-row-a').querySelector('audio')).toBeNull());
    expect(screen.getByTestId('feedback-row-a').textContent).toContain('Words a');
    expect(screen.getByTestId('feedback-row-a').textContent).toContain('Recording deleted.');
  });

  it('shows the reason when a change is refused', async () => {
    m.getAdminFeedbackMemos.mockResolvedValue(page([memo('a')]));
    m.reviewAdminFeedbackMemo.mockResolvedValue({ error: 'Note not found', status: 404 });
    render(<QMAdminFeedback />);
    fireEvent.click(within(await screen.findByTestId('feedback-row-a')).getByText('Mark reviewed'));
    expect((await screen.findByRole('alert')).textContent).toContain('Note not found');
  });

  it('says so when there is no feedback yet', async () => {
    m.getAdminFeedbackMemos.mockResolvedValue(page([]));
    render(<QMAdminFeedback />);
    expect(await screen.findByText('No feedback yet.')).toBeTruthy();
  });
});
