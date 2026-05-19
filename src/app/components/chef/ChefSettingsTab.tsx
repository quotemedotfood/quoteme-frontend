// B2 — Settings-populated: ChefSettingsTab (mobile) + ChefSettingsTabDesktop.
// Ported verbatim from source/screens-tabs.jsx (Desi handoff, 2026-05-19).
// Structure, class composition, copy, and section order are binding per Desi spec.
//
// V3 spec refs: Part 6.7 (tab content scope), Part 9 (distributor follow-ups — locked copy).
//
// ChefTabBar: B1 (feat-a1-chef-sidebar-shell) will land this at
//   src/app/components/chef/ChefTabBar (or ChefMobileTabBar).
//   Minimal stub below — B1 will replace at bundle integration.
// ChefTabDesktopShell: same B1 branch, same path.
//   Minimal stub below — B1 will replace at bundle integration.

import { ImagePlus, UserPlus, Store, Plus } from 'lucide-react';

import {
  SettingsSection,
  SettingRow,
  DesktopSettingRow,
  DistributorFollowupRow,
  QuoteCountPill,
} from './SettingsPrimitives';

// ─── Types ───────────────────────────────────────────────────────────────────

type NavFn = (target: string) => void;

// ─── Demo data — LOCKED (verbatim from source/screens-tabs.jsx) ──────────────
// TODO: replace with API data from GET /api/v1/chef/settings (or equivalent endpoint).

const TEAM_CHEFS = [
  {
    name: 'Marta Quintero',
    email: 'marta@hollowayandsons.com',
    role: 'Sous chef',
    joined: 'Apr 14, 2026',
    status: 'active' as const,
  },
  {
    name: 'Wei Tanaka',
    email: 'wei@hollowayandsons.com',
    role: 'Pastry',
    joined: null as string | null,
    status: 'invited' as const,
  },
];

const LOCATIONS = [
  { name: 'Holloway & Sons', city: 'Hudson, NY', role: 'Primary', current: true },
  { name: 'The Maple Room', city: 'Rhinebeck, NY', role: 'Visiting', current: false },
];

// TODO: replace with API data from GET /api/v1/chef/me.
const DEMO = {
  chefFirst: 'Marcus',
  chefLast: 'Holloway',
  chefEmail: 'marcus@hollowayandsons.com',
  restaurant: 'Holloway & Sons',
};

// ─── B1 stubs ─────────────────────────────────────────────────────────────────
// TODO: Remove these stubs when B1 (feat-a1-chef-sidebar-shell) merges to main.
//       ChefTabBar → src/app/components/chef/ChefTabBar
//       ChefTabDesktopShell → src/app/components/chef/ChefTabDesktopShell

function noopNav(_target: string): void {}

function ChefTabBar({ active }: { active: string; nav?: NavFn }) {
  // TODO: import { ChefTabBar } from './ChefTabBar'; when B1 lands.
  const tabs = [
    { id: 'home', label: 'Quotes' },
    { id: 'distributors', label: 'Distributors' },
    { id: 'settings', label: 'Settings' },
  ];
  return (
    <div
      style={{
        borderTop: '1px solid var(--qm-soft-line)',
        background: '#fff',
        display: 'flex',
        height: 56,
        flexShrink: 0,
      }}
    >
      {tabs.map((t) => (
        <div
          key={t.id}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: active === t.id ? 600 : 400,
            color: active === t.id ? 'var(--qm-charcoal)' : 'var(--qm-gray-500)',
          }}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}

function ChefTabDesktopShell({
  children,
}: {
  active: string;
  nav?: NavFn;
  initialMode?: string;
  children: React.ReactNode;
}) {
  // TODO: import { ChefTabDesktopShell } from './ChefTabDesktopShell'; when B1 lands.
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '36px 40px' }}>{children}</div>
  );
}

// ─── ChefSettingsTab — mobile ────────────────────────────────────────────────

interface ChefSettingsTabProps {
  state?: 'with-data' | 'empty';
  nav?: NavFn;
}

