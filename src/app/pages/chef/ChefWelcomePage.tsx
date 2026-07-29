import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { consumeChefMagicLink, requestNewChefMagicLink } from '../../services/api';
import type { ChefMagicLinkConsumeResponse } from '../../services/api';
import { useEstablishSession, clearPriorIdentityKeys } from '../../hooks/useSessionOnUse';
import { stripSeedPrefix } from '../../utils/format';
import { formatCurrency } from '../../utils/formatCurrency';

// V2 W4 — Justin/Moose lock: the page IS the quote arrival. No greeting,
// no "welcome", no account framing. Lead with rep + distributor + the
// quote that's waiting; one primary action → continue to the quote
// receipt. Envelope treatment per chat2 design lock.

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// Design tokens from colors_and_type.css (locked palette)
const C = {
  charcoal: '#2B2B2B',
  orange: '#F2993D',
  orangeHover: '#E8953A',
  lightBlue: '#A5CFDD',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  warmPaper: '#FBFAF7',
};

function eyebrow(size = 9.5): React.CSSProperties {
  return {
    ...sans,
    fontSize: size,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: C.gray700,
  };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch { return ''; }
}

function money(cents: number, currency?: string): string {
  return formatCurrency(cents, currency);
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase();
}

export function ChefWelcomePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const establishSession = useEstablishSession();

  const token = params.get('token') || '';

  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<ChefMagicLinkConsumeResponse | null>(null);
  const [errorCode, setErrorCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  // Refusal-page (2026-07-29, Justin's dead-end ruling): rep/distributor/
  // quote context for the expired-link screen. NOT populated by the BE
  // today (see the ApiResponse.rep/distributor/quote_reference comment in
  // api.ts) - stays undefined until the BE ships that extension, at which
  // point ExpiredLinkScreen picks these up automatically.
  const [errorRep, setErrorRep] = useState<{ name: string; email: string; phone: string | null } | null>(null);
  const [errorDistributor, setErrorDistributor] = useState<{ name: string } | null>(null);
  const [errorQuoteReference, setErrorQuoteReference] = useState<string | null>(null);

  // BUG #29: guards against a second consume call for the same token. A
  // single-use token that consume() has already burned MUST NOT be handed
  // to the backend again: a second network call for the same token always
  // comes back "already_used" even though the FIRST call actually
  // succeeded, which is exactly the wrongful lockout this bug report
  // describes. The `cancelled` flag alone doesn't prevent this: React 18
  // StrictMode double-invokes effects in dev (mount, cleanup, mount), and a
  // naive "bail out of the whole effect if already fired" guard would
  // discard the FIRST (real) in-flight request when that cleanup runs,
  // leaving the page stuck in loading forever.
  //
  // Instead, this ref caches the in-flight PROMISE per token, not just a
  // "did we fire" boolean. The first effect invocation creates the request;
  // any subsequent invocation for the same token (StrictMode's remount, or
  // this effect re-running because `establishSession` was recreated) reuses
  // that same promise instead of calling consumeChefMagicLink again. Only
  // one network call ever reaches the backend per token, and whichever
  // effect invocation is still mounted when it resolves processes the
  // result normally.
  const inFlightRef = useRef<{
    token: string;
    promise: ReturnType<typeof consumeChefMagicLink>;
  } | null>(null);

  useEffect(() => {
    // #29-residue: clear every prior-identity key (QM-admin token,
    // chef/legacy impersonation display names + audit event id, guest
    // token) at the VERY START of the open attempt, before the network call
    // even fires. BUG #29's fix only cleared these on a SUCCESSFUL consume
    // (inside useEstablishSession, below), so an ERRORED consume (an
    // already-burned single-use token, any 4xx) skipped establishSession
    // entirely and left a stale identity's keys in place - ImpersonationBanner
    // would then render a PRIOR admin/impersonation identity's banner
    // straight through the error screen. Clearing here, unconditionally,
    // covers both outcomes by construction: a failed open never restores a
    // prior identity, and a successful one still clears them a second time
    // (idempotent) inside establishSession as it always has.
    clearPriorIdentityKeys();

    if (!token) {
      setState('error');
      setErrorCode('invalid_token');
      return;
    }

    if (!inFlightRef.current || inFlightRef.current.token !== token) {
      inFlightRef.current = { token, promise: consumeChefMagicLink(token) };
    }
    const { promise } = inFlightRef.current;

    let cancelled = false;
    (async () => {
      const res = await promise;
      if (cancelled) return;

      if (res.data) {
        // Persist JWT + populate AuthContext.user + sync UserContext via the
        // shared session-establish helper (same steps this page always ran
        // inline). V2 P0-A/B fix: AuthContext was only validating on app
        // boot, so newly-stored JWTs from the magic-link flow left user as
        // null → DashboardRoleRouter fell through to rep dashboard and rep
        // sidebar. Forcing a /me roundtrip here populates AuthContext.user
        // with role: 'chef' before the chef navigates onward (on CTA click,
        // below - navigation is intentionally NOT part of this call so the
        // envelope can render immediately without waiting on it).
        const u = res.data.user;
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
        await establishSession(res.data.jwt, {
          fullName,
          email: u.email,
          phoneNumber: '',
          distributorName: res.data.quote.distributor?.name || '',
          plan: 'free',
          isGuest: false,
        });
        setData(res.data);
        setState('ready');
      } else {
        // BUG #39: `error`/`error_code` are the machine code (e.g.
        // 'expired', 'account_conflict'); `message` is the BE's
        // human-readable copy for that code, when it sends one. These are
        // no longer the same value - previously this fell back to
        // `res.error` (the code itself), which meant errorCopy() would
        // render the raw code string as if it were a message.
        setErrorCode(res.error_code || res.error || 'invalid_token');
        setErrorMsg(res.message || '');
        setErrorRep(res.rep || null);
        setErrorDistributor(res.distributor || null);
        setErrorQuoteReference(res.quote_reference || null);
        setState('error');
      }
    })();

    return () => { cancelled = true; };
  }, [token, establishSession]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div
            className="w-10 h-10 rounded-full border-4"
            style={{ borderColor: C.softLine, borderTopColor: C.orange, animation: 'spin 1s linear infinite' }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageShell>
    );
  }

  // ── Error: expired link — designed screen (c145) ──────────────────────────
  if (state === 'error' && errorCode === 'expired') {
    return (
      <PageShell>
        <ExpiredLinkScreen
          token={token}
          rep={errorRep}
          distributor={errorDistributor}
          quoteReference={errorQuoteReference}
        />
      </PageShell>
    );
  }

  // ── Error: other errors ────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <PageShell>
        <div className="px-6 py-16">
          <ErrorPanel code={errorCode} message={errorMsg} />
        </div>
      </PageShell>
    );
  }

  // ── Ready: envelope ────────────────────────────────────────────────────────
  const q = data!.quote;
  const repInitials = initials(q.rep?.name);
  const chefFullName = [data!.user.first_name, data!.user.last_name].filter(Boolean).join(' ');
  const restaurantLine = [q.restaurant?.name, [q.restaurant?.city, q.restaurant?.state].filter(Boolean).join(', ')]
    .filter(Boolean).join(' · ');
  const sentDate = formatDate(q.sent_at || q.created_at);

  return (
    <PageShell topRight={sentDate}>
      <div className="px-6 pt-10 pb-6 flex flex-col flex-1 max-w-md mx-auto w-full">
        {/* Envelope card */}
        <div
          className="bg-white rounded-lg p-6"
          style={{
            border: `1px solid ${C.softLine}`,
            boxShadow: '0 1px 0 rgba(0,0,0,.02), 0 12px 30px rgba(43,43,43,.05)',
          }}
        >
          {/* FROM */}
          <div style={eyebrow()}>FROM</div>
          <div className="mt-1.5 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: C.lightBlue }}
            >
              <span style={{ ...serif, fontSize: 13, fontWeight: 600, color: C.charcoal }}>
                {repInitials}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ ...serif, fontSize: 15, fontWeight: 500, color: C.charcoal, lineHeight: 1.35 }}>
                {q.rep?.name || 'Your rep'}
              </div>
              <div style={{ ...sans, fontSize: 12, color: C.gray700, lineHeight: 1.35 }}>
                {q.distributor?.name || ''}
              </div>
            </div>
          </div>

          {/* Thick divider — letter-from-rep metaphor */}
          <div className="mt-5" style={{ borderTop: `2px solid ${C.charcoal}` }} />

          {/* TO */}
          <div className="mt-4" style={eyebrow()}>TO</div>
          <div className="mt-1" style={{ ...sans, fontSize: 14, color: C.charcoal, lineHeight: 1.35 }}>
            {chefFullName || data!.user.email}
          </div>
          {restaurantLine && (
            <div style={{ ...sans, fontSize: 12, color: C.gray700, lineHeight: 1.35 }}>
              {restaurantLine}
            </div>
          )}

          {/* Quote summary */}
          <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${C.softLine}` }}>
            <div style={eyebrow()}>QUOTE</div>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div style={{ ...serif, fontSize: 18, fontWeight: 500, color: C.charcoal }}>
                  {stripSeedPrefix(q.label)}
                </div>
                <div
                  style={{ ...sans, fontSize: 11.5, color: C.gray500, fontVariantNumeric: 'tabular-nums' }}
                >
                  {q.item_count} item{q.item_count === 1 ? '' : 's'} across {q.category_count} categor{q.category_count === 1 ? 'y' : 'ies'}
                </div>
              </div>
              <div
                style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal, fontVariantNumeric: 'tabular-nums' }}
              >
                {money(q.total_cents, q.distributor?.currency)}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-6">
          <button
            onClick={() => navigate(`/chef/quotes/${q.id}`)}
            className="w-full rounded-md text-white font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              ...sans,
              fontSize: 15,
              padding: '12px 18px',
              background: C.orange,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.orangeHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.orange)}
          >
            Review quote
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <div
            className="mt-3 text-center"
            style={{ ...sans, fontSize: 10.5, color: C.gray500, lineHeight: 1.4 }}
          >
            You'll always come back to this quote, saved with your quote history.
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ─── ExpiredLinkScreen ─────────────────────────────────────────────────────
// Refusal-page rework (2026-07-29, Justin's dead-end ruling): "a dead end is
// not an error state, it is a lost sale" (Constitution XIV/XV/XXIII). This
// screen used to be a true dead end - a generic message and, at best, a
// mailto to a generic support inbox. It now gives the chef a live path
// forward without leaving the page:
//   1. Rep / distributor / quote-reference context, rendered whenever the
//      consume response actually carries it (see the ApiResponse.rep/
//      distributor/quote_reference comment in api.ts - the BE does not send
//      these on the expired branch yet, so this card is conditional and
//      simply doesn't render until that ships).
//   2. Primary action: "Request a new link", which POSTs the expired token
//      to requestNewChefMagicLink (api.ts) - a NEW endpoint contract flagged
//      for BE follow-up, see that helper's doc comment for the full
//      method/path/payload/response shape assumed here.
//   3. A graceful fallback: if the request call fails, the rep's mailto/tel
//      links (when present) and the generic support/build-your-own actions
//      stay visible and usable - the chef is never stuck.
// Per Justin (2026-05-22): use generic support@quoteme.food when no rep
// email is available, not a placeholder name.
const SUPPORT_EMAIL = 'support@quoteme.food';
const MAILTO_SUBJECT = encodeURIComponent('Fresh quote link request');
const MAILTO_BODY = encodeURIComponent(
  "Hi,\n\nThe link I received to view my quote has expired. Could you send a fresh link?\n\nThanks",
);

type RequestLinkState = 'idle' | 'loading' | 'success' | 'error';

function InlineSpinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-3.5 h-3.5 rounded-full"
      style={{
        border: '2px solid rgba(255,255,255,0.4)',
        borderTopColor: '#fff',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}

function ExpiredLinkScreen({
  token,
  rep,
  distributor,
  quoteReference,
}: {
  token: string;
  rep?: { name: string; email: string; phone: string | null } | null;
  distributor?: { name: string } | null;
  quoteReference?: string | null;
}) {
  const [requestState, setRequestState] = useState<RequestLinkState>('idle');

  const hasRepContact = Boolean(rep?.email || rep?.phone);
  const hasContextCard = Boolean(rep?.name || distributor?.name || quoteReference || hasRepContact);

  async function handleRequestNewLink() {
    setRequestState('loading');
    try {
      const res = await requestNewChefMagicLink(token);
      if (res.data?.success) {
        setRequestState('success');
      } else {
        setRequestState('error');
      }
    } catch {
      setRequestState('error');
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">
      <div className="max-w-sm w-full">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Icon — envelope with a clock, rendered inline SVG */}
        <div className="flex justify-center mb-7">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full"
            style={{ background: '#F3F0EB' }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.charcoal}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* Envelope body */}
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polyline points="2,4 12,13 22,4" />
              {/* Clock overlay, bottom right */}
              <circle cx="17.5" cy="16.5" r="3.5" fill={C.warmPaper} stroke={C.charcoal} strokeWidth="1.5" />
              <polyline points="17.5,14.8 17.5,16.5 18.7,17.7" />
            </svg>
          </div>
        </div>

        {/* Headline — warm, not an error tone */}
        <h1
          className="text-center"
          style={{ ...serif, fontSize: 24, fontWeight: 600, color: C.charcoal, lineHeight: 1.25 }}
        >
          This link has expired.
        </h1>

        {/* Sub-copy */}
        <p
          className="mt-3 text-center"
          style={{ ...sans, fontSize: 14, color: C.gray700, lineHeight: 1.6 }}
        >
          Quote links expire after 72 hours, but you're not stuck. Request a fresh one below and your rep will
          get it right to you.
        </p>

        {/* Rep / distributor / quote-reference context card, only when the
            consume response actually carries it. */}
        {hasContextCard && (
          <div
            className="mt-6 rounded-md p-4"
            style={{ border: `1px solid ${C.softLine}`, background: '#fff' }}
          >
            {distributor?.name && (
              <>
                <div style={eyebrow(9)}>DISTRIBUTOR</div>
                <div className="mt-0.5" style={{ ...sans, fontSize: 14, color: C.charcoal }}>
                  {distributor.name}
                </div>
              </>
            )}
            {rep?.name && (
              <div className={distributor?.name ? 'mt-3' : ''}>
                <div style={eyebrow(9)}>YOUR REP</div>
                <div className="mt-0.5" style={{ ...sans, fontSize: 14, color: C.charcoal }}>
                  {rep.name}
                </div>
              </div>
            )}
            {hasRepContact && (
              <div className="mt-2 flex flex-col gap-1">
                {rep?.email && (
                  <a
                    href={`mailto:${rep.email}`}
                    className="no-underline"
                    style={{ ...sans, fontSize: 13, color: C.orange }}
                  >
                    {rep.email}
                  </a>
                )}
                {rep?.phone && (
                  <a
                    href={`tel:${rep.phone}`}
                    className="no-underline"
                    style={{ ...sans, fontSize: 13, color: C.orange }}
                  >
                    {rep.phone}
                  </a>
                )}
              </div>
            )}
            {quoteReference && (
              <div
                className="mt-3 pt-3"
                style={{ ...sans, fontSize: 11.5, color: C.gray500, borderTop: `1px solid ${C.softLine}` }}
              >
                Quote {quoteReference}
              </div>
            )}
          </div>
        )}

        {/* Primary action: request a new link, four states */}
        <div className="mt-7">
          <button
            type="button"
            onClick={handleRequestNewLink}
            disabled={requestState === 'loading' || requestState === 'success'}
            className="flex items-center justify-center gap-2 w-full rounded-md font-medium transition-colors"
            style={{
              ...sans,
              fontSize: 15,
              padding: '12px 18px',
              background: requestState === 'success' ? '#DDEFE3' : C.orange,
              color: requestState === 'success' ? '#1F5C3A' : '#fff',
              cursor: requestState === 'loading' || requestState === 'success' ? 'default' : 'pointer',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              if (requestState === 'idle' || requestState === 'error') {
                e.currentTarget.style.background = C.orangeHover;
              }
            }}
            onMouseLeave={(e) => {
              if (requestState === 'idle' || requestState === 'error') {
                e.currentTarget.style.background = C.orange;
              }
            }}
          >
            {requestState === 'loading' && (
              <>
                <InlineSpinner />
                Sending...
              </>
            )}
            {requestState === 'success' && 'Your rep has been notified, a fresh link is on the way'}
            {(requestState === 'idle' || requestState === 'error') && 'Request a new link'}
          </button>

          {requestState === 'error' && (
            <p
              className="mt-2.5 text-center"
              style={{ ...sans, fontSize: 12.5, color: C.gray700, lineHeight: 1.5 }}
            >
              {hasRepContact
                ? 'Could not reach your rep automatically. Use the contact info above.'
                : 'Could not reach your rep automatically. Email us below and we will get you a fresh link.'}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="mt-7" style={{ borderTop: `1px solid ${C.softLine}` }} />

        {/* Fallback actions: always available, never gated on the button above */}
        <div className="mt-7 flex flex-col gap-3">
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${MAILTO_SUBJECT}&body=${MAILTO_BODY}`}
            className="flex items-center justify-center gap-2 w-full rounded-md font-medium transition-colors no-underline"
            style={{
              ...sans,
              fontSize: 14,
              padding: '11px 18px',
              background: 'transparent',
              color: C.gray700,
              border: `1px solid ${C.softLine}`,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.gray400;
              e.currentTarget.style.color = C.charcoal;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.softLine;
              e.currentTarget.style.color = C.gray700;
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polyline points="2,4 12,13 22,4" />
            </svg>
            Email us for a fresh link
          </a>

          <a
            href="/chef/entry"
            className="flex items-center justify-center gap-1.5 w-full rounded-md font-medium transition-colors no-underline"
            style={{
              ...sans,
              fontSize: 14,
              padding: '11px 18px',
              background: 'transparent',
              color: C.gray700,
              border: `1px solid ${C.softLine}`,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.gray400;
              e.currentTarget.style.color = C.charcoal;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.softLine;
              e.currentTarget.style.color = C.gray700;
            }}
          >
            Build your own quote
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── PageShell ─────────────────────────────────────────────────────────────
// Lightweight chrome: QuoteMe wordmark + optional right-side metadata.
// No nav, no account dot — chef just arrived from email, identity is implicit.
function PageShell({ children, topRight }: { children: React.ReactNode; topRight?: string }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.warmPaper, color: C.charcoal }}
    >
      <div
        className="flex items-center justify-between px-5 py-3 bg-white"
        style={{ borderBottom: `1px solid ${C.softLine}` }}
      >
        <span style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal, lineHeight: 1 }}>
          QuoteMe
        </span>
        {topRight && (
          <span style={{ ...sans, fontSize: 11, color: C.gray500 }}>{topRight}</span>
        )}
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

