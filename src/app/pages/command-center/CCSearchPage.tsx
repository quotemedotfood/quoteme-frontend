// CCSearchPage — Global Search (B2-CC Section 6)
//
// Debounced lookup across restaurants / reps / quotes.
// Three result groups: RESTAURANTS → REPS → QUOTES.
// Zero Sacred Orange on this surface (read-only, one-orange rule).
// No scores, no rankings, no charts. Dispatch center posture.
//
// Initial query: picked up from ?q= URL param (matching how CCSearchBar
// navigates: navigate(`/distributor-admin/command-center/search?q=<term>`)).
//
// BE contract: GET /api/v1/distributor_admin/command_center/search?q=<term>
//   → { restaurants: CCSearchRestaurant[], reps: CCSearchRep[], quotes: CCSearchQuote[] }
//   No inside_sales group.
//
// CCQuotesPage does NOT read a `rep` query param — it uses local component
// state (repFilter) toggled by its own filter chips. Rep rows therefore
// navigate to /distributor-admin/command-center/quotes without a rep param.
// This is noted in the PR.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Search, X, UtensilsCrossed, User, FileText, ChevronRight } from 'lucide-react';
import {
  CCStatusTag,
  CCSectionHead,
  RepAvatar,
  AttentionRule,
  SoftRule,
  sans,
  serif,
  tabular,
  C,
} from '../../components/distributor-admin/command-center/cc-atoms';
import {
  getCommandCenterSearch,
  type CCSearchResults,
  type CCSearchRestaurant,
  type CCSearchRep,
  type CCSearchQuote,
} from '../../services/api';

// ── Suggestion chips ──────────────────────────────────────────────────────────
// Generic examples — NOT hardcoded restaurant/rep names that may not exist.
// User can click to fill the query field.
const SUGGESTION_CHIPS = ['Q-1001', 'Green Leaf', 'Smith', 'Downtown'];

// ── Loading skeleton ──────────────────────────────────────────────────────────

function GroupSkeleton() {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ width: 80, height: 10, background: C.softLine, borderRadius: 4 }} />
        <div style={{ width: 20, height: 10, background: C.softLine, borderRadius: 4 }} />
      </div>
      <div style={{ borderTop: `2px solid ${C.charcoal}`, marginBottom: 0 }} />
      {[1, 2].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 0',
            borderBottom: `1px solid ${C.softLine}`,
          }}
        >
          <div style={{ width: 20, height: 20, background: C.softLine, borderRadius: 4, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: '55%', height: 12, background: C.softLine, borderRadius: 4, marginBottom: 6 }} />
            <div style={{ width: '35%', height: 10, background: C.softLine, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Result group wrapper ───────────────────────────────────────────────────────

interface GroupProps {
  label: string;
  count: number;
  children: React.ReactNode;
}

function Group({ label, count, children }: GroupProps) {
  return (
    <section style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            ...sans,
            fontSize: 10,
            letterSpacing: '.14em',
            textTransform: 'uppercase' as const,
            color: C.gray700,
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span style={{ ...sans, ...tabular, fontSize: 11, color: C.gray500 }}>{count}</span>
      </div>
      <div style={{ borderTop: `2px solid ${C.charcoal}` }} />
      {children}
    </section>
  );
}

// ── Row styles shared ──────────────────────────────────────────────────────────

const rowBase: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 0',
  borderBottom: `1px solid ${C.softLine}`,
  background: 'transparent',
  border: 'none',
  borderBottomStyle: 'solid' as const,
  borderBottomWidth: 1,
  borderBottomColor: C.softLine,
  cursor: 'pointer',
};

function useRowHover() {
  const [hover, setHover] = useState(false);
  return {
    style: { background: hover ? '#F9FAFB' : 'transparent', transition: 'background 150ms' },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
  };
}

// ── Restaurant row ────────────────────────────────────────────────────────────

function RestaurantRow({ item, onClick }: { item: CCSearchRestaurant; onClick: () => void }) {
  const h = useRowHover();
  return (
    <button
      onClick={onClick}
      style={{ ...rowBase, borderBottom: 'none', borderBottomWidth: 1, borderBottomColor: C.softLine, borderBottomStyle: 'solid', ...h.style }}
      onMouseEnter={h.onMouseEnter}
      onMouseLeave={h.onMouseLeave}
    >
      <UtensilsCrossed size={15} color={C.gray500} strokeWidth={1.5} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...serif,
            fontSize: 14.5,
            fontWeight: 500,
            color: C.charcoal,
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
          }}
        >
          {item.name}
        </div>
        <div style={{ ...sans, ...tabular, fontSize: 11.5, color: C.gray500, lineHeight: 1.4, marginTop: 2 }}>
          {item.quote_count} {item.quote_count === 1 ? 'quote' : 'quotes'} · {item.owner_name ?? 'no owner'}
        </div>
      </div>
      <ChevronRight size={14} color={C.gray400} strokeWidth={1.5} style={{ flexShrink: 0 }} />
    </button>
  );
}

