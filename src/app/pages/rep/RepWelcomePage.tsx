// RepWelcomePage — magic-link landing for reps.
//
// Mirrors ChefWelcomePage pattern exactly:
//   - Mounted OUTSIDE RootLayout (no auth guard) so a rep arriving via email
//     with no JWT isn't bounced to /auth.
//   - On mount: reads `token` from URL query, calls consumeRepMagicLink(token),
//     stores JWT in localStorage('quoteme_token'), renders the envelope card,
//     then navigates to redirect_to on CTA click.
//   - Envelope shows: distributor name (never catalog name), quote summary,
//     chef, and two action verbs ("Review the quote" / "Go straight to pricing").
//
// Source: designs/handoff/5272026/src/screens-rep.jsx · RepWelcomePage.
// No gradients. No marketing copy. Sacred Orange = var(--primary).

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { consumeRepMagicLink } from '../../services/api';
import type { RepMagicLinkConsumeResponse } from '../../services/api';
import { RepMatchStateBadge } from '../../components/rep/RepMatchStateBadge';
import { useSessionOnUse } from '../../hooks/useSessionOnUse';

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const C = {
  charcoal: '#2B2B2B',
  orange: 'var(--primary)',
  orangeHover: '#E8953A',
  lightBlue: '#A5CFDD',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  accent: 'var(--accent, #7FAEC2)',
} as const;

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

function initials(first: string | null | undefined, last: string | null | undefined): string {
  const parts = [first, last].filter(Boolean);
  if (!parts.length) return '?';
  return parts.map((s) => s![0]).join('').toUpperCase();
}

