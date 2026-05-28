// B2 — Settings-populated: ChefSettingsTab (mobile) + ChefSettingsTabDesktop.
// Ported verbatim from source/screens-tabs.jsx (Desi handoff, 2026-05-19).
// Structure, class composition, copy, and section order are binding per Desi spec.
//
// V3 spec refs: Part 6.7 (tab content scope), Part 9 (distributor follow-ups — locked copy).
//
// c71 (2026-05-27): Action buttons wired.
//   YOU Edit → Sheet drawer, PATCH /api/v1/users/me (name + email; phone BE-gated to reps).
//   Restaurant Edit → disabled-with-tooltip (no chef-scoped PATCH restaurant endpoint — Chef v4 pre-work).
//   Replace logo → disabled-with-tooltip (no logo upload endpoint — Chef v4 pre-work).
//   Remove / Resend invite → mailto interim (no chef-team-member BE endpoint — Chef v4 pre-work).
//   Sign out → wired to AuthContext logout().
//   Real data: YOU section from GET /api/v1/me; Restaurant name from GET /api/v1/chef/quotes[0].
//
// ChefTabBar: B1 (feat-a1-chef-sidebar-shell) will land this at
//   src/app/components/chef/ChefTabBar (or ChefMobileTabBar).
//   Minimal stub below — B1 will replace at bundle integration.
// ChefTabDesktopShell: same B1 branch, same path.
//   Minimal stub below — B1 will replace at bundle integration.

import { useState, useEffect } from 'react';
import { ImagePlus, UserPlus, Store, Plus } from 'lucide-react';

import {
  SettingsSection,
  SettingRow,
  DesktopSettingRow,
  DistributorFollowupRow,
  QuoteCountPill,
} from './SettingsPrimitives';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { useAuth } from '../../contexts/AuthContext';
import { updateCurrentUser, getChefQuotes } from '../../services/api';

// ─── Mailto helpers ───────────────────────────────────────────────────────────
// Interim pattern — no chef-team-member BE endpoint exists. Routes team
// management actions to Justin via mailto. Replace when a real
// /api/v1/chef/team_members resource lands (Chef v4 pre-work).

function openTeamManagementMailto(action: 'Remove' | 'Resend', chefName: string, chefEmail: string) {
  const subject = encodeURIComponent('QuoteMe team management request');
  const body = encodeURIComponent(
    `Action: ${action} team member\nChef: ${chefName} <${chefEmail}>`
  );
  window.location.href = `mailto:justinl@quoteme.food?subject=${subject}&body=${body}`;
}

