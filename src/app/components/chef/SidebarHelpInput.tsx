// SidebarHelpInput — lives above Settings in the NewspaperSidebar.
//
// Open mode  : text input + send arrow button.
//              Placeholder: "Stuck on something? Ask Marcus or QuoteMe."
//              Caption: "Press Enter — we'll route to Marcus or QuoteMe support."
// Compact mode: collapses to a HelpCircle icon button.
//
// On Enter (or send button click): opens HelpDrawer with the typed question.

import React, { useRef, useState } from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { HelpDrawer } from './HelpDrawer';

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

export interface SidebarHelpInputProps {
  collapsed: boolean;
}

export function SidebarHelpInput({ collapsed }: SidebarHelpInputProps) {
  const [question, setQuestion] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function openDrawer(text: string) {
    if (!text.trim()) return;
    setPendingQuestion(text.trim());
    setQuestion('');
    setDrawerOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      openDrawer(question);
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
              // In compact mode there's no pre-typed question — open drawer with a prompt
              setPendingQuestion('How can I get help?');
              setDrawerOpen(true);
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

        {drawerOpen && (
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
            onClick={() => openDrawer(question)}
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
      </div>

      {drawerOpen && (
        <HelpDrawer
          initialQuestion={pendingQuestion}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
