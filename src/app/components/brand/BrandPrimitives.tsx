// BrandPrimitives — shared visual primitives for the brand shell.
//
// Ported from:
//   handoff/desi-brand-suite-060626/src/screens-brand.jsx  (NotifyStatusBadge,
//     NotifyStepper, BrandMark)
//   handoff/desi-brand-suite-060626/src/screens-profiles.jsx  (ProfileMark,
//     ProfileHeader, ProfileSection, ProfileRepRow, CarriedBrandChip,
//     NoPricingFooter)
//
// Translation notes (JSX → TSX):
//   • No behaviour changes.
//   • NpIcon from NewspaperShell used for icon rendering.
//   • Doctrine: NO prices on distributor profiles.

import { NpIcon } from '../newspaper/NewspaperShell';

// ─── NotifyStatusBadge ────────────────────────────────────────────────────────

export type NotifyStatus = 'live' | 'loaded' | 'opened' | 'sent' | 'draft';

const NOTIFY_MAP: Record<
  NotifyStatus,
  { label: string; bg: string; fg: string; dot: string; border?: string }
> = {
  live:   { label: 'In their catalog', bg: 'rgba(127,174,194,.22)', fg: '#2A5F6F',            dot: 'var(--accent)' },
  loaded: { label: 'Loaded',           bg: '#F3F4F6',               fg: 'var(--qm-gray-700)', dot: 'var(--qm-charcoal)' },
  opened: { label: 'Opened',           bg: '#F3F4F6',               fg: 'var(--qm-gray-700)', dot: 'var(--qm-gray-400)' },
  sent:   { label: 'Sent',             bg: '#FFF9F3',               fg: 'var(--qm-gray-700)', dot: 'var(--qm-warning)', border: '1px solid var(--qm-soft-line)' },
  draft:  { label: 'Draft',            bg: '#fff',                  fg: 'var(--qm-gray-500)', dot: 'var(--qm-gray-400)', border: '1px solid var(--qm-soft-line)' },
};

export function NotifyStatusBadge({ status }: { status: NotifyStatus | string }) {
  const m = NOTIFY_MAP[(status as NotifyStatus)] ?? NOTIFY_MAP.sent;
  return (
    <span
      className="qm-pill"
      style={{
        background: m.bg,
        color: m.fg,
        border: m.border ?? 'none',
        fontSize: 10,
        padding: '2px 8px',
        gap: 5,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 999, background: m.dot, display: 'inline-block' }} />
      {m.label}
    </span>
  );
}

// ─── NotifyStepper ────────────────────────────────────────────────────────────

const NOTIFY_STEPS: NotifyStatus[] = ['sent', 'opened', 'loaded', 'live'];
const NOTIFY_LABELS: Record<NotifyStatus, string> = {
  sent: 'Sent', opened: 'Opened', loaded: 'Loaded', live: 'In catalog', draft: 'Draft',
};

