// HelpDrawer — slides in from the right when a chef sends a question from
// the sidebar help input.
//
// Two artboard states (per Desi spec):
//   Sent (pending)  — ack callout + echoed question + placeholder reply pane
//   Replied         — ack callout + echoed question + rep's actual reply
//
// Rep / distributor data is sourced from the chef's most recent sent quote
// (getChefQuotes() → first row with a rep). When no rep is on file, the ack
// callout falls back to QuoteMe support copy.
//
// Question is POSTed to /api/v1/chef/quotes/:id/question when a quote id is
// available. When none is on file (new chef, no quotes yet) the send call is
// skipped client-side and the ack is shown immediately.
//
// Phone fallback: no canonical support number exists in this codebase.
// Stubbed as "(800) 555-QUOTE" — replace with the real number before launch.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Clock } from 'lucide-react';
import { getChefQuotes, sendChefQuestion, escalateHelp, type ChefQuoteRow } from '../../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  charcoal: '#2B2B2B',
  navy: '#2A5F6F',
  navyDark: '#1F4A57',
  warmPaper: '#FBFAF7',
  warmPaperDark: '#F3F2EE',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  orange: '#F2993D',
  orangeHover: '#E08A2E',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── AckCallout ───────────────────────────────────────────────────────────────

function AckCallout({ repName, distributorName }: { repName: string | null; distributorName: string | null }) {
  const hasRep = !!(repName || distributorName);
  return (
    <div
      style={{
        background: C.navy,
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 20,
      }}
    >
      <p style={{ ...sans, fontSize: 13, color: '#fff', lineHeight: 1.55, margin: 0 }}>
        {hasRep ? (
          <>
            Your question has been sent. Routing to{' '}
            {repName ? <strong style={{ fontWeight: 600 }}>{repName}</strong> : 'your rep'}
            {distributorName ? (
              <> at <strong style={{ fontWeight: 600 }}>{distributorName}</strong></>
            ) : null}
            . Most chefs hear back within 1–2 hours.
          </>
        ) : (
          'Your question has been sent. Routing to QuoteMe support.'
        )}
      </p>
    </div>
  );
}

// ─── QuoteBlock ───────────────────────────────────────────────────────────────

function QuoteBlock({ question, sentAt }: { question: string; sentAt: Date }) {
  return (
    <div
      style={{
        borderLeft: `3px solid ${C.charcoal}`,
        paddingLeft: 14,
        marginBottom: 24,
      }}
    >
      <p
        style={{
          ...serif,
          fontSize: 15,
          fontStyle: 'italic',
          color: C.charcoal,
          lineHeight: 1.6,
          margin: '0 0 6px',
        }}
      >
        "{question}"
      </p>
      <p style={{ ...sans, fontSize: 11, color: C.gray400, margin: 0 }}>
        <Clock size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
        Sent {formatTime(sentAt)}
      </p>
    </div>
  );
}

// ─── ReplyPane ────────────────────────────────────────────────────────────────

