// RepTypeahead — shared rep-selection control with typeahead filter.
//
// Used in RoutingTable (Forward-To column, unassigned rows) and re-exported
// for CCAssignPage (later wave).
//
// Props:
//   reps        — full rep list to filter against
//   value       — currently selected rep id (controlled)
//   onSelect    — fired when user picks a rep
//   placeholder — input placeholder text (default "Assign rep…")
//   disabled    — locks the control (e.g. while a forward is in flight)
//
// Styling: matches the existing Forward-To outlined select control
// (border #A5B4FC, border-radius 5, font 12px DM Sans). No new colors.

import React, { useEffect, useRef, useState } from 'react';
import { sans, C, CC_ACK_NAVY } from './cc-atoms';

export interface RepTypeaheadProps {
  reps: { id: string; name: string }[];
  value?: string;
  onSelect: (repId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const CONTROL_STYLE: React.CSSProperties = {
  ...sans,
  fontSize: 12,
  background: '#fff',
  border: '1px solid #A5B4FC',
  borderRadius: 5,
  padding: '5px 8px',
  width: '100%',
  maxWidth: 148,
  boxSizing: 'border-box',
  outline: 'none',
  color: C.gray500,
};

const DROPDOWN_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  zIndex: 200,
  background: '#fff',
  border: '1px solid #A5B4FC',
  borderRadius: 5,
  boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
  marginTop: 2,
  maxHeight: 180,
  overflowY: 'auto',
  minWidth: 148,
  maxWidth: 220,
};

export function RepTypeahead({
  reps,
  value,
  onSelect,
  placeholder = 'Assign rep…',
  disabled = false,
}: RepTypeaheadProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive the display value when controlled (value prop changes after selection)
  const selectedName = value ? (reps.find((r) => r.id === value)?.name ?? '') : '';

  // Filter reps by query
  const filtered = query.trim()
    ? reps.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    : reps;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.currentTarget.value);
    setOpen(true);
  }

  function handleFocus() {
    if (!disabled) setOpen(true);
  }

  function handleSelect(rep: { id: string; name: string }) {
    onSelect(rep.id);
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
    if (e.key === 'Enter' && filtered.length === 1) {
      handleSelect(filtered[0]);
    }
  }

  // Input shows the typed query while open; otherwise shows selected name or empty
  const inputValue = open ? query : selectedName;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', maxWidth: 148 }}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        style={{
          ...CONTROL_STYLE,
          cursor: disabled ? 'default' : 'text',
          opacity: disabled ? 0.6 : 1,
          // Subtle highlight so unassigned Forward To cells stand out (matches select)
          boxShadow: '0 0 0 2px #EEF2FF',
          color: selectedName && !open ? CC_ACK_NAVY : C.gray500,
          fontWeight: selectedName && !open ? 500 : undefined,
          transition: 'opacity 150ms',
        }}
      />

      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          style={{ ...DROPDOWN_STYLE, listStyle: 'none', margin: 0, padding: '4px 0' }}
        >
          {filtered.map((rep) => (
            <li
              key={rep.id}
              role="option"
              aria-selected={rep.id === value}
              onMouseEnter={() => setHovered(rep.id)}
              onMouseLeave={() => setHovered(null)}
              onMouseDown={(e) => {
                // mousedown fires before blur; prevent blur from closing before select
                e.preventDefault();
                handleSelect(rep);
              }}
              style={{
                ...sans,
                fontSize: 12,
                padding: '6px 10px',
                cursor: 'pointer',
                color: rep.id === value ? CC_ACK_NAVY : C.gray700,
                fontWeight: rep.id === value ? 500 : undefined,
                background: hovered === rep.id ? '#EEF2FF' : 'transparent',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {rep.name}
            </li>
          ))}
        </ul>
      )}

      {open && query.trim().length > 0 && filtered.length === 0 && (
        <div
          style={{
            ...DROPDOWN_STYLE,
            padding: '8px 10px',
            color: C.gray400,
            fontSize: 12,
            ...sans,
          }}
        >
          No reps match "{query}"
        </div>
      )}
    </div>
  );
}