export function RepWelcomePage() {
  const [params] = useSearchParams();
  const establishSessionAndGo = useSessionOnUse();
  const token = params.get('token') || '';

  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<RepMagicLinkConsumeResponse | null>(null);
  const [errorCode, setErrorCode] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorCode('invalid_token');
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await consumeRepMagicLink(token);
      if (cancelled) return;

      if (res.data) {
        localStorage.setItem('quoteme_token', res.data.jwt);
        setData(res.data);
        setState('ready');
      } else {
        setErrorCode(res.error_code || res.error || 'invalid_token');
        setState('error');
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <PageShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 24px', gap: 16 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%',
              border: `4px solid ${C.softLine}`,
              borderTopColor: C.orange,
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageShell>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <PageShell>
        <div style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ ...serif, fontSize: 22, fontWeight: 600, color: C.charcoal, lineHeight: 1.3 }}>
            {errorCode === 'expired'
              ? "This link has expired."
              : "We couldn't open that link."}
          </div>
          <p style={{ ...sans, fontSize: 14, color: C.gray700, lineHeight: 1.55, marginTop: 12 }}>
            {errorCode === 'expired'
              ? 'Quote links expire after 30 days. Ask your manager to re-issue a fresh link.'
              : 'It may have been copied incomplete, or replaced by a newer one. Reach out to your manager.'}
          </p>
        </div>
      </PageShell>
    );
  }

  // ── Ready — envelope ───────────────────────────────────────────────────────
  const q = data!.quote;
  const repFirst = data!.user.first_name;
  const repLast = data!.user.last_name;
  const repInitials = initials(repFirst, repLast);
  const repFullName = [repFirst, repLast].filter(Boolean).join(' ') || data!.user.email;
  const distributorName = data!.distributor_name;
  const redirectTo = data!.redirect_to;

  // Same missing-refreshUser gap ChefWelcomePage/RepInviteAcceptPage had:
  // storing the JWT alone leaves AuthContext.user null until the next /me
  // roundtrip. useSessionOnUse does store + refresh + (guarded) navigate in
  // one call so neither CTA below can land the rep on an authenticated view
  // with a stale/null AuthContext.user - and the guard falls back to a real
  // view if redirect_to ever points at a one-shot consume route.
  const sessionUser = {
    fullName: repFullName,
    email: data!.user.email,
    phoneNumber: '',
    distributorName,
    plan: 'free' as const,
    isGuest: false as const,
  };

  const handleOpen = () => {
    establishSessionAndGo({
      jwt: data!.jwt,
      target: redirectTo || `/rep/quotes/${q.id}`,
      user: sessionUser,
    });
  };

  const handleTriage = () => {
    establishSessionAndGo({
      jwt: data!.jwt,
      target: '/rep/quotes/inbound',
      user: sessionUser,
    });
  };

  return (
    <PageShell topRight={distributorName}>
      <div style={{ padding: '40px 24px 24px', display: 'flex', flexDirection: 'column', flex: 1, maxWidth: 448, margin: '0 auto', width: '100%' }}>
        {/* Envelope card */}
        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            padding: 24,
            border: `1px solid ${C.softLine}`,
            boxShadow: '0 1px 0 rgba(0,0,0,.02), 0 12px 30px rgba(43,43,43,.05)',
          }}
        >
          {/* Eyebrow */}
          <div style={eyebrow()}>INCOMING QUOTE</div>

          {/* Rep avatar row */}
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                background: C.lightBlue,
              }}
            >
              <span style={{ ...serif, fontSize: 13, fontWeight: 600, color: C.charcoal }}>
                {repInitials}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...serif, fontSize: 15, fontWeight: 500, color: C.charcoal, lineHeight: 1.35 }}>
                {repFullName}
              </div>
              <div style={{ ...sans, fontSize: 12, color: C.gray700, lineHeight: 1.35 }}>
                {distributorName}
              </div>
            </div>
          </div>

          {/* Thick divider */}
          <div style={{ marginTop: 20, borderTop: `2px solid ${C.charcoal}` }} />

          {/* Quote summary */}
          <div style={{ marginTop: 16 }}>
            <div style={eyebrow()}>QUOTE</div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ ...serif, fontSize: 18, fontWeight: 500, color: C.charcoal }}>
                  {q.restaurant}
                </div>
                <div style={{ ...sans, fontSize: 11.5, color: C.gray500, fontVariantNumeric: 'tabular-nums' }}>
                  {q.item_count} items
                  {q.waiting_hours != null && q.waiting_hours > 0 ? ` · waiting ${q.waiting_hours}h` : ''}
                </div>
                <div style={{ marginTop: 6 }}>
                  <RepMatchStateBadge state={q.match_state} missingCount={q.missing_count} />
                </div>
              </div>
            </div>
          </div>

          {/* Two ways to move */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: `1px solid ${C.softLine}`,
              ...sans, fontSize: 12, color: C.gray700, lineHeight: 1.6,
            }}
          >
            Two ways to move on this:
            <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, display: 'inline-block', flexShrink: 0 }} />
                <span>
                  <span style={{ color: C.charcoal, fontWeight: 500 }}>Review the quote</span>
                  {', see what '}{q.chef_first} matched, swap items where needed.
                </span>
              </li>
              <li style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', flexShrink: 0 }} />
                <span>
                  <span style={{ color: C.charcoal, fontWeight: 500 }}>Go straight to pricing</span>
                  {', price what\'s there and send it back.'}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <button
            type="button"
            onClick={handleOpen}
            style={{
              ...sans,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '12px 18px',
              fontSize: 15,
              fontWeight: 500,
              color: '#fff',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Open the quote
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleTriage}
            style={{
              ...sans,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '11px 18px',
              fontSize: 14,
              color: C.gray700,
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            See all incoming quotes
          </button>
          <div style={{ ...sans, fontSize: 10.5, color: C.gray500, textAlign: 'center', lineHeight: 1.4, marginTop: 12 }}>
            You'll always come back to this from your triage queue.
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ─── PageShell ─────────────────────────────────────────────────────────────
function PageShell({ children, topRight }: { children: React.ReactNode; topRight?: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.warmPaper, color: C.charcoal }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          background: '#fff',
          borderBottom: `1px solid ${C.softLine}`,
        }}
      >
        <span style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal, lineHeight: 1 }}>
          QuoteMe
        </span>
        {topRight && (
          <span style={{ ...sans, fontSize: 11, color: C.gray500 }}>{topRight}</span>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  );
}
