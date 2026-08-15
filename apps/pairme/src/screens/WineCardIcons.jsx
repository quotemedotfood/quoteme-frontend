import React from 'react';

/**
 * Five tap-to-reveal icon slots for one wine offering card. Lives in its
 * own file (not TheWine.jsx) because a concurrent branch is editing
 * TheWine.jsx/routes.jsx/App.jsx/lib/theme.css - see lib/wineCardIconGate.js
 * for the gate logic that decides which slots are active, computed
 * upstream (lib/state.js) and handed in here as plain booleans/data so this
 * component stays pure presentation.
 *
 * HARD RULES this file exists to satisfy:
 *  - tap reveals the explainer, never hover: every handler below is
 *    onClick; there is no onMouseEnter/onPointerEnter/onMouseOver anywhere
 *    in this file.
 *  - every icon carries a visible label AND an aria-label - the emoji is
 *    never the sole carrier of meaning.
 *  - table/glass/house/ourPick are persistent SLOTS: they always render, in
 *    either a lit (active, tappable) or dark (inactive, non-interactive,
 *    reduced-opacity) visual state. The protein slot is the one exception:
 *    it renders NOTHING at all when `proteinIcons` is empty (see
 *    lib/wineCardIconGate.js's resolveProteinIcons doc comment) - never a
 *    dark placeholder, because a guessed protein icon is worse than none.
 *  - no gradients anywhere in the styling below.
 */
const SLOT_DEFS = {
  table: { emoji: '\u{1F465}', label: 'Table wine', explainer: 'Works with everything your table ordered.' },
  glass: { emoji: '\u{1F942}', label: 'By the glass', explainer: 'You can order this by the glass.' },
  house: { emoji: '\u{1F3E0}', label: 'House pick', explainer: 'The restaurant recommends this with your dish.' },
  ourPick: { emoji: '\u{1F350}', label: 'Our pick', explainer: 'Our pick for what you ordered.' },
};

function IconSlot({ id, emoji, label, explainer, active, open, onToggle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', position: 'relative' }}>
      <button
        type="button"
        data-testid={`wine-icon-${id}`}
        onClick={active ? onToggle : undefined}
        disabled={!active}
        aria-label={active ? `${label}. ${explainer}` : `${label}. Not applicable to this wine.`}
        aria-expanded={active ? !!open : undefined}
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '999px',
          border: `1px solid ${active ? 'var(--pm-selBd)' : 'var(--pm-rule)'}`,
          background: active ? 'var(--pm-sel)' : 'var(--pm-sunken)',
          opacity: active ? 1 : 0.4,
          cursor: active ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: '14px var(--font-body)',
          padding: 0,
        }}
      >
        <span aria-hidden="true">{emoji}</span>
      </button>
      <span style={{ font: '500 8.5px var(--font-body)', color: 'var(--pm-muted)', textAlign: 'center', maxWidth: '56px', lineHeight: '1.15' }}>
        {label}
      </span>
      {active && open ? (
        <div
          role="note"
          data-testid={`wine-icon-explainer-${id}`}
          style={{
            position: 'absolute',
            top: '38px',
            zIndex: 1,
            width: '160px',
            font: '400 11px/1.4 var(--font-body)',
            color: 'var(--pm-ink)',
            background: 'var(--pm-card)',
            border: '1px solid var(--pm-rule)',
            borderRadius: '8px',
            padding: '8px',
          }}
        >
          {explainer}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {boolean} tableActive
 * @param {boolean} glassActive
 * @param {boolean} housePickActive
 * @param {boolean} ourPickActive
 * @param {Array<{key:string, emoji:string, label:string, explainer:string}>} [proteinIcons]
 */
export default function WineCardIcons({ tableActive, glassActive, housePickActive, ourPickActive, proteinIcons }) {
  const [open, setOpen] = React.useState(() => new Set());
  const toggle = (key) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const proteins = proteinIcons || [];
  const slots = [
    { id: 'table', active: !!tableActive, ...SLOT_DEFS.table },
    { id: 'glass', active: !!glassActive, ...SLOT_DEFS.glass },
    { id: 'house', active: !!housePickActive, ...SLOT_DEFS.house },
    { id: 'ourPick', active: !!ourPickActive, ...SLOT_DEFS.ourPick },
  ];

  return (
    <div data-testid="wine-card-icons" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '9px' }}>
      {slots.map((s) => (
        <IconSlot
          key={s.id}
          id={s.id}
          emoji={s.emoji}
          label={s.label}
          explainer={s.explainer}
          active={s.active}
          open={open.has(s.id)}
          onToggle={() => toggle(s.id)}
        />
      ))}
      {proteins.map((p, i) => {
        const id = `protein-${p.key}-${i}`;
        return (
          <IconSlot
            key={id}
            id={id}
            emoji={p.emoji}
            label={p.label}
            explainer={p.explainer}
            active
            open={open.has(id)}
            onToggle={() => toggle(id)}
          />
        );
      })}
    </div>
  );
}
