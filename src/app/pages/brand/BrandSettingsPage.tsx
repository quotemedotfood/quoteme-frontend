// BrandSettingsPage — /brand/settings
//
// Reskinned per handoff/desi-brand-suite-060626/src/screens-brand.jsx
// (BrandSettingsBody). All API wiring (updateCurrentUser, refreshUser)
// and field schema preserved.
//
// No distributor wording. No rep-facing fields. No gradient colors.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { updateCurrentUser } from '../../services/api';
import { BrandMark } from '../../components/brand/BrandPrimitives';

export function BrandSettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName]   = useState(user?.last_name ?? '');
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const brandName = user?.brand?.name ?? user?.first_name ?? 'Brand';
  const brandCategory = user?.brand?.category ?? null;
  const brandMono = brandName.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);
    const res = await updateCurrentUser({ first_name: firstName.trim(), last_name: lastName.trim() });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSuccess(true);
    await refreshUser();
  };

  // ── Helper components ──────────────────────────────────────────────────────
  function Row({ label, value }: { label: string; value: string }) {
    return (
      <div className="doc-divider py-3 flex items-baseline justify-between gap-3">
        <span className="qm-eyebrow" style={{ fontSize: 9 }}>{label}</span>
        <span className="text-[13px] ink leading-snug">{value || '—'}</span>
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="mt-8">
        <div className="qm-eyebrow" style={{ fontSize: 10 }}>{title}</div>
        <div className="mt-2 doc-divider-thick" />{children}
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: 32, lineHeight: 1.15 }}>Settings</h1>
        <p className="mt-1 ink-faint" style={{ fontSize: 13.5 }}>Your company details. This is what powers your public profile.</p>
        <button
          onClick={() => navigate('/brand/profile')}
          className="mt-2 text-[12px] ink-soft underline inline-flex items-center gap-1"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 'unset' }}
        >
          View your public profile →
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px', alignItems: 'start' }}>
        {/* ── Left column ── */}
        <div>
          <Section title="LOGO">
            <div className="py-3.5 flex items-center gap-4">
              <BrandMark mono={brandMono} size={56} radius={12} />
              <div className="min-w-0">
                <button className="qm-btn qm-btn-outline" style={{ padding: '8px 14px', fontSize: 12.5 }}>
                  Replace logo
                </button>
                <div className="text-[11px] ink-faint mt-1.5 leading-snug">
                  Shown on your profile and across the network. PNG or SVG, square.
                </div>
              </div>
            </div>
          </Section>

          <Section title="COMPANY">
            <Row label="Brand name"  value={brandName} />
            <Row label="Email"       value={user?.email ?? ''} />
            <Row label="Category"    value={brandCategory ?? ''} />
          </Section>

          {/* Account update form */}
          <Section title="YOUR ACCOUNT">
            <form onSubmit={handleSave} className="py-2">
              <div className="flex gap-3 mt-2">
                <div className="flex-1">
                  <label className="qm-eyebrow block" style={{ fontSize: 9 }}>FIRST NAME</label>
                  <input
                    className="qm-input mt-1"
                    style={{ fontSize: 14, padding: '8px 10px', minHeight: 'unset' }}
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="flex-1">
                  <label className="qm-eyebrow block" style={{ fontSize: 9 }}>LAST NAME</label>
                  <input
                    className="qm-input mt-1"
                    style={{ fontSize: 14, padding: '8px 10px', minHeight: 'unset' }}
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              {error && <div className="mt-2 text-[12.5px] px-3 py-2 rounded-md" style={{ color: '#B91C1C', background: '#FEF2F2' }}>{error}</div>}
              {success && <div className="mt-2 text-[12.5px] px-3 py-2 rounded-md" style={{ color: '#15803D', background: '#F0FDF4' }}>Settings saved.</div>}

              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="qm-btn qm-btn-orange"
                  style={{ fontSize: 14, opacity: saving ? 0.5 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => { setFirstName(user?.first_name ?? ''); setLastName(user?.last_name ?? ''); setError(null); setSuccess(false); }}
                  className="qm-btn qm-btn-text"
                  style={{ fontSize: 14 }}
                >
                  Discard
                </button>
              </div>
            </form>
          </Section>
        </div>

        {/* ── Right column ── */}
        <div>
          <Section title="BILLING">
            <div className="py-3.5">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[13px] ink">Free plan</div>
                  <div className="text-[11.5px] ink-faint leading-snug mt-0.5">
                    Send your line to distributors at no cost.
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>

      <div
        className="mt-10 pt-5 flex items-center justify-between gap-4"
        style={{ borderTop: '1px solid var(--qm-soft-line)' }}
      >
        <div className="text-[12px] ink-faint">
          Signed in as {user?.email ?? '—'}
        </div>
        <button
          type="button"
          onClick={() => { logout(); navigate('/auth', { replace: true }); }}
          className="text-[12px] ink-soft underline"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 'unset' }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
