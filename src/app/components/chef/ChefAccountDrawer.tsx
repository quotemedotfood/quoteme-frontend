// ChefAccountDrawer — slides from right, 340px wide.
//
// Sections (conditional on chefType):
//   Identity block (name + email + phone) — always
//   YOU — always (Profile, Notifications, Sign-in & security, Log out)
//   YOUR LOCATIONS — multi-location only
//   GROUP LOCATIONS — group admin only
//   GROUP ADMIN — group admin only
//
// Chrome: document-feel, eyebrow + serif title, doc-divider sections.
// No animation theater — clean slide only.
// Backdrop closes. X button closes. No tap-outside prevention.

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Plus, Users, FileText, CreditCard, ChevronRight } from 'lucide-react';
import type { ChefType } from './ChefBadgePill';
import type { LocationItem } from '../../services/api';

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  charcoal: '#2B2B2B',
  warmPaper: '#FBFAF7',
  softLine: '#E8E8E8',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  orange: '#F2993D',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChefAccountDrawerProps {
  open: boolean;
  onClose: () => void;
  chefType: ChefType;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  locations?: LocationItem[];
  currentLocationId?: string;
  onSelectLocation?: (id: string) => void;
  onAddLocation?: () => void;
  onSignOut: () => void;
  /** Navigation callback for YOU section items */
  onNavigate?: (dest: 'profile' | 'notifications' | 'security') => void;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Eyebrow({ text }: { text: string }) {
  return (
    <div
      style={{
        ...sans,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: C.gray500,
        marginBottom: 10,
      }}
    >
      {text}
    </div>
  );
}

function DocDivider() {
  return (
    <div
      style={{
        borderTop: `1px solid ${C.softLine}`,
        margin: '20px 0',
      }}
    />
  );
}

interface DrawerRowProps {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  muted?: boolean;
  danger?: boolean;
}

function DrawerRow({ icon, label, onClick, active, muted, danger }: DrawerRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...sans,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 0',
        background: 'none',
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 4,
        textAlign: 'left',
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        color: danger ? '#C0392B' : muted ? C.gray500 : C.charcoal,
        transition: 'color 100ms ease',
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        (e.currentTarget as HTMLButtonElement).style.color = danger
          ? '#A93226'
          : C.orange;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = danger
          ? '#C0392B'
          : muted
          ? C.gray500
          : active
          ? C.charcoal
          : C.charcoal;
      }}
    >
      {icon && (
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: C.gray500 }}>
          {icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{label}</span>
      {onClick && !danger && (
        <ChevronRight size={14} strokeWidth={1.8} color={C.gray500} />
      )}
    </button>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export function ChefAccountDrawer({
  open,
  onClose,
  chefType,
  firstName,
  lastName,
  email,
  phone,
  locations = [],
  currentLocationId,
  onSelectLocation,
  onAddLocation,
  onSignOut,
  onNavigate,
}: ChefAccountDrawerProps) {
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Trap focus and close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  // Group admin: show demo group locations (5 sites placeholder)
  const groupSites = [
    'Downtown',
    'Midtown',
    'West Side',
    'Airport',
    'Uptown',
  ];

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(43,43,43,.38)',
        }}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        style={{
          position: 'relative',
          width: 340,
          maxWidth: '92vw',
          height: '100%',
          background: '#FFFFFF',
          borderLeft: `1px solid ${C.softLine}`,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '20px 20px 0',
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                ...sans,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: C.gray500,
                marginBottom: 4,
              }}
            >
              Account
            </div>
            <div style={{ ...serif, fontSize: 22, fontWeight: 700, color: C.charcoal, lineHeight: 1.2 }}>
              {fullName || 'My Account'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account drawer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'none',
              border: `1px solid ${C.softLine}`,
              borderRadius: 6,
              cursor: 'pointer',
              color: C.gray500,
              marginTop: 2,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.warmPaper; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '16px 20px 32px', flex: 1 }}>

          {/* Identity block */}
          <div
            style={{
              background: C.warmPaper,
              border: `1px solid ${C.softLine}`,
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 20,
            }}
          >
            <div style={{ ...sans, fontSize: 14, fontWeight: 600, color: C.charcoal, marginBottom: 2 }}>
              {fullName || email}
            </div>
            {email && (
              <div style={{ ...sans, fontSize: 12.5, color: C.gray500, lineHeight: 1.4 }}>
                {email}
              </div>
            )}
            {phone && (
              <div style={{ ...sans, fontSize: 12.5, color: C.gray500, lineHeight: 1.4 }}>
                {phone}
              </div>
            )}
          </div>

          {/* YOU section — always */}
          <Eyebrow text="You" />
          <DrawerRow
            label="Profile"
            onClick={() => onNavigate?.('profile')}
          />
          <DrawerRow
            label="Notifications"
            onClick={() => onNavigate?.('notifications')}
          />
          <DrawerRow
            label="Sign-in &amp; security"
            onClick={() => onNavigate?.('security')}
          />
          <DrawerRow
            label="Sign out"
            onClick={() => { onSignOut(); onClose(); }}
            danger
          />

          {/* YOUR LOCATIONS — multi-location only */}
          {chefType === 'multi' && (
            <>
              <DocDivider />
              <Eyebrow text="Your Locations" />
              {locations.map((loc) => {
                const isCurrent = loc.id === currentLocationId;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => onSelectLocation?.(loc.id)}
                    style={{
                      ...sans,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '9px 0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 14,
                      fontWeight: isCurrent ? 600 : 400,
                      color: isCurrent ? C.charcoal : C.gray700,
                      borderRadius: 4,
                    }}
                  >
                    <MapPin
                      size={14}
                      strokeWidth={isCurrent ? 2 : 1.6}
                      color={isCurrent ? C.orange : C.gray500}
                      style={{ flexShrink: 0 }}
                    />
                    <span style={{ flex: 1 }}>
                      {loc.name}
                      {loc.city ? ` · ${loc.city}` : ''}
                    </span>
                    {isCurrent && (
                      <span
                        style={{
                          ...sans,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: C.orange,
                        }}
                      >
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onAddLocation}
                style={{
                  ...sans,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '9px 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: C.orange,
                  fontWeight: 500,
                  borderRadius: 4,
                }}
              >
                <Plus size={14} strokeWidth={2} color={C.orange} />
                Add a location
              </button>
            </>
          )}

          {/* GROUP LOCATIONS + GROUP ADMIN — group_admin only */}
          {chefType === 'group' && (
            <>
              <DocDivider />
              <Eyebrow text="Group Locations" />
              {groupSites.map((site) => (
                <div
                  key={site}
                  style={{
                    ...sans,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 0',
                    fontSize: 14,
                    color: C.gray700,
                  }}
                >
                  <MapPin size={14} strokeWidth={1.6} color={C.gray500} style={{ flexShrink: 0 }} />
                  <span>{site}</span>
                </div>
              ))}

              <DocDivider />
              <Eyebrow text="Group Admin" />
              <DrawerRow
                icon={<Users size={14} strokeWidth={1.6} />}
                label="Team &amp; roles"
                onClick={() => onNavigate?.('profile')}
              />
              <DrawerRow
                icon={<MapPin size={14} strokeWidth={1.6} />}
                label="Restaurants"
                onClick={() => onNavigate?.('profile')}
              />
              <DrawerRow
                icon={<FileText size={14} strokeWidth={1.6} />}
                label="Group quote rollups"
                onClick={() => onNavigate?.('profile')}
              />
              <DrawerRow
                icon={<CreditCard size={14} strokeWidth={1.6} />}
                label="Group billing"
                onClick={() => onNavigate?.('profile')}
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
