// BrandPackagesPage — /brand/packages and /brand/packages/:id
//
// List: GET /api/v1/brand/packages, status chips, create form.
// Detail: GET /api/v1/brand/packages/:id, items list, Send action
//   (distributor picker from GET /brand/distributors directory).
//
// DESIGN-SWAP SEAM: visual frame replaced by Desi's packages screen.
// Data shape, status chip set, and send flow are final.

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  getBrandPackages,
  getBrandPackage,
  createBrandPackage,
  sendBrandPackage,
  getBrandDistributors,
  getBrandCatalog,
} from '../../services/api';
import type {
  BrandPackageSummary,
  BrandPackageDetail,
  BrandDistributorDirectory,
  BrandSampleProduct,
} from '../../services/api';

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

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#F3F4F6', color: '#374151' },
  sent:      { bg: '#EFF6FF', color: '#1D4ED8' },
  converted: { bg: '#F0FDF4', color: '#15803D' },
  dismissed: { bg: '#FEF2F2', color: '#B91C1C' },
};

function StatusChip({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#F3F4F6', color: '#374151' };
  return (
    <span
      style={{
        ...sans,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        padding: '3px 9px',
        borderRadius: 99,
        background: colors.bg,
        color: colors.color,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  ...sans,
  width: '100%',
  padding: '9px 12px',
  fontSize: 14,
  border: `1px solid ${C.softLine}`,
  borderRadius: 6,
  outline: 'none',
  color: C.ink,
  background: '#fff',
  boxSizing: 'border-box',
};

// ─── Package detail view ──────────────────────────────────────────────────────

function PackageDetailView({ id }: { id: string }) {
  const navigate = useNavigate();
  const [pkg, setPkg]             = useState<BrandPackageDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [directory, setDirectory] = useState<BrandDistributorDirectory[]>([]);
  const [selectedDist, setSelectedDist] = useState('');
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getBrandPackage(id), getBrandDistributors()]).then(
      ([pkgRes, distRes]) => {
        setPkg(pkgRes.data ?? null);
        setDirectory(distRes.data?.directory ?? []);
        setLoading(false);
      }
    );
  }, [id]);

  const handleSend = async () => {
    if (!selectedDist) return;
    setSendError(null);
    setSending(true);
    const res = await sendBrandPackage(id, selectedDist);
    setSending(false);
    if (res.error) { setSendError(res.error); return; }
    // Refresh
    const updated = await getBrandPackage(id);
    setPkg(updated.data ?? null);
  };

  if (loading) return <div style={{ ...sans, color: C.gray500, fontSize: 14 }}>Loading…</div>;
  if (!pkg) return <div style={{ ...sans, color: C.errorRed, fontSize: 14 }}>Package not found.</div>;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/brand/packages')}
        style={{
          ...sans,
          fontSize: 13,
          color: C.gray500,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginBottom: 20,
        }}
      >
        ← All packages
      </button>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ ...serif, fontSize: 22, fontWeight: 700, color: C.charcoal }}>
            {pkg.title}
          </div>
          <StatusChip status={pkg.status} />
        </div>
        {pkg.notes && (
          <div style={{ ...sans, fontSize: 13.5, color: C.gray700, marginTop: 8 }}>
            {pkg.notes}
          </div>
        )}
        {pkg.target_distributor && (
          <div style={{ ...sans, fontSize: 13, color: C.gray500, marginTop: 4 }}>
            Sent to: {pkg.target_distributor.name}
          </div>
        )}
      </div>

      {/* Items */}
      {pkg.items.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...eyebrow(), marginBottom: 10 }}>
            Items ({pkg.items.length})
          </div>
          <div
            style={{
              border: `1px solid ${C.softLine}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {pkg.items.map((item, i) => (
              <div
                key={item.id}
                style={{
                  padding: '10px 16px',
                  borderBottom:
                    i < pkg.items.length - 1 ? `1px solid ${C.softLine}` : 'none',
                }}
              >
                <div style={{ ...sans, fontSize: 13.5, fontWeight: 500, color: C.ink }}>
                  {item.product_name}
                </div>
                {item.note && (
                  <div style={{ ...sans, fontSize: 12, color: C.gray500, marginTop: 2 }}>
                    {item.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send section — only when draft or not yet sent */}
      {pkg.status === 'draft' && (
        <div
          style={{
            padding: '20px',
            background: C.warmPaper,
            borderRadius: 8,
            border: `1px solid ${C.softLine}`,
          }}
        >
          <div style={{ ...eyebrow(), marginBottom: 10 }}>Send to a distributor</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              value={selectedDist}
              onChange={(e) => setSelectedDist(e.target.value)}
              style={{ ...inputStyle, flex: '1 1 200px', cursor: 'pointer' }}
            >
              <option value="">Select distributor…</option>
              {directory.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.headquarters_city ? ` — ${d.headquarters_city}` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !selectedDist}
              style={{
                ...sans,
                padding: '9px 20px',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                background: sending || !selectedDist ? '#9CA3AF' : C.charcoal,
                border: 'none',
                borderRadius: 6,
                cursor: sending || !selectedDist ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'Sending…' : 'Send package'}
            </button>
          </div>
          {sendError && (
            <div style={{ ...sans, fontSize: 13, color: C.errorRed, marginTop: 10 }}>
              {sendError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Package list + create form ───────────────────────────────────────────────

function PackageListView() {
  const navigate                  = useNavigate();
  const [packages, setPackages]   = useState<BrandPackageSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<BrandSampleProduct[]>([]);
  const [title, setTitle]         = useState('');
  const [notes, setNotes]         = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [pkgRes, catRes] = await Promise.all([getBrandPackages(), getBrandCatalog()]);
    setPackages(pkgRes.data ?? []);
    setCatalogProducts(catRes.data?.catalog?.sample_products ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreateError(null);
    setCreating(true);
    const items = selectedProducts.map((pid) => ({ product_id: pid }));
    const res = await createBrandPackage({ title: title.trim(), notes: notes.trim() || undefined, items });
    setCreating(false);
    if (res.error) { setCreateError(res.error); return; }
    setTitle('');
    setNotes('');
    setSelectedProducts([]);
    setShowCreate(false);
    setLoading(true);
    await fetchAll();
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={eyebrow()}>Packages</div>
          <div style={{ ...serif, fontSize: 24, fontWeight: 700, color: C.charcoal }}>
            Your packages
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          style={{
            ...sans,
            padding: '9px 16px',
            fontSize: 13.5,
            fontWeight: 600,
            color: '#fff',
            background: C.charcoal,
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {showCreate ? 'Cancel' : '+ New package'}
        </button>
      </div>

      {loading ? (
        <div style={{ ...sans, color: C.gray500, fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          {/* Create form */}
          {showCreate && (
            <div
              style={{
                padding: '20px',
                background: C.warmPaper,
                borderRadius: 8,
                border: `1px solid ${C.softLine}`,
                marginBottom: 24,
              }}
            >
              <div style={{ ...eyebrow(), marginBottom: 14 }}>New package</div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ ...sans, fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.gray500, display: 'block', marginBottom: 5 }}>Title</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Package title"
                  disabled={creating}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ ...sans, fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.gray500, display: 'block', marginBottom: 5 }}>Notes (optional)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' } as React.CSSProperties}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={creating}
                />
              </div>

              {/* Product picker from catalog sample */}
              {catalogProducts.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ ...sans, fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: C.gray500, display: 'block', marginBottom: 8 }}>
                    Add products from catalog ({selectedProducts.length} selected)
                  </label>
                  <div
                    style={{
                      maxHeight: 220,
                      overflowY: 'auto',
                      border: `1px solid ${C.softLine}`,
                      borderRadius: 6,
                    }}
                  >
                    {catalogProducts.map((p, i) => {
                      const isSel = selectedProducts.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderBottom:
                              i < catalogProducts.length - 1
                                ? `1px solid ${C.softLine}`
                                : 'none',
                            cursor: 'pointer',
                            background: isSel ? C.warmPaper : '#fff',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleProduct(p.id)}
                            style={{ width: 14, height: 14, flexShrink: 0 }}
                          />
                          <div>
                            <div style={{ ...sans, fontSize: 13, color: C.ink }}>{p.product}</div>
                            {(p.brand || p.pack_size) && (
                              <div style={{ ...sans, fontSize: 11.5, color: C.gray500 }}>
                                {[p.brand, p.pack_size].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {createError && (
                <div style={{ ...sans, fontSize: 13, color: C.errorRed, marginBottom: 10 }}>
                  {createError}
                </div>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                style={{
                  ...sans,
                  padding: '9px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  background: creating || !title.trim() ? '#9CA3AF' : C.charcoal,
                  border: 'none',
                  borderRadius: 6,
                  cursor: creating || !title.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {creating ? 'Creating…' : 'Create package'}
              </button>
            </div>
          )}

          {/* Package list */}
          {packages.length === 0 ? (
            <div
              style={{
                ...sans,
                fontSize: 14,
                color: C.gray500,
                padding: '24px',
                background: C.warmPaper,
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              No packages yet. Create your first package above.
            </div>
          ) : (
            <div
              style={{
                border: `1px solid ${C.softLine}`,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {packages.map((pkg, i) => (
                <div
                  key={pkg.id}
                  onClick={() => navigate(`/brand/packages/${pkg.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom:
                      i < packages.length - 1 ? `1px solid ${C.softLine}` : 'none',
                    cursor: 'pointer',
                    background: '#fff',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ ...sans, fontSize: 14, fontWeight: 600, color: C.ink }}>
                      {pkg.title}
                    </div>
                    <div style={{ ...sans, fontSize: 12, color: C.gray500, marginTop: 2 }}>
                      {pkg.items_count} item{pkg.items_count !== 1 ? 's' : ''}
                      {pkg.target_distributor && ` · ${pkg.target_distributor.name}`}
                    </div>
                  </div>
                  <StatusChip status={pkg.status} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Router: list vs detail ───────────────────────────────────────────────────

export function BrandPackagesPage() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <PackageDetailView id={id} />;
  return <PackageListView />;
}
