// MEP PEOPLE (MEP platform part B, Moose 2026-11-13): one MEP's LinkedIn
// connections, shown to the MEP (MepHomePage, People tab) and to QM admin
// (QMAdminMepPeople). The server only SUGGESTS accounts from the company
// text; nothing is linked until a person presses Link on one suggestion
// (never on a name). LinkedIn is never fetched: the export file is read in
// the browser and sent as text.
import { useEffect, useRef, useState } from 'react';
import { Star, Linkedin, Link2, X } from 'lucide-react';
import type {
  MepPerson,
  MepPeoplePage,
  MepPeopleQuery,
  MepImportResult,
  MepAccountRef,
  MepAccountType,
} from '../../services/mepApi';

type Result<T> = { data?: T; error?: string };

export interface PeopleApi {
  list(query: MepPeopleQuery): Promise<Result<MepPeoplePage>>;
  importText(text: string): Promise<Result<MepImportResult>>;
  link(id: string, type: MepAccountType, accountId: string): Promise<Result<MepPerson>>;
  unlink(id: string): Promise<Result<MepPerson>>;
  /** The MEP's own star. Absent: the star is shown, not changed. */
  star?(id: string, starred: boolean): Promise<Result<{ starred: boolean }>>;
  /** QM admin only: add the company as a restaurant group and link it. */
  addGroup?(id: string): Promise<Result<MepPerson>>;
}

const TYPE_LABEL: Record<MepAccountType, string> = {
  hotel: 'Hotel',
  restaurant_group: 'Restaurant group',
  restaurant: 'Restaurant',
};

export function personName(p: Pick<MepPerson, 'first_name' | 'last_name'>): string {
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || 'No name';
}

export function accountLabel(a: MepAccountRef): string {
  const place = [a.city, a.state].filter(Boolean).join(', ');
  return [a.name || 'Removed account', TYPE_LABEL[a.account_type], place].filter(Boolean).join(' · ');
}