function openAddPaymentMailto(chefIdentifier: string) {
  const subject = encodeURIComponent('QuoteMe subscription request');
  const body = encodeURIComponent(
    `I'd like to subscribe to QuoteMe at $20/month. — ${chefIdentifier}`
  );
  window.location.href = `mailto:justinl@quoteme.food?subject=${subject}&body=${body}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type NavFn = (target: string) => void;

// ─── Demo data — team chefs only (no BE endpoint yet) ────────────────────────
// TODO (Chef v4): replace TEAM_CHEFS with real data from a
// GET /api/v1/chef/team_members endpoint once the BE resource exists.
// LOCATIONS are also static pending a multi-location chef BE.

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

// ─── B1 stubs ─────────────────────────────────────────────────────────────────
// TODO: Remove these stubs when B1 (feat-a1-chef-sidebar-shell) merges to main.
//       ChefTabBar → src/app/components/chef/ChefTabBar
//       ChefTabDesktopShell → src/app/components/chef/ChefTabDesktopShell

function noopNav(_target: string): void {}

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

// ─── Edit You Drawer ─────────────────────────────────────────────────────────
// Wired to PATCH /api/v1/users/me (first_name, last_name, email).
// Phone is intentionally read-only for chefs: the BE update_me only writes
// phone on rep_profile (which chefs don't have). Flag for Chef v4.

interface EditYouDrawerProps {
  open: boolean;
  onClose: () => void;
  initialFirstName: string;
  initialLastName: string;
  initialEmail: string;
  onSaved: () => void;
}

function EditYouDrawer({
  open,
  onClose,
  initialFirstName,
  initialLastName,
  initialEmail,
  onSaved,
}: EditYouDrawerProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync fields when drawer opens with fresh values
  useEffect(() => {
    if (open) {
      setFirstName(initialFirstName);
      setLastName(initialLastName);
      setEmail(initialEmail);
      setError(null);
    }
  }, [open, initialFirstName, initialLastName, initialEmail]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setSaving(true);
    const res = await updateCurrentUser({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="serif">Edit your details</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <form onSubmit={handleSave} className="flex flex-col gap-5 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="qm-eyebrow" style={{ fontSize: 10 }}>FIRST NAME</label>
                <input
                  className="border border-[var(--border)] rounded-md px-3 py-2 text-[13.5px] ink bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="qm-eyebrow" style={{ fontSize: 10 }}>LAST NAME</label>
                <input
                  className="border border-[var(--border)] rounded-md px-3 py-2 text-[13.5px] ink bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="qm-eyebrow" style={{ fontSize: 10 }}>EMAIL</label>
              <input
                type="email"
                className="border border-[var(--border)] rounded-md px-3 py-2 text-[13.5px] ink bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={saving}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="qm-eyebrow" style={{ fontSize: 10 }}>PHONE</label>
              <div
                className="border border-[var(--border)] rounded-md px-3 py-2 text-[13.5px] ink-faint bg-transparent cursor-not-allowed select-none"
                title="Phone updates require contacting support. Chef v4 pre-work."
              >
                —
              </div>
              <p className="text-[11px] ink-faint leading-snug">
                To update your phone number, email{' '}
                <a href="mailto:support@quoteme.food" className="underline ink-soft">
                  support@quoteme.food
                </a>
                .
              </p>
            </div>
            {error && (
              <p className="text-[12px] text-red-600 leading-snug">{error}</p>
            )}
            <button
              type="submit"
              className="qm-btn qm-btn-orange mt-1"
              style={{ padding: '10px 20px', fontSize: 13 }}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── ChefSettingsTab — mobile ────────────────────────────────────────────────

interface ChefSettingsTabProps {
  state?: 'with-data' | 'empty';
  nav?: NavFn;
}

export function ChefSettingsTab({ state = 'with-data', nav = noopNav }: ChefSettingsTabProps) {
  const { user, refreshUser, logout } = useAuth();
  const empty = state === 'empty';

  // Restaurant name fetched from first chef quote's restaurant field.
  // Chef v4 pre-work: replace with a dedicated GET /api/v1/chef/profile endpoint
  // that returns the chef's primary restaurant with address + phone.
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [editYouOpen, setEditYouOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getChefQuotes().then((res) => {
      const quotes = res.data?.quotes ?? [];
      const name = quotes.find((q) => q.restaurant?.name)?.restaurant?.name ?? null;
      setRestaurantName(name);
    });
  }, [user]);

  const chefFirst = user?.first_name ?? '';
  const chefLast = user?.last_name ?? '';
  const chefEmail = user?.email ?? '';
  const chefFullName = [chefFirst, chefLast].filter(Boolean).join(' ') || '—';
  const restaurantDisplay = restaurantName ?? '—';

  function handleSignOut() {
    logout();
  }

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
          <SettingRow
            label="Name"
            value={empty ? '—' : chefFullName}
            onEdit={() => setEditYouOpen(true)}
          />
          <SettingRow
            label="Email"
            value={empty ? '—' : (chefEmail || '—')}
            onEdit={() => setEditYouOpen(true)}
          />
          <SettingRow
            label="Phone"
            value={empty ? 'Add a number' : '—'}
            placeholder={empty || true}
            editDisabled
            editTooltip="Phone updates for chefs coming in a future release."
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
                background: empty ? 'var(--background)' : '#1F1A14',
                border: '1px solid var(--border)',
                color: empty ? 'var(--muted-foreground)' : '#FBFAF7',
              }}
            >
              {empty ? (
                <ImagePlus size={20} color="var(--muted-foreground)" />
              ) : (
                <span className="serif font-semibold" style={{ fontSize: 18, letterSpacing: 0.4 }}>
                  {restaurantDisplay.charAt(0) || '?'}
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
              {/* Logo upload — no BE endpoint exists. Disabled with tooltip. Chef v4 pre-work. */}
              <button
                className="text-[11.5px] underline ink-soft mt-1 cursor-not-allowed opacity-50"
                title="Logo upload coming in a future release."
                disabled
              >
                {empty ? 'Upload' : 'Replace'}
              </button>
            </div>
          </div>
          <SettingRow
            label="Name"
            value={empty ? '—' : restaurantDisplay}
            editDisabled
            editTooltip="Restaurant edits require your rep. Chef v4 pre-work."
          />
          <SettingRow
            label="Address"
            value={empty ? 'Add address' : '—'}
            placeholder={empty || restaurantDisplay === '—'}
            editDisabled
            editTooltip="Restaurant edits require your rep. Chef v4 pre-work."
          />
          <SettingRow
            label="Phone"
            value={empty ? 'Add a number' : '—'}
            placeholder={empty || true}
            editDisabled
            editTooltip="Restaurant edits require your rep. Chef v4 pre-work."
          />
        </SettingsSection>

        {/* OTHER CHEFS — magic-link invite, no passwords */}
        <SettingsSection title="OTHER CHEFS HERE" count={empty ? 0 : TEAM_CHEFS.length}>
          {empty ? (
            <div className="py-3 text-[12.5px] ink-faint leading-snug">
              Just you for now. Invite the kitchen and quotes are visible to the whole team.
            </div>
          ) : (
            TEAM_CHEFS.map((c, i) => (
              <div key={i} className="doc-divider py-3 flex items-start gap-3">
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      c.status === 'active' ? 'var(--secondary)' : 'var(--background)',
                    border:
                      c.status === 'active' ? 'none' : '1px dashed var(--border)',
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
                {/* mailto interim — no /api/v1/chef/team_members endpoint. Chef v4 pre-work. */}
                <button
                  className="text-[11.5px] ink-soft underline shrink-0"
                  onClick={() =>
                    openTeamManagementMailto(
                      c.status === 'invited' ? 'Resend' : 'Remove',
                      c.name,
                      c.email
                    )
                  }
                >
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
              {restaurantDisplay} is your only kitchen right now.
            </div>
          ) : (
            LOCATIONS.filter((l) => !l.current).map((l, i) => (
              <div key={i} className="doc-divider py-3 flex items-start gap-3">
                <Store size={16} color="var(--foreground)" />
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
                    color: 'var(--foreground)',
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
                onClick={() => openAddPaymentMailto(`${chefFullName} <${chefEmail}>`)}
              >
                Add payment
              </button>
            )}
          </div>

          {/* Paid tier explainer — no marketing voice, just what it does */}
          <div className="doc-divider pt-3 pb-1">
            <div className="text-[12.5px] ink leading-snug">
              <span className="serif font-medium">$20/mo</span> · unlimited quotes, plus the ability
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
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="text-[11.5px] ink-faint">Signed in as {chefEmail || '—'}</div>
          <button className="text-[11.5px] ink-soft underline" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>

      {/* Edit YOU drawer */}
      <EditYouDrawer
        open={editYouOpen}
        onClose={() => setEditYouOpen(false)}
        initialFirstName={chefFirst}
        initialLastName={chefLast}
        initialEmail={chefEmail}
        onSaved={refreshUser}
      />
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
  const { user, refreshUser, logout } = useAuth();
  const empty = state === 'empty';

  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [editYouOpen, setEditYouOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getChefQuotes().then((res) => {
      const quotes = res.data?.quotes ?? [];
      const name = quotes.find((q) => q.restaurant?.name)?.restaurant?.name ?? null;
      setRestaurantName(name);
    });
  }, [user]);

  const chefFirst = user?.first_name ?? '';
  const chefLast = user?.last_name ?? '';
  const chefEmail = user?.email ?? '';
  const chefFullName = [chefFirst, chefLast].filter(Boolean).join(' ') || '—';
  const restaurantDisplay = restaurantName ?? '—';

  function handleSignOut() {
    logout();
  }

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
                value={empty ? '—' : chefFullName}
                onEdit={() => setEditYouOpen(true)}
              />
              <DesktopSettingRow
                label="Email"
                value={empty ? '—' : (chefEmail || '—')}
                onEdit={() => setEditYouOpen(true)}
              />
              <DesktopSettingRow
                label="Phone"
                value={empty ? 'Add a number' : '—'}
                placeholder={empty || true}
                editDisabled
                editTooltip="Phone updates for chefs coming in a future release."
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
                  background: empty ? 'var(--background)' : '#1F1A14',
                  border: '1px solid var(--border)',
                  color: empty ? 'var(--muted-foreground)' : '#FBFAF7',
                }}
              >
                {empty ? (
                  <ImagePlus size={22} color="var(--muted-foreground)" />
                ) : (
                  <span
                    className="serif font-semibold"
                    style={{ fontSize: 22, letterSpacing: 0.4 }}
                  >
                    {restaurantDisplay.charAt(0) || '?'}
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
                {/* Logo upload — no BE endpoint exists. Disabled with tooltip. Chef v4 pre-work. */}
                <button
                  className="text-[12px] underline ink-soft mt-1 cursor-not-allowed opacity-50"
                  title="Logo upload coming in a future release."
                  disabled
                >
                  {empty ? 'Upload' : 'Replace'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-[120px_1fr_auto] items-baseline gap-x-4">
              <DesktopSettingRow
                label="Name"
                value={empty ? '—' : restaurantDisplay}
                editDisabled
                editTooltip="Restaurant edits require your rep. Chef v4 pre-work."
              />
              <DesktopSettingRow
                label="Address"
                value={empty ? 'Add address' : '—'}
                placeholder={empty || restaurantDisplay === '—'}
                editDisabled
                editTooltip="Restaurant edits require your rep. Chef v4 pre-work."
              />
              <DesktopSettingRow
                label="Phone"
                value={empty ? 'Add a number' : '—'}
                placeholder={empty || true}
                editDisabled
                editTooltip="Restaurant edits require your rep. Chef v4 pre-work."
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
                Just you for now. Invite the kitchen and quotes are visible to the whole team.
              </div>
            ) : (
              TEAM_CHEFS.map((c, i) => (
                <div key={i} className="doc-divider py-3 flex items-center gap-4">
                  <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        c.status === 'active' ? 'var(--secondary)' : 'var(--background)',
                      border:
                        c.status === 'active' ? 'none' : '1px dashed var(--border)',
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
                  {/* mailto interim — no /api/v1/chef/team_members endpoint. Chef v4 pre-work. */}
                  <button
                    className="text-[12px] ink-soft underline shrink-0"
                    onClick={() =>
                      openTeamManagementMailto(
                        c.status === 'invited' ? 'Resend' : 'Remove',
                        c.name,
                        c.email
                      )
                    }
                  >
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
                {restaurantDisplay} is your only kitchen right now.
              </div>
            ) : (
              LOCATIONS.filter((l) => !l.current).map((l, i) => (
                <div key={i} className="doc-divider py-3 flex items-center gap-4">
                  <Store size={18} color="var(--foreground)" />
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
                      color: 'var(--foreground)',
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
                  onClick={() => openAddPaymentMailto(`${chefFullName} <${chefEmail}>`)}
                >
                  Add payment
                </button>
              )}
            </div>

            <div className="doc-divider pt-4 pb-2 flex items-baseline justify-between gap-6">
              <div className="flex-1">
                <div className="text-[13.5px] ink leading-snug">
                  <span className="serif font-medium">$20/mo</span> · unlimited quotes, plus the
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
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="text-[12px] ink-faint">Signed in as {chefEmail || '—'}</div>
            <button className="text-[12px] ink-soft underline" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Edit YOU drawer */}
      <EditYouDrawer
        open={editYouOpen}
        onClose={() => setEditYouOpen(false)}
        initialFirstName={chefFirst}
        initialLastName={chefLast}
        initialEmail={chefEmail}
        onSaved={refreshUser}
      />
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
