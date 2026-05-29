// ChefMenuDetailPage — /chef/menus/:id
//
// Renders one saved menu in document-weight — reads like a saved document,
// not an app UI.
//
// Bottom: Distributor-history block (the moat surface). Shows every
// distributor this menu has been quoted against, with dates and totals.
//
// Two primary actions:
//   "Pull a quote from this menu" → /chef/pull/entry        (state: { menu_id })
//   "Compare across distributors" → /chef/menus/:id/spread  (Agent C3)
//
// BE not yet live (Track C, Agent C4). 404 / empty responses render the
// empty state cleanly.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getChefMenu, type ChefMenuDetail, type ChefMenuItemDetail } from '../../services/api';

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  charcoal: '#2B2B2B',
  orange: '#F2993D',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  gray300: '#D1D5DB',
} as const;

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};
const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function money(cents: number): string {
  return (
    '$' +
    (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Group items by category for document-style rendering
function groupByCategory(items: ChefMenuItemDetail[]): Map<string, ChefMenuItemDetail[]> {
  const map = new Map<string, ChefMenuItemDetail[]>();
  for (const item of items) {
    const cat = item.category || 'Other';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return map;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 py-20">
      <div
        className="w-8 h-8 rounded-full border-4"
        style={{
          borderColor: C.softLine,
          borderTopColor: C.orange,
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-5 pt-12 pb-16 text-center">
      <p style={{ ...sans, fontSize: 14, color: C.gray700 }}>
        This menu couldn't be found.
      </p>
      <button
        type="button"
        onClick={onBack}
        style={{
          ...sans,
          marginTop: 16,
          background: 'transparent',
          border: 'none',
          color: C.orange,
          fontSize: 13.5,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        ← Back to menus
      </button>
    </div>
  );
}

// Distributor history table
function DistributorHistory({ menu }: { menu: ChefMenuDetail }) {
  if (!menu.distributor_history || menu.distributor_history.length === 0) {
    return (
      <div
        style={{
          background: C.warmPaper,
          border: `1px solid ${C.softLine}`,
          borderRadius: 10,
          padding: '18px 20px',
        }}
      >
        <h2
          style={{
            ...serif,
            fontSize: 15,
            fontWeight: 600,
            color: C.charcoal,
            margin: '0 0 8px',
          }}
        >
          Distributor history
        </h2>
        <p style={{ ...sans, fontSize: 13, color: C.gray500, margin: 0, lineHeight: 1.55 }}>
          This menu hasn't been quoted against any distributors yet.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.warmPaper,
        border: `1px solid ${C.softLine}`,
        borderRadius: 10,
        padding: '18px 20px',
      }}
    >
      <h2
        style={{
          ...serif,
          fontSize: 15,
          fontWeight: 600,
          color: C.charcoal,
          margin: '0 0 14px',
        }}
      >
        Distributor history
      </h2>

      {/* Column headers */}
      <div
        style={{
          ...sans,
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          gap: '0 16px',
          fontSize: 11,
          fontWeight: 600,
          color: C.gray500,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          borderBottom: `1px solid ${C.softLine}`,
          paddingBottom: 6,
          marginBottom: 8,
        }}
      >
        <span>Distributor</span>
        <span style={{ textAlign: 'right' }}>Quotes</span>
        <span style={{ textAlign: 'right' }}>Last quoted</span>
        <span style={{ textAlign: 'right' }}>Total</span>
      </div>

      {menu.distributor_history.map((d) => (
        <div
          key={d.distributor_id}
          style={{
            ...sans,
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: '0 16px',
            fontSize: 13.5,
            color: C.charcoal,
            borderBottom: `1px solid ${C.softLine}`,
            padding: '9px 0',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {d.distributor_name}
          </span>
          <span style={{ color: C.gray700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {d.quote_count}
          </span>
          <span style={{ color: C.gray700, textAlign: 'right', whiteSpace: 'nowrap' }}>
            {formatDate(d.last_quoted_at)}
          </span>
          <span
            style={{
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'right',
              whiteSpace: 'nowrap',
            }}
          >
            {money(d.total_cents)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ChefMenuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [menu, setMenu] = useState<ChefMenuDetail | null>(null);

  useEffect(() => {
    if (!id) { setLoadState('not_found'); return; }
    let cancelled = false;
    (async () => {
      const res = await getChefMenu(id);
      if (cancelled) return;
      if (res.data) {
        setMenu(res.data);
        setLoadState('ready');
      } else if (
        res.error?.includes('404') ||
        res.error?.includes('HTTP 404') ||
        !res.error
      ) {
        setLoadState('not_found');
      } else {
        setLoadState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loadState === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-10 pb-16">
        <Spinner />
      </div>
    );
  }

  if (loadState === 'not_found' || loadState === 'error') {
    return <NotFound onBack={() => navigate('/chef/menus')} />;
  }

  if (!menu) return null;

  const grouped = groupByCategory(menu.items || []);
  const isDraft = menu.quote_count === 0;

  return (
    <div
      className="max-w-2xl mx-auto px-5 pt-6 pb-20"
      style={{ ...sans, color: C.charcoal }}
    >
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate('/chef/menus')}
        style={{
          ...sans,
          background: 'transparent',
          border: 'none',
          color: C.gray500,
          fontSize: 12.5,
          cursor: 'pointer',
          padding: 0,
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        ← All menus
      </button>

      {/* Document header */}
      <div
        style={{
          borderBottom: `1px solid ${C.softLine}`,
          paddingBottom: 20,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h1
            style={{
              ...serif,
              fontSize: 28,
              fontWeight: 600,
              color: C.charcoal,
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {menu.name}
          </h1>
          {isDraft && (
            <span
              style={{
                ...sans,
                fontSize: 10,
                fontWeight: 500,
                color: '#92400E',
                background: '#FEF3C7',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              Draft
            </span>
          )}
        </div>

        <div
          style={{
            ...sans,
            fontSize: 12.5,
            color: C.gray500,
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          {menu.item_count} {menu.item_count === 1 ? 'item' : 'items'}
          {menu.last_quoted_at
            ? ` · last quoted ${formatDate(menu.last_quoted_at)}`
            : ' · never quoted'}
          {menu.quote_count > 0
            ? ` · ${menu.quote_count} ${menu.quote_count === 1 ? 'quote' : 'quotes'}`
            : null}
          {` · created ${formatDate(menu.created_at)}`}
        </div>
      </div>

      {/* Primary actions */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 32,
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/chef/pull/entry', { state: { menu_id: menu.id } })}
          style={{
            ...sans,
            background: C.orange,
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Pull a quote from this menu
        </button>

        <button
          type="button"
          onClick={() => navigate(`/chef/menus/${menu.id}/spread`)}
          style={{
            ...sans,
            background: 'transparent',
            color: C.charcoal,
            fontSize: 13.5,
            fontWeight: 500,
            padding: '10px 20px',
            borderRadius: 8,
            border: `1.5px solid ${C.gray300}`,
            cursor: 'pointer',
          }}
        >
          Compare across distributors
        </button>
      </div>

      {/* Menu content — document weight */}
      {menu.items && menu.items.length > 0 ? (
        <div style={{ marginBottom: 36 }}>
          <h2
            style={{
              ...serif,
              fontSize: 16,
              fontWeight: 600,
              color: C.charcoal,
              margin: '0 0 14px',
            }}
          >
            Items
          </h2>

          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 20 }}>
              <div
                style={{
                  ...sans,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: C.gray500,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 6,
                  borderBottom: `1px solid ${C.softLine}`,
                  paddingBottom: 4,
                }}
              >
                {category}
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {items.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      ...sans,
                      fontSize: 13.5,
                      color: C.charcoal,
                      padding: '4px 0',
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: C.gray300,
                        flexShrink: 0,
                        marginBottom: 1,
                      }}
                    />
                    <span>{item.name}</span>
                    {item.source_dish && (
                      <span
                        style={{
                          fontSize: 11,
                          color: C.gray500,
                          fontStyle: 'italic',
                        }}
                      >
                        {item.source_dish}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            ...sans,
            fontSize: 13.5,
            color: C.gray500,
            marginBottom: 36,
            padding: '16px 0',
            borderTop: `1px solid ${C.softLine}`,
            borderBottom: `1px solid ${C.softLine}`,
          }}
        >
          No items on record for this menu.
        </div>
      )}

      {/* Distributor history */}
      <DistributorHistory menu={menu} />

      {/* Bottom CTA strip — repeat pull-quote for convenience */}
      <div
        style={{
          marginTop: 36,
          paddingTop: 24,
          borderTop: `1px solid ${C.softLine}`,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/chef/pull/entry', { state: { menu_id: menu.id } })}
          style={{
            ...sans,
            background: C.orange,
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Pull a quote from this menu
        </button>

        <button
          type="button"
          onClick={() => navigate(`/chef/menus/${menu.id}/spread`)}
          style={{
            ...sans,
            background: 'transparent',
            color: C.charcoal,
            fontSize: 13.5,
            fontWeight: 500,
            padding: '10px 20px',
            borderRadius: 8,
            border: `1.5px solid ${C.gray300}`,
            cursor: 'pointer',
          }}
        >
          Compare across distributors
        </button>
      </div>
    </div>
  );
}
