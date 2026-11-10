// MERC SIGN-IN (Mercs + Hotels epic, step 2). The emailed link lands here:
// /merc/sign-in?token=<token>. Outside RootLayout, no sign-in needed. Trades
// the token once (mercApi.consumeMercLink) and goes to /merc.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { consumeMercLink } from '../../services/mercApi';
import { MercFrame } from './MercFrame';

export function MercSignInPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    const token = params.get('token') || '';
    if (!token) {
      setError('This link is missing its code. Ask for a new sign-in link.');
      return;
    }
    consumeMercLink(token).then((res) => {
      if (res.data) navigate('/merc', { replace: true });
      else setError(res.error || 'That link did not work. Ask for a new one.');
    });
  }, [params, navigate]);

  return (
    <MercFrame>
      {error ? (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-sm text-gray-500">Signing you in…</p>
      )}
    </MercFrame>
  );
}
