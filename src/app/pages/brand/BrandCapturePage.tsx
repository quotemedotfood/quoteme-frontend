// BrandCapturePage — /brand/capture
//
// Reskinned per handoff/desi-brand-suite-060626/src/screens-brand.jsx
// (BrandCaptureBody). Desi's paste/upload/photo tabs + match results UI.
//
// V1 backend: paste a menu_id → POST /brand/matches. The "paste" tab
// supports a menu_id input (functional). Upload/photo tabs show the Desi
// affordance visually but are marked as "coming soon" since the capture
// backend is not wired yet — faithful to the README "demo stub" note.
//
// All existing getBrandMatches / createBrandPackage wiring preserved.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getBrandMatches, createBrandPackage } from '../../services/api';
import type { BrandMatchComponent, BrandMatchProduct } from '../../services/api';
import { NpIcon } from '../../components/newspaper/NewspaperShell';

type SelectedMap = Record<string, string>; // dish_component_id → product_id

export function BrandCapturePage() {
  const navigate = useNavigate();

  const [tab, setTab]             = useState<'paste' | 'upload' | 'photo'>('paste');
  const [menuId, setMenuId]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [components, setComponents] = useState<BrandMatchComponent[]>([]);
  const [matched, setMatched]     = useState(0);
  const [total, setTotal]         = useState(0);
  const [selected, setSelected]   = useState<SelectedMap>({});
  const [pkgTitle, setPkgTitle]   = useState('');
  const [creating, setCreating]   = useState(false);

  const TABS: { id: 'paste' | 'upload' | 'photo'; label: string }[] = [
    { id: 'paste',  label: 'Paste' },
    { id: 'upload', label: 'Upload' },
    { id: 'photo',  label: 'Photo' },
  ];

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuId.trim()) return;
    setError(null);
    setComponents([]);
    setSelected({});
    setLoading(true);
    const res = await getBrandMatches(menuId.trim());
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setComponents(res.data?.components ?? []);
    setMatched(res.data?.matched_count ?? 0);
    setTotal(res.data?.total_count ?? 0);
  };

  const toggleProduct = (componentId: string, productId: string) => {
    setSelected((prev) => {
      if (prev[componentId] === productId) {
        const next = { ...prev }; delete next[componentId]; return next;
      }
      return { ...prev, [componentId]: productId };
    });
  };

  const selectedCount = Object.keys(selected).length;

  const handleCreatePackage = async () => {
    if (!pkgTitle.trim() || selectedCount === 0) return;
    setCreating(true);
    const items = Object.entries(selected).map(([dish_component_id, product_id]) => ({ product_id, dish_component_id }));
    const res = await createBrandPackage({ title: pkgTitle.trim(), items });
    setCreating(false);
    if (res.error) { setError(res.error); return; }
    navigate('/brand/packages');
  };

  // ── Results view (after match) ──────────────────────────────────────────────
  if (components.length > 0) {
    return (
      <div>
        <button
          onClick={() => { setComponents([]); setSelected({}); }}
          className="text-[12px] ink-soft inline-flex items-center gap-1 mb-3"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 'unset' }}
        >
          <NpIcon name="arrow-left" size={14} /> Capture
        </button>

        <div className="qm-eyebrow" style={{ fontSize: 11 }}>MATCHED AGAINST YOUR CATALOG</div>
        <h1 className="serif font-semibold ink mt-2" style={{ fontSize: 30, lineHeight: 1.14 }}>
          {matched} of your products fit this menu.
        </h1>
        <p className="ink-soft mt-2 leading-relaxed" style={{ fontSize: 14, maxWidth: 460 }}>
          We matched <span className="num">{total}</span> menu components against{' '}
          <b className="ink">your catalog only</b>. Add the matches to a package and send to a distributor.
        </p>

        <div className="mt-5" style={{ maxWidth: 520 }}>
          <div className="qm-eyebrow" style={{ fontSize: 10 }}>MATCHED COMPONENTS</div>
          <div className="mt-2 doc-divider-thick" />

          {components.map((comp, ci) => (
            <div key={comp.dish_component_id} className="doc-divider py-3">
              <div className="text-[13px] ink font-medium leading-snug">{comp.name}</div>
              <div className="text-[11px] ink-faint leading-snug mb-2">from {comp.dish_name}</div>

              {comp.matches.length === 0 ? (
                <div className="text-[12px] ink-faint italic">No catalog match for this component.</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {comp.matches.map((m: BrandMatchProduct) => {
                    const isSel = selected[comp.dish_component_id] === m.product_id;
                    return (
                      <label
                        key={m.product_id}
                        className="flex items-center gap-3 rounded-md"
                        style={{
                          padding: '8px 10px',
                          border: `1px solid ${isSel ? 'var(--qm-charcoal)' : 'var(--qm-soft-line)'}`,
                          background: isSel ? 'var(--qm-warm-paper)' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <NpIcon name={isSel ? 'check-square' : 'square'} size={16} color={isSel ? 'var(--qm-charcoal)' : 'var(--qm-gray-400)'} />
                        <div className="min-w-0">
                          <div className="text-[13px] ink leading-snug">{m.product_name}</div>
                          <div className="text-[11px] ink-faint num leading-snug">
                            {[m.brand, m.pack_size, m.item_number].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleProduct(comp.dish_component_id, m.product_id)}
                          style={{ display: 'none' }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {selectedCount > 0 && (
            <div className="mt-4 px-4 py-4 rounded-md" style={{ background: 'var(--qm-warm-paper)', border: '1px solid var(--qm-soft-line)' }}>
              <div className="qm-eyebrow mb-3" style={{ fontSize: 10 }}>
                CREATE PACKAGE — {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2">
                <input
                  className="qm-input"
                  style={{ flex: 1, minHeight: 'unset', fontSize: 14, padding: '9px 12px' }}
                  type="text"
                  placeholder="Package title"
                  value={pkgTitle}
                  onChange={(e) => setPkgTitle(e.target.value)}
                  disabled={creating}
                />
                <button
                  type="button"
                  onClick={handleCreatePackage}
                  disabled={creating || !pkgTitle.trim()}
                  className="qm-btn qm-btn-orange"
                  style={{ fontSize: 13, padding: '9px 16px', opacity: (creating || !pkgTitle.trim()) ? 0.5 : 1, cursor: (creating || !pkgTitle.trim()) ? 'not-allowed' : 'pointer' }}
                >
                  <NpIcon name="package" size={15} color="#fff" />
                  {creating ? 'Creating…' : 'Create package'}
                </button>
              </div>
              {error && <div className="mt-2 text-[12.5px]" style={{ color: '#B91C1C' }}>{error}</div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Input view ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="qm-eyebrow" style={{ fontSize: 11 }}>CAPTURE</div>
      <h1 className="serif font-semibold ink mt-2" style={{ fontSize: 30, lineHeight: 1.14 }}>
        What menu are you working from?
      </h1>
      <p className="ink-soft mt-2 leading-relaxed" style={{ fontSize: 14, maxWidth: 460 }}>
        Paste or drop a menu. We'll match it against your catalog to find which of your products fit —{' '}
        <b className="ink">only your line, nothing else</b>.
      </p>

      <div className="mt-5" style={{ maxWidth: 520 }}>
        {/* Tabs */}
        <div className="inline-flex p-1 rounded-full" style={{ background: 'var(--qm-gray-100)' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3.5 py-1.5 rounded-full"
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                background: tab === t.id ? '#fff' : 'transparent',
                color: tab === t.id ? 'var(--qm-charcoal)' : 'var(--qm-gray-500)',
                boxShadow: tab === t.id ? 'var(--qm-shadow-sm)' : 'none',
                border: 'none',
                cursor: 'pointer',
                minHeight: 'unset',
                transition: 'background 0.12s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'paste' ? (
          <form onSubmit={handleMatch}>
            <textarea
              className="qm-textarea mt-3"
              style={{ minHeight: 120, fontSize: 14 }}
              placeholder="Paste the menu here — dishes, a spec sheet, an email… or enter a menu ID to match against your catalog."
              value={menuId}
              onChange={(e) => setMenuId(e.target.value)}
              disabled={loading}
            />
            {error && <div className="mt-2 text-[12.5px]" style={{ color: '#B91C1C' }}>{error}</div>}
            <button
              type="submit"
              disabled={loading || !menuId.trim()}
              className="qm-btn qm-btn-orange qm-btn-full mt-4"
              style={{ padding: '13px 18px', fontSize: 15, opacity: (loading || !menuId.trim()) ? 0.5 : 1, cursor: (loading || !menuId.trim()) ? 'not-allowed' : 'pointer' }}
            >
              <NpIcon name="search" size={16} color="#fff" />
              {loading ? 'Matching…' : 'Match against my catalog'}
            </button>
          </form>
        ) : (
          <div
            className="mt-3 rounded-lg text-center"
            style={{ border: '1.5px dashed var(--qm-gray-200)', padding: '30px 22px', background: 'var(--qm-warm-paper)' }}
          >
            <NpIcon name={tab === 'photo' ? 'camera' : 'upload'} size={20} color="var(--qm-gray-400)" />
            <div className="mt-2 text-[13px] ink leading-snug">
              {tab === 'photo' ? 'Take a photo of the menu' : 'Drop a PDF, doc, or image'}
            </div>
            <div className="text-[11.5px] ink-faint mt-1">Coming soon — paste a menu in the meantime.</div>
          </div>
        )}
      </div>
    </div>
  );
}
