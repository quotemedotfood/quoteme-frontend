// BrandCatalogPage — /brand/catalog
//
// GET /api/v1/brand/catalog — shows current catalog or empty state.
// POST /api/v1/brand/catalogs (multipart) — drag/drop or picker to upload.
// After upload, re-fetches catalog and shows sample_products table.
//
// DESIGN-SWAP SEAM: visual layer replaced by Desi's catalog frame.
// Data fetching, upload handler, and table schema are final.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBrandCatalog, uploadBrandCatalog } from '../../services/api';
import type { BrandSampleProduct } from '../../services/api';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  charcoal: '#2B2B2B',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray500: '#6B7280',
  gray700: '#4F4F4F',
  ink: '#1A1A1A',
  errorRed: '#B91C1C',
  successGreen: '#15803D',
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

export function BrandCatalogPage() {
  const [catalog, setCatalog]           = useState<any | null>(null);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragging, setDragging]         = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  const fetchCatalog = useCallback(async () => {
    const res = await getBrandCatalog();
    setCatalog(res.data?.catalog ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  const handleFile = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(false);
    setUploading(true);
    const res = await uploadBrandCatalog(file);
    setUploading(false);
    if (res.error) {
      setUploadError(res.error);
      return;
    }
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

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const samples: BrandSampleProduct[] = catalog?.sample_products ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={eyebrow()}>Brand Catalog</div>
        <div style={{ ...serif, fontSize: 24, fontWeight: 700, color: C.charcoal }}>
          {catalog ? `${catalog.brand?.name ?? 'Your'} catalog` : 'Catalog'}
        </div>
      </div>

      {loading ? (
        <div style={{ ...sans, color: C.gray500, fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          {/* Upload section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ ...eyebrow(), marginBottom: 12 }}>
              {catalog ? 'Replace catalog' : 'Upload catalog'}
            </div>

            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? C.charcoal : C.softLine}`,
                borderRadius: 10,
                padding: '36px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragging ? C.warmPaper : '#fff',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{ ...sans, fontSize: 14, color: C.gray700, fontWeight: 500 }}>
                {uploading
                  ? 'Uploading…'
                  : 'Drag & drop a CSV or XLSX, or click to browse'}
              </div>
              <div style={{ ...sans, fontSize: 12, color: C.gray500, marginTop: 6 }}>
                Accepted: .csv, .xls, .xlsx
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={onFileChange}
              style={{ display: 'none' }}
            />

            {uploadError && (
              <div
                style={{
                  ...sans,
                  fontSize: 13,
                  color: C.errorRed,
                  marginTop: 10,
                  padding: '10px 12px',
                  background: '#FEF2F2',
                  borderRadius: 6,
                }}
              >
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div
                style={{
                  ...sans,
                  fontSize: 13,
                  color: C.successGreen,
                  marginTop: 10,
                  padding: '10px 12px',
                  background: '#F0FDF4',
                  borderRadius: 6,
                }}
              >
                Catalog uploaded successfully.
              </div>
            )}
          </div>

          {/* Catalog summary */}
          {catalog ? (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...sans, fontSize: 13.5, color: C.gray700 }}>
                  <strong style={{ color: C.ink }}>
                    {catalog.item_count?.toLocaleString() ?? 0}
                  </strong>{' '}
                  items ·{' '}
                  <strong style={{ color: C.ink }}>
                    {catalog.row_count?.toLocaleString() ?? 0}
                  </strong>{' '}
                  rows · status:{' '}
                  <strong style={{ color: C.ink }}>{catalog.catalog_state ?? catalog.status}</strong>
                </div>
              </div>

              {/* Sample products table */}
              {samples.length > 0 && (
                <div>
                  <div style={{ ...eyebrow(), marginBottom: 10 }}>
                    Sample products ({samples.length})
                  </div>
                  <div
                    style={{
                      border: `1px solid ${C.softLine}`,
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <table style={{ ...sans, width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr
                          style={{
                            background: C.warmPaper,
                            borderBottom: `1px solid ${C.softLine}`,
                          }}
                        >
                          <th style={{ textAlign: 'left', padding: '8px 14px', fontWeight: 600, color: C.gray700 }}>Product</th>
                          <th style={{ textAlign: 'left', padding: '8px 14px', fontWeight: 600, color: C.gray700 }}>Brand</th>
                          <th style={{ textAlign: 'left', padding: '8px 14px', fontWeight: 600, color: C.gray700 }}>Pack size</th>
                          <th style={{ textAlign: 'left', padding: '8px 14px', fontWeight: 600, color: C.gray700 }}>Item #</th>
                        </tr>
                      </thead>
                      <tbody>
                        {samples.map((p, i) => (
                          <tr
                            key={p.id ?? i}
                            style={{
                              borderBottom:
                                i < samples.length - 1 ? `1px solid ${C.softLine}` : 'none',
                            }}
                          >
                            <td style={{ padding: '9px 14px', color: C.ink }}>{p.product}</td>
                            <td style={{ padding: '9px 14px', color: C.gray700 }}>{p.brand ?? '—'}</td>
                            <td style={{ padding: '9px 14px', color: C.gray700 }}>{p.pack_size ?? '—'}</td>
                            <td style={{ padding: '9px 14px', color: C.gray700 }}>{p.item_number ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
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
              No catalog uploaded yet. Upload a CSV or XLSX above to get started.
            </div>
          )}
        </>
      )}
    </div>
  );
}
