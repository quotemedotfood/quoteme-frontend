// c144 — Stuck-state recovery UI (Screen 14 equivalent).
// Mounts inside ChefStatusPage when the 60-second polling timeout fires.
// Three escape paths per design-lock spec:
//   (a) Email menu directly to support
//   (b) Try again with shorter sections (back to /chef/entry, menu text preserved)
//   (c) Wait it out — email-capture so chef gets a notification when quote lands
//
// Copy doctrine: calm, operational, never panicked.
// BANNED WORDS: AI, intelligent, automated, platform, ecosystem.
// Screen 14 spec was NOT found in repo — copy drafted from doctrine voice.
// FLAG: needs Twelve's review before commit to production copy.

import { useState } from 'react';
import { useNavigate } from 'react-router';

// ─── Constants ───────────────────────────────────────────────────────────────

// localStorage key where menu text is persisted for recovery purposes.
// Written by ChefEntryPage (on change) and ChefStatusPage (on mount).
// ChefEntryPage reads this key to restore text when chef arrives via path (b).
export const MENU_DRAFT_KEY = 'quoteme_menu_draft';

// Canonical support address — Marcus is a demo persona, not a real inbox.
// Per Justin's directive (2026-05-22): path (a) mailto routes to the actual
// rep on the chef's quote (repEmail prop). When no rep is on file, path (a)
// is hidden entirely; the tertiary "Need help?" link below falls back here.
const SUPPORT_EMAIL = 'support@quoteme.food';

const headlineStyle: React.CSSProperties = { fontFamily: "'Playfair Display', serif" };

// ─── Props ───────────────────────────────────────────────────────────────────

export interface StuckRecoveryScreenProps {
  /** Quote ID being polled — used for mailto subject line */
  quoteId?: string;
  /** Rep's email from quote binding. When absent, path (a) is hidden. */
  repEmail?: string;
  /** Rep's display name. Used in button label when path (a) is shown. */
  repName?: string;
  /** Called when chef picks path (c) and submits an email for notification */
  onWaitItOut?: (email: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StuckRecoveryScreen({ quoteId, repEmail, repName, onWaitItOut }: StuckRecoveryScreenProps) {
  const navigate = useNavigate();
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySent, setNotifySent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<'a' | 'b' | 'c' | null>(null);

  // ── Path (a): mailto to the rep on the chef's quote ─────────────────────
  // Only rendered when repEmail is on file. mailto target is data-driven.
  function handleEmailRep() {
    if (!repEmail) return;
    setActivePath('a');
    const savedMenu = localStorage.getItem(MENU_DRAFT_KEY) ?? '';
    const subject = encodeURIComponent('Menu needs help');
    const body = encodeURIComponent(
      `Hi${repName ? ` ${repName}` : ''} — my menu didn't finish processing. Could you take a look?\n\nQuote ID: ${quoteId ?? 'unknown'}\n\n---\n${savedMenu}`,
    );
    window.location.href = `mailto:${repEmail}?subject=${subject}&body=${body}`;
  }

  // ── Path (b): try again ─────────────────────────────────────────────────
  function handleTryAgain() {
    setActivePath('b');
    // Menu text is already in localStorage under MENU_DRAFT_KEY.
    // ChefEntryPage reads this key on mount to restore the textarea.
    navigate('/chef/entry', {
      state: { restoreMenuDraft: true, hint: 'shorter_sections' },
    });
  }

  // ── Path (c): wait it out ───────────────────────────────────────────────
  function handleNotifySubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);

    const trimmed = notifyEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    // Persist locally so the chef knows we have their address even without
    // a backend round-trip. A future backend endpoint can pick this up.
    localStorage.setItem('quoteme_notify_email', trimmed);
    localStorage.setItem('quoteme_notify_quote_id', quoteId ?? '');

    setNotifySent(true);
    onWaitItOut?.(trimmed);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Header */}
        <div className="text-center flex flex-col gap-3">
          {/* Neutral status icon — not an error, not a spinner */}
          <div className="w-12 h-12 rounded-full border-4 border-[#E0E0E0] flex items-center justify-center mx-auto">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9E9E9E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1
            className="text-2xl font-bold text-[#2A2A2A]"
            style={headlineStyle}
          >
            Taking longer than expected
          </h1>
          <p className="text-[#4F4F4F] text-base leading-relaxed">
            We saved your menu. Pick how you'd like to handle this.
          </p>
        </div>

