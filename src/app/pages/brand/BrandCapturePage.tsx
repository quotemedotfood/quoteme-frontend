// BrandCapturePage — /brand/capture
//
// V1 capture: paste a menu_id → POST /brand/matches → per-component match
// list → select products → "Create package" with selected product_ids.
//
// Label clearly as v1; menu upload capture comes with Desi designs.
//
// DESIGN-SWAP SEAM: this page's upload + visual layer replaced by Desi's
// capture frame when menu-upload capture ships. The match results table,
// selection state, and package handoff shape are final.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getBrandMatches, createBrandPackage } from '../../services/api';
import type { BrandMatchComponent, BrandMatchProduct } from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray500: '#6B7280',
  gray700: '#4F4F4F',
  ink: '#1A1A1A',
  errorRed: '#B91C1C',
} as const;

const sans: React.CSSProperties = {
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const serif: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

function eyebrow(): React.CSSProperties {
  return {
    ...sans,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: C.gray500,
    marginBottom: 6,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SelectedMap = Record<string, string>; // dish_component_id → product_id

export function BrandCapturePage() {
  const navigate = useNavigate();

  const [menuId, setMenuId]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [components, setComponents] = useState<BrandMatchComponent[]>([]);
  const [matched, setMatched]       = useState(0);
  const [total, setTotal]           = useState(0);
  const [selected, setSelected]     = useState<SelectedMap>({});
  const [pkgTitle, setPkgTitle]     = useState('');
  const [creating, setCreating]     = useState(false);

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuId.trim()) return;
    setError(null);
    setComponents([]);
    setSelected({});
    setLoading(true);
    const res = await getBrandMatches(menuId.trim());
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setComponents(res.data?.components ?? []);
    setMatched(res.data?.matched_count ?? 0);
    setTotal(res.data?.total_count ?? 0);
  };

  const toggleProduct = (componentId: string, productId: string) => {
    setSelected((prev) => {
      if (prev[componentId] === productId) {
        const next = { ...prev };
        delete next[componentId];
        return next;
      }
      return { ...prev, [componentId]: productId };
    });
  };

  const selectedCount = Object.keys(selected).length;

  const handleCreatePackage = async () => {
    if (!pkgTitle.trim() || selectedCount === 0) return;
    setCreating(true);
    const items = Object.entries(selected).map(([dish_component_id, product_id]) => ({
      product_id,
      dish_component_id,
    }));
    const res = await createBrandPackage({ title: pkgTitle.trim(), items });
    setCreating(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate('/brand/packages');
  };

  const inputStyle: React.CSSProperties = {
    ...sans,
    padding: '10px 12px',
    fontSize: 14,
    border: `1px solid ${C.softLine}`,
    borderRadius: 6,
    outline: 'none',
    color: C.ink,
    background: '#fff',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={eyebrow()}>Capture (v1)</div>
        <div style={{ ...serif, fontSize: 24, fontWeight: 700, color: C.charcoal }}>
          Match a menu
        </div>
        <div style={{ ...sans, fontSize: 13, color: C.gray500, marginTop: 6 }}>
          Paste a menu ID to find your products in it. Menu-upload capture arrives with Desi's designs.
        </div>
      </div>

      {/* Menu ID form */}
      <form onSubmit={handleMatch} style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          type="text"
          placeholder="Menu ID (e.g. abc123)"
          value={menuId}
          onChange={(e) => setMenuId(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !menuId.trim()}
          style={{
            ...sans,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            background: loading ? '#9CA3AF' : C.charcoal,
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Matching…' : 'Match'}
        </button>
      </form>

      {error && (
        <div
          style={{
            ...sans,
            fontSize: 13,
            color: C.errorRed,
            marginBottom: 20,
            padding: '10px 12px',
            background: '#FEF2F2',
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}

      {/* Results */}
      {components.length > 0 && (
        <div>
          <div style={{ ...sans, fontSize: 13.5, color: C.gray700, marginBottom: 16 }}>
            Matched{' '}
            <strong style={{ color: C.ink }}>{matched}</strong> of{' '}
            <strong style={{ color: C.ink }}>{total}</strong> menu components.
            Select your products below.
          </div>

          <div
            style={{
              border: `1px solid ${C.softLine}`,
              borderRadius: 8,
              overflow: 'hidden',
              marginBottom: 24,
            }}
          >
            {components.map((comp, ci) => (
              <div
                key={comp.dish_component_id}
                style={{
                  borderBottom:
                    ci < components.length - 1 ? `1px solid ${C.softLine}` : 'none',
                  padding: '14px 16px',
                }}
              >
                {/* Component header */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ ...sans, fontSize: 13.5, fontWeight: 600, color: C.ink }}>
                    {comp.name}
                  </div>
                  <div style={{ ...sans, fontSize: 12, color: C.gray500 }}>
                    from {comp.dish_name}
                  </div>
                </div>

                {/* Match options */}
                {comp.matches.length === 0 ? (
                  <div style={{ ...sans, fontSize: 12.5, color: C.gray500, fontStyle: 'italic' }}>
                    No matches in your catalog for this component.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {comp.matches.map((m: BrandMatchProduct) => {
                      const isSelected = selected[comp.dish_component_id] === m.product_id;
                      return (
                        <label
                          key={m.product_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            borderRadius: 6,
                            border: `1px solid ${isSelected ? C.charcoal : C.softLine}`,
                            background: isSelected ? C.warmPaper : '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProduct(comp.dish_component_id, m.product_id)}
                            style={{ width: 15, height: 15, flexShrink: 0 }}
                          />
                          <div>
                            <div style={{ ...sans, fontSize: 13.5, color: C.ink, fontWeight: 500 }}>
                              {m.product_name}
                            </div>
                            <div style={{ ...sans, fontSize: 12, color: C.gray500 }}>
                              {[m.brand, m.pack_size, m.item_number].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create package */}
          {selectedCount > 0 && (
            <div
              style={{
                padding: '20px',
                background: C.warmPaper,
                borderRadius: 8,
                border: `1px solid ${C.softLine}`,
              }}
            >
              <div style={{ ...eyebrow(), marginBottom: 10 }}>
                Create package ({selectedCount} product{selectedCount !== 1 ? 's' : ''} selected)
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
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
                  style={{
                    ...sans,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#fff',
                    background: creating ? '#9CA3AF' : C.charcoal,
                    border: 'none',
                    borderRadius: 6,
                    cursor: creating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creating ? 'Creating…' : 'Create package'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
