// ManagerSidebar — Newspaper-chrome rail, manager destinations.
//
// Mirrors RepNewspaperSidebar (RepDesktopShell.tsx) exactly:
//   • same masthead pattern (logo, collapse button)
//   • same "WORKING AS" block (serif name, sans role + company, 2px charcoal rule)
//   • same grouped nav (icon, label, count, active left-border, collapse/hidden)
//   • same bottom hide-sidebar control
//
// Manager destinations (locked order per README):
//   THE FLOOR:  Today · Inbound · Rep activity
//   NEEDS YOU:  Assignments · Team
//   DESIGN-AHEAD: Inside sales (muted, "Soon")
//
// Mode: 'open' (280px) · 'collapsed' (64px) · 'hidden' (no sidebar — layout handles)
// Persistence: caller owns state (CCLayout holds useState).
//
// Sacred Orange (#F2993D) for count badges with attention=true.
// NEVER use ToMarket Orange (#F04E23).

import React from 'react';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Inbox,
  FileText,
  UserPlus,
  Users,
  Headphones,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ArrowLeft,
} from 'lucide-react';
import { SACRED_ORANGE, sans, serif, C } from './cc-atoms';

export type CCActiveTab =
  | 'today'
  | 'inbound'
  | 'quotes'
  | 'assign'
  | 'team'
  | 'search'
  | 'settings';

export type CCManagerInfo = {
  name: string;
  role: string;
  company: string;
  region: string;
  today: string;
};

export type CCSidebarMode = 'open' | 'collapsed' | 'hidden';

interface NavCount {
  n: number;
  attention: boolean;
}

interface NavItemProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  label: string;
  count?: NavCount;
  current: boolean;
  collapsed: boolean;
  muted?: boolean;
  onClick?: () => void;
}

function CCNavItem({ icon: Icon, label, count, current, collapsed, muted, onClick }: NavItemProps) {
  return (
    <div style={{ padding: '0 12px' }}>
      <button
        type="button"
        onClick={muted ? undefined : onClick}
        title={collapsed ? (muted ? `${label} — coming soon` : label) : (muted ? `${label} — coming soon` : undefined)}
        aria-label={label}
        style={{
          ...sans,
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: collapsed ? '10px 10px' : '10px 10px 10px 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: current && collapsed ? C.warmPaper : 'transparent',
          border: 'none',
          borderLeft: current ? `2px solid ${C.charcoal}` : '2px solid transparent',
          borderRadius: 6,
          cursor: muted ? 'default' : 'pointer',
          opacity: muted ? 0.55 : 1,
          gap: 12,
        }}
        onMouseEnter={(e) => {
          if (!muted) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            current && collapsed ? C.warmPaper : 'transparent';
        }}
      >
        <Icon
          size={18}
          strokeWidth={current ? 2 : 1.6}
          color={muted ? C.gray500 : C.charcoal}
        />
        {!collapsed && (
          <>
            <span
              style={{
                flex: 1,
                textAlign: 'left',
                fontSize: 13.5,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: muted ? C.gray500 : C.charcoal,
                fontWeight: current ? 500 : 400,
                fontStyle: muted ? 'italic' : 'normal',
              }}
            >
              {label}
            </span>
            {muted ? (
              <span
                style={{
                  fontSize: 9.5,
                  color: C.gray500,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                  paddingLeft: 8,
                }}
              >
                Soon
              </span>
            ) : count != null ? (
              <span
                style={{
                  ...sans,
                  fontSize: 11,
                  fontVariantNumeric: 'tabular-nums',
                  color: count.attention ? C.charcoal : C.gray500,
                  fontWeight: count.attention ? 700 : 400,
                  flexShrink: 0,
                  paddingLeft: 8,
                }}
              >
                {count.n}
              </span>
            ) : null}
          </>
        )}
      </button>
    </div>
  );
}

interface GroupLabelProps {
  label: string;
  collapsed: boolean;
}

function CCGroupLabel({ label, collapsed }: GroupLabelProps) {
  if (collapsed) {
    return (
      <div
        style={{
          margin: '8px 16px',
          borderTop: `1px solid ${C.softLine}`,
        }}
      />
    );
  }
  return (
    <div
      style={{
        ...sans,
        padding: '20px 24px 6px',
        fontSize: 10,
        letterSpacing: '.18em',
        textTransform: 'uppercase',
        color: C.gray500,
        fontWeight: 500,
      }}
    >
      {label}
    </div>
  );
}

interface ManagerSidebarProps {
  mode: CCSidebarMode;
  onModeChange: (m: CCSidebarMode) => void;
  active: CCActiveTab;
  onNav: (dest: CCActiveTab) => void;
  manager: CCManagerInfo;
  /** Attention counts — caller computes from fetched data or uses 0 defaults */
  unassignedCount?: number;
  coldRepsCount?: number;
  inboundOpenCount?: number;
  quotesCount?: number;
}

