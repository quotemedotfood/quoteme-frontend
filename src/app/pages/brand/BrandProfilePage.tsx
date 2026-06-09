// BrandProfilePage — /brand/profile
//
// Reskinned per handoff/desi-brand-suite-060626/src/screens-profiles.jsx
// (BrandProfileBody) and screens-brand.jsx (BrandProfilePreviewBody).
// Data contract (user?.brand from /me) preserved.
//
// Doctrine: NO prices anywhere. Products shown as names + specs only.
// No distributor wording. No gradient colors.

import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { NpIcon } from '../../components/newspaper/NewspaperShell';
import { ProfileHeader, ProfileSection } from '../../components/brand/BrandPrimitives';

export function BrandProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const brandName = user?.brand?.name ?? user?.first_name ?? 'Brand';
  const brandMono = brandName.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase();
  const brandCategory = user?.brand?.category ?? null;
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || null;

  return (
    <div>
      {/* Preview notice */}
      <div className="mb-4 px-4 py-3 rounded-md flex items-center gap-2.5" style={{ background: 'var(--qm-warm-paper)', border: '1px solid var(--qm-soft-line)' }}>
        <NpIcon name="eye" size={14} color="var(--qm-gray-500)" />
        <span className="text-[11.5px] ink-soft">
          This is your public profile — how distributors and the network see you. Edit details in{' '}
          <button
            onClick={() => navigate('/brand/settings')}
            className="underline ink"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 'unset' }}
          >
            Settings
          </button>.
        </span>
      </div>

      {/* ── Profile header ── */}
      <ProfileHeader
        mono={brandMono}
        name={brandName}
        kind={`BRAND${brandCategory ? ` · ${brandCategory.toUpperCase()}` : ''}`}
        desktop
        links={user?.email ? [{ icon: 'at-sign', label: user.email }] : []}
      />

      {/* ── Contact ── */}
      {fullName && (
        <ProfileSection title="CONTACT" desktop>
          <div className="doc-divider py-2.5 flex items-baseline justify-between gap-3">
            <span className="qm-eyebrow" style={{ fontSize: 9 }}>NAME</span>
            <span className="text-[13px] ink leading-snug">{fullName}</span>
          </div>
          <div className="doc-divider py-2.5 flex items-baseline justify-between gap-3">
            <span className="qm-eyebrow" style={{ fontSize: 9 }}>EMAIL</span>
            <span className="text-[13px] ink leading-snug">{user?.email ?? '—'}</span>
          </div>
        </ProfileSection>
      )}

      {/* ── No-prices footer (doctrine) ── */}
      <div className="mt-8 flex items-start gap-3" style={{ borderTop: '1px solid var(--qm-soft-line)', paddingTop: 14 }}>
        <NpIcon name="info" size={14} color="var(--accent)" style={{ marginTop: 1 }} />
        <div className="ink-soft leading-relaxed" style={{ fontSize: 12, maxWidth: 460 }}>
          <b className="ink">Prices are never shown here.</b> Your products show names and pack specs only.
          Pricing lives inside a distributor's catalog — never on your profile.
        </div>
      </div>
    </div>
  );
}
