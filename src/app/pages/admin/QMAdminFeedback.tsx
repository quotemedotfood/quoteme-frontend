// QM admin Feedback: the diners' voice notes from the PairMe star (Moose
// 2026-11-12). Newest first. Each note shows its words, where it came from,
// who it may be shared with, and the recording while one is kept.
//
// READS GET /api/v1/admin/feedback_memos. WRITES PATCH .../:id/review (Mark
// reviewed) and DELETE .../:id/audio (Delete audio: kept recordings are
// deleted by hand, never on a timer). Each change tells the sidebar badge
// (needing attention = not yet reviewed).
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import {
  getAdminFeedbackMemos,
  reviewAdminFeedbackMemo,
  deleteAdminFeedbackAudio,
  AdminFeedbackMemo,
} from '../../services/adminApi';
import { announceFeedbackChanged } from '../../components/admin/FeedbackNavBadge';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';

const SHARE_LABEL: Record<AdminFeedbackMemo['share'], string> = {
  none: 'Only us',
  restaurant: 'Restaurant',
  public: 'Public',
};

function when(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function words(m: AdminFeedbackMemo): string {
  if (m.text) return m.text;
  if (m.transcription_state === 'pending') return 'Reading the recording...';
  if (m.transcription_state === 'failed') return 'Could not read the recording.';
  return 'No words heard.';
}

export function QMAdminFeedback() {
  const [memos, setMemos] = useState<AdminFeedbackMemo[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      const res = await getAdminFeedbackMemos(page);
      if (!live) return;
      if (res.data) {
        setMemos(res.data.memos);
        setTotal(res.data.total);
        setPerPage(res.data.per_page);
        setError(null);
        announceFeedbackChanged(res.data.attention_count);
      } else {
        setError(res.error || 'Could not load feedback.');
      }
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [page]);

  function replace(updated: AdminFeedbackMemo) {
    setMemos((list) => list.map((m) => (m.id === updated.id ? updated : m)));
  }

  async function markReviewed(m: AdminFeedbackMemo) {
    setBusy(m.id);
    const res = await reviewAdminFeedbackMemo(m.id);
    setBusy(null);
    if (res.data) {
      replace(res.data.memo);
      announceFeedbackChanged(res.data.attention_count);
      setError(null);
    } else {
      setError(res.error || 'Could not mark it reviewed.');
    }
  }

  async function deleteAudio(m: AdminFeedbackMemo) {
    if (!window.confirm('Delete this recording? The words stay. This cannot be undone.')) return;
    setBusy(m.id);
    const res = await deleteAdminFeedbackAudio(m.id);
    setBusy(null);
    if (res.data) {
      replace(res.data.memo);
      announceFeedbackChanged(res.data.attention_count);
      setError(null);
    } else {
      setError(res.error || 'Could not delete the recording.');
    }
  }

  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1 className="text-2xl font-semibold text-[#2A2A2A] mb-1">Feedback</h1>
      <p className="text-sm text-[#4F4F4F] mb-6">Voice notes from diners in PairMe. Newest first.</p>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && memos.length === 0 ? (
        <p className="text-sm text-[#4F4F4F]">Loading...</p>
      ) : memos.length === 0 ? (
        <p className="text-sm text-[#4F4F4F]">No feedback yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {memos.map((m) => (
            <li
              key={m.id}
              data-testid={`feedback-row-${m.id}`}
              className={`rounded-lg border bg-white p-4 ${m.reviewed_at ? 'border-gray-200' : 'border-[#DC2626]/40'}`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#4F4F4F] mb-2">
                <span>{when(m.created_at)}</span>
                <span>{m.restaurant ? m.restaurant.name : 'No restaurant'}</span>
                <span>Share: {SHARE_LABEL[m.share]}</span>
                <span className="font-mono">{m.screen}</span>
                {m.reviewed_at ? <span>Reviewed {when(m.reviewed_at)}</span> : <span className="text-[#DC2626] font-medium">Needs review</span>}
              </div>

              <p className="text-sm text-[#2A2A2A] whitespace-pre-wrap">{words(m)}</p>
              {m.transcription_state === 'failed' && m.transcription_error && (
                <p className="mt-1 text-xs text-[#DC2626]">{m.transcription_error}</p>
              )}

              {m.audio_url ? (
                <audio controls preload="none" src={m.audio_url} className="mt-3 w-full" aria-label="Recording" />
              ) : (
                <p className="mt-2 text-xs text-gray-400">{m.audio_deleted_at ? 'Recording deleted.' : 'No recording kept.'}</p>
              )}

              <div className="mt-3 flex gap-2">
                {!m.reviewed_at && (
                  <Button size="sm" onClick={() => markReviewed(m)} disabled={busy === m.id}>
                    Mark reviewed
                  </Button>
                )}
                {m.audio_url && (
                  <Button size="sm" variant="outline" onClick={() => deleteAudio(m)} disabled={busy === m.id}>
                    Delete audio
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center gap-3 text-sm">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Newer
          </Button>
          <span>
            Page {page} of {pages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Older
          </Button>
        </div>
      )}
    </div>
  );
}
