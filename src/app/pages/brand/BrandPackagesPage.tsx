// BrandPackagesPage — /brand/packages and /brand/packages/:id
//
// Reskinned per handoff/desi-brand-suite-060626/src/screens-brand.jsx
// (BrandPackagesBody + BrandPackageBuilderBody). All API wiring
// (getBrandPackages, getBrandPackage, createBrandPackage, sendBrandPackage,
// getBrandDistributors, getBrandCatalog) and state shapes preserved.
//
// Doctrine: ONE distributor per package. No prices. No gradient colors.

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
import { NpIcon } from '../../components/newspaper/NewspaperShell';

// ─── NotifyStatusBadge for packages ──────────────────────────────────────────

function PkgStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; dot: string; border?: string }> = {
    draft:     { bg: '#fff',    fg: 'var(--qm-gray-500)', dot: 'var(--qm-gray-400)', border: '1px solid var(--qm-soft-line)' },
    sent:      { bg: '#FFF9F3', fg: 'var(--qm-gray-700)', dot: 'var(--qm-warning)',   border: '1px solid var(--qm-soft-line)' },
    converted: { bg: 'rgba(127,174,194,.22)', fg: '#2A5F6F', dot: 'var(--accent)' },
    dismissed: { bg: '#FEF2F2', fg: '#B91C1C', dot: '#DC2626' },
  };
  const m = map[status] ?? map.sent;
  return (
    <span className="qm-pill" style={{ background: m.bg, color: m.fg, border: m.border ?? 'none', fontSize: 10, padding: '2px 8px', gap: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: m.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
}

// ─── Package detail view ──────────────────────────────────────────────────────

function PackageDetailView({ id }: { id: string }) {
  const navigate = useNavigate();
  const [pkg, setPkg]             = useState<BrandPackageDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [directory, setDirectory] = useState<BrandDistributorDirectory[]>([]);
  const [selectedDist, setSelectedDist] = useState('');
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent]           = useState(false);

  useEffect(() => {
    Promise.all([getBrandPackage(id), getBrandDistributors()]).then(([pkgRes, distRes]) => {
      setPkg(pkgRes.data ?? null);
      setDirectory(distRes.data?.directory ?? []);
      setLoading(false);
    });
  }, [id]);

  const handleSend = async () => {
    if (!selectedDist) return;
    setSendError(null);
    setSending(true);
    const res = await sendBrandPackage(id, selectedDist);
    setSending(false);
    if (res.error) { setSendError(res.error); return; }
    const updated = await getBrandPackage(id);
    setPkg(updated.data ?? null);
    setSent(true);
  };

  if (loading) return <div className="text-[14px] ink-faint mt-8" style={{ fontFamily: 'var(--qm-sans)' }}>Loading…</div>;
  if (!pkg)    return <div className="text-[14px] mt-8" style={{ color: '#B91C1C', fontFamily: 'var(--qm-sans)' }}>Package not found.</div>;

  const selectedDistName = directory.find((d) => d.id === selectedDist)?.name ?? null;

  // ── Sent confirmation ──────────────────────────────────────────────────────
  if (sent) {
    return (
      <div>
        <div className="inline-flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: 'rgba(127,174,194,.18)' }}>
          <NpIcon name="check" size={22} color="var(--qm-ack-navy)" />
        </div>
        <h1 className="serif font-medium ink mt-4" style={{ fontSize: 26, lineHeight: 1.2 }}>
          Package sent to {selectedDistName ?? 'the distributor'}.
        </h1>
        <p className="ink-soft mt-2 leading-relaxed" style={{ fontSize: 14, maxWidth: 440 }}>
          {pkg.items.length} product{pkg.items.length !== 1 ? 's' : ''} are on their way.
          Watch it move from Sent → Opened → Loaded → In their catalog under Notifications.
        </p>
        <div className="mt-5 flex gap-2">
          <button onClick={() => navigate('/brand/notifications')} className="qm-btn qm-btn-outline" style={{ fontSize: 13 }}>Track in Notifications</button>
          <button onClick={() => navigate('/brand/packages')} className="qm-btn qm-btn-text" style={{ fontSize: 13 }}>All packages</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/brand/packages')}
        className="text-[12px] ink-soft inline-flex items-center gap-1 mb-3"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 'unset' }}
      >
        <NpIcon name="arrow-left" size={14} /> Packages
      </button>

      <div className="flex items-start gap-3">
        <h1 className="serif font-semibold ink" style={{ fontSize: 26, lineHeight: 1.14 }}>{pkg.title}</h1>
        <PkgStatusBadge status={pkg.status} />
      </div>
      {pkg.notes && <div className="text-[13.5px] ink-soft mt-2">{pkg.notes}</div>}
      {pkg.target_distributor && (
        <div className="text-[12px] ink-faint mt-1">Sent to: {pkg.target_distributor.name}</div>
      )}

      {/* Items */}
      {pkg.items.length > 0 && (
        <div className="mt-6">
          <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
            <span>ITEMS</span>
            <span className="ink-faint" style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}>{pkg.items.length}</span>
          </div>
          <div className="mt-2 doc-divider-thick" />
          {pkg.items.map((item, i) => (
            <div key={item.id} className="doc-divider py-2.5">
              <div className="text-[13px] ink leading-snug">{item.product_name}</div>
              {item.note && <div className="text-[11px] ink-faint leading-snug">{item.note}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Send section — only when draft */}
      {pkg.status === 'draft' && (
        <div className="mt-6 px-4 py-4 rounded-md" style={{ background: 'var(--qm-warm-paper)', border: '1px solid var(--qm-soft-line)' }}>
          <div className="qm-eyebrow mb-3" style={{ fontSize: 10 }}>SEND TO ONE DISTRIBUTOR</div>
          <div className="mt-2 doc-divider-thick mb-3" />

          {directory.map((d) => {
            const on = selectedDist === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDist(d.id)}
                className="w-full text-left doc-divider py-2.5 flex items-center gap-3"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 'unset' }}
              >
                <span className="inline-flex items-center justify-center rounded-full shrink-0" style={{ width: 18, height: 18, border: `1.5px solid ${on ? 'var(--qm-charcoal)' : 'var(--qm-gray-400)'}` }}>
                  {on && <span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--qm-charcoal)', display: 'inline-block' }} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] ink leading-snug">{d.name}</div>
                  {d.headquarters_city && <div className="text-[11px] ink-faint leading-snug">{d.headquarters_city}</div>}
                </div>
              </button>
            );
          })}

          {sendError && <div className="mt-2 text-[12.5px]" style={{ color: '#B91C1C' }}>{sendError}</div>}

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !selectedDist}
            className="qm-btn qm-btn-orange qm-btn-full mt-4"
            style={{ padding: '13px 18px', fontSize: 15, opacity: (sending || !selectedDist) ? 0.5 : 1, cursor: (sending || !selectedDist) ? 'not-allowed' : 'pointer' }}
          >
            <NpIcon name="send" size={16} color="#fff" />
            {sending ? 'Sending…' : `Notify ${selectedDistName ?? 'a distributor'}`}
          </button>
          <div className="mt-2 text-[11px] ink-faint">One distributor per package, each stays its own thread.</div>
        </div>
      )}
    </div>
  );
}