export function NotifyStepper({ status }: { status: NotifyStatus | string }) {
  const idx = NOTIFY_STEPS.indexOf(status as NotifyStatus);
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {NOTIFY_STEPS.map((s, i) => {
        const done = i <= idx;
        return (
          <span key={s} className="inline-flex items-center gap-1">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: done ? 'var(--accent)' : 'var(--qm-gray-200)',
                display: 'inline-block',
              }}
            />
            <span
              className="num"
              style={{ fontSize: 9.5, color: done ? 'var(--qm-charcoal)' : 'var(--qm-gray-400)', letterSpacing: '.02em' }}
            >
              {NOTIFY_LABELS[s]}
            </span>
            {i < NOTIFY_STEPS.length - 1 && (
              <span
                style={{
                  flex: 1,
                  height: 1,
                  background: i < idx ? 'var(--accent)' : 'var(--qm-gray-200)',
                  minWidth: 8,
                  display: 'inline-block',
                }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

// ─── BrandMark ────────────────────────────────────────────────────────────────

export function BrandMark({
  mono,
  size = 44,
  radius,
  onDark = false,
}: {
  mono: string;
  size?: number;
  radius?: number;
  onDark?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 serif"
      style={{
        width: size,
        height: size,
        borderRadius: radius != null ? radius : Math.round(size * 0.22),
        background: onDark ? 'rgba(255,255,255,.12)' : '#1F1A14',
        color: onDark ? '#fff' : '#FBFAF7',
        fontWeight: 600,
        fontSize: size * 0.4,
        lineHeight: 1,
        letterSpacing: '-0.01em',
      }}
      aria-hidden="true"
    >
      {mono}
    </span>
  );
}

// ─── Profile primitives (from screens-profiles.jsx) ───────────────────────────

export function ProfileMark({
  mono,
  size = 56,
  radius,
  dark = true,
  accent,
}: {
  mono: string;
  size?: number;
  radius?: number;
  dark?: boolean;
  accent?: string;
}) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 serif"
      style={{
        width: size,
        height: size,
        borderRadius: radius != null ? radius : Math.round(size * 0.2),
        background: accent ?? (dark ? '#1F1A14' : 'var(--qm-warm-paper)'),
        color: dark || accent ? '#FBFAF7' : 'var(--qm-charcoal)',
        border: dark || accent ? 'none' : '1px solid var(--qm-soft-line)',
        fontWeight: 600,
        fontSize: size * 0.38,
        lineHeight: 1,
        letterSpacing: '-0.01em',
      }}
      aria-hidden="true"
    >
      {mono}
    </span>
  );
}

export function ProfileLinks({ links = [], desktop = false }: { links: Array<{ icon?: string; label: string }>; desktop?: boolean }) {
  if (!links.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
      {links.map((l, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 ink-soft" style={{ fontSize: desktop ? 12.5 : 12 }}>
          <NpIcon name={l.icon ?? 'link'} size={13} color="var(--qm-gray-500)" />
          <span className="underline underline-offset-2">{l.label}</span>
        </span>
      ))}
    </div>
  );
}

export function ProfileHeader({
  mono,
  name,
  kind,
  location,
  links,
  accent,
  desktop = false,
  est,
}: {
  mono: string;
  name: string;
  kind: string;
  location?: string;
  links?: Array<{ icon?: string; label: string }>;
  accent?: string;
  desktop?: boolean;
  est?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <ProfileMark mono={mono} size={desktop ? 64 : 52} accent={accent} />
      <div className="min-w-0 flex-1">
        <div className="qm-eyebrow" style={{ fontSize: desktop ? 10.5 : 10 }}>{kind}</div>
        <h1
          className="serif font-semibold ink mt-1"
          style={{ fontSize: desktop ? 32 : 24, lineHeight: 1.1, letterSpacing: '-0.01em' }}
        >
          {name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 ink-faint" style={{ fontSize: desktop ? 13 : 12 }}>
          {location && (
            <span className="inline-flex items-center gap-1">
              <NpIcon name="map-pin" size={12} color="var(--qm-gray-400)" /> {location}
            </span>
          )}
          {est && <span className="num">· Est. {est}</span>}
        </div>
        {links && <ProfileLinks links={links} desktop={desktop} />}
      </div>
    </div>
  );
}

export function ProfileSection({
  title,
  count,
  note,
  children,
  desktop = false,
}: {
  title: string;
  count?: number;
  note?: string;
  children?: React.ReactNode;
  desktop?: boolean;
}) {
  return (
    <div className={desktop ? 'mt-8' : 'mt-7'}>
      <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
        <span>{title}</span>
        {count != null && (
          <span className="ink-faint" style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}>{count}</span>
        )}
      </div>
      {note && (
        <div className="mt-1 text-[11.5px] ink-faint leading-snug" style={{ maxWidth: 360 }}>{note}</div>
      )}
      <div className="mt-2 doc-divider-thick" />
      {children}
    </div>
  );
}

export function ProfileRepRow({
  rep,
  viewerLoggedIn,
}: {
  rep: { name: string; territory?: string; email?: string | null; phone?: string | null; publicize?: boolean };
  viewerLoggedIn: boolean;
}) {
  const showContact = viewerLoggedIn && rep.publicize && (rep.email || rep.phone);
  return (
    <div className="doc-divider py-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[13.5px] ink leading-snug">{rep.name}</div>
        {rep.territory && <div className="text-[11.5px] ink-faint leading-snug">{rep.territory}</div>}
      </div>
      <div className="text-right shrink-0">
        {showContact ? (
          <>
            {rep.email && (
              <a href={`mailto:${rep.email}`} className="block text-[11.5px] underline ink-soft leading-snug">
                {rep.email}
              </a>
            )}
            {rep.phone && <div className="text-[11.5px] ink-faint num leading-snug">{rep.phone}</div>}
          </>
        ) : (
          <span className="text-[11px] ink-faint leading-snug inline-flex items-center gap-1">
            <NpIcon name="lock" size={11} color="var(--qm-gray-400)" />
            {viewerLoggedIn ? 'Contact not shared' : 'Sign in to reach'}
          </span>
        )}
      </div>
    </div>
  );
}

export function CarriedBrandChip({ name, mono }: { name: string; mono: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 doc-divider">
      <ProfileMark mono={mono} size={32} radius={7} />
      <span className="text-[13px] ink leading-snug">{name}</span>
    </div>
  );
}

// Doctrine: prices are NEVER shown on a distributor profile.
export function NoPricingFooter({ desktop = false }: { desktop?: boolean }) {
  return (
    <div className="mt-8 flex items-start gap-3" style={{ borderTop: '1px solid var(--qm-soft-line)', paddingTop: 14 }}>
      <NpIcon name="shield" size={15} color="var(--accent)" style={{ marginTop: 1 }} />
      <div className="ink-soft leading-relaxed" style={{ fontSize: desktop ? 12 : 11.5, maxWidth: 460 }}>
        <b className="ink">Prices are never shown here.</b> A distributor's catalog and pricing stay private:
        they appear only inside a quote a chef has asked for. Nothing on this page reflects what anything costs.
      </div>
    </div>
  );
}
