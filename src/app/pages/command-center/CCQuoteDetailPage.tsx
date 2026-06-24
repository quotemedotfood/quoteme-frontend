// CCQuoteDetail — read-only manager view of one quote.
//
// Manager opens any quote and sees everything the rep sees — cannot edit.
// Editing stays with the rep (mandatory read-only banner enforces this boundary).
//
// Layout:
//   1. Read-only banner (warm-paper, 3px charcoal left border, eye icon)
//   2. Header (quote id eyebrow, restaurant H1, city · sent, OWNED BY + STATUS)
//   3. Re-quote activity trail (when requote > 0)
//   4. Compact read-only line-item document (category groups, name/pack/note,
//      qty × unit price, subtotals, total)
//   5. Optional "Message {rep}" link (no orange, no editing)
//
// Zero orange on this surface. No editable controls.
//
// BE contract: GET /api/v1/distributor_admin/command_center/quotes/:id
//   → CCQuoteDetail shape

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Eye, ArrowRight, ChevronLeft, MessageCircle, User } from 'lucide-react';
import {
  CCStatusTag,
  CCSectionHead,
  RepAvatar,
  AttentionRule,
  sans,
  serif,
  tabular,
  C,
  CC_ACK_NAVY,
} from '../../components/distributor-admin/command-center/cc-atoms';
import {
  getCommandCenterQuote,
  type CCQuoteDetail,
  type CCLineGroup,
} from '../../services/api';
import { categoryLabel } from '../../utils/categoryLabel';

// ── Money formatter ───────────────────────────────────────────────────────────

