// NewspaperShell — THE ONE SHELL, role-agnostic.
//
// Ported from handoff/desi-brand-suite-060626/src/screens-desktop.jsx
// (RoleSidebar, NewspaperMobileShell, NewspaperShell).
//
// Translation notes (JSX → TSX):
//   • No behaviour changes from Desi's delivery.
//   • Props typed loosely (any arrays) to avoid impedance with JSX source.
//   • Icon renders via Lucide-react (already in app). Desi's prototype used a
//     generic <Icon name="..."> helper; we resolve each icon via lucide-react
//     by name at runtime using a lookup table.
//   • QuoteMeWordmark inline (no separate component).
//   • useState import from react.
//   • noopNav replaced with () => {}.
//
// Usage:
//   <NewspaperShell variant="desktop" | "mobile" edition="Brand Edition"
//     identity={…} nav={[…]} active="dashboard" settings={…}
//     onNav={fn} maxWidth={860}>
//     {pageBody}
//   </NewspaperShell>

import { useState } from 'react';
import * as LucideIcons from 'lucide-react';

// ── Icon resolver ─────────────────────────────────────────────────────────────
// Maps Desi's icon name strings (kebab-case) to Lucide component names.
const ICON_MAP: Record<string, string> = {
  'layout-grid':    'LayoutGrid',
  'scan-line':      'ScanLine',
  'package':        'Package',
  'bell':           'Bell',
  'notebook-text':  'NotebookText',
  'truck':          'Truck',
  'users':          'Users',
  'settings':       'Settings',
  'panel-left-close': 'PanelLeftClose',
  'panel-left-open':  'PanelLeftOpen',
  'panel-left':       'PanelLeft',
  'x':              'X',
  'menu':           'Menu',
  'arrow-right':    'ArrowRight',
  'arrow-left':     'ArrowLeft',
  'plus':           'Plus',
  'check':          'Check',
  'check-square':   'CheckSquare',
  'square':         'Square',
  'circle-check':   'CircleCheck',
  'upload':         'Upload',
  'search':         'Search',
  'send':           'Send',
  'link':           'Link',
  'lock':           'Lock',
  'eye':            'Eye',
  'info':           'Info',
  'shield':         'Shield',
  'globe':          'Globe',
  'at-sign':        'AtSign',
  'map-pin':        'MapPin',
  'phone':          'Phone',
  'file-text':      'FileText',
  'camera':         'Camera',
  'log-out':        'LogOut',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function NpIcon({ name, size = 18, color, className, style }: IconProps) {
  const lucideName = ICON_MAP[name] ?? name.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');
  const Comp = (LucideIcons as any)[lucideName];
  if (!Comp) return null;
  return (
    <Comp
      size={size}
      color={color}
      className={className}
      style={style}
      strokeWidth={1.75}
    />
  );
}

// ── QuoteMe wordmark ─────────────────────────────────────────────────────────

interface WordmarkProps {
  height?: number;
  edition?: string | null;
  variant?: 'horizontal' | 'square';
}

function QuoteMeWordmark({ height = 34, edition, variant = 'horizontal' }: WordmarkProps) {
  if (variant === 'square') {
    return (
      <span
        className="inline-flex items-center justify-center serif font-bold"
        style={{
          width: height,
          height: height,
          fontSize: height * 0.42,
          color: 'var(--qm-charcoal)',
          letterSpacing: '-0.015em',
        }}
      >
        QM
      </span>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
      <div className="flex items-center" style={{ gap: 4 }}>
        <span
          className="serif"
          style={{ fontSize: height * 0.52, fontWeight: 600, color: 'var(--qm-charcoal)', letterSpacing: '-0.015em' }}
        >
          Quote
        </span>
        <span
          className="serif"
          style={{
            fontSize: height * 0.52,
            fontWeight: 800,
            color: 'var(--qm-orange)',
            textShadow: '1.5px 1.5px 0 var(--qm-charcoal)',
            letterSpacing: '-0.015em',
          }}
        >
          ME
        </span>
      </div>
      {edition && (
        <div
          style={{
            marginTop: 3,
            fontSize: 8.5,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--qm-gray-500)',
            fontWeight: 600,
            fontFamily: 'var(--qm-sans)',
          }}
        >
          {edition}
        </div>
      )}
    </div>
  );
}

// ── NavGroupLabel ────────────────────────────────────────────────────────────

function NavGroupLabel({ label, mode }: { label: string; mode: string }) {
  if (mode === 'compact') {
    return (
      <div className="mx-4 my-2" style={{ borderTop: '1px solid var(--qm-soft-line)' }} />
    );
  }
  return (
    <div
      className="qm-eyebrow"
      style={{ padding: '20px 24px 6px', fontSize: 10, letterSpacing: '.18em', color: 'var(--qm-gray-500)' }}
    >
      {label}
    </div>
  );
}

// ── NavDestination ────────────────────────────────────────────────────────────

interface SubItem {
  label: string;
  meta?: string;
  onClick?: () => void;
  muted?: boolean;
  current?: boolean;
}

interface NavItem {
  id: string;
  icon: string;
  label: string;
  count?: number;
  muted?: boolean;
  onClick?: () => void;
  sub?: SubItem[];
}

interface NavGroup {
  group?: string;
  items: NavItem[];
}

function NavDestination({
  icon,
  label,
  count,
  sub = [],
  current,
  muted,
  mode,
  onClick,
}: {
  icon: string;
  label: string;
  count?: number;
  sub?: SubItem[];
  current?: boolean;
  muted?: boolean;
  mode: string;
  onClick?: () => void;
}) {
  const collapsed = mode === 'compact';
  return (
    <div className="px-3">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center w-full rounded-md hover:bg-gray-50 transition-colors text-left"
        style={{
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 10,
          paddingRight: collapsed ? 10 : 12,
          borderLeft: current
            ? '2px solid var(--qm-charcoal)'
            : '2px solid transparent',
          background:
            current && collapsed ? 'var(--qm-warm-paper)' : 'transparent',
          justifyContent: collapsed ? 'center' : 'flex-start',
          cursor: onClick ? 'pointer' : 'default',
          minHeight: 'unset',
        }}
        title={collapsed ? label : undefined}
      >
        <NpIcon
          name={icon}
          size={18}
          color={muted ? 'var(--qm-gray-500)' : 'var(--qm-charcoal)'}
          style={{ flexShrink: 0 }}
        />
        {!collapsed && (
          <>
            <span
              className="ml-3 text-[13.5px] leading-snug flex-1 truncate"
              style={{
                color: muted ? 'var(--qm-gray-500)' : 'var(--qm-charcoal)',
                fontWeight: current ? 500 : 400,
                fontStyle: muted ? 'italic' : 'normal',
              }}
            >
              {label}
            </span>
            {count != null && (
              <span className="text-[11px] ink-faint num shrink-0 pl-2">{count}</span>
            )}
          </>
        )}
      </button>

      {/* Sub-items — open mode only */}
      {!collapsed && sub.length > 0 && (
        <div className="ml-9 mt-0.5 mb-1">
          {sub.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={s.onClick}
              className="w-full text-left flex items-baseline justify-between py-1 hover:opacity-80"
              style={{ cursor: s.onClick ? 'pointer' : 'default', minHeight: 'unset' }}
            >
              <span
                className="text-[12.5px] leading-snug"
                style={{
                  color: s.muted ? 'var(--qm-gray-500)' : 'var(--qm-gray-700)',
                  fontWeight: s.current ? 500 : 400,
                  fontStyle: s.muted ? 'italic' : 'normal',
                }}
              >
                {s.label}
              </span>
              {s.meta && (
                <span
                  className="text-[10.5px] num shrink-0 pl-2"
                  style={{ color: 'var(--qm-gray-500)' }}
                >
                  {s.meta}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SidebarRestoreButton ──────────────────────────────────────────────────────

function SidebarRestoreButton({ onShow }: { onShow: () => void }) {
  return (
    <button
      onClick={onShow}
      className="absolute z-10 w-10 h-10 rounded-full bg-white border hairline flex items-center justify-center hover:shadow-sm"
      style={{ top: 18, left: 18, boxShadow: '0 1px 2px rgba(43,43,43,.06)', minHeight: 'unset', minWidth: 'unset' }}
      aria-label="Show sidebar"
    >
      <NpIcon name="panel-left" size={18} color="var(--qm-charcoal)" />
    </button>
  );
}

// ── RoleSidebar (desktop) ─────────────────────────────────────────────────────

export interface RoleSidebarProps {
  edition?: string;
  identity?: { eyebrow?: string; title?: string; sub?: string; mono?: string };
  nav?: NavGroup[];
  active?: string;
  settings?: { id?: string; icon?: string; label?: string; onClick?: () => void; sub?: SubItem[] } | null;
  mode?: 'open' | 'compact' | 'hidden';
  onModeChange?: (m: 'open' | 'compact' | 'hidden') => void;
  onSignOut?: () => void;
}

export function RoleSidebar({
  edition = 'Edition',
  identity = {},
  nav = [],
  active,
  settings = null,
  mode = 'open',
  onModeChange = () => {},
  onSignOut,
}: RoleSidebarProps) {
  const collapsed = mode === 'compact';
  const width = collapsed ? 64 : 280;
  const isCurrent = (id: string | undefined) => !!id && id === active;
  const { eyebrow = 'ACCOUNT', title, sub, mono } = identity;
  const markText = mono ?? (title ? title.split(' ').map((s) => s[0]).slice(0, 2).join('') : 'QM');

  function Mark({ size }: { size: number }) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 serif"
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.22),
          background: '#1F1A14',
          color: '#FBFAF7',
          fontWeight: 600,
          fontSize: size * 0.4,
          lineHeight: 1,
          letterSpacing: '-0.01em',
        }}
        aria-hidden="true"
      >
        {markText}
      </span>
    );
  }

  return (
    <aside
      className="np-sidebar"
      style={{ width, transition: 'width 0.2s ease' }}
    >
      {/* Masthead */}
      <div className={collapsed ? 'px-2 pt-5 pb-4' : 'px-6 pt-7 pb-5'}>
        <div className="flex items-center justify-between gap-2">
          {!collapsed ? (
            <QuoteMeWordmark variant="horizontal" height={34} edition={edition} />
          ) : (
            <QuoteMeWordmark variant="square" height={34} />
          )}
          {!collapsed && (
            <button
              onClick={() => onModeChange('compact')}
              className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-50 flex-shrink-0"
              style={{ minHeight: 'unset', minWidth: 'unset' }}
              aria-label="Collapse"
            >
              <NpIcon name="panel-left-close" size={16} color="var(--qm-charcoal)" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => onModeChange('open')}
            className="mt-3 w-full h-8 rounded-md flex items-center justify-center hover:bg-gray-50"
            style={{ minHeight: 'unset' }}
            aria-label="Expand"
          >
            <NpIcon name="panel-left-open" size={16} color="var(--qm-charcoal)" />
          </button>
        )}
      </div>

      {/* Identity block */}
      {!collapsed ? (
        <div
          className="px-6 pb-5 flex items-center gap-3"
          style={{ borderTop: '2px solid var(--qm-charcoal)', paddingTop: 16 }}
        >
          <Mark size={40} />
          <div className="min-w-0">
            <div className="qm-eyebrow" style={{ fontSize: 9.5, letterSpacing: '.18em' }}>
              {eyebrow}
            </div>
            {title && (
              <div
                className="serif font-medium ink mt-0.5 truncate"
                style={{ fontSize: 15.5, lineHeight: 1.15 }}
              >
                {title}
              </div>
            )}
            {sub && <div className="text-[11.5px] ink-faint truncate">{sub}</div>}
          </div>
        </div>
      ) : (
        <div
          className="mx-2 mb-2 py-2 flex items-center justify-center"
          style={{ borderTop: '2px solid var(--qm-charcoal)' }}
          title={title}
        >
          <Mark size={34} />
        </div>
      )}

      {/* Nav groups */}
      <div
        className={collapsed ? 'py-1' : 'pt-1 pb-2'}
        style={{ borderTop: '1px solid var(--qm-soft-line)' }}
      >
        {nav.map((grp, gi) => (
          <div key={gi}>
            {grp.group && <NavGroupLabel label={grp.group} mode={mode} />}
            {grp.items.map((it, ii) => (
              <NavDestination
                key={ii}
                icon={it.icon}
                label={it.label}
                count={it.count}
                muted={it.muted}
                current={isCurrent(it.id)}
                mode={mode}
                onClick={it.onClick}
                sub={collapsed ? [] : it.sub ?? []}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* Settings — bottom-pinned */}
      {settings && (
        <div className="py-2" style={{ borderTop: '1px solid var(--qm-soft-line)' }}>
          <NavDestination
            icon={settings.icon ?? 'settings'}
            label={settings.label ?? 'Settings'}
            current={isCurrent(settings.id)}
            mode={mode}
            onClick={settings.onClick}
            sub={collapsed ? [] : settings.sub ?? []}
          />
          <div className={collapsed ? 'mt-1 px-2' : 'mt-1 px-6'}>
            <button
              onClick={() => onModeChange('hidden')}
              className="w-full flex items-center gap-2 py-2 text-[11.5px] ink-faint hover:ink-soft"
              style={{ justifyContent: collapsed ? 'center' : 'flex-start', minHeight: 'unset' }}
              aria-label="Hide sidebar"
            >
              <NpIcon name="x" size={14} color="var(--qm-gray-500)" />
              {!collapsed && <span>Hide sidebar</span>}
            </button>
          </div>
          {onSignOut && (
            <div className={collapsed ? 'px-2 pb-2' : 'px-6 pb-3'}>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-2 py-2 text-[11.5px] ink-faint hover:ink-soft"
                style={{ justifyContent: collapsed ? 'center' : 'flex-start', minHeight: 'unset' }}
                aria-label="Sign out"
              >
                <NpIcon name="log-out" size={14} color="var(--qm-gray-500)" />
                {!collapsed && <span>Sign out</span>}
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

// ── NewspaperMobileShell ──────────────────────────────────────────────────────

export interface NewspaperMobileShellProps {
  edition?: string;
  identity?: { eyebrow?: string; title?: string; sub?: string; meta?: string; initials?: string };
  nav?: NavGroup[];
  active?: string;
  settings?: { id?: string; icon?: string; label?: string; onClick?: () => void; sub?: SubItem[] } | null;
  trust?: React.ReactNode;
  onSignOut?: () => void;
  children?: React.ReactNode;
}

export function NewspaperMobileShell({
  edition = 'Brand Edition',
  identity = {},
  nav = [],
  active,
  settings = null,
  trust = null,
  onSignOut,
  children,
}: NewspaperMobileShellProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { eyebrow = 'CURRENTLY VIEWING', title, sub, meta, initials } = identity;

  return (
    <div className="np-mobile-shell">
      {/* Masthead */}
      <div className="np-mobile-masthead">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 -ml-1 rounded-md flex items-center justify-center hover:bg-gray-50"
          style={{ minHeight: 'unset', minWidth: 'unset', flexShrink: 0 }}
          aria-label="Open menu"
        >
          <NpIcon name="menu" size={20} color="var(--qm-charcoal)" />
        </button>
        <div className="flex flex-col min-w-0 flex-1" style={{ lineHeight: 1 }}>
          <QuoteMeWordmark variant="horizontal" height={32} edition={edition} />
        </div>
        {initials && (
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center border hairline shrink-0"
            style={{ background: 'var(--qm-warm-paper)', minHeight: 'unset', minWidth: 'unset' }}
            aria-label="Account"
          >
            <span className="serif text-[11px] font-semibold ink">{initials}</span>
          </button>
        )}
      </div>

      {trust}

      <div className="np-mobile-body">{children}</div>

      {/* Drawer overlay */}
      <div
        onClick={close}
        className="np-drawer-overlay"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        aria-hidden={!open}
      />

      {/* Slide-in drawer */}
      <nav
        className="np-drawer"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-102%)' }}
        aria-hidden={!open}
      >
        {/* Drawer masthead */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <QuoteMeWordmark variant="horizontal" height={32} edition={edition} />
          <button
            onClick={close}
            className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-gray-50"
            style={{ minHeight: 'unset', minWidth: 'unset' }}
            aria-label="Close menu"
          >
            <NpIcon name="x" size={18} color="var(--qm-charcoal)" />
          </button>
        </div>

        {/* Identity block */}
        {title && (
          <div
            className="px-5 pb-4"
            style={{ borderTop: '2px solid var(--qm-charcoal)', paddingTop: 14 }}
          >
            <div className="qm-eyebrow" style={{ fontSize: 9.5, letterSpacing: '.18em' }}>
              {eyebrow}
            </div>
            <div className="serif font-medium ink mt-1.5" style={{ fontSize: 16, lineHeight: 1.2 }}>
              {title}
            </div>
            {sub && <div className="text-[12px] ink-faint mt-0.5">{sub}</div>}
            {meta && <div className="text-[12px] ink-soft mt-1.5">{meta}</div>}
          </div>
        )}

        {/* Nav */}
        <div
          className="overflow-auto flex-1 pt-1 pb-2"
          style={{ borderTop: '1px solid var(--qm-soft-line)' }}
        >
          {nav.map((grp, gi) => (
            <div key={gi}>
              {grp.group && <NavGroupLabel label={grp.group} mode="open" />}
              {grp.items.map((it, ii) => (
                <NavDestination
                  key={ii}
                  icon={it.icon}
                  label={it.label}
                  count={it.count}
                  muted={it.muted}
                  current={it.id === active}
                  mode="open"
                  onClick={() => {
                    close();
                    it.onClick?.();
                  }}
                  sub={(it.sub ?? []).map((s) => ({
                    ...s,
                    onClick: s.onClick ? () => { close(); s.onClick!(); } : undefined,
                  }))}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Settings — bottom-pinned */}
        {settings && (
          <div className="py-2" style={{ borderTop: '1px solid var(--qm-soft-line)' }}>
            <NavDestination
              icon={settings.icon ?? 'settings'}
              label={settings.label ?? 'Settings'}
              current={settings.id === active}
              mode="open"
              onClick={() => {
                close();
                settings.onClick?.();
              }}
              sub={(settings.sub ?? []).map((s) => ({
                ...s,
                onClick: s.onClick ? () => { close(); s.onClick!(); } : undefined,
              }))}
            />
          </div>
        )}
        {onSignOut && (
          <div className="px-6 pb-4" style={{ borderTop: settings ? undefined : '1px solid var(--qm-soft-line)' }}>
            <button
              type="button"
              onClick={() => { close(); onSignOut(); }}
              className="w-full flex items-center gap-2 py-3 text-[12px] ink-soft"
              style={{ minHeight: 'unset' }}
            >
              <NpIcon name="log-out" size={15} color="var(--qm-gray-500)" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}

// ── NewspaperShellDesktop ────────────────────────────────────────────────────

interface DesktopShellProps {
  edition?: string;
  identity?: RoleSidebarProps['identity'];
  nav?: NavGroup[];
  active?: string;
  settings?: RoleSidebarProps['settings'];
  trust?: React.ReactNode;
  onNav?: (target: string) => void;
  onSignOut?: () => void;
  children?: React.ReactNode;
  initialMode?: 'open' | 'compact' | 'hidden';
  maxWidth?: number;
}

function NewspaperShellDesktop({
  edition,
  identity,
  nav,
  active,
  settings,
  trust,
  onSignOut,
  children,
  initialMode = 'open',
  maxWidth = 880,
}: DesktopShellProps) {
  const [mode, setMode] = useState<'open' | 'compact' | 'hidden'>(initialMode);
  const hidden = mode === 'hidden';

  return (
    <div className="np-shell-desktop">
      {hidden ? (
        <SidebarRestoreButton onShow={() => setMode('open')} />
      ) : (
        <RoleSidebar
          edition={edition}
          identity={identity}
          nav={nav}
          active={active}
          settings={settings}
          mode={mode}
          onModeChange={setMode}
          onSignOut={onSignOut}
        />
      )}
      <main className="np-shell-desktop-main">
        {trust}
        <div className="np-shell-desktop-content">
          <div style={{ maxWidth }}>{children}</div>
        </div>
      </main>
    </div>
  );
}

// ── NewspaperShell — THE ONE SHELL ───────────────────────────────────────────

export interface NewspaperShellProps extends DesktopShellProps, NewspaperMobileShellProps {
  variant?: 'desktop' | 'mobile';
}

export function NewspaperShell({
  variant = 'desktop',
  edition,
  identity,
  nav,
  active,
  settings,
  trust = null,
  onNav,
  onSignOut,
  children,
  initialMode = 'open',
  maxWidth = 880,
}: NewspaperShellProps) {
  // Breakpoint: ≥768px → desktop, else → mobile
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  const resolvedVariant = variant === 'desktop' && isDesktop ? 'desktop' : variant;

  if (resolvedVariant === 'mobile') {
    return (
      <NewspaperMobileShell
        edition={edition}
        identity={identity}
        nav={nav}
        active={active}
        settings={settings}
        trust={trust}
        onSignOut={onSignOut}
      >
        {children}
      </NewspaperMobileShell>
    );
  }

  return (
    <NewspaperShellDesktop
      edition={edition}
      identity={identity}
      nav={nav}
      active={active}
      settings={settings}
      trust={trust}
      onNav={onNav}
      onSignOut={onSignOut}
      initialMode={initialMode}
      maxWidth={maxWidth}
    >
      {children}
    </NewspaperShellDesktop>
  );
}
