// MEP HOME: who is signed in (GET /api/v1/mep/me) and the account list with
// stars (MEP platform, part A, Moose 2026-11-13; see MepAccountList).
import { useEffect, useState } from 'react';
import { loadMepMe, clearMepSession, MepMe } from '../../services/mepApi';
import { MepFrame } from './MepFrame';
import { MepAccountList } from './MepAccountList';
import { PeopleList, PeopleApi } from '../../components/mep/PeopleList';
import { getMepPeople, importMepPeople, linkMepPerson, unlinkMepPerson, setMepPersonStar } from '../../services/mepApi';

// The MEP's own people (part B). Module level so the list does not reload on every render.
const MEP_PEOPLE_API: PeopleApi = {
  list: getMepPeople,
  importText: importMepPeople,
  link: linkMepPerson,
  unlink: unlinkMepPerson,
  star: setMepPersonStar,
};

// A QM admin viewing as this MEP: no star (the server refuses every write too).
const MEP_PEOPLE_API_VIEW_ONLY: PeopleApi = { ...MEP_PEOPLE_API, star: undefined };

type Tab = 'accounts' | 'people';

export function MepHomePage() {
  const [me, setMe] = useState<MepMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [tab, setTab] = useState<Tab>('accounts');

  useEffect(() => {
    let live = true;
    loadMepMe().then((res) => {
      if (!live) return;
      if (res.data) setMe(res.data);
      else setError(res.status === 401 ? 'You are not signed in. Use the link in your sign-in email, or ask for a new one.' : res.error || 'Something went wrong. Try again.');
    });
    return () => {
      live = false;
    };
  }, []);

  function signOut() {
    clearMepSession();
    setMe(null);
    setSignedOut(true);
  }

  return (
    <MepFrame wide={!!me}>
      {signedOut && <p className="text-sm text-gray-600">You are signed out.</p>}
      {!signedOut && error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!signedOut && !error && !me && <p className="text-sm text-gray-500">Loading…</p>}
      {me && (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
            <p className="text-sm text-gray-600">
              Signed in as <span className="text-[#2A2A2A] font-medium">{me.name}</span> ({me.email})
            </p>
            <button type="button" onClick={signOut} className="text-sm text-[#7FAEC2] hover:underline">
              Sign out
            </button>
          </div>
          {me.viewing_as_admin && (
            <p role="status" className="text-sm bg-[#FFF6E5] border border-[#E8B04B] rounded-md px-3 py-2 mb-4">
              Viewing as {me.name}. View only: nothing can be changed. This view ends after one hour.
            </p>
          )}
          <div role="tablist" className="flex gap-4 border-b border-gray-200 mb-4">
            {(['accounts', 'people'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`pb-2 text-sm font-medium ${tab === t ? 'border-b-2 border-[#7FAEC2] text-[#2A2A2A]' : 'text-gray-500'}`}
              >
                {t === 'accounts' ? 'Accounts' : 'People'}
              </button>
            ))}
          </div>
          {tab === 'accounts' ? (
            <MepAccountList viewOnly={!!me.viewing_as_admin} />
          ) : (
            <PeopleList
              api={me.viewing_as_admin ? MEP_PEOPLE_API_VIEW_ONLY : MEP_PEOPLE_API}
              intro="Your LinkedIn connections. Link each one to the account they work at, and star the people you can introduce us to."
            />
          )}
        </>
      )}
    </MepFrame>
  );
}
