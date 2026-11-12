// THE RED NUMBER on the QM admin sidebar's Feedback item (Moose 2026-11-12:
// "on the admin view there's a # flag in red, on the sidebar tab that shows
// the number of audio recordings needing attention").
//
// Needing attention = not yet reviewed. Reads
// GET /api/v1/admin/feedback_memos/attention_count on mount and again whenever
// the Feedback page announces a change (FEEDBACK_CHANGED_EVENT), so the number
// drops as soon as a note is marked reviewed. Shows nothing at zero or on an
// error.
import { useEffect, useState } from 'react';
import { getAdminFeedbackAttentionCount } from '../../services/adminApi';

export const FEEDBACK_CHANGED_EVENT = 'qm-admin:feedback-changed';

/** Tell the badge the count changed. Pass the new count when it is known. */
export function announceFeedbackChanged(attentionCount?: number) {
  window.dispatchEvent(new CustomEvent(FEEDBACK_CHANGED_EVENT, { detail: { attentionCount } }));
}

export function FeedbackNavBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let live = true;
    async function load() {
      const res = await getAdminFeedbackAttentionCount();
      if (live && res.data) setCount(res.data.attention_count);
    }
    function onChanged(e: Event) {
      const known = (e as CustomEvent<{ attentionCount?: number }>).detail?.attentionCount;
      if (typeof known === 'number') setCount(known);
      else load();
    }
    load();
    window.addEventListener(FEEDBACK_CHANGED_EVENT, onChanged);
    return () => {
      live = false;
      window.removeEventListener(FEEDBACK_CHANGED_EVENT, onChanged);
    };
  }, []);

  if (count <= 0) return null;
  return (
    <span
      data-testid="feedback-attention-badge"
      aria-label={`${count} to review`}
      className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[#DC2626] text-white text-[11px] font-semibold flex items-center justify-center"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
