// CCSearchBar — persistent global-search command bar.
// Appears sticky at the top of the work area on desktop; submitting routes to
// /distributor-admin/command-center/search with the query.

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { sans, C } from './cc-atoms';

interface CCSearchBarProps {
  value?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: (query: string) => void;
}

export function CCSearchBar({
  value = '',
  placeholder = 'Find a quote, restaurant, or rep…',
  autoFocus = false,
  onSubmit,
}: CCSearchBarProps) {
  const [q, setQ] = useState(value);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(q);
    } else {
      navigate(`/distributor-admin/command-center/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#fff',
        border: `1px solid ${C.softLine}`,
        borderRadius: 8,
        padding: '9px 13px',
      }}
    >
      <Search size={16} color={C.gray500} strokeWidth={1.6} />
      <input
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        style={{
          ...sans,
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 14,
          color: C.charcoal,
        }}
      />
      <kbd
        style={{
          ...sans,
          fontSize: 11,
          color: C.gray500,
          border: `1px solid ${C.softLine}`,
          borderRadius: 4,
          padding: '1px 6px',
          background: '#F9FAFB',
        }}
      >
        /
      </kbd>
    </form>
  );
}
