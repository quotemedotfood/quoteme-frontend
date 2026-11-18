/**
 * Moose's status board (Moose 2026-11-17). Table one: a row per agent seat,
 * written by the seat. Table two: a row per repo, read from GitHub by a
 * background job. The page reloads its data every 30 seconds while open
 * (v2), raises a desktop alert when a seat turns red, a seat writes to
 * Moose, or a repo turns red, and lets Moose reply to a seat.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getStatusBoard, markSeatSeen, replyToSeat, type BoardLight, type BoardPull, type BoardRepo, type BoardSeat, type StatusBoardResponse } from '../../services/adminApi';

// v2 (Assemblage 11-18, Moose's ask): poll every 30 seconds while the page
// is open, so desktop alerts arrive in time. (Was 30 minutes, 11-17.)
const REFRESH_MS = 30_000;
const MAX_REPLY = 300;

type Alert = { title: string; body: string };

// What changed between two loads that Moose should hear about: a seat turned
// red, a seat sent a new message, a repo turned red (a PR waits on his merge).
function alertsBetween(before: StatusBoardResponse, after: StatusBoardResponse): Alert[] {
  const out: Alert[] = [];
  const seatBefore = new Map(before.seats.map((s) => [s.seat, s]));
  after.seats.forEach((s) => {
    const was = seatBefore.get(s.seat);
    if (s.light === 'red' && was?.light !== 'red') out.push({ title: `${s.seat} is stuck`, body: s.working_on || 'Needs you.' });
    if (s.to_moose_new && s.to_moose && s.to_moose_at !== was?.to_moose_at) out.push({ title: `${s.seat} wrote to you`, body: s.to_moose });
  });
  const repoBefore = new Map(before.repos.map((r) => [r.repo, r]));
  after.repos.forEach((r) => {
    if (r.light === 'red' && repoBefore.get(r.repo)?.light !== 'red') {
      out.push({ title: `${r.repo}: ready for your merge`, body: r.ready.map((p) => `#${p.number} ${p.title}`).join(', ').slice(0, 200) });
    }
  });
  return out;
}

function notify(alerts: Alert[]) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  alerts.forEach((a) => {
    const n = new Notification(a.title, { body: a.body, tag: a.title });
    n.onclick = () => { window.focus(); n.close(); };
  });
}

function MessageCell({ s, onChanged }: { s: BoardSeat; onChanged: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await replyToSeat(s.seat, text.trim());
    setBusy(false);
    if (res.error) setError(res.error);
    else { setText(''); onChanged(); }
  }

  async function seen() {
    await markSeatSeen(s.seat);
    onChanged();
  }

  const last = (s.to_seat || []).slice(-1)[0];
  return (
    <div className="min-w-[220px]">
      {s.to_moose ? (
        <p className={`text-[#2A2A2A] ${s.to_moose_new ? 'font-semibold' : ''}`}>
          {s.to_moose_new && <span className="text-xs mr-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">new</span>}
          {s.to_moose}
          {s.to_moose_new && (
            <button type="button" onClick={seen} className="ml-2 text-xs text-[#3D7D99] underline underline-offset-2 font-normal">Seen</button>
          )}
        </p>
      ) : <span className="text-gray-300">-</span>}
      {last && (
        <p className="text-xs text-[#4F4F4F] mt-1">You: {last.text} <span className="italic">{last.read_at ? '(read)' : '(not read yet)'}</span></p>
      )}
      <div className="flex gap-1 mt-1.5">
        <input
          value={text}
          maxLength={MAX_REPLY}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) send(); }}
          placeholder={`Reply to ${s.seat}`}
          className="border border-gray-300 rounded px-2 py-1 text-xs flex-1 min-w-0"
        />
        <button type="button" onClick={send} disabled={busy || !text.trim()} className="text-xs px-2 py-1 bg-[#2A2A2A] text-white rounded disabled:opacity-40">
          Send
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

const LIGHT_COLOR: Record<BoardLight, string> = { green: '#2E9E5B', yellow: '#E0A800', red: '#D64545' };
const SEAT_LIGHT_WORD: Record<BoardLight, string> = { green: 'Ready for the next task', yellow: 'Working', red: 'Stuck, needs Moose' };
const REPO_LIGHT_WORD: Record<BoardLight, string> = { green: 'Clear', yellow: 'In checks', red: 'Waiting on your merge' };

function ago(iso: string | null, now: number): string {
  if (!iso) return 'never';
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60} min ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

function Light({ light, word, dim }: { light: BoardLight; word: string; dim?: boolean }) {
  return (
    <span
      role="img"
      aria-label={word}
      title={word}
      className="inline-block rounded-full"
      style={{ width: 28, height: 28, backgroundColor: dim ? '#C9C9C9' : LIGHT_COLOR[light], boxShadow: dim ? 'none' : `0 0 0 4px ${LIGHT_COLOR[light]}33` }}
    />
  );
}

function SeatRow({ s, now, onChanged }: { s: BoardSeat; now: number; onChanged: () => void }) {
  return (
    <tr className={`border-b border-gray-100 align-top ${s.stale ? 'opacity-45' : ''} ${s.to_moose_new ? 'bg-red-50' : ''}`}>
      <td className="px-3 py-3 text-center"><Light light={s.light} word={SEAT_LIGHT_WORD[s.light]} dim={s.stale} /></td>
      <td className="px-3 py-3 font-semibold text-[#2A2A2A] whitespace-nowrap">{s.seat}</td>
      <td className="px-3 py-3 text-[#2A2A2A]">
        {s.working_on || <span className="italic text-[#4F4F4F]">{s.never_reported ? 'Has not reported yet' : 'Nothing listed'}</span>}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        {s.last_pr ? (
          <a href={s.last_pr.url} target="_blank" rel="noreferrer" className="text-[#3D7D99] underline underline-offset-2">{s.last_pr.label || 'PR'}</a>
        ) : <span className="text-gray-300">-</span>}
      </td>
      <td className="px-3 py-3">
        {s.documents.length > 0 ? (
          <ul className="space-y-1">
            {s.documents.map((d) => (
              <li key={d.url}><a href={d.url} target="_blank" rel="noreferrer" className="text-[#3D7D99] underline underline-offset-2">{d.label}</a></li>
            ))}
          </ul>
        ) : <span className="text-gray-300">-</span>}
      </td>
      <td className="px-3 py-3">
        {s.questions.length > 0 ? (
          <ol className="space-y-1.5">
            {s.questions.map((q) => (
              <li key={q.n} className="flex gap-2">
                <span className="font-semibold text-[#2A2A2A]">{q.n}.</span>
                <span className="text-[#2A2A2A]">
                  {q.text}{' '}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${q.blocks ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-[#4F4F4F]'}`}>
                    {q.blocks ? 'blocks' : 'does not block'}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : <span className="text-gray-300">-</span>}
      </td>
      <td className="px-3 py-3"><MessageCell s={s} onChanged={onChanged} /></td>
      <td className="px-3 py-3 text-xs text-[#4F4F4F] whitespace-nowrap">{ago(s.reported_at, now)}</td>
    </tr>
  );
}

function Pulls({ title, pulls, tone }: { title: string; pulls: BoardPull[]; tone: string }) {
  if (pulls.length === 0) return null;
  return (
    <div className="mb-2 last:mb-0">
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>{title} ({pulls.length})</p>
      <ul className="mt-0.5 space-y-0.5">
        {pulls.map((p) => (
          <li key={p.number}>
            <a href={p.url} target="_blank" rel="noreferrer" className="text-[#3D7D99] underline underline-offset-2">#{p.number}</a>{' '}
            <span className="text-[#2A2A2A]">{p.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RepoRow({ r, now, setUp }: { r: BoardRepo; now: number; setUp: boolean }) {
  const nothing = r.ready.length + r.ruling.length + r.checking.length + r.failing.length === 0;
  return (
    <tr className="border-b border-gray-100 align-top">
      <td className="px-3 py-3 text-center"><Light light={r.light} word={REPO_LIGHT_WORD[r.light]} dim={!setUp || !r.refreshed_at} /></td>
      <td className="px-3 py-3 whitespace-nowrap">
        <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-[#2A2A2A] underline underline-offset-2">{r.repo}</a>
        <p className="text-xs text-[#4F4F4F]">{r.open_count} open</p>
      </td>
      <td className="px-3 py-3">
        <Pulls title="Ready, waiting on your merge" pulls={r.ready} tone="text-red-700" />
        <Pulls title="Draft that passed, waiting on a ruling" pulls={r.ruling} tone="text-[#4F4F4F]" />
        <Pulls title="In checks" pulls={r.checking} tone="text-amber-700" />
        <Pulls title="Checks failed" pulls={r.failing} tone="text-[#4F4F4F]" />
        {nothing && <span className="text-[#4F4F4F] italic">{r.refreshed_at ? 'Nothing waiting.' : 'Not read yet.'}</span>}
        {r.error && <p className="text-xs text-red-600 mt-1">Last read failed: {r.error}</p>}
      </td>
      <td className="px-3 py-3 text-xs text-[#4F4F4F] whitespace-nowrap">{ago(r.refreshed_at, now)}</td>
    </tr>
  );
}

export function QMAdminProductPipeline() {
  const [board, setBoard] = useState<StatusBoardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<number>(Date.now());

  const previous = useRef<StatusBoardResponse | null>(null);
  const [permission, setPermission] = useState<string>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

  const load = useCallback(async () => {
    const res = await getStatusBoard();
    if (res.data) {
      if (previous.current) notify(alertsBetween(previous.current, res.data));
      previous.current = res.data;
      setBoard(res.data);
      setError(null);
    } else {
      setError(res.error || 'Could not load the board.');
    }
    setLoadedAt(Date.now());
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#4F4F4F]';

  return (
    <div className="px-6 py-6 max-w-[1500px] mx-auto">
      <div className="flex flex-wrap items-baseline gap-3 mb-1">
        <h1 className="text-2xl font-bold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>Status Board</h1>
        <span className="text-xs text-[#4F4F4F]">Reloads every 30 seconds. Last loaded {new Date(loadedAt).toLocaleTimeString()}.</span>
        <button type="button" onClick={load} className="text-xs text-[#3D7D99] underline underline-offset-2">Reload now</button>
        {permission === 'default' && (
          <button
            type="button"
            onClick={async () => setPermission(await Notification.requestPermission())}
            className="hidden md:inline-block text-xs px-2 py-1 border border-[#2A2A2A] rounded"
          >
            Turn on desktop alerts
          </button>
        )}
        {permission === 'granted' && <span className="hidden md:inline text-xs text-[#4F4F4F]">Desktop alerts on</span>}
        {permission === 'denied' && <span className="hidden md:inline text-xs text-[#4F4F4F]">Desktop alerts are blocked in this browser's settings</span>}
      </div>
      <p className="text-sm text-[#4F4F4F] mb-5">Who is doing what, and where you are the one being waited on.</p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {!board && !error && <p className="text-sm text-[#4F4F4F]">Loading…</p>}

      {board && (
        <>
          <h2 className="text-lg font-semibold text-[#2A2A2A] mb-2">Seats</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className={`${th} w-14`} />
                    <th className={th}>Seat</th>
                    <th className={th}>Working on</th>
                    <th className={th}>Last PR</th>
                    <th className={th}>For you to read</th>
                    <th className={th}>Questions for you</th>
                    <th className={th}>Message</th>
                    <th className={th}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {board.seats.map((s) => <SeatRow key={s.seat} s={s} now={loadedAt} onChanged={load} />)}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-[#4F4F4F] mb-8">
            Green: ready for the next task. Yellow: working. Red: stuck and needs you. A greyed row has not been updated
            for {board.stale_after_hours} hours.
          </p>

          <h2 className="text-lg font-semibold text-[#2A2A2A] mb-2">Repos</h2>
          {!board.repos_set_up && (
            <p className="text-sm text-amber-700 mb-2">GitHub is not connected yet, so this table is empty until the read-only token is set.</p>
          )}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className={`${th} w-14`} />
                    <th className={th}>Repo</th>
                    <th className={th}>Pull requests</th>
                    <th className={th}>Read</th>
                  </tr>
                </thead>
                <tbody>
                  {board.repos.map((r) => <RepoRow key={r.repo} r={r} now={loadedAt} setUp={board.repos_set_up} />)}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-[#4F4F4F]">
            Red: a PR that is not a draft has passed its checks and waits on your merge. Yellow: a PR is in checks. Green: clear.
          </p>
        </>
      )}
    </div>
  );
}
