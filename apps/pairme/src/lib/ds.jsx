import React from 'react';

/**
 * Thin adapter over the PairMe design system bundle.
 *
 * The bundle publishes components on window.PairMeDesignSystem_2f0099. Point
 * BUNDLE at your real import once the design system is on npm or vendored, and
 * delete the fallbacks below. The fallbacks exist only so a screen renders if
 * the bundle has not loaded yet.
 */
const BUNDLE = () => (typeof window !== 'undefined' && window.PairMeDesignSystem_2f0099) || {};

export function Button({ variant = 'primary', size = 'md', style, children, ...rest }) {
  const B = BUNDLE().Button;
  if (B) return <B variant={variant} size={size} style={style} {...rest}>{children}</B>;
  const pad = { sm: '9px 14px', md: '12px 18px', lg: '15px 22px' }[size] || '12px 18px';
  const skin = variant === 'primary'
    ? { background: '#FFCC7D', color: '#1F2A44', border: '1px solid #E5A44F' }
    : variant === 'secondary'
      ? { background: 'transparent', color: 'var(--pm-accent2, #1F2A44)', border: '1.5px solid var(--pm-accent2, #1F2A44)' }
      : { background: 'transparent', color: 'var(--pm-ink, #1C1C1A)', border: '1px solid transparent' };
  return (
    <button {...rest} style={{ borderRadius: 999, padding: pad, font: '600 14px var(--font-body)', cursor: 'pointer', minHeight: 44, ...skin, ...style }}>
      {children}
    </button>
  );
}

export function Input({ label, style, ...rest }) {
  const I = BUNDLE().Input;
  if (I) return <I label={label} style={style} {...rest} />;
  return (
    <label style={{ display: 'block', ...style }}>
      {label ? <span style={{ display: 'block', font: '600 12px var(--font-body)', color: 'var(--pm-muted)', marginBottom: 5 }}>{label}</span> : null}
      <input
        {...rest}
        style={{
          width: '100%', boxSizing: 'border-box', border: '1px solid var(--pm-rule)',
          borderRadius: 8, padding: '12px 11px', font: '400 13px var(--font-body)',
          background: 'var(--pm-card)', color: 'var(--pm-ink)', minHeight: 44,
        }}
      />
    </label>
  );
}
