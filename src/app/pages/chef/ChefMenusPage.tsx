// ChefMenusPage — /chef/menus
//
// "Menus and Order Guides" — two sections on one surface:
//
//   1. Menus — reverse-chronological list of the chef's saved menus.
//      Each row carries a small source badge derived from source_type:
//        public_scrape → "Scraped"
//        chef_upload   → "Uploaded"
//        rep_upload    → "From your rep"
//        direct_import → "Imported"
//        OCR_photo     → "Photo"
//        pasted_text | paste → "Pasted"
//      Existing affordances preserved: name, item_count, last_quoted,
//      quote_count, "Use for a quote" CTA, kebab (Rename / Delete), Draft pill.
//
//   2. Order Guides — flat list from GET /api/v1/chef/order_guides.
//      Columns: distributor name, status pill, item count, date.
//      PDF and Excel download links.
//      Empty state: "No order guides yet."
//
// No new routes — both live at /chef/menus (ChefMenusPage).
// BE 404s on either endpoint render graceful empty states.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import {
  getChefMenus,
  getChefOrderGuides,
  renameChefMenu,
  deleteChefMenu,
  downloadChefOrderGuidePdf,
  downloadChefOrderGuideExcel,
  type ChefMenuRow,
  type ChefOrderGuideRow,
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

/** Map BE source_type to a short human label. */
function sourceLabel(sourceType: string | null | undefined): string | null {
  if (!sourceType) return null;
  switch (sourceType) {
    case 'public_scrape':  return 'Scraped';
    case 'chef_upload':    return 'Uploaded';
    case 'rep_upload':     return 'From your rep';
    case 'direct_import':  return 'Imported';
    case 'OCR_photo':      return 'Photo';
    case 'pasted_text':
    case 'paste':          return 'Pasted';
    default:               return null;
  }
}