function ReplyPane({ reply, repName }: { reply: string | null; repName: string | null }) {
  if (reply) {
    return (
      <div
        style={{
          background: C.warmPaperDark,
          border: `1px solid ${C.softLine}`,
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 20,
        }}
      >
        {repName && (
          <p style={{ ...sans, fontSize: 11, fontWeight: 600, color: C.gray500, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {repName}
          </p>
        )}
        <p style={{ ...sans, fontSize: 14, color: C.charcoal, lineHeight: 1.6, margin: 0 }}>
          {reply}
        </p>
      </div>
    );
  }

  // Pending state — no reply yet
  return (
    <div
      style={{
        background: C.warmPaperDark,
        border: `1px dashed ${C.softLine}`,
        borderRadius: 8,
        padding: '20px 16px',
        marginBottom: 20,
        textAlign: 'center',
      }}
    >
      <p style={{ ...sans, fontSize: 13, color: C.gray400, margin: 0 }}>
        No reply yet — you'll hear back within 1–2 hours.
      </p>
    </div>
  );
}

// ─── Composer ─────────────────────────────────────────────────────────────────

function Composer({
  quoteId,
  onSent,
}: {
  quoteId: string | null;
  onSent: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [talkAck, setTalkAck] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    if (quoteId) {
      await sendChefQuestion(quoteId, trimmed);
    }
    setSending(false);
    setText('');
    onSent(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      style={{
        background: C.warmPaper,
        borderTop: `1px solid ${C.softLine}`,
        padding: '16px 20px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask another question…"
          rows={2}
          style={{
            ...sans,
            flex: 1,
            fontSize: 13,
            color: C.charcoal,
            background: '#fff',
            border: `1px solid ${C.softLine}`,
            borderRadius: 6,
            padding: '10px 12px',
            resize: 'none',
            outline: 'none',
            lineHeight: 1.5,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.navy; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.softLine; }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          aria-label="Send"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 38,
            height: 38,
            flexShrink: 0,
            background: text.trim() && !sending ? C.orange : C.softLine,
            border: 'none',
            borderRadius: 6,
            cursor: text.trim() && !sending ? 'pointer' : 'default',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={(e) => {
            if (text.trim() && !sending) (e.currentTarget as HTMLButtonElement).style.background = C.orangeHover;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = text.trim() && !sending ? C.orange : C.softLine;
          }}
        >
          <ArrowRight size={16} strokeWidth={2} color={text.trim() && !sending ? '#fff' : C.gray400} />
        </button>
      </div>

      {talkAck ? (
        <p style={{ ...sans, fontSize: 10.5, color: C.navy, margin: '10px 0 0', textAlign: 'center', fontWeight: 500 }}>
          Got it — someone will reach out.
        </p>
      ) : (
        <button
          type="button"
          onClick={async () => {
            await escalateHelp(text || 'Talk request from chef', 'chef-helpdrawer');
            setTalkAck(true);
            setTimeout(() => setTalkAck(false), 3000);
          }}
          style={{
            ...sans,
            display: 'block',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            color: C.gray400,
            margin: '10px 0 0',
            textAlign: 'center',
            padding: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.gray500; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.gray400; }}
        >
          Talk to a person →
        </button>
      )}
    </div>
  );
}

// ─── HelpDrawer ───────────────────────────────────────────────────────────────

export interface HelpDrawerProps {
  /** Initial question text typed in the sidebar before opening the drawer. */
  initialQuestion: string;
  onClose: () => void;
}

export function HelpDrawer({ initialQuestion, onClose }: HelpDrawerProps) {
  const [repName, setRepName] = useState<string | null>(null);
  const [distributorName, setDistributorName] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Thread of questions in this session
  const [thread, setThread] = useState<Array<{ question: string; sentAt: Date; reply: string | null }>>([
    { question: initialQuestion, sentAt: new Date(), reply: null },
  ]);

  // Fetch most recent sent quote to get rep/distributor context and quote id
  useEffect(() => {
    const bearerToken = typeof localStorage !== 'undefined' && localStorage.getItem('quoteme_token');
    if (!bearerToken) return;

    getChefQuotes().then((res) => {
      if (res.data?.quotes?.length) {
        const sentQuotes = res.data.quotes.filter((q: ChefQuoteRow) => q.status === 'sent' || q.status === 'pending' || q.status === 'won');
        const recent = sentQuotes[0] ?? res.data.quotes[0];
        if (recent) {
          setQuoteId(recent.id);
          if (recent.rep?.name) setRepName(recent.rep.name);
          if (recent.distributor?.name) setDistributorName(recent.distributor.name);
        }
      }
    });
  }, []);

  // POST initial question when quoteId resolves (or immediately if already set)
  // We also POST on mount if quoteId is available from a prior render
  const sentInitialRef = useRef(false);
  useEffect(() => {
    if (quoteId && !sentInitialRef.current) {
      sentInitialRef.current = true;
      sendChefQuestion(quoteId, initialQuestion);
    }
  }, [quoteId, initialQuestion]);

  // Slide-in animation on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 220);
  }

  function handleNewQuestion(text: string) {
    setThread((prev) => [...prev, { question: text, sentAt: new Date(), reply: null }]);
  }

  const lastEntry = thread[thread.length - 1];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(43,43,43,0.25)',
          zIndex: 800,
          opacity: visible ? 1 : 0,
          transition: 'opacity 220ms ease',
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          maxWidth: '92vw',
          background: '#fff',
          zIndex: 801,
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 220ms ease',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
        }}
        role="dialog"
        aria-label="Help conversation"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${C.softLine}`,
            flexShrink: 0,
          }}
        >
          <h2 style={{ ...serif, fontSize: 18, fontWeight: 700, color: C.charcoal, margin: 0 }}>
            Help
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close help drawer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 6,
              color: C.gray500,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(43,43,43,.06)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 20px 8px',
          }}
        >
          <AckCallout repName={repName} distributorName={distributorName} />

          {/* All questions in thread */}
          {thread.map((entry, idx) => (
            <div key={idx}>
              <QuoteBlock question={entry.question} sentAt={entry.sentAt} />
              {/* Only show reply pane for the last entry */}
              {idx === thread.length - 1 && (
                <ReplyPane reply={entry.reply} repName={repName} />
              )}
            </div>
          ))}
        </div>

        {/* Composer — fixed to bottom of drawer */}
        <div style={{ flexShrink: 0 }}>
          <Composer quoteId={quoteId} onSent={handleNewQuestion} />
        </div>
      </div>
    </>,
    document.body,
  );
}