export function ChefSettingsTab({ state = 'with-data', nav = noopNav }: ChefSettingsTabProps) {
  const empty = state === 'empty';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-5 pt-5 pb-6 scroller">
        <div>
          <div className="serif font-semibold ink" style={{ fontSize: 24, lineHeight: 1.15 }}>
            Settings
          </div>
          <p className="mt-1 text-[12.5px] ink-faint">
            Your details, your kitchen, the people in it.
          </p>
        </div>

        {/* YOU */}
        <SettingsSection title="YOU">
          <SettingRow label="Name" value={empty ? '—' : `${DEMO.chefFirst} ${DEMO.chefLast}`} />
          <SettingRow label="Email" value={DEMO.chefEmail} />
          <SettingRow
            label="Phone"
            value={empty ? 'Add a number' : '(518) 555-0188'}
            placeholder={empty}
          />
        </SettingsSection>

        {/* RESTAURANT */}
        <SettingsSection title="RESTAURANT">
          <div className="py-3 flex items-center gap-3">
            <div
              className="shrink-0 rounded-md flex items-center justify-center"
              style={{
                width: 56,
                height: 56,
                background: empty ? 'var(--qm-warm-paper)' : '#1F1A14',
                border: '1px solid var(--qm-soft-line)',
                color: empty ? 'var(--qm-gray-500)' : '#FBFAF7',
              }}
            >
              {empty ? (
                <ImagePlus size={20} color="var(--qm-gray-500)" />
              ) : (
                <span className="serif font-semibold" style={{ fontSize: 18, letterSpacing: 0.4 }}>
                  H&amp;S
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] ink leading-snug">{empty ? 'Add a logo' : 'Logo'}</div>
              <div className="text-[11.5px] ink-faint leading-snug">
                {empty
                  ? 'Square PNG or JPG. Shows on your order guides.'
                  : 'Shows on your order guide header and emails.'}
              </div>
              <button className="text-[11.5px] underline ink-soft mt-1">
                {empty ? 'Upload' : 'Replace'}
              </button>
            </div>
          </div>
          <SettingRow label="Name" value={empty ? 'Holloway & Sons' : DEMO.restaurant} />
          <SettingRow
            label="Address"
            value={empty ? 'Add address' : '412 Warren St, Hudson, NY 12534'}
            placeholder={empty}
          />
          <SettingRow
            label="Phone"
            value={empty ? 'Add a number' : '(518) 555-0140'}
            placeholder={empty}
          />
        </SettingsSection>

        {/* OTHER CHEFS — magic-link invite, no passwords */}
        <SettingsSection title="OTHER CHEFS HERE" count={empty ? 0 : TEAM_CHEFS.length}>
          {empty ? (
            <div className="py-3 text-[12.5px] ink-faint leading-snug">
              Just you for now. Invite the kitchen and quotes are shared automatically.
            </div>
          ) : (
            TEAM_CHEFS.map((c, i) => (
              <div key={i} className="doc-divider py-3 flex items-start gap-3">
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      c.status === 'active' ? 'var(--qm-light-blue)' : 'var(--qm-warm-paper)',
                    border:
                      c.status === 'active' ? 'none' : '1px dashed var(--qm-soft-line)',
                  }}
                >
                  <span className="serif text-[11px] font-semibold ink">
                    {c.name
                      .split(' ')
                      .map((s) => s[0])
                      .join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <div className="text-[13px] ink leading-snug">{c.name}</div>
                    {c.status === 'invited' && (
                      <span
                        className="qm-pill"
                        style={{
                          background: '#FEF3C7',
                          color: '#92400E',
                          fontSize: 9.5,
                          padding: '1px 7px',
                        }}
                      >
                        Invite sent
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] ink-faint leading-snug">{c.email}</div>
                  <div className="text-[11px] ink-faint mt-0.5 leading-snug">
                    {c.role}
                    {c.joined && <span> · joined {c.joined}</span>}
                  </div>
                </div>
                <button className="text-[11.5px] ink-soft underline shrink-0">
                  {c.status === 'invited' ? 'Resend' : 'Remove'}
                </button>
              </div>
            ))
          )}
          <button
            className="qm-btn qm-btn-outline mt-3 flex items-center gap-1.5"
            style={{ padding: '8px 14px', fontSize: 12.5 }}
          >
            <UserPlus size={14} /> Invite a chef
          </button>
          <div className="text-[10.5px] ink-faint mt-2 leading-snug">
            We send a one-tap link. No password, no account setup on their end.
          </div>
        </SettingsSection>

        {/* OTHER LOCATIONS */}
        <SettingsSection title="OTHER LOCATIONS" count={empty ? 0 : LOCATIONS.length - 1}>
          {empty ? (
            <div className="py-3 text-[12.5px] ink-faint leading-snug">
              {DEMO.restaurant} is your only kitchen right now.
            </div>
          ) : (
            LOCATIONS.filter((l) => !l.current).map((l, i) => (
              <div key={i} className="doc-divider py-3 flex items-start gap-3">
                <Store size={16} color="var(--qm-gray-700)" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] ink leading-snug">{l.name}</div>
                  <div className="text-[11.5px] ink-faint leading-snug">
                    {l.city} · {l.role}
                  </div>
                </div>
                <button className="text-[11.5px] ink-soft underline shrink-0">Switch to</button>
              </div>
            ))
          )}
          <button
            className="qm-btn qm-btn-outline mt-3 flex items-center gap-1.5"
            style={{ padding: '8px 14px', fontSize: 12.5 }}
          >
            <Plus size={14} /> Add another restaurant
          </button>
          <div className="text-[10.5px] ink-faint mt-2 leading-snug">
            Quotes, rep contacts, and order guides stay separate per location.
          </div>
        </SettingsSection>

        {/* DISTRIBUTOR FOLLOW-UPS — V3 Part 9 (locked copy).
            Anchors the chef-distributor relationship to existing selections, never opens it
            up to algorithmic targeting. Opus c11 lock (May 18) Q8: own section, before BILLING. */}
        <SettingsSection title="DISTRIBUTOR FOLLOW-UPS">
          <DistributorFollowupRow defaultValue={empty ? 'allow' : 'allow'} />
        </SettingsSection>

        {/* BILLING — last per Justin's operational hierarchy (money lives at the bottom of the doc) */}
        <SettingsSection title="BILLING">
          <div className="py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <div className="serif text-[15px] font-medium ink">{empty ? 'Free' : 'Free'}</div>
                <span
                  className="qm-pill"
                  style={{
                    background: '#F3F4F6',
                    color: 'var(--qm-gray-700)',
                    fontSize: 10,
                    padding: '2px 8px',
                  }}
                >
                  Current
                </span>
              </div>
              <div className="text-[11.5px] ink-faint num mt-1">
                <QuoteCountPill>
                  {empty ? '0 of 5 quotes used' : '3 of 5 quotes used · 2 left'}
                </QuoteCountPill>
              </div>
            </div>
            {!empty && (
              <button
                className="qm-btn qm-btn-orange"
                style={{ padding: '8px 14px', fontSize: 12.5 }}
              >
                Add payment
              </button>
            )}
          </div>

          {/* Paid tier explainer — no marketing voice, just what it does */}
          <div className="doc-divider pt-3 pb-1">
            <div className="text-[12.5px] ink leading-snug">
              <span className="serif font-medium">$50/mo</span> · unlimited quotes, plus the ability
              to send one menu to several distributors at once.
            </div>
            <div className="text-[11px] ink-faint mt-1 leading-snug">
              Card on file via Stripe. Cancel from here any month.
            </div>
          </div>

          <div className="pt-3 mt-1 text-[11px] ink-faint leading-snug">
            Need a different setup, or invoicing for a group? Email{' '}
            <a href="mailto:billing@quoteme.food" className="underline ink-soft">
              billing@quoteme.food
            </a>
            .
          </div>
        </SettingsSection>

        {/* Sign out — quiet, bottom of the page */}
        <div
          className="mt-7 pt-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--qm-soft-line)' }}
        >
          <div className="text-[11.5px] ink-faint">Signed in as {DEMO.chefEmail}</div>
          <button className="text-[11.5px] ink-soft underline">Sign out</button>
        </div>
      </div>

      <ChefTabBar active="settings" nav={nav} />
    </div>
  );
}

