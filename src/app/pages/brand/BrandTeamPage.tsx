// BrandTeamPage — /brand/team
//
// Stub page per handoff/desi-brand-suite-060626/README.md nav contract.
// Team management (invite members, manage roles) is a future feature.
// Doctrine: No distributor wording. No rep-facing fields. No gradient colors.

import { NpIcon } from '../../components/newspaper/NewspaperShell';

export function BrandTeamPage() {
  return (
    <div>
      {/* ── Header ── */}
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: 32, lineHeight: 1.15 }}>Team</h1>
        <p className="mt-1 ink-faint" style={{ fontSize: 13.5 }}>
          Manage who has access to your brand account.
        </p>
      </div>

      {/* ── Coming soon ── */}
      <div
        className="mt-8 flex flex-col items-center justify-center text-center rounded-md"
        style={{ border: '1px solid var(--qm-soft-line)', background: 'var(--qm-warm-paper)', padding: '48px 32px', gap: 12 }}
      >
        <NpIcon name="users" size={28} color="var(--qm-gray-500)" />
        <div>
          <div className="text-[15px] ink font-medium" style={{ fontFamily: 'var(--qm-sans)' }}>Team management coming soon</div>
          <div className="mt-1 text-[13px] ink-faint" style={{ maxWidth: 360, margin: '6px auto 0' }}>
            You'll be able to invite colleagues, assign roles, and control who can publish catalog updates on behalf of your brand.
          </div>
        </div>
      </div>
    </div>
  );
}
