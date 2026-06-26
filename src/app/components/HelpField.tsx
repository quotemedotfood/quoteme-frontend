// HelpField — lane-agnostic sidebar help input.
//
// Replaces SidebarHelpInput (chef-only) with a generalised version that works
// for chef / rep / cc / brand lanes.
//
// Collapsed mode : HelpCircle icon button.
// Open mode      : text input + ArrowRight send button.
//
// Per-lane submit behaviour:
//   chef   → opens HelpDrawer with the typed question.
//   rep / cc / brand → calls escalateHelp(), shows 3s inline confirmation.

import React, { useRef, useState } from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { escalateHelp } from '../services/api';
import { HelpDrawer } from './chef/HelpDrawer';

const C = {
  charcoal: '#2B2B2B',
  navy: '#2A5F6F',
  navyLight: 'rgba(42,95,111,0.08)',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  orange: '#F2993D',
  orangeHover: '#E08A2E',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export interface HelpFieldProps {
  collapsed: boolean;
  lane: 'chef' | 'rep' | 'cc' | 'brand';
}

export function HelpField({ collapsed, lane }: HelpFieldProps) {
  const [question, setQuestion] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [sent, setSent] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(text: string) {
    if (!text.trim()) return;
    const trimmed = text.trim();

    if (lane === 'chef') {
      setPendingQuestion(trimmed);
      setQuestion('');
      setDrawerOpen(true);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } else {
      // rep / cc / brand
      setQuestion('');
      await escalateHelp(trimmed, `${lane}-sidebar`);
      // TODO B-183 slice 2: FAQ surface renders here before escalation
      setConfirmation("Sent to the QuoteMe team — we'll follow up.");
      setTimeout(() => setConfirmation(''), 3000);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(question);
    }
  }

  // ── Compact mode: single HelpCircle button ────────────────────────────────
  if (collapsed) {
    return (
      <>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 0',
          }}
        >
          <button
            type="button"
            title="Get help"
            aria-label="Get help"
            onClick={() => {
              if (lane === 'chef') {
                setPendingQuestion('How can I get help?');
                setDrawerOpen(true);
              } else {
                escalateHelp('Help request from sidebar (collapsed)', `${lane}-sidebar`);
                // TODO B-183 slice 2: FAQ surface renders here before escalation
                setConfirmation("Sent to the QuoteMe team — we'll follow up.");
                setTimeout(() => setConfirmation(''), 3000);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 6,
              color: C.gray500,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.navyLight; (e.currentTarget as HTMLButtonElement).style.color = C.navy; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = C.gray500; }}
          >
            <HelpCircle size={18} strokeWidth={1.6} />
          </button>
        </div>

        {lane === 'chef' && drawerOpen && (
          <HelpDrawer
            initialQuestion={pendingQuestion}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </>
    );
  }

  // ── Open mode: input + send button ────────────────────────────────────────
  return (
    <>
      <div
        style={{
          padding: '8px 16px 12px',
          borderTop: `1px solid ${C.softLine}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#fff',
            border: `1px solid ${C.softLine}`,
            borderRadius: 6,
            padding: '0 6px 0 10px',
            transition: 'border-color 120ms ease',
          }}
          onFocusCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = C.navy; }}
          onBlurCapture={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = C.softLine; }}
        >
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stuck on something? Ask QuoteMe."
            style={{
              ...sans,
              flex: 1,
              fontSize: 12,
              color: C.charcoal,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '9px 0',
              lineHeight: 1.4,
              minWidth: 0,
            }}
          />
          <button
            type="button"
            onClick={() => handleSubmit(question)}
            disabled={!question.trim()}
            aria-label="Send question"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              flexShrink: 0,
              background: question.trim() ? C.orange : 'transparent',
              border: 'none',
              borderRadius: 4,
              cursor: question.trim() ? 'pointer' : 'default',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => {
              if (question.trim()) (e.currentTarget as HTMLButtonElement).style.background = C.orangeHover;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = question.trim() ? C.orange : 'transparent';
            }}
          >
            <ArrowRight
              size={14}
              strokeWidth={2}
              color={question.trim() ? '#fff' : C.gray500}
            />
          </button>
        </div>

        <p
          style={{
            ...sans,
            fontSize: 10,
            color: C.gray500,
            margin: '5px 0 0',
            lineHeight: 1.4,
          }}
        >
          Press Enter — we'll route to QuoteMe support.
        </p>
        {sent && (
          <p style={{ ...sans, fontSize: 10.5, color: '#2A5F6F', margin: '4px 0 0', lineHeight: 1.4, fontWeight: 500 }}>
            Sent!
          </p>
        )}
        {confirmation && (
          <p style={{ ...sans, fontSize: 10.5, color: '#2A5F6F', margin: '4px 0 0', lineHeight: 1.4, fontWeight: 500 }}>
            {confirmation}
          </p>
        )}
      </div>

      {lane === 'chef' && drawerOpen && (
        <HelpDrawer
          initialQuestion={pendingQuestion}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