function money(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div style={{ maxWidth: 740 }}>
      {[80, 240, 180, 140].map((w, i) => (
        <div
          key={i}
          style={{
            height: i === 1 ? 32 : 14,
            width: w,
            background: '#E5E7EB',
            borderRadius: 4,
            marginBottom: 12,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

// ── Read-only banner ──────────────────────────────────────────────────────────

function ReadOnlyBanner({ repFirstName }: { repFirstName?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        background: C.warmPaper,
        border: `1px solid ${C.softLine}`,
        borderLeft: `3px solid ${C.charcoal}`,
        borderRadius: 6,
      }}
    >
      <Eye size={15} color={C.charcoal} strokeWidth={1.6} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...serif, fontSize: 14, fontWeight: 500, color: C.charcoal, lineHeight: 1.3 }}>
          Manager view · read-only
        </div>
        <div style={{ ...sans, fontSize: 12.5, color: C.gray700, lineHeight: 1.6, marginTop: 2 }}>
          You see everything {repFirstName ?? 'the rep'} sees. Editing this quote stays with the rep.
        </div>
      </div>
    </div>
  );
}

// ── Line-item document ────────────────────────────────────────────────────────

function LineItemDoc({ groups, total }: { groups: CCLineGroup[]; total: number | null }) {
  const computedTotal =
    total ??
    groups.reduce(
      (sum, g) => sum + g.items.reduce((s, it) => s + it.qty * it.unit, 0),
      0
    );

  return (
    <div style={{ marginTop: 20 }}>
      <AttentionRule />

      {groups.map((g, gi) => {
        const sub = g.items.reduce((a, it) => a + it.qty * it.unit, 0);
        return (
          <div key={gi} style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h3
                style={{
                  ...serif,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: C.charcoal,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                }}
              >
                {categoryLabel(g.cat)}
              </h3>
              <span style={{ ...sans, ...tabular, fontSize: 11, color: C.gray500 }}>
                {money(sub)}
              </span>
            </div>
            <div style={{ marginTop: 4 }}>
              {g.items.map((it, ii) => (
                <div
                  key={ii}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: `1px solid ${C.softLine}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...sans, fontSize: 13, color: C.charcoal, lineHeight: 1.3 }}>
                      {it.name}
                    </div>
                    <div style={{ ...sans, ...tabular, fontSize: 11, color: C.gray500, lineHeight: 1.3 }}>
                      {it.pack}{it.note ? ` · ${it.note}` : ''}
                    </div>
                  </div>
                  <div
                    style={{
                      ...sans,
                      ...tabular,
                      textAlign: 'right',
                      flexShrink: 0,
                      fontSize: 12.5,
                      color: C.gray700,
                    }}
                  >
                    {it.qty} × {money(it.unit)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Total */}
      <div
        style={{
          borderTop: `2px solid ${C.charcoal}`,
          marginTop: 16,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingTop: 12,
        }}
      >
        <span style={{ ...serif, fontSize: 15, color: C.charcoal }}>Quote total</span>
        <span style={{ ...serif, ...tabular, fontWeight: 600, fontSize: 22, color: C.charcoal }}>
          {money(computedTotal)}
        </span>
      </div>
    </div>
  );
}

// ── CCQuoteDetailPage ─────────────────────────────────────────────────────────

export function CCQuoteDetailPage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CCQuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quoteId) return;
    let cancelled = false;
    setLoading(true);
    getCommandCenterQuote(quoteId).then((res) => {
      if (cancelled) return;
      if (res.data) setDetail(res.data);
      else setError(res.error ?? 'Could not load quote.');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [quoteId]);

  const goBack = () => navigate('/distributor-admin/command-center/quotes');

  return (
    <div>
      {/* Back link */}
      <button
        type="button"
        onClick={goBack}
        style={{
          ...sans,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 16,
          fontSize: 12,
          color: C.gray700,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.charcoal; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.gray700; }}
      >
        <ChevronLeft size={14} strokeWidth={1.6} />
        Rep activity
      </button>

      <div style={{ maxWidth: 740 }}>
        {loading ? (
          <DetailSkeleton />
        ) : error ? (
          <div style={{ ...sans, fontSize: 13, color: C.gray500, padding: '48px 0', textAlign: 'center' }}>
            {error}
          </div>
        ) : detail ? (
          <QuoteDetailBody detail={detail} />
        ) : null}
      </div>
    </div>
  );
}

// ── QuoteDetailBody ───────────────────────────────────────────────────────────

function QuoteDetailBody({ detail: q }: { detail: CCQuoteDetail }) {
  const repFirstName = q.rep?.name.split(' ')[0];

  return (
    <>
      <ReadOnlyBanner repFirstName={repFirstName} />

      {/* Header */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div
            style={{
              ...sans,
              fontSize: 10,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: C.gray700,
              fontWeight: 600,
            }}
          >
            QUOTE · {q.id}
          </div>
          {q.requote > 0 && (
            <span style={{ ...sans, ...tabular, fontSize: 10.5, color: C.gray500, letterSpacing: '.04em' }}>
              RE-QUOTED {q.requote}×
            </span>
          )}
        </div>

        <h1
          style={{
            ...serif,
            fontWeight: 600,
            color: C.charcoal,
            fontSize: 30,
            lineHeight: 1.12,
            marginTop: 4,
          }}
        >
          {q.restaurant}
        </h1>

        <div style={{ ...sans, fontSize: 13, color: C.gray700, marginTop: 4 }}>
          {q.city} · sent {q.sent}
        </div>

        {/* Owned by + Status */}
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {q.rep ? (
              <RepAvatar initials={q.rep.initials} name={q.rep.name} size={34} />
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  border: `1px dashed ${C.gray400}`,
                  width: 34,
                  height: 34,
                }}
              >
                <User size={15} color={C.gray400} strokeWidth={1.6} />
              </span>
            )}
            <div>
              <div
                style={{
                  ...sans,
                  fontSize: 9,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color: C.gray500,
                  fontWeight: 600,
                }}
              >
                OWNED BY
              </div>
              <div style={{ ...sans, fontSize: 13.5, color: C.charcoal, lineHeight: 1.3 }}>
                {q.rep ? q.rep.name : 'Unassigned'}
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                ...sans,
                fontSize: 9,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: C.gray500,
                fontWeight: 600,
              }}
            >
              STATUS
            </div>
            <div style={{ marginTop: 2 }}>
              <CCStatusTag status={q.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Re-quote activity trail */}
      {q.requote > 0 && (
        <div
          style={{
            marginTop: 20,
            padding: '12px 16px',
            borderRadius: 6,
            background: C.warmPaper,
            border: `1px solid ${C.softLine}`,
          }}
        >
          <div
            style={{
              ...sans,
              fontSize: 9.5,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: C.gray700,
              fontWeight: 600,
            }}
          >
            RE-QUOTE ACTIVITY
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 8,
              flexWrap: 'wrap',
              fontSize: 12,
              color: C.gray700,
              ...sans,
              ...tabular,
            }}
          >
            {q.requote_trail.length > 0 ? (
              q.requote_trail.map((ev, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ArrowRight size={12} color={C.gray400} strokeWidth={1.6} />}
                  <span
                    style={{
                      color:
                        ev.event === 'accepted'
                          ? CC_ACK_NAVY
                          : ev.event === 'requoted'
                          ? C.charcoal
                          : C.gray700,
                      fontWeight: ev.event === 'accepted' ? 500 : 400,
                    }}
                  >
                    {ev.label}
                  </span>
                </React.Fragment>
              ))
            ) : (
              // Fallback trail when BE doesn't return events
              <>
                <span>First sent {q.sent}</span>
                <ArrowRight size={12} color={C.gray400} strokeWidth={1.6} />
                <span>Re-quoted {q.requote}×</span>
                <ArrowRight size={12} color={C.gray400} strokeWidth={1.6} />
                <span
                  style={{
                    color: q.status === 'accepted' ? CC_ACK_NAVY : C.charcoal,
                    fontWeight: q.status === 'accepted' ? 500 : 400,
                  }}
                >
                  {q.status === 'accepted'
                    ? 'Accepted'
                    : q.status === 'pending'
                    ? 'Waiting on chef'
                    : 'Sent'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Line-item document */}
      {q.line_groups && q.line_groups.length > 0 ? (
        <LineItemDoc groups={q.line_groups} total={q.total} />
      ) : (
        <div style={{ marginTop: 20 }}>
          <AttentionRule />
          <div style={{ ...sans, fontSize: 13, color: C.gray500, padding: '32px 0', textAlign: 'center' }}>
            Line items not available for this quote.
          </div>
        </div>
      )}

      {/* Optional message link — no orange, no editing */}
      {q.rep && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: `1px solid ${C.softLine}`,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 12,
            color: C.gray700,
          }}
        >
          <button
            type="button"
            style={{
              ...sans,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: C.gray700,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.charcoal; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.gray700; }}
          >
            <MessageCircle size={13} color={C.gray700} strokeWidth={1.6} />
            Message {repFirstName}
          </button>
        </div>
      )}
    </>
  );
}
