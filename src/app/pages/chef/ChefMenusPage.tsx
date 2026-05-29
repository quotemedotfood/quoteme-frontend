// ChefMenusPage — /chef/menus
//
// Reverse-chronological list of the chef's saved menus.
// Populated state: rows with name, item count, last-quoted date, quote
// count, "Use for a quote" CTA, kebab (Rename / Delete), and a "Draft"
// pill for never-quoted menus.
//
// Empty state: minimal, doctrine-quiet — no onboarding theater. Brief
// copy + primary action to create a first menu via /chef/entry.
//
// BE not yet live (Track C, Agent C4). Endpoint 404s render the empty
// state cleanly — no crash.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  getChefMenus,
  renameChefMenu,
  deleteChefMenu,
  type ChefMenuRow,
} from '../../services/api';

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  charcoal: '#2B2B2B',
  orange: '#F2993D',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  danger: '#DC2626',
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

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="py-20 text-center max-w-sm mx-auto">
      <p style={{ ...sans, fontSize: 14, color: C.gray700, lineHeight: 1.6 }}>
        You haven't saved any menus yet. Start a quote and your menu will be saved here for
        re-use.
      </p>
      <button
        type="button"
        onClick={onNew}
        style={{
          ...sans,
          marginTop: 20,
          display: 'inline-block',
          background: C.orange,
          color: '#fff',
          fontSize: 13.5,
          fontWeight: 600,
          padding: '10px 22px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Build a quote
      </button>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="py-20 text-center">
      <p style={{ ...sans, fontSize: 14, color: C.gray700 }}>
        {message || "Couldn't load your menus right now."}
      </p>
    </div>
  );
}

function DraftPill() {
  return (
    <span
      style={{
        ...sans,
        fontSize: 10,
        fontWeight: 500,
        color: '#92400E',
        background: '#FEF3C7',
        padding: '2px 8px',
        borderRadius: 999,
        flexShrink: 0,
      }}
    >
      Draft
    </span>
  );
}

// Kebab menu anchored to a ref element
function KebabMenu({
  onRename,
  onDelete,
  onClose,
}: {
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: 4,
        background: '#fff',
        border: `1px solid ${C.softLine}`,
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
        zIndex: 50,
        minWidth: 140,
        overflow: 'hidden',
      }}
    >
      {[
        { label: 'Rename', action: onRename, color: C.charcoal },
        { label: 'Delete', action: onDelete, color: C.danger },
      ].map(({ label, action, color }) => (
        <button
          key={label}
          type="button"
          onClick={() => { action(); onClose(); }}
          style={{
            ...sans,
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '10px 16px',
            fontSize: 13.5,
            color,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = C.warmPaper;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Inline rename input
function RenameInput({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialValue) onSave(trimmed);
    else onCancel();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onCancel();
      }}
      style={{
        ...sans,
        fontSize: 14,
        fontWeight: 500,
        color: C.charcoal,
        border: `1px solid ${C.orange}`,
        borderRadius: 4,
        padding: '2px 6px',
        background: '#fff',
        outline: 'none',
        width: '100%',
        maxWidth: 300,
      }}
    />
  );
}

// Single menu row
function MenuRow({
  menu,
  onOpen,
  onUseForQuote,
  onRename,
  onDelete,
}: {
  menu: ChefMenuRow;
  onOpen: () => void;
  onUseForQuote: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [kebabOpen, setKebabOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const isDraft = menu.quote_count === 0;

  return (
    <div
      style={{
        borderBottom: `1px solid ${C.softLine}`,
        padding: '14px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {renaming ? (
          <RenameInput
            initialValue={menu.name}
            onSave={(name) => { onRename(name); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <button
            type="button"
            onClick={onOpen}
            style={{
              ...sans,
              fontSize: 14,
              fontWeight: 500,
              color: C.charcoal,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              maxWidth: '100%',
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {menu.name}
            </span>
            {isDraft && <DraftPill />}
          </button>
        )}
        <div
          style={{
            ...sans,
            fontSize: 11.5,
            color: C.gray500,
            marginTop: 3,
            lineHeight: 1.4,
          }}
        >
          {menu.item_count} {menu.item_count === 1 ? 'item' : 'items'}
          {menu.last_quoted_at
            ? ` · last quoted ${formatDate(menu.last_quoted_at)}`
            : ' · never quoted'}
          {menu.quote_count > 0
            ? ` · ${menu.quote_count} ${menu.quote_count === 1 ? 'quote' : 'quotes'}`
            : null}
        </div>
      </div>

      {/* Use for a quote */}
      <button
        type="button"
        onClick={onUseForQuote}
        style={{
          ...sans,
          flexShrink: 0,
          background: C.orange,
          color: '#fff',
          fontSize: 12.5,
          fontWeight: 600,
          padding: '7px 14px',
          borderRadius: 7,
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Use for a quote
      </button>

      {/* Kebab */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          aria-label="Menu options"
          onClick={() => setKebabOpen((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 4,
            color: C.gray500,
            fontSize: 18,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ···
        </button>
        {kebabOpen && (
          <KebabMenu
            onRename={() => setRenaming(true)}
            onDelete={onDelete}
            onClose={() => setKebabOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ChefMenusPage() {
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [menus, setMenus] = useState<ChefMenuRow[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getChefMenus();
      if (cancelled) return;
      if (res.data) {
        setMenus(res.data.menus);
        setLoadState('ready');
      } else {
        // BE not yet live — treat 404 / empty as no menus rather than hard error
        setMenus([]);
        setLoadState('ready');
        if (res.error && !res.error.includes('404') && !res.error.includes('HTTP 404')) {
          setErrorMsg(res.error);
          setLoadState('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRename = async (menuId: string, name: string) => {
    const res = await renameChefMenu(menuId, name);
    if (res.data) {
      setMenus((prev) =>
        prev.map((m) => (m.id === menuId ? { ...m, name: res.data!.name } : m))
      );
    }
  };

  const handleDelete = async (menuId: string) => {
    const ok = window.confirm('Remove this menu?');
    if (!ok) return;
    await deleteChefMenu(menuId);
    setMenus((prev) => prev.filter((m) => m.id !== menuId));
  };

  return (
    <div
      className="max-w-2xl mx-auto px-5 pt-6 pb-16"
      style={{ ...sans, color: C.charcoal }}
    >
      {/* Page header */}
      <div
        style={{
          borderBottom: `1px solid ${C.softLine}`,
          paddingBottom: 18,
          marginBottom: 8,
        }}
      >
        <h1
          style={{
            ...serif,
            fontSize: 26,
            fontWeight: 600,
            color: C.charcoal,
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Menus
        </h1>
        <p
          style={{
            ...sans,
            fontSize: 13,
            color: C.gray500,
            marginTop: 5,
            lineHeight: 1.5,
          }}
        >
          Every menu you've built or quoted from, saved for re-use.
        </p>
      </div>

      {/* Body */}
      {loadState === 'loading' && <Spinner />}
      {loadState === 'error' && <ErrorState message={errorMsg} />}
      {loadState === 'ready' && menus.length === 0 && (
        <EmptyState onNew={() => navigate('/chef/entry')} />
      )}
      {loadState === 'ready' && menus.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.softLine}` }}>
          {menus.map((menu) => (
            <MenuRow
              key={menu.id}
              menu={menu}
              onOpen={() => navigate(`/chef/menus/${menu.id}`)}
              onUseForQuote={() =>
                navigate('/chef/pull/entry', { state: { menu_id: menu.id } })
              }
              onRename={(name) => handleRename(menu.id, name)}
              onDelete={() => handleDelete(menu.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