// ─── ErrorPanel ────────────────────────────────────────────────────────────
// Known error codes from the consume endpoint:
//   invalid_token    (401): bad / missing / unknown
//   expired          (410): token past its TTL (rendered via the dedicated
//                           ExpiredLinkScreen above, not this panel)
//   role_conflict    (422): email already has a non-chef account
//   account_conflict (422): BUG #39, the chef magic-link TTL rewrite's
//                           replacement error code for cases where the
//                           backend can't sign the chef in automatically
function ErrorPanel({ code, message }: { code: string; message?: string }) {
  const copy = errorCopy(code, message);
  return (
    <div className="max-w-md mx-auto text-center">
      <div style={{ ...serif, fontSize: 22, fontWeight: 600, color: C.charcoal, lineHeight: 1.3 }}>
        {copy.title}
      </div>
      <p
        className="mt-3"
        style={{ ...sans, fontSize: 14, color: C.gray700, lineHeight: 1.55 }}
      >
        {copy.body}
      </p>
    </div>
  );
}

function errorCopy(code: string, message?: string): { title: string; body: string } {
  // expired: functionally unreachable through this panel today - the
  // state === 'error' && errorCode === 'expired' check above renders the
  // dedicated ExpiredLinkScreen (c145) before ErrorPanel ever mounts. Kept
  // here, with fallback text matching the backend's exact wording, as a
  // defensive case should that routing ever change.
  if (code === 'expired') {
    return {
      title: 'This link has expired.',
      body: message || 'This link has expired. Ask your rep to resend.',
    };
  }
  if (code === 'role_conflict') {
    return {
      title: "We couldn't open the quote.",
      body: message || 'An account already exists at this email under a different role. Reach out to your rep and we\'ll sort it out.',
    };
  }
  // account_conflict (422): BUG #39 - the chef magic-link TTL rewrite
  // removed the old already_used code and, alongside expired, added this
  // one for cases where the backend can't sign the chef in automatically
  // (e.g. an account conflict it can't resolve on its own). Honest copy,
  // backend message preferred, fallback matches the backend's wording
  // exactly.
  if (code === 'account_conflict') {
    return {
      title: "We couldn't sign you in.",
      body: message || "This link can't sign you in right now. Please contact your rep for help.",
    };
  }
  // invalid_token + fallthrough. Also catches the now-removed already_used:
  // the backend's chef magic-link TTL rewrite no longer returns that code,
  // so any occurrence here is unrecognized and gets the generic message.
  return {
    title: "We couldn't open that link.",
    body: 'It may have been copied incomplete, or the link may have already been replaced by a newer one. Ask your rep to resend.',
  };
}