/** Map OG status to a pill style. */
function statusPillStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    ...sans,
    fontSize: 10.5,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 999,
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  };
  switch (status) {
    case 'finalized':
    case 'accepted':
      return { ...base, color: '#065F46', background: '#D1FAE5' };
    case 'draft':
      return { ...base, color: '#92400E', background: '#FEF3C7' };
    case 'sent':
    case 'submitted':
      return { ...base, color: '#1E3A5F', background: '#DBEAFE' };
    default:
      return { ...base, color: C.gray700, background: '#F3F4F6' };
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'finalized': return 'Finalized';
    case 'accepted':  return 'Accepted';
    case 'draft':     return 'Draft';
    case 'sent':      return 'Sent';
    case 'submitted': return 'Submitted';
    default:          return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
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

function MenusEmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="py-14 text-center max-w-sm mx-auto">
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

function ErrorInline({ message }: { message: string }) {
  return (
    <div className="py-10 text-center">
      <p style={{ ...sans, fontSize: 13.5, color: C.gray700 }}>
        {message || "Couldn't load right now."}
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

function SourceBadge({ sourceType }: { sourceType: string | null | undefined }) {
  const label = sourceLabel(sourceType);
  if (!label) return null;
  return (
    <span
      style={{
        ...sans,
        fontSize: 10,
        fontWeight: 500,
        color: '#374151',
        background: '#F3F4F6',
        border: '1px solid #E5E7EB',
        padding: '2px 7px',
        borderRadius: 999,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

// ─── Portal positioning helper (exported for testing) ─────────────────────────

/** Menu dropdown dimensions (approximate, used for flip calculation). */
const KEBAB_MENU_HEIGHT = 90; // px — two rows × ~45px each
const KEBAB_MENU_WIDTH = 140; // px — matches minWidth below

/**
 * Compute fixed `{ top, left }` coordinates for the kebab dropdown portal,
 * positioning it below the trigger button (or flipping above if near the
 * viewport bottom).
 *
 * @param rect  - DOMRect of the trigger button
 * @param vpH   - viewport height (window.innerHeight)
 * @param vpW   - viewport width (window.innerWidth)
 */
export function computeKebabPosition(
  rect: { top: number; bottom: number; left: number; right: number; width: number; height: number },
  vpH: number,
  vpW: number,
): { top: number; left: number } {
  const GAP = 4;
  // Default: place below the button
  let top = rect.bottom + GAP;
  // Flip above if it would overflow the bottom of the viewport
  if (top + KEBAB_MENU_HEIGHT > vpH) {
    top = rect.top - KEBAB_MENU_HEIGHT - GAP;
  }
  // Left-align with the button; clamp so it doesn't overflow the right edge
  let left = rect.left;
  if (left + KEBAB_MENU_WIDTH > vpW) {
    left = vpW - KEBAB_MENU_WIDTH - 8;
  }
  return { top, left };
}

// Kebab menu — rendered via createPortal to document.body so it is never
// clipped by an overflow:auto ancestor (e.g. a mobile scroll container).
function KebabMenu({
  position,
  onRename,
  onDelete,
  onClose,
}: {
  position: { top: number; left: number };
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const menu = (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        marginTop: 0,
        background: '#fff',
        border: `1px solid ${C.softLine}`,
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
        zIndex: 9999,
        minWidth: KEBAB_MENU_WIDTH,
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

  return createPortal(menu, document.body);
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
  const [kebabPosition, setKebabPosition] = useState<{ top: number; left: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const kebabRef = useRef<HTMLButtonElement>(null);
  const isDraft = menu.quote_count === 0;
  const menuDisplayName = displayMenuName(menu.name);

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
              flexWrap: 'wrap',
              gap: 6,
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
              {menuDisplayName}
            </span>
            {isDraft && <DraftPill />}
            <SourceBadge sourceType={menu.source_type} />
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
          {menu.quote_count === 0
            ? ' · never quoted'
            : menu.last_quoted_at
              ? ` · last quoted ${formatDate(menu.last_quoted_at)}`
              : ` · ${menu.quote_count} ${menu.quote_count === 1 ? 'quote' : 'quotes'}`}
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
      <div style={{ flexShrink: 0 }}>
        <button
          ref={kebabRef}
          type="button"
          aria-label="Menu options"
          onClick={() => {
            if (kebabOpen) {
              setKebabOpen(false);
              setKebabPosition(null);
            } else {
              const rect = kebabRef.current?.getBoundingClientRect();
              if (rect) {
                setKebabPosition(
                  computeKebabPosition(rect, window.innerHeight, window.innerWidth)
                );
              }
              setKebabOpen(true);
            }
          }}
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
        {kebabOpen && kebabPosition && (
          <KebabMenu
            position={kebabPosition}
            onRename={() => setRenaming(true)}
            onDelete={onDelete}
            onClose={() => { setKebabOpen(false); setKebabPosition(null); }}
          />
        )}
      </div>
    </div>
  );
}

/** Display name for a menu, masking the legacy "Guest Quote" default. */
function displayMenuName(name: string): string {
  return name === 'Guest Quote' ? 'Untitled Menu' : name;
}

// Single order guide row
function OrderGuideRow({ og }: { og: ChefOrderGuideRow }) {
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);

  async function handleDownloadPdf() {
    setDownloading('pdf');
    const res = await downloadChefOrderGuidePdf(og.id);
    if (res.blob) {
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-guide-${og.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloading(null);
  }

  async function handleDownloadExcel() {
    setDownloading('excel');
    const res = await downloadChefOrderGuideExcel(og.id);
    if (res.blob) {
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-guide-${og.id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloading(null);
  }

  return (
    <div
      style={{
        borderBottom: `1px solid ${C.softLine}`,
        padding: '13px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Distributor name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...sans,
            fontSize: 14,
            fontWeight: 500,
            color: C.charcoal,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {og.distributor_name ?? 'Unknown distributor'}
          </span>
          <span style={statusPillStyle(og.status)}>{statusLabel(og.status)}</span>
          {/* Date in title row so identical distributor+status rows are distinguishable */}
          <span style={{ ...sans, fontSize: 12, fontWeight: 400, color: C.gray500, whiteSpace: 'nowrap' }}>
            {formatDate(og.created_at)}
          </span>
        </div>
        <div style={{ ...sans, fontSize: 11.5, color: C.gray500, marginTop: 3 }}>
          {og.items_count} {og.items_count === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* Download links */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading !== null}
          style={{
            ...sans,
            fontSize: 12,
            fontWeight: 600,
            color: C.charcoal,
            border: `1px solid ${C.softLine}`,
            borderRadius: 6,
            padding: '6px 11px',
            whiteSpace: 'nowrap',
            background: '#fff',
            cursor: downloading !== null ? 'default' : 'pointer',
          }}
        >
          {downloading === 'pdf' ? 'PDF…' : 'PDF'}
        </button>
        <button
          onClick={handleDownloadExcel}
          disabled={downloading !== null}
          style={{
            ...sans,
            fontSize: 12,
            fontWeight: 600,
            color: C.charcoal,
            border: `1px solid ${C.softLine}`,
            borderRadius: 6,
            padding: '6px 11px',
            whiteSpace: 'nowrap',
            background: '#fff',
            cursor: downloading !== null ? 'default' : 'pointer',
          }}
        >
          {downloading === 'excel' ? 'Excel…' : 'Excel'}
        </button>
      </div>
    </div>
  );
}

// Section header with count badge
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        borderBottom: `1px solid ${C.softLine}`,
        paddingBottom: 10,
        marginBottom: 0,
      }}
    >
      <h2
        style={{
          ...serif,
          fontSize: 19,
          fontWeight: 600,
          color: C.charcoal,
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      {typeof count === 'number' && count > 0 && (
        <span
          style={{
            ...sans,
            fontSize: 11,
            fontWeight: 500,
            color: C.gray500,
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            borderRadius: 999,
            padding: '1px 8px',
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ChefMenusPage() {
  const navigate = useNavigate();

  // Menus state
  const [menusLoad, setMenusLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [menus, setMenus] = useState<ChefMenuRow[]>([]);
  const [menusError, setMenusError] = useState('');

  // Order Guides state
  const [ogsLoad, setOgsLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ogs, setOgs] = useState<ChefOrderGuideRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Fetch menus
    (async () => {
      const res = await getChefMenus();
      if (cancelled) return;
      if (res.data) {
        setMenus(res.data.menus);
        setMenusLoad('ready');
      } else {
        // BE not yet live — treat 404 as empty rather than error
        setMenus([]);
        setMenusLoad('ready');
        if (res.error && !res.error.includes('404') && !res.error.includes('HTTP 404')) {
          setMenusError(res.error);
          setMenusLoad('error');
        }
      }
    })();

    // Fetch order guides
    (async () => {
      const res = await getChefOrderGuides();
      if (cancelled) return;
      if (res.data) {
        setOgs(res.data);
        setOgsLoad('ready');
      } else {
        setOgs([]);
        setOgsLoad('ready');
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
          marginBottom: 28,
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
          Menus and Order Guides
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
          Every menu you've built or quoted from, and the order guides generated from them.
        </p>
      </div>

      {/* ── Menus section ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 40 }}>
        <SectionHeader
          title="Menus"
          count={menusLoad === 'ready' ? menus.length : undefined}
        />

        {menusLoad === 'loading' && <Spinner />}
        {menusLoad === 'error' && <ErrorInline message={menusError} />}
        {menusLoad === 'ready' && menus.length === 0 && (
          <MenusEmptyState onNew={() => navigate('/chef/entry')} />
        )}
        {menusLoad === 'ready' && menus.length > 0 && (
          <div>
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

      {/* ── Order Guides section ───────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Order Guides"
          count={ogsLoad === 'ready' ? ogs.length : undefined}
        />

        {ogsLoad === 'loading' && <Spinner />}
        {ogsLoad === 'ready' && ogs.length === 0 && (
          <div className="py-12 text-center">
            <p style={{ ...sans, fontSize: 13.5, color: C.gray500, lineHeight: 1.5 }}>
              No order guides yet.
            </p>
          </div>
        )}
        {ogsLoad === 'ready' && ogs.length > 0 && (
          <div>
            {ogs.map((og) => (
              <OrderGuideRow key={og.id} og={og} />
            ))}
          </div>
        )}
        {ogsLoad === 'error' && (
          <div className="py-10 text-center">
            <p style={{ ...sans, fontSize: 13.5, color: C.gray500 }}>
              Couldn't load order guides right now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
