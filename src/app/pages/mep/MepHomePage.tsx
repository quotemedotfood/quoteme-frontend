// MEP HOME (MEPs + Hotels epic, step 2): a placeholder. Shows who is
// signed in, from GET /api/v1/mep/me. The account list comes in step 3.
import { useEffect, useState } from 'react';
import { loadMepMe, clearMepSession, MepMe } from '../../services/mepApi';
import { MepFrame } from './MepFrame';

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
    <MepFrame>
      {signedOut && <p className="text-sm text-gray-600">You are signed out.</p>}
      {!signedOut && error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!signedOut && !error && !me && <p className="text-sm text-gray-500">Loading…</p>}
      {me && (
        <>
          <p className="text-base text-[#2A2A2A]">Signed in as {me.name}</p>
          <p className="text-sm text-gray-500 mb-6">{me.email}</p>
          <button type="button" onClick={signOut} className="text-sm text-[#7FAEC2] hover:underline">
            Sign out
          </button>
        </>
      )}
    </MepFrame>
  );
}