        {/* Escape path (a) — email the rep on the quote. Hidden when no rep on file. */}
        {repEmail && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleEmailRep}
              className={`w-full border rounded-xl px-5 py-4 text-left transition-colors ${
                activePath === 'a'
                  ? 'border-[#E5A84B] bg-[#FFFBF5]'
                  : 'border-[#E8E8E8] hover:border-[#E5A84B] hover:bg-[#FFFBF5]'
              }`}
            >
              <p className="font-medium text-[#2A2A2A] text-sm mb-0.5">
                Send {repName ?? 'your rep'} the menu directly
              </p>
              <p className="text-[#9E9E9E] text-xs leading-relaxed">
                Opens your email with the menu ready to go. They'll take
                it from here.
              </p>
            </button>
          </div>
        )}

        {/* Escape path (b) — try again with shorter sections */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleTryAgain}
            className={`w-full border rounded-xl px-5 py-4 text-left transition-colors ${
              activePath === 'b'
                ? 'border-[#E5A84B] bg-[#FFFBF5]'
                : 'border-[#E8E8E8] hover:border-[#E5A84B] hover:bg-[#FFFBF5]'
            }`}
          >
            <p className="font-medium text-[#2A2A2A] text-sm mb-0.5">
              Try again with shorter sections
            </p>
            <p className="text-[#9E9E9E] text-xs leading-relaxed">
              Your menu text is ready to edit. Breaking it into smaller
              sections usually works.
            </p>
          </button>
        </div>

        {/* Escape path (c) — wait it out */}
        <div
          className={`border rounded-xl px-5 py-4 transition-colors ${
            activePath === 'c'
              ? 'border-[#E5A84B] bg-[#FFFBF5]'
              : 'border-[#E8E8E8]'
          }`}
        >
          <button
            type="button"
            className="w-full text-left"
            onClick={() => setActivePath(activePath === 'c' ? null : 'c')}
          >
            <p className="font-medium text-[#2A2A2A] text-sm mb-0.5">
              Wait it out
            </p>
            <p className="text-[#9E9E9E] text-xs leading-relaxed">
              Leave the tab or close it. We'll email you when the quote is
              ready.
            </p>
          </button>

          {activePath === 'c' && (
            <div className="mt-4">
              {notifySent ? (
                <p className="text-sm text-[#4F4F4F]">
                  Got it. We'll send the quote to{' '}
                  <span className="font-medium">{notifyEmail}</span> when
                  it's ready.
                </p>
              ) : (
                <form onSubmit={handleNotifySubmit} className="flex flex-col gap-3">
                  <label className="text-xs font-medium text-[#4F4F4F]">
                    Your email
                  </label>
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => {
                      setNotifyEmail(e.target.value);
                      setEmailError(null);
                    }}
                    placeholder="chef@yourrestaurant.com"
                    autoComplete="email"
                    className="border border-[#E8E8E8] rounded-lg px-4 py-2.5 text-sm text-[#2B2B2B] placeholder-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#2B2B2B]/10 focus:border-[#E8E8E8]"
                  />
                  {emailError && (
                    <p className="text-xs text-red-500">{emailError}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-[#F9A64B] hover:bg-[#E8953A] text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
                  >
                    Notify me
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Tertiary — quiet support fallback. Shown always so chef has an out. */}
        <p className="text-center text-xs text-[#9E9E9E]">
          Need help?{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('QuoteMe help')}`}
            className="text-[#4F4F4F] underline underline-offset-2 hover:text-[#2A2A2A]"
          >
            Email {SUPPORT_EMAIL}
          </a>
        </p>

      </div>
    </div>
  );
}
