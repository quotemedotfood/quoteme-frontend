// MEP HOME: who is signed in (GET /api/v1/mep/me) and the account list with
// stars (MEP platform, part A, Moose 2026-11-13; see MepAccountList).
import { useEffect, useState } from 'react';
import { loadMepMe, clearMepSession, MepMe } from '../../services/mepApi';
import { MepFrame } from './MepFrame';
import { MepAccountList } from './MepAccountList';

export function MepHomePage() {
  const [me, setMe] = useState<MepMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

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
          <MepAccountList />
        </>
      )}
    </MepFrame>
  );
}
