// B2 — Settings-populated: primitive layout components.
// Ported verbatim from source/screens-tabs.jsx (Desi handoff, 2026-05-19).
// Structure, class composition, and copy are binding per Desi spec.

import { useState } from 'react';

// ─── Utility ────────────────────────────────────────────────────────────────

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

// ─── SettingsSection ─────────────────────────────────────────────────────────

interface SettingsSectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
}

export function SettingsSection({ title, count, children }: SettingsSectionProps) {
  return (
    <div className="mt-6">
      <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
        <span>{title}</span>
        {typeof count === 'number' && (
          <span className="ink-faint" style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}>
            {count}
          </span>
        )}
      </div>
      <div className="mt-2 doc-divider-thick" />
      {children}
    </div>
  );
}

// ─── SettingRow (mobile) ──────────────────────────────────────────────────────

interface SettingRowProps {
  label: string;
  value: React.ReactNode;
  placeholder?: boolean;
}

export function SettingRow({ label, value, placeholder = false }: SettingRowProps) {
  return (
    <div className="doc-divider py-3 flex items-baseline justify-between gap-3">
      <div className="qm-eyebrow shrink-0" style={{ fontSize: 9.5, width: 64, paddingTop: 2 }}>
        {label}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cls('text-[13px] leading-snug', placeholder ? 'ink-faint' : 'ink')}>
          {value}
        </div>
      </div>
      <button className="text-[11.5px] ink-soft underline shrink-0">Edit</button>
    </div>
  );
}

// ─── DesktopSettingRow ────────────────────────────────────────────────────────

interface DesktopSettingRowProps {
  label: string;
  value: React.ReactNode;
  placeholder?: boolean;
}

export function DesktopSettingRow({ label, value, placeholder = false }: DesktopSettingRowProps) {
  return (
    <>
      <div
        className="qm-eyebrow doc-divider py-3.5 self-stretch"
        style={{ fontSize: 10, paddingTop: 14 }}
      >
        {label}
      </div>
      <div className="doc-divider py-3.5 self-stretch">
        <div className={cls('text-[13.5px] leading-snug', placeholder ? 'ink-faint' : 'ink')}>
          {value}
        </div>
      </div>
      <div className="doc-divider py-3.5 self-stretch text-right">
        <button className="text-[12px] ink-soft underline">Edit</button>
      </div>
    </>
  );
}

// ─── DistributorFollowupRow — V3 Part 9 (locked copy) ────────────────────────
//
// Locked copy — verbatim per Desi / V3 Part 9 / Opus c11 lock (May 18) Q8:
//   Question: "Allow your selected distributors to follow up on quotes tied to your menus?"
//   Options:  "Allow" / "Do not allow" (segmented control, not toggle).
//
// MUST NOT be modified without explicit lock override from Desi + Moose.

interface DistributorFollowupRowProps {
  defaultValue?: 'allow' | 'disallow';
  desktop?: boolean;
}

export function DistributorFollowupRow({
  defaultValue = 'allow',
  desktop = false,
}: DistributorFollowupRowProps) {
  const [value, setValue] = useState<'allow' | 'disallow'>(defaultValue);
  const px = desktop ? 'py-4' : 'py-3.5';
  const titleSize = desktop ? 'text-[13.5px]' : 'text-[13px]';
  const bodySize = desktop ? 'text-[12px]' : 'text-[11.5px]';

  return (
    <div className={cls(px, 'flex flex-col gap-3')}>
      <div>
        <div className={cls(titleSize, 'ink leading-snug')}>
          Allow your selected distributors to follow up on quotes tied to your menus?
        </div>
        <div className={cls(bodySize, 'ink-faint leading-snug mt-1')}>
          Applies only to distributors you&apos;ve already quoted with. Never opens you up to
          outreach from distributors you haven&apos;t selected.
        </div>
      </div>

      <div
        className="inline-flex rounded-md self-start"
        role="radiogroup"
        aria-label="Distributor follow-ups preference"
        style={{
          background: 'var(--background)',
          border: '1px solid var(--border)',
          padding: 3,
        }}
      >
        {(
          [
            { v: 'allow' as const, label: 'Allow' },
            { v: 'disallow' as const, label: 'Do not allow' },
          ] as const
        ).map((opt) => {
          const on = value === opt.v;
          return (
            <button
              key={opt.v}
              role="radio"
              aria-checked={on}
              onClick={() => setValue(opt.v)}
              className="px-3 py-1.5 rounded-[5px] transition-colors"
              style={{
                background: on ? '#fff' : 'transparent',
                color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
                fontFamily: on ? '"Playfair Display", Georgia, serif' : '"DM Sans", -apple-system, sans-serif',
                fontSize: desktop ? 12.5 : 12,
                fontWeight: 500,
                boxShadow: on ? '0 1px 2px rgba(43,43,43,.06)' : 'none',
                lineHeight: 1.2,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── QuoteCountPill — orange-outline counter wrapper ──────────────────────────
//
// May 19 lock: wraps the "{n} of 5 free quotes used" phrase.
// Border is orange (--qm-orange); text inherits from parent (ink-faint).
// Never reads as a CTA. Do not add cursor-pointer or hover states.

interface QuoteCountPillProps {
  children: React.ReactNode;
  padding?: string;
}

export function QuoteCountPill({ children, padding = '2px 10px' }: QuoteCountPillProps) {
  return (
    <span
      className="num"
      style={{
        display: 'inline-block',
        border: '1px solid var(--primary)',
        borderRadius: 999,
        padding,
        lineHeight: 1.3,
        fontFeatureSettings: '"tnum" 1',
      }}
    >
      {children}
    </span>
  );
}
