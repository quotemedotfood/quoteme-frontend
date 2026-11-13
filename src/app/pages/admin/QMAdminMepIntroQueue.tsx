// QM ADMIN: THE MEP INTRO QUEUE (MEP platform part B, Moose 2026-11-13).
// /qm-admin/mep-intros. Every MEP's starred people ("I can make this
// intro"), newest first, with the account each works at, so Moose can ask
// the MEP for the intro. READER of GET /api/v1/admin/mep_connections/starred.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getMepIntroQueue, MepIntroQueueRow } from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';
import { personName, accountLabel } from '../../components/mep/PeopleList';

export function QMAdminMepIntroQueue() {
  const [rows, setRows] = useState<MepIntroQueueRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getMepIntroQueue().then((res) => {
      if (!live) return;
      if (res.data) setRows(res.data);
      else setError(res.error || 'Failed to load');
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <Link to="/qm-admin/meps" className="text-sm text-[#7FAEC2] hover:underline">MEPs</Link>
      <h1 className="text-2xl font-bold text-[#2A2A2A] mt-1 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
        Intro queue
      </h1>
      <p className="text-sm text-gray-500 mb-6">People an MEP starred as an intro they can make.</p>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!rows && !error && <p className="text-sm text-gray-400">Loading…</p>}
      {rows && rows.length === 0 && <p className="text-sm text-gray-500">No starred people yet.</p>}
      {rows && rows.length > 0 && (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3" data-testid="intro-queue-row">
              <p className="text-sm font-medium text-[#2A2A2A]">
                {personName(r)}
                <span className="font-normal text-gray-500">{[r.position, r.company].filter(Boolean).length ? ` · ${[r.position, r.company].filter(Boolean).join(' at ')}` : ''}</span>
              </p>
              <p className="text-xs text-gray-600">
                {r.linked_account ? accountLabel(r.linked_account) : 'Not linked to an account yet'}
              </p>
              <p className="text-xs text-gray-500">
                Ask <Link to={`/qm-admin/meps/${r.mep.id}/people`} className="text-[#7FAEC2] hover:underline">{r.mep.name}</Link>
                {' · '}
                <a href={r.linkedin_url} target="_blank" rel="noreferrer noopener" className="text-[#7FAEC2] hover:underline">LinkedIn</a>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