// ─── Package list + create form ───────────────────────────────────────────────

function PackageListView() {
  const navigate = useNavigate();
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
    setSelectedProducts((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
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
    <>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="serif font-semibold ink" style={{ fontSize: 32, lineHeight: 1.15 }}>Packages</h1>
          <p className="mt-1 ink-faint" style={{ fontSize: 13.5 }}>A set of your products, sent to one distributor.</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="qm-btn qm-btn-orange shrink-0"
          style={{ padding: '10px 15px', fontSize: 13 }}
        >
          <NpIcon name="plus" size={15} color="#fff" />
          {showCreate ? 'Cancel' : 'New package'}
        </button>
      </div>

      {loading ? (
        <div className="mt-8 text-[14px] ink-faint" style={{ fontFamily: 'var(--qm-sans)' }}>Loading…</div>
      ) : (
        <>
          {/* Create form */}
          {showCreate && (
            <div className="mt-5 px-4 py-4 rounded-md" style={{ background: 'var(--qm-warm-paper)', border: '1px solid var(--qm-soft-line)' }}>
              <div className="qm-eyebrow mb-3" style={{ fontSize: 10 }}>NEW PACKAGE</div>

              <div className="mb-3">
                <label className="qm-eyebrow block mb-1" style={{ fontSize: 9 }}>TITLE</label>
                <input
                  className="qm-input"
                  style={{ fontSize: 14, padding: '8px 10px', minHeight: 'unset' }}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Package title"
                  disabled={creating}
                />
              </div>

              <div className="mb-3">
                <label className="qm-eyebrow block mb-1" style={{ fontSize: 9 }}>NOTES (OPTIONAL)</label>
                <textarea
                  className="qm-textarea"
                  style={{ minHeight: 60, fontSize: 14, padding: '8px 10px' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={creating}
                />
              </div>

              {catalogProducts.length > 0 && (
                <div className="mb-3">
                  <label className="qm-eyebrow block mb-2" style={{ fontSize: 9 }}>
                    PRODUCTS FROM CATALOG: {selectedProducts.length} selected
                  </label>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--qm-soft-line)', borderRadius: 6 }}>
                    {catalogProducts.map((p, i) => {
                      const isSel = selectedProducts.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-3"
                          style={{
                            padding: '7px 12px',
                            borderBottom: i < catalogProducts.length - 1 ? '1px solid var(--qm-soft-line)' : 'none',
                            cursor: 'pointer',
                            background: isSel ? 'var(--qm-warm-paper)' : '#fff',
                          }}
                        >
                          <NpIcon name={isSel ? 'check-square' : 'square'} size={15} color={isSel ? 'var(--qm-charcoal)' : 'var(--qm-gray-400)'} />
                          <div className="min-w-0">
                            <div className="text-[12.5px] ink leading-snug">{p.product}</div>
                            {(p.brand || p.pack_size) && (
                              <div className="text-[11px] ink-faint leading-snug">{[p.brand, p.pack_size].filter(Boolean).join(' · ')}</div>
                            )}
                          </div>
                          <input type="checkbox" checked={isSel} onChange={() => toggleProduct(p.id)} style={{ display: 'none' }} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {createError && <div className="mb-2 text-[12.5px]" style={{ color: '#B91C1C' }}>{createError}</div>}

              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="qm-btn qm-btn-orange"
                style={{ fontSize: 14, opacity: (creating || !title.trim()) ? 0.5 : 1, cursor: (creating || !title.trim()) ? 'not-allowed' : 'pointer' }}
              >
                {creating ? 'Creating…' : 'Create package'}
              </button>
            </div>
          )}

          {/* Package list */}
          <div className="mt-6">
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>ALL PACKAGES</div>
            <div className="mt-2 doc-divider-thick" />

            {packages.length === 0 ? (
              <div className="py-4 text-[13px] ink-faint">No packages yet. Create your first package above.</div>
            ) : (
              packages.map((p, i) => (
                <button
                  key={p.id ?? i}
                  onClick={() => navigate(`/brand/packages/${p.id}`)}
                  className="w-full text-left doc-divider py-3.5 block hover:opacity-95"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="serif text-[15px] font-medium ink leading-snug">{p.title}</div>
                      <div className="text-[11.5px] ink-faint num leading-snug">
                        {p.items_count} product{p.items_count !== 1 ? 's' : ''}
                        {p.target_distributor ? ` · ${p.target_distributor.name}` : ' · no distributor selected'}
                      </div>
                    </div>
                    <PkgStatusBadge status={p.status} />
                  </div>
                  <div className="mt-1.5 text-[11px] ink-faint num">
                    {p.status === 'draft'
                      ? `Started ${new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : `Sent ${new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
}

// ─── Router: list vs detail ───────────────────────────────────────────────────

export function BrandPackagesPage() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <PackageDetailView id={id} />;
  return <PackageListView />;
}