export function ManagerSidebar({
  mode,
  onModeChange,
  active,
  onNav,
  manager,
  unassignedCount = 0,
  coldRepsCount = 0,
  inboundOpenCount = 0,
  quotesCount = 0,
}: ManagerSidebarProps) {
  const collapsed = mode === 'collapsed';
  const navigate = useNavigate();
  const width = collapsed ? 64 : 280;

  const initials = manager.name
    .split(' ')
    .map((s) => s[0] ?? '')
    .join('');

  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        borderRight: `1px solid ${C.softLine}`,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 200ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Masthead */}
      <div
        style={{
          padding: collapsed ? '20px 8px 16px' : '28px 24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'flex-start',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <img
            src={collapsed ? '/quoteme-logo.png' : '/quoteme-horizontal.png'}
            alt="QuoteMe"
            style={{
              width: collapsed ? 40 : 150,
              height: 'auto',
              display: 'block',
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <button
              type="button"
              onClick={() => onModeChange('collapsed')}
              aria-label="Collapse sidebar"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.gray500,
              }}
            >
              <PanelLeftClose size={16} strokeWidth={1.6} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={() => onModeChange('open')}
            aria-label="Expand sidebar"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.gray500,
            }}
          >
            <PanelLeftOpen size={16} strokeWidth={1.6} />
          </button>
        )}
      </div>

      {/* WORKING AS */}
      {!collapsed ? (
        <div
          style={{
            padding: '16px 24px 20px',
            borderTop: `2px solid ${C.charcoal}`,
          }}
        >
          <div
            style={{
              ...sans,
              fontSize: 10,
              letterSpacing: '.18em',
              color: C.gray500,
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            WORKING AS
          </div>
          <div
            style={{
              ...serif,
              fontSize: 16,
              fontWeight: 500,
              color: C.charcoal,
              lineHeight: 1.2,
              marginTop: 6,
            }}
          >
            {manager.name}
          </div>
          <div
            style={{
              ...sans,
              fontSize: 12,
              color: C.gray500,
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {manager.role} · {manager.company}
          </div>
        </div>
      ) : (
        <div
          style={{
            margin: '0 8px 8px',
            paddingTop: 8,
            paddingBottom: 8,
            display: 'flex',
            justifyContent: 'center',
            borderTop: `2px solid ${C.charcoal}`,
          }}
          title={`${manager.name} · ${manager.company}`}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${C.softLine}`,
              background: C.warmPaper,
            }}
          >
            <span style={{ ...serif, fontSize: 12, fontWeight: 600, color: C.charcoal }}>
              {initials}
            </span>
          </div>
        </div>
      )}

      {/* Nav groups */}
      <div
        style={{
          paddingTop: 4,
          paddingBottom: 8,
          borderTop: `1px solid ${C.softLine}`,
        }}
      >
        <CCGroupLabel label="THE FLOOR" collapsed={collapsed} />
        <CCNavItem
          icon={LayoutDashboard}
          label="Today"
          current={active === 'today'}
          collapsed={collapsed}
          onClick={() => onNav('today')}
        />
        <CCNavItem
          icon={Inbox}
          label="Inbound"
          current={active === 'inbound'}
          collapsed={collapsed}
          count={{ n: inboundOpenCount, attention: inboundOpenCount > 0 }}
          onClick={() => onNav('inbound')}
        />
        <CCNavItem
          icon={FileText}
          label="Rep activity"
          current={active === 'quotes'}
          collapsed={collapsed}
          count={{ n: quotesCount, attention: false }}
          onClick={() => onNav('quotes')}
        />

        <CCGroupLabel label="NEEDS YOU" collapsed={collapsed} />
        <CCNavItem
          icon={UserPlus}
          label="Assignments"
          current={active === 'assign'}
          collapsed={collapsed}
          count={{ n: unassignedCount, attention: unassignedCount > 0 }}
          onClick={() => onNav('assign')}
        />
        <CCNavItem
          icon={Users}
          label="Team"
          current={false}
          collapsed={collapsed}
          muted
        />

        <CCGroupLabel label="DESIGN-AHEAD" collapsed={collapsed} />
        <CCNavItem
          icon={Headphones}
          label="Inside sales"
          current={false}
          collapsed={collapsed}
          muted
        />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom: Back link + Settings + Hide */}
      <div
        style={{
          paddingTop: 8,
          paddingBottom: 8,
          borderTop: `1px solid ${C.softLine}`,
        }}
      >
        {/* Back to Distributor Admin */}
        <div style={{ padding: '0 12px', marginBottom: 2 }}>
          <button
            type="button"
            onClick={() => navigate('/distributor-admin')}
            title={collapsed ? 'Distributor Admin' : undefined}
            aria-label="Back to Distributor Admin"
            style={{
              ...sans,
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '9px 10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'transparent',
              border: 'none',
              borderLeft: '2px solid transparent',
              borderRadius: 6,
              cursor: 'pointer',
              gap: 10,
              color: C.gray500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <ArrowLeft size={16} strokeWidth={1.6} color={C.gray500} />
            {!collapsed && (
              <span
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.3,
                  color: C.gray500,
                  fontWeight: 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Distributor Admin
              </span>
            )}
          </button>
        </div>

        <CCNavItem
          icon={Settings}
          label="Settings"
          current={active === 'settings'}
          collapsed={collapsed}
          onClick={() => onNav('settings')}
        />
        <div style={{ padding: collapsed ? '4px 8px' : '4px 24px' }}>
          <button
            type="button"
            onClick={() => onModeChange('hidden')}
            aria-label="Hide sidebar"
            style={{
              ...sans,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: '8px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11.5,
              color: C.gray500,
            }}
          >
            <X size={14} color={C.gray500} strokeWidth={1.6} />
            {!collapsed && <span>Hide sidebar</span>}
          </button>
        </div>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${C.softLine}`,
            fontSize: 10,
            color: C.gray500,
            lineHeight: 1.6,
          }}
        >
          <div style={{ ...sans, letterSpacing: '.14em', textTransform: 'uppercase' }}>The board</div>
          <div style={sans}>
            {manager.company} · {manager.region}. {manager.today}.
          </div>
        </div>
      )}
    </aside>
  );
}