// ── Rep row ────────────────────────────────────────────────────────────────────

function RepRow({ item, onClick }: { item: CCSearchRep; onClick: () => void }) {
  const h = useRowHover();
  return (
    <button
      onClick={onClick}
      style={{ ...rowBase, ...h.style }}
      onMouseEnter={h.onMouseEnter}
      onMouseLeave={h.onMouseLeave}
    >
      <RepAvatar initials={item.initials} name={item.name} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...sans, fontSize: 13.5, color: C.charcoal, lineHeight: 1.25, fontWeight: 500 }}>
          {item.name}
        </div>
        <div style={{ ...sans, ...tabular, fontSize: 11.5, color: C.gray500, lineHeight: 1.4, marginTop: 2 }}>
          {item.open} open · last quote {item.last}
        </div>
      </div>
      <ChevronRight size={14} color={C.gray400} strokeWidth={1.5} style={{ flexShrink: 0 }} />
    </button>
  );
}

// ── Quote row ──────────────────────────────────────────────────────────────────

function QuoteRow({ item, onClick }: { item: CCSearchQuote; onClick: () => void }) {
  const h = useRowHover();
  return (
    <button
      onClick={onClick}
      style={{ ...rowBase, ...h.style }}
      onMouseEnter={h.onMouseEnter}
      onMouseLeave={h.onMouseLeave}
    >
      <FileText size={15} color={C.gray500} strokeWidth={1.5} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...sans,
            fontSize: 13.5,
            color: C.charcoal,
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
          }}
        >
          {item.restaurant}{' '}
          <span style={{ color: C.gray500 }}>
            · {item.q_label}
          </span>
        </div>
        <div style={{ ...sans, ...tabular, fontSize: 11.5, color: C.gray500, lineHeight: 1.4, marginTop: 2 }}>
          {item.rep_name ?? 'unassigned'} · {item.sent} · {item.items} {item.items === 1 ? 'item' : 'items'}
        </div>
      </div>
      <CCStatusTag status={item.status} size="xs" />
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CCSearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialQ = searchParams.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState<CCSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const term = q.trim();

  // Debounced search: fires 300ms after last keystroke if term ≥ 2 chars
  const runSearch = useCallback((value: string) => {
    const t = value.trim();
    if (t.length < 2) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getCommandCenterSearch(t).then((res) => {
      if (res.error) {
        setError('Search unavailable. Try again in a moment.');
        setResults(null);
      } else {
        setResults(res.data ?? null);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(term), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [term, runSearch]);

  // Autofocus — move cursor to end of initial value
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, []);

  const handleChipClick = (chip: string) => {
    setQ(chip);
  };

  const nResults = results
    ? results.restaurants.length + results.reps.length + results.quotes.length
    : 0;

  // ── Derived navigation targets ───────────────────────────────────────────
  const goToRestaurant = (item: CCSearchRestaurant) => {
    if (item.first_quote_id) {
      navigate(`/distributor-admin/command-center/quotes/${encodeURIComponent(item.first_quote_id)}`);
    } else {
      navigate(`/distributor-admin/command-center/quotes`);
    }
  };

  // NOTE: CCQuotesPage does NOT read a ?rep= query param from the URL —
  // its repFilter is local component state. Navigating to /quotes without a
  // param is the correct behavior; the user can then filter by rep on that page.
  const goToRep = (_item: CCSearchRep) => {
    navigate(`/distributor-admin/command-center/quotes`);
  };

  const goToQuote = (item: CCSearchQuote) => {
    navigate(`/distributor-admin/command-center/quotes/${encodeURIComponent(item.id)}`);
  };

  // ── Search field ──────────────────────────────────────────────────────────
  const searchField = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#fff',
        border: `1px solid ${C.charcoal}`,
        borderRadius: 8,
        padding: '11px 14px',
      }}
    >
      <Search size={17} color={C.charcoal} strokeWidth={1.6} style={{ flexShrink: 0 }} />
      <input
        ref={inputRef}
        value={q}
        autoFocus
        onChange={(e) => setQ(e.target.value)}
        placeholder="Restaurant, quote number, or rep…"
        style={{
          ...sans,
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 15,
          color: C.charcoal,
        }}
      />
      {q && (
        <button
          onClick={() => {
            setQ('');
            setResults(null);
            setError(null);
            inputRef.current?.focus();
          }}
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Clear search"
        >
          <X size={15} color={C.gray500} strokeWidth={1.6} />
        </button>
      )}
    </div>
  );

  // ── Content area ──────────────────────────────────────────────────────────
  let content: React.ReactNode;

  if (!term || term.length < 2) {
    // Resting state
    content = (
      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <Search size={26} color={C.gray400} strokeWidth={1.4} style={{ display: 'block', margin: '0 auto' }} />
        <div
          style={{
            ...serif,
            fontSize: 16,
            fontWeight: 500,
            color: C.charcoal,
            marginTop: 12,
          }}
        >
          Search the whole book.
        </div>
        <p
          style={{
            ...sans,
            fontSize: 12.5,
            color: C.gray500,
            lineHeight: 1.6,
            marginTop: 6,
            maxWidth: 320,
            margin: '6px auto 0',
          }}
        >
          Quotes, restaurants, reps. Got a chef on the phone? Type their name and pull up the last quote.
        </p>
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap' as const,
          }}
        >
          {SUGGESTION_CHIPS.map((s) => (
            <button
              key={s}
              onClick={() => handleChipClick(s)}
              style={{
                ...sans,
                padding: '5px 12px',
                fontSize: 12,
                border: `1px solid ${C.softLine}`,
                borderRadius: 999,
                background: '#fff',
                color: C.gray700,
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  } else if (loading) {
    // Loading — subtle skeletons, no flash
    content = (
      <div style={{ marginTop: 4 }}>
        <div style={{ ...sans, ...tabular, fontSize: 12, color: C.gray400, marginTop: 16 }}>
          Searching…
        </div>
        <GroupSkeleton />
        <GroupSkeleton />
      </div>
    );
  } else if (error) {
    content = (
      <div
        style={{
          ...sans,
          marginTop: 40,
          textAlign: 'center',
          fontSize: 13,
          color: C.gray500,
          lineHeight: 1.6,
        }}
      >
        {error}
      </div>
    );
  } else if (results && nResults === 0) {
    // No results
    content = (
      <div
        style={{
          ...sans,
          marginTop: 40,
          textAlign: 'center',
          fontSize: 13,
          color: C.gray500,
          lineHeight: 1.6,
        }}
      >
        Nothing matches &ldquo;{q}&rdquo;. Try a restaurant, a quote number, or a rep&rsquo;s name.
      </div>
    );
  } else if (results) {
    // Results
    content = (
      <>
        <div
          style={{
            ...sans,
            ...tabular,
            fontSize: 12,
            color: C.gray500,
            marginTop: 16,
          }}
        >
          {nResults} {nResults === 1 ? 'match' : 'matches'} for &ldquo;{q}&rdquo;
        </div>

        {results.restaurants.length > 0 && (
          <Group label="RESTAURANTS" count={results.restaurants.length}>
            {results.restaurants.map((r) => (
              <RestaurantRow key={r.id} item={r} onClick={() => goToRestaurant(r)} />
            ))}
          </Group>
        )}

        {results.reps.length > 0 && (
          <Group label="REPS" count={results.reps.length}>
            {results.reps.map((r) => (
              <RepRow key={r.id} item={r} onClick={() => goToRep(r)} />
            ))}
          </Group>
        )}

        {results.quotes.length > 0 && (
          <Group label="QUOTES" count={results.quotes.length}>
            {results.quotes.map((q) => (
              <QuoteRow key={q.id} item={q} onClick={() => goToQuote(q)} />
            ))}
          </Group>
        )}
      </>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <CCSectionHead eyebrow="SEARCH" title="Find anything, fast." />
      <div style={{ marginTop: 16 }}>{searchField}</div>
      {content}
    </div>
  );
}