/** Reads a chosen file as text in the browser. */
export function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function PeopleList({ api, intro }: { api: PeopleApi; intro?: string }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<MepPeoplePage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [reload, setReload] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  useEffect(() => {
    let live = true;
    api.list({ q: query, starred: starredOnly, unlinked: unlinkedOnly, page }).then((res) => {
      if (!live) return;
      if (res.data) {
        setResult(res.data);
        setError(null);
      } else setError(res.error || 'Could not load the people.');
    });
    return () => {
      live = false;
    };
  }, [api, query, starredOnly, unlinkedOnly, page, reload]);

  function replace(row: MepPerson) {
    setResult((r) => r && { ...r, people: r.people.map((p) => (p.id === row.id ? row : p)) });
  }

  async function runImport(text: string) {
    if (!text.trim()) return;
    setBusy('import');
    setNotice(null);
    const res = await api.importText(text);
    setBusy(null);
    if (!res.data) {
      setError(res.error || 'The import did not go through.');
      return;
    }
    const { created, updated, refused } = res.data;
    const skipped = refused.length ? ` ${refused.length} skipped (no LinkedIn URL, lines ${refused.slice(0, 10).map((r) => r.line).join(', ')}${refused.length > 10 ? '…' : ''}).` : '';
    setNotice(`Added ${created}, updated ${updated}.${skipped}`);
    setPaste('');
    setPage(1);
    setReload((n) => n + 1);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    runImport(await readFileText(file));
  }

  async function act(key: string, call: () => Promise<Result<MepPerson>>) {
    if (busy) return;
    setBusy(key);
    const res = await call();
    setBusy(null);
    if (res.data) replace(res.data);
    else setError(res.error || 'That did not go through.');
  }

  async function toggleStar(p: MepPerson) {
    if (!api.star || busy) return;
    setBusy(`star:${p.id}`);
    const res = await api.star(p.id, !p.starred);
    setBusy(null);
    if (res.data) replace({ ...p, starred: res.data.starred });
    else setError(res.error || 'The star did not save.');
  }

  const pages = result ? Math.max(1, Math.ceil(result.total / result.per_page)) : 1;

  return (
    <section aria-label="People">
      {intro && <p className="text-sm text-gray-500 mb-3">{intro}</p>}

      <details className="mb-4 border border-gray-200 rounded-lg p-3">
        <summary className="text-sm font-medium text-[#2A2A2A] cursor-pointer">Add people from LinkedIn</summary>
        <p className="text-xs text-gray-500 mt-2">
          In LinkedIn: Settings, Data privacy, Get a copy of your data, Connections. Upload the Connections.csv it emails you, or paste rows
          (First Name, Last Name, URL, Email Address, Company, Position, Connected On). Email addresses are not kept.
        </p>
        <div className="flex flex-col gap-2 mt-3">
          <label className="text-sm text-[#7FAEC2] cursor-pointer w-fit">
            <input type="file" accept=".csv,text/csv" className="sr-only" aria-label="Upload Connections.csv" onChange={onFile} />
            Upload Connections.csv
          </label>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={3}
            aria-label="Paste rows"
            placeholder="Or paste rows here"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => runImport(paste)}
            disabled={!paste.trim() || busy === 'import'}
            className="self-start text-sm bg-[#A5CFDD] hover:bg-[#7FAEC2] disabled:opacity-50 text-white rounded-md px-3 py-1.5"
          >
            {busy === 'import' ? 'Adding…' : 'Add pasted rows'}
          </button>
        </div>
      </details>

      {notice && <p role="status" className="text-sm text-green-700 mb-2">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-600 mb-2">{error}</p>}

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, company, title"
          aria-label="Search people"
          className="flex-1 min-w-0 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 px-1">
          <input type="checkbox" checked={starredOnly} onChange={(e) => { setStarredOnly(e.target.checked); setPage(1); }} />
          Starred
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 px-1">
          <input type="checkbox" checked={unlinkedOnly} onChange={(e) => { setUnlinkedOnly(e.target.checked); setPage(1); }} />
          Not linked yet
        </label>
      </div>

      {result && result.people.length === 0 && <p className="text-sm text-gray-500 py-6">No people yet.</p>}

      {result && result.people.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {result.people.map((p) => (
            <li key={p.id} className="px-3 py-3" data-testid="mep-person-row">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleStar(p)}
                  disabled={!api.star || busy === `star:${p.id}`}
                  aria-pressed={p.starred}
                  aria-label={p.starred ? `Remove star from ${personName(p)}` : `Star ${personName(p)}`}
                  title={api.star ? 'I can make this intro' : p.starred ? 'The MEP can make this intro' : undefined}
                  className="shrink-0 p-1 rounded hover:bg-gray-100 disabled:hover:bg-transparent"
                >
                  <Star size={20} className={p.starred ? 'fill-[#E8B04B] text-[#E8B04B]' : 'text-gray-400'} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#2A2A2A]">
                    {personName(p)}
                    <a href={p.linkedin_url} target="_blank" rel="noreferrer noopener" className="inline-flex align-middle ml-2 text-[#7FAEC2]" aria-label={`${personName(p)} on LinkedIn`}>
                      <Linkedin size={14} />
                    </a>
                  </p>
                  <p className="text-xs text-gray-500">{[p.position, p.company].filter(Boolean).join(' at ') || 'No company'}</p>

                  {p.linked_account ? (
                    <p className="text-xs text-[#2A2A2A] mt-1 flex items-center gap-1" data-testid="person-linked">
                      <Link2 size={12} /> {accountLabel(p.linked_account)}
                      <button
                        type="button"
                        onClick={() => act(`unlink:${p.id}`, () => api.unlink(p.id))}
                        aria-label={`Remove the link for ${personName(p)}`}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </p>
                  ) : (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5" data-testid="person-suggestions">
                      {p.suggestions.length === 0 && <span className="text-xs text-gray-400">No match in our accounts</span>}
                      {p.suggestions.map((s) => (
                        <button
                          key={`${s.account_type}:${s.id}`}
                          type="button"
                          onClick={() => act(`link:${p.id}`, () => api.link(p.id, s.account_type, s.id))}
                          className="text-xs border border-[#A5CFDD] text-[#2A2A2A] rounded-full px-2 py-0.5 hover:bg-[#EEF6F9]"
                        >
                          Link: {accountLabel(s)}
                        </button>
                      ))}
                      {api.addGroup && p.suggestions.length === 0 && p.company && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Add "${p.company}" as a restaurant group and link ${personName(p)} to it?`)) {
                              act(`group:${p.id}`, () => api.addGroup!(p.id));
                            }
                          }}
                          className="text-xs text-[#7FAEC2] hover:underline"
                        >
                          Add {p.company} as a restaurant group
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {result && pages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((n) => n - 1)} className="text-[#7FAEC2] disabled:text-gray-300">Previous</button>
          <span className="text-gray-500">Page {page} of {pages} · {result.total} people</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((n) => n + 1)} className="text-[#7FAEC2] disabled:text-gray-300">Next</button>
        </div>
      )}
    </section>
  );
}
