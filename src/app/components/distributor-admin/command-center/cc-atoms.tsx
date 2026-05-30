// Command Center atoms — CCStatusTag, SourceBadge, RepAvatar, CCSectionHead.
//
// Port of cc-core.jsx prototype atoms to production React/TypeScript.
// Sacred Orange = #F2993D (constitution canonical). CCQuotes + CCQuoteDetail
// carry ZERO orange — status tag uses dots only.
// No gradients. Field voice throughout.

import React from 'react';
import {
  MessageCircle,
  Globe,
  Users,
  PenLine,
} from 'lucide-react';

export const SACRED_ORANGE = '#F2993D';
export const CC_BLUE = '#A5CFDD';
export const CC_BLUE_INK = '#7FAEC2'; // --accent
export const CC_ACK_NAVY = '#2A5F6F';

const C = {
  charcoal: '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
} as const;

export const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
export const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
export const tabular: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1',
};

// ── Status vocabulary ─────────────────────────────────────────────────────────
// accepted    → serif, warm-paper, ack-navy
// pending     → "Waiting on chef", accent-blue dot
// sent        → "Sent", gray dot
// unassigned  → "Needs an owner", Sacred Orange dot (only on non-read-only surfaces)

export type CCStatus = 'accepted' | 'pending' | 'sent' | 'unassigned';

interface CCStatusTagProps {
  status: CCStatus;
  size?: 'sm' | 'xs';
}

export function CCStatusTag({ status, size = 'sm' }: CCStatusTagProps) {
  const fs = size === 'xs' ? 10 : 11;

  if (status === 'accepted') {
    return (
      <span
        style={{
          ...serif,
          display: 'inline-block',
          background: C.warmPaper,
          color: CC_ACK_NAVY,
          border: `1px solid ${CC_ACK_NAVY}33`,
          fontSize: fs,
          padding: '2px 9px',
          fontWeight: 500,
          borderRadius: 999,
          lineHeight: 1.6,
          whiteSpace: 'nowrap',
        }}
      >
        Accepted
      </span>
    );
  }

  const map: Record<string, { label: string; dot: string; fg: string }> = {
    pending:    { label: 'Waiting on chef', dot: CC_BLUE_INK,   fg: C.charcoal },
    sent:       { label: 'Sent',            dot: C.gray400,      fg: C.gray700  },
    unassigned: { label: 'Needs an owner',  dot: SACRED_ORANGE,  fg: C.charcoal },
  };
  const m = map[status] ?? map.sent;

  return (
    <span
      style={{
        ...sans,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: fs,
        color: m.fg,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: m.dot,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {m.label}
    </span>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────

export type InboundSource = 'request' | 'website' | 'referral' | 'manual';

export const SOURCE_LABEL: Record<InboundSource, string> = {
  request:  'Chef request',
  website:  'Website',
  referral: 'Referral',
  manual:   'Logged by hand',
};

const SOURCE_ICON_MAP: Record<InboundSource, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  request:  MessageCircle,
  website:  Globe,
  referral: Users,
  manual:   PenLine,
};

interface SourceBadgeProps {
  source: InboundSource;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const Icon = SOURCE_ICON_MAP[source] ?? MessageCircle;
  return (
    <span
      style={{
        ...sans,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 10.5,
        letterSpacing: '.04em',
        color: C.gray700,
        border: `1px solid ${C.softLine}`,
        borderRadius: 999,
        padding: '2px 9px 2px 7px',
        background: '#fff',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={11} color={C.gray700} strokeWidth={1.6} />
      {SOURCE_LABEL[source]}
    </span>
  );
}

// ── Rep avatar chip ───────────────────────────────────────────────────────────

interface RepAvatarProps {
  initials: string;
  name?: string;
  size?: number;
}

export function RepAvatar({ initials, name, size = 28 }: RepAvatarProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        border: `1px solid ${C.softLine}`,
        background: C.warmPaper,
        width: size,
        height: size,
        flexShrink: 0,
      }}
      title={name}
    >
      <span
        style={{
          ...serif,
          fontWeight: 600,
          color: C.charcoal,
          fontSize: size * 0.4,
          lineHeight: 1,
        }}
      >
        {initials}
      </span>
    </span>
  );
}

// ── Section head ──────────────────────────────────────────────────────────────

interface CCSectionHeadProps {
  eyebrow?: string;
  eyebrowColor?: string;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  size?: 'lg' | 'sm';
}

export function CCSectionHead({
  eyebrow,
  eyebrowColor,
  title,
  sub,
  right,
  size = 'lg',
}: CCSectionHeadProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <div
              style={{
                ...sans,
                fontSize: 10.5,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: eyebrowColor ?? C.gray700,
                fontWeight: 600,
              }}
            >
              {eyebrow}
            </div>
          )}
          <h1
            style={{
              ...serif,
              fontWeight: 600,
              color: C.charcoal,
              fontSize: size === 'lg' ? 30 : 22,
              lineHeight: 1.12,
              marginTop: eyebrow ? 4 : 0,
            }}
          >
            {title}
          </h1>
          {sub && (
            <p
              style={{
                ...sans,
                marginTop: 8,
                fontSize: 13.5,
                color: C.gray700,
                lineHeight: 1.6,
                maxWidth: 620,
              }}
            >
              {sub}
            </p>
          )}
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
    </div>
  );
}

// ── Attention / doc dividers ──────────────────────────────────────────────────

export function AttentionRule() {
  return (
    <div
      style={{
        borderTop: `2px solid ${C.charcoal}`,
        marginTop: 6,
      }}
    />
  );
}

export function SoftRule() {
  return (
    <div
      style={{
        borderTop: `1px solid ${C.softLine}`,
      }}
    />
  );
}

// ── Count line ────────────────────────────────────────────────────────────────

interface CountLineCounts {
  total: number;
  accepted: number;
  pending: number;
  sent: number;
  unassigned: number;
}

interface CountLineProps {
  counts: CountLineCounts;
}

export function CountLine({ counts }: CountLineProps) {
  const seg = (n: number, label: string, color?: string) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 6,
      }}
    >
      <span
        style={{
          ...serif,
          ...tabular,
          fontSize: 16,
          fontWeight: 600,
          color: color ?? C.charcoal,
        }}
      >
        {n}
      </span>
      <span style={{ ...sans, fontSize: 12, color: C.gray700 }}>{label}</span>
    </span>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '20px',
        flexWrap: 'wrap',
        rowGap: 6,
      }}
    >
      {seg(counts.total, 'on the board')}
      <span style={{ color: C.gray400 }}>·</span>
      {seg(counts.accepted, 'accepted', CC_ACK_NAVY)}
      {seg(counts.pending, 'waiting on the chef')}
      {seg(counts.sent, 'sent')}
      {counts.unassigned > 0 && (
        <>{seg(counts.unassigned, 'need an owner')}</>
      )}
    </div>
  );
}

export { C };
