// BrandCatalogPage — /brand/catalog
//
// Reskinned per handoff/desi-brand-suite-060626/src/screens-brand.jsx
// (BrandCatalogBody). All API wiring (getBrandCatalog, uploadBrandCatalog),
// drag/drop upload, loading/error/success states preserved.
//
// Doctrine: names + pack specs ONLY — no prices ever shown.
// No gradient colors.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBrandCatalog, uploadBrandCatalog } from '../../services/api';
import type { BrandSampleProduct } from '../../services/api';
import { NpIcon } from '../../components/newspaper/NewspaperShell';

export function BrandCatalogPage() {
  const [catalog, setCatalog]             = useState<any | null>(null);
  const [loading, setLoading]             = useState(true);
  const [uploading, setUploading]         = useState(false);
  const [uploadError, setUploadError]     = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragging, setDragging]           = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  const fetchCatalog = useCallback(async () => {
    const res = await getBrandCatalog();
    // BE returns the catalog FLAT when present; {catalog: null} only when empty.
    const d: any = res.data;
    setCatalog(d && d.id ? d : (d?.catalog ?? null));
    setLoading(false);
  }, []);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  const handleFile = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(false);
    setUploading(true);
    const res = await uploadBrandCatalog(file);
    setUploading(false);
    if (res.error) { setUploadError(res.error); return; }
    setUploadSuccess(true);
    setLoading(true);
    await fetchCatalog();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const samples: BrandSampleProduct[] = catalog?.sample_products ?? [];
  const catName = catalog?.brand?.name ?? null;
  const catVersion = catalog?.version ?? null;
  const catUpdated = catalog ? new Date(catalog.updated_at ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="serif font-semibold ink" style={{ fontSize: 32, lineHeight: 1.15 }}>Catalog</h1>
          <p className="mt-1 ink-faint num" style={{ fontSize: 13.5 }}>
            {catName ? `${catName} · ` : ''}
            {catVersion ? `${catVersion} · ` : ''}
            {catUpdated ? `updated ${catUpdated}` : 'No catalog uploaded'}
          </p>
        </div>
        <button
          className="qm-btn qm-btn-orange shrink-0"
          style={{ padding: '10px 15px', fontSize: 13 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <NpIcon name="upload" size={15} color="#fff" />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {loading ? (
        <div className="mt-8 text-[14px] ink-faint" style={{ fontFamily: 'var(--qm-sans)' }}>Loading…</div>
      ) : (
        <>
          {/* ── Upload drop zone ── */}
          <div
            className="mt-5 rounded-lg text-center"
            style={{
              border: `1.5px dashed ${dragging ? 'var(--qm-charcoal)' : 'var(--qm-gray-200)'}`,
              padding: '26px 24px',
              background: dragging ? 'var(--qm-warm-paper)' : 'var(--qm-warm-paper)',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <NpIcon name="upload" size={20} color="var(--qm-gray-400)" />
            <div className="mt-2 text-[13px] ink leading-snug">
              Drop a catalog file to add or update products
            </div>
            <div className="text-[11.5px] ink-faint mt-1">
              PDF, spreadsheet, or a photo of your sell sheet · names &amp; pack specs, no prices
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.pdf"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />

          {uploadError && (
            <div className="mt-3 px-3 py-2.5 rounded-md text-[13px]" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
              {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="mt-3 px-3 py-2.5 rounded-md text-[13px]" style={{ background: '#F0FDF4', color: '#15803D' }}>
              Catalog uploaded successfully.
            </div>
          )}

          {/* ── Products list ── */}
          <div className="mt-6">
            <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
              <span>PRODUCTS</span>
              <span className="ink-faint" style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}>
                {catalog?.item_count?.toLocaleString() ?? samples.length}
              </span>
            </div>
            <div className="mt-2 doc-divider-thick" />

            {samples.length === 0 ? (
              <div className="py-4 text-[13px] ink-faint">
                {catalog ? 'No sample products loaded.' : 'No catalog uploaded yet.'}
              </div>
            ) : (
              samples.map((p, i) => (
                <div key={p.id ?? i} className="doc-divider py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13.5px] ink leading-snug">{p.product_name}</div>
                    <div className="text-[11.5px] ink-faint num leading-snug">
                      {[p.pack_size, p.brand].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {p.item_number && (
                    <span className="qm-pill shrink-0" style={{ background: 'var(--qm-warm-paper)', color: 'var(--qm-gray-700)', border: '1px solid var(--qm-soft-line)', fontSize: 9.5, padding: '1px 7px' }}>
                      #{p.item_number}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* ── No-prices doctrine footer ── */}
          <div className="mt-6 flex items-start gap-3 text-[11.5px] ink-soft" style={{ borderTop: '1px solid var(--qm-soft-line)', paddingTop: 12 }}>
            <NpIcon name="info" size={14} color="var(--qm-gray-500)" />
            <div>
              This is your own catalog. Pricing is set by your distributors, never here. Your products show prices only inside a distributor's catalog.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