// ─── ChefSettingsTabDesktop ───────────────────────────────────────────────────

interface ChefSettingsTabDesktopProps {
  state?: 'with-data' | 'empty';
  nav?: NavFn;
  initialMode?: string;
}

export function ChefSettingsTabDesktop({
  state = 'with-data',
  nav = noopNav,
  initialMode = 'open',
}: ChefSettingsTabDesktopProps) {
  const empty = state === 'empty';

  return (
    <ChefTabDesktopShell active="settings" nav={nav} initialMode={initialMode}>
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: 32, lineHeight: 1.15 }}>
          Settings
        </h1>
        <p className="mt-1 text-[14px] ink-faint">
          Your details, your kitchen, the people in it.
        </p>
      </div>

      <div className="mt-7">
        {/* Sections — single column. Sidebar carries sub-nav; section eyebrows
            are enough document signposting. */}
        <div>
          {/* YOU */}
          <section id="you">
            <div className="qm-eyebrow" style={{ fontSize: 11 }}>
              YOU
            </div>
            <div className="mt-2 doc-divider-thick" />
            <div className="grid grid-cols-[120px_1fr_auto] items-baseline gap-x-4">
              <DesktopSettingRow
                label="Name"
                value={empty ? '—' : `${DEMO.chefFirst} ${DEMO.chefLast}`}
                placeholder={empty}
              />
              <DesktopSettingRow label="Email" value={DEMO.chefEmail} />
              <DesktopSettingRow
                label="Phone"
                value={empty ? 'Add a number' : '(518) 555-0188'}
                placeholder={empty}
              />
            </div>
          </section>

          {/* RESTAURANT */}
          <section id="kitchen" className="mt-10">
            <div className="qm-eyebrow" style={{ fontSize: 11 }}>
              RESTAURANT
            </div>
            <div className="mt-2 doc-divider-thick" />
            <div className="py-4 flex items-center gap-4">
              <div
                className="shrink-0 rounded-md flex items-center justify-center"
                style={{
                  width: 72,
                  height: 72,
                  background: empty ? 'var(--qm-warm-paper)' : '#1F1A14',
                  border: '1px solid var(--qm-soft-line)',
                  color: empty ? 'var(--qm-gray-500)' : '#FBFAF7',
                }}
              >
                {empty ? (
                  <ImagePlus size={22} color="var(--qm-gray-500)" />
                ) : (
                  <span
                    className="serif font-semibold"
                    style={{ fontSize: 22, letterSpacing: 0.4 }}
                  >
                    H&amp;S
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] ink leading-snug">
                  {empty ? 'Add a logo' : 'Logo'}
                </div>
                <div className="text-[12px] ink-faint leading-snug">
                  Square PNG or JPG, up to 2 MB. Shows on your order guide header and emails.
                </div>
                <button className="text-[12px] underline ink-soft mt-1">
                  {empty ? 'Upload' : 'Replace'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-[120px_1fr_auto] items-baseline gap-x-4">
              <DesktopSettingRow
                label="Name"
                value={empty ? 'Holloway & Sons' : DEMO.restaurant}
              />
              <DesktopSettingRow
                label="Address"
                value={empty ? 'Add address' : '412 Warren St, Hudson, NY 12534'}
                placeholder={empty}
              />
              <DesktopSettingRow
                label="Phone"
                value={empty ? 'Add a number' : '(518) 555-0140'}
                placeholder={empty}
              />
            </div>
          </section>

          {/* OTHER CHEFS */}
          <section id="team" className="mt-10">
            <div
              className="qm-eyebrow flex items-baseline justify-between"
              style={{ fontSize: 11 }}
            >
              <span>OTHER CHEFS HERE</span>
              {!empty && (
                <span
                  className="ink-faint"
                  style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}
                >
                  {TEAM_CHEFS.length}
                </span>
              )}
            </div>
            <div className="mt-2 doc-divider-thick" />
            {empty ? (
              <div
                className="py-4 text-[13px] ink-faint leading-relaxed"
                style={{ maxWidth: 480 }}
              >
                Just you for now. Invite the kitchen and quotes are shared automatically.
              </div>
            ) : (
              TEAM_CHEFS.map((c, i) => (
                <div key={i} className="doc-divider py-3 flex items-center gap-4">
                  <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        c.status === 'active' ? 'var(--qm-light-blue)' : 'var(--qm-warm-paper)',
                      border:
                        c.status === 'active' ? 'none' : '1px dashed var(--qm-soft-line)',
                    }}
                  >
                    <span className="serif text-[12px] font-semibold ink">
                      {c.name
                        .split(' ')
                        .map((s) => s[0])
                        .join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <div className="text-[13.5px] ink leading-snug">{c.name}</div>
                      {c.status === 'invited' && (
                        <span
                          className="qm-pill"
                          style={{
                            background: '#FEF3C7',
                            color: '#92400E',
                            fontSize: 10,
                            padding: '1px 7px',
                          }}
                        >
                          Invite sent
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] ink-faint leading-snug">
                      {c.email} · {c.role}
                      {c.joined && ` · joined ${c.joined}`}
                    </div>
                  </div>
                  <button className="text-[12px] ink-soft underline shrink-0">
                    {c.status === 'invited' ? 'Resend' : 'Remove'}
                  </button>
                </div>
              ))
            )}
            <button
              className="qm-btn qm-btn-outline mt-3 flex items-center gap-1.5"
              style={{ padding: '10px 16px', fontSize: 13 }}
            >
              <UserPlus size={15} /> Invite a chef
            </button>
            <div className="text-[11.5px] ink-faint mt-2 leading-snug">
              We send a one-tap link. No password, no account setup on their end.
            </div>
          </section>

          {/* LOCATIONS */}
          <section id="locations" className="mt-10">
            <div
              className="qm-eyebrow flex items-baseline justify-between"
              style={{ fontSize: 11 }}
            >
              <span>OTHER LOCATIONS</span>
              {!empty && (
                <span
                  className="ink-faint"
                  style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}
                >
                  {LOCATIONS.length - 1}
                </span>
              )}
            </div>
            <div className="mt-2 doc-divider-thick" />
            {empty ? (
              <div
                className="py-4 text-[13px] ink-faint leading-relaxed"
                style={{ maxWidth: 480 }}
              >
                {DEMO.restaurant} is your only kitchen right now.
              </div>
            ) : (
              LOCATIONS.filter((l) => !l.current).map((l, i) => (
                <div key={i} className="doc-divider py-3 flex items-center gap-4">
                  <Store size={18} color="var(--qm-gray-700)" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] ink leading-snug">{l.name}</div>
                    <div className="text-[12px] ink-faint leading-snug">
                      {l.city} · {l.role}
                    </div>
                  </div>
                  <button className="text-[12px] ink-soft underline shrink-0">Switch to</button>
                </div>
              ))
            )}
            <button
              className="qm-btn qm-btn-outline mt-3 flex items-center gap-1.5"
              style={{ padding: '10px 16px', fontSize: 13 }}
            >
              <Plus size={15} /> Add another restaurant
            </button>
            <div className="text-[11.5px] ink-faint mt-2 leading-snug">
              Quotes, rep contacts, and order guides stay separate per location.
            </div>
          </section>

          {/* DISTRIBUTOR FOLLOW-UPS — V3 Part 9 locked copy. Opus c11 lock (May 18) Q8. */}
          <section id="follow-ups" className="mt-10">
            <div className="qm-eyebrow" style={{ fontSize: 11 }}>
              DISTRIBUTOR FOLLOW-UPS
            </div>
            <div className="mt-2 doc-divider-thick" />
            <DistributorFollowupRow defaultValue={empty ? 'allow' : 'allow'} desktop />
          </section>

          {/* BILLING */}
          <section id="billing" className="mt-10">
            <div className="qm-eyebrow" style={{ fontSize: 11 }}>
              BILLING
            </div>
            <div className="mt-2 doc-divider-thick" />
            <div className="py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <div className="serif text-[18px] font-medium ink">Free</div>
                  <span
                    className="qm-pill"
                    style={{
                      background: '#F3F4F6',
                      color: 'var(--qm-gray-700)',
                      fontSize: 10,
                      padding: '2px 8px',
                    }}
                  >
                    Current
                  </span>
                </div>
                <div className="text-[12px] ink-faint num mt-1">
                  <QuoteCountPill>
                    {empty ? '0 of 5 quotes used' : '3 of 5 quotes used · 2 left'}
                  </QuoteCountPill>
                </div>
              </div>
              {!empty && (
                <button
                  className="qm-btn qm-btn-orange"
                  style={{ padding: '10px 16px', fontSize: 13 }}
                >
                  Add payment
                </button>
              )}
            </div>

            <div className="doc-divider pt-4 pb-2 flex items-baseline justify-between gap-6">
              <div className="flex-1">
                <div className="text-[13.5px] ink leading-snug">
                  <span className="serif font-medium">$50/mo</span> · unlimited quotes, plus the
                  ability to send one menu to several distributors at once.
                </div>
                <div className="text-[11.5px] ink-faint mt-1 leading-snug">
                  Card on file via Stripe. Cancel from here any month.
                </div>
              </div>
            </div>

            <div className="pt-3 text-[11.5px] ink-faint leading-snug">
              Need a different setup, or invoicing for a group? Email{' '}
              <a href="mailto:billing@quoteme.food" className="underline ink-soft">
                billing@quoteme.food
              </a>
              .
            </div>
          </section>

          {/* Sign out */}
          <div
            className="mt-10 pt-5 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--qm-soft-line)' }}
          >
            <div className="text-[12px] ink-faint">Signed in as {DEMO.chefEmail}</div>
            <button className="text-[12px] ink-soft underline">Sign out</button>
          </div>
        </div>
      </div>
    </ChefTabDesktopShell>
  );
}

// Re-export primitives for convenience
export {
  SettingsSection,
  SettingRow,
  DesktopSettingRow,
  DistributorFollowupRow,
  QuoteCountPill,
} from './SettingsPrimitives';

