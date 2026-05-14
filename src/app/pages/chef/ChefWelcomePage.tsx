import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { consumeChefMagicLink } from '../../services/api';
import type { ChefMagicLinkConsumeResponse } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

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
  orange: '#F9A64B',
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

function money(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase();
}

export function ChefWelcomePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { syncWithAuthUser } = useUser();

  const token = params.get('token') || '';

  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<ChefMagicLinkConsumeResponse | null>(null);
  const [errorCode, setErrorCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorCode('invalid_token');
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await consumeChefMagicLink(token);
      if (cancelled) return;

      if (res.data) {
        // Persist JWT (existing auth pattern) so subsequent /api/v1/chef/*
        // calls authenticate as this chef.
        localStorage.setItem('quoteme_token', res.data.jwt);
        // Tell UserContext we're an authenticated chef (not guest).
        const u = res.data.user;
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
        syncWithAuthUser({
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
        setErrorCode(res.error_code || res.error || 'invalid_token');
        setErrorMsg(typeof res.error === 'string' ? res.error : '');
        setState('error');
      }
    })();

    return () => { cancelled = true; };
  }, [token, syncWithAuthUser]);

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

  // ── Error ──────────────────────────────────────────────────────────────────
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
                  {q.label}
                </div>
                <div
                  style={{ ...sans, fontSize: 11.5, color: C.gray500, fontVariantNumeric: 'tabular-nums' }}
                >
                  {q.item_count} items across {q.category_count} categories
                </div>
              </div>
              <div
                style={{ ...serif, fontSize: 18, fontWeight: 600, color: C.charcoal, fontVariantNumeric: 'tabular-nums' }}
              >
                {money(q.total_cents)}
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
            You'll always come back to this quote — saved with your quote history.
          </div>
        </div>
      </div>
    </PageShell>
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
// Three known error codes from the consume endpoint:
//   invalid_token  (401) — bad / missing / unknown
//   expired        (410) — > 30 days from generation
//   role_conflict  (422) — email already has a non-chef account
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
  if (code === 'expired') {
    return {
      title: 'This link has expired.',
      body: message || 'Ask your rep to send the quote again — they can re-issue a fresh link in a moment.',
    };
  }
  if (code === 'role_conflict') {
    return {
      title: "We couldn't open the quote.",
      body: message || 'An account already exists at this email under a different role. Reach out to your rep and we\'ll sort it out.',
    };
  }
  // invalid_token + fallthrough
  return {
    title: "We couldn't open that link.",
    body: 'It may have been copied incomplete, or the link may have already been replaced by a newer one. Ask your rep to resend.',
  };
}
