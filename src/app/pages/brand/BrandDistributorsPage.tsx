// BrandDistributorsPage — /brand/distributors
//
// Shows:
//   - Existing relationships list (GET /api/v1/brand/distributors → relationships)
//   - Directory picker (+ Add) to connect with known distributors
//   - F3 brand-mint card: "Distributor not on QuoteMe?" → name input →
//     POST /brand/secured_upload_links → show copyable URL
//   - List of minted links w/ status (GET /brand/secured_upload_links)
//
// Doctrine: NO prices, NO match counts anywhere.
// Doctrine: NO "distributor" wording on brand settings/profile — only here.
//
// DESIGN-SWAP SEAM: Desi's distributors frame replaces this layout.
// Data fetching, mint flow, and link list are final.

import { useCallback, useEffect, useState } from 'react';
import {
  getBrandDistributors,
  addBrandDistributor,
  getBrandSecuredUploadLinks,
  createBrandSecuredUploadLink,
} from '../../services/api';
import type {
  BrandDistributorRelationship,
  BrandDistributorDirectory,
  BrandSecuredUploadLink,
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

const inputStyle: React.CSSProperties = {
  ...sans,
  padding: '9px 12px',
  fontSize: 14,
  border: `1px solid ${C.softLine}`,
  borderRadius: 6,
  outline: 'none',
  color: C.ink,
  background: '#fff',
};

// ─── Status chip ──────────────────────────────────────────────────────────────

const LINK_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: '#EFF6FF', color: '#1D4ED8' },
  consumed: { bg: '#F0FDF4', color: '#15803D' },
  expired:  { bg: '#F3F4F6', color: '#6B7280' },
};

function LinkStatusChip({ status }: { status: string }) {
  const colors = LINK_STATUS_COLORS[status] ?? { bg: '#F3F4F6', color: '#374151' };
  return (
    <span
      style={{
        ...sans,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        padding: '2px 8px',
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BrandDistributorsPage() {
  const [relationships, setRelationships] = useState<BrandDistributorRelationship[]>([]);
  const [directory, setDirectory]         = useState<BrandDistributorDirectory[]>([]);
  const [links, setLinks]                 = useState<BrandSecuredUploadLink[]>([]);
  const [loading, setLoading]             = useState(true);

  // Add distributor state
  const [selectedDistId, setSelectedDistId] = useState('');
  const [adding, setAdding]                 = useState(false);
  const [addError, setAddError]             = useState<string | null>(null);

  // Brand-mint state
  const [mintName, setMintName]     = useState('');
  const [minting, setMinting]       = useState(false);
  const [mintError, setMintError]   = useState<string | null>(null);
  const [mintedUrl, setMintedUrl]   = useState<string | null>(null);
  const [copied, setCopied]         = useState(false);

  const fetchAll = useCallback(async () => {
    const [distRes, linksRes] = await Promise.all([
      getBrandDistributors(),
      getBrandSecuredUploadLinks(),
    ]);
    setRelationships(distRes.data?.relationships ?? []);
    setDirectory(distRes.data?.directory ?? []);
    setLinks(linksRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async () => {
    if (!selectedDistId) return;
    setAddError(null);
    setAdding(true);
    const res = await addBrandDistributor(selectedDistId);
    setAdding(false);
    if (res.error) { setAddError(res.error); return; }
    setSelectedDistId('');
    setLoading(true);
    await fetchAll();
  };

  const handleMint = async () => {
    if (!mintName.trim()) return;
    setMintError(null);
    setMinting(true);
    setMintedUrl(null);
    const res = await createBrandSecuredUploadLink({ distributor_name: mintName.trim() });
    setMinting(false);
    if (res.error) { setMintError(res.error); return; }
    setMintedUrl(res.data?.url ?? null);
    setMintName('');
    // Refresh links list
    const linksRes = await getBrandSecuredUploadLinks();
    setLinks(linksRes.data ?? []);
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select an input
    }
  };

  // Filter directory to exclude already-connected distributors
  const connectedIds = new Set(relationships.map((r) => r.distributor.id));
  const availableDirectory = directory.filter((d) => !connectedIds.has(d.id));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={eyebrow()}>Distributors</div>
        <div style={{ ...serif, fontSize: 24, fontWeight: 700, color: C.charcoal }}>
          Your distributor connections
        </div>
      </div>

      {loading ? (
        <div style={{ ...sans, color: C.gray500, fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          {/* Existing relationships */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ ...eyebrow(), marginBottom: 12 }}>
              Connected ({relationships.length})
            </div>
            {relationships.length === 0 ? (
              <div
                style={{
                  ...sans,
                  fontSize: 13.5,
                  color: C.gray500,
                  padding: '16px',
                  background: C.warmPaper,
                  borderRadius: 8,
                }}
              >
                No distributor connections yet.
              </div>
            ) : (
              <div
                style={{
                  border: `1px solid ${C.softLine}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {relationships.map((rel, i) => (
                  <div
                    key={rel.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom:
                        i < relationships.length - 1 ? `1px solid ${C.softLine}` : 'none',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ ...sans, fontSize: 14, fontWeight: 600, color: C.ink }}>
                        {rel.distributor.display_name ?? rel.distributor.name}
                      </div>
                      {rel.distributor.headquarters_city && (
                        <div style={{ ...sans, fontSize: 12, color: C.gray500, marginTop: 2 }}>
                          {rel.distributor.headquarters_city}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        ...sans,
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '.05em',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: '#F3F4F6',
                        color: '#374151',
                      }}
                    >
                      {rel.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add from directory */}
          {availableDirectory.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ ...eyebrow(), marginBottom: 10 }}>Add from directory</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select
                  value={selectedDistId}
                  onChange={(e) => setSelectedDistId(e.target.value)}
                  style={{ ...inputStyle, flex: '1 1 200px', cursor: 'pointer' }}
                >
                  <option value="">Select distributor…</option>
                  {availableDirectory.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}{d.headquarters_city ? ` — ${d.headquarters_city}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={adding || !selectedDistId}
                  style={{
                    ...sans,
                    padding: '9px 18px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#fff',
                    background: adding || !selectedDistId ? '#9CA3AF' : C.charcoal,
                    border: 'none',
                    borderRadius: 6,
                    cursor: adding || !selectedDistId ? 'not-allowed' : 'pointer',
                  }}
                >
                  {adding ? 'Connecting…' : 'Connect'}
                </button>
              </div>
              {addError && (
                <div style={{ ...sans, fontSize: 13, color: C.errorRed, marginTop: 8 }}>
                  {addError}
                </div>
              )}
            </div>
          )}

          {/* F3 brand-mint */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ ...eyebrow(), marginBottom: 8 }}>Distributor not on QuoteMe?</div>
            <div
              style={{
                padding: '20px',
                background: C.warmPaper,
                borderRadius: 8,
                border: `1px solid ${C.softLine}`,
              }}
            >
              <div style={{ ...sans, fontSize: 13.5, color: C.gray700, marginBottom: 14 }}>
                Send them a secure link so they can upload their catalog and join QuoteMe.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  style={{ ...inputStyle, flex: '1 1 200px' }}
                  type="text"
                  placeholder="Distributor name"
                  value={mintName}
                  onChange={(e) => setMintName(e.target.value)}
                  disabled={minting}
                />
                <button
                  type="button"
                  onClick={handleMint}
                  disabled={minting || !mintName.trim()}
                  style={{
                    ...sans,
                    padding: '9px 18px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#fff',
                    background: minting || !mintName.trim() ? '#9CA3AF' : C.charcoal,
                    border: 'none',
                    borderRadius: 6,
                    cursor: minting || !mintName.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {minting ? 'Generating…' : 'Generate link'}
                </button>
              </div>

              {mintError && (
                <div style={{ ...sans, fontSize: 13, color: C.errorRed, marginTop: 10 }}>
                  {mintError}
                </div>
              )}

              {mintedUrl && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '12px 14px',
                    background: '#fff',
                    border: `1px solid ${C.softLine}`,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      ...sans,
                      fontSize: 13,
                      color: C.ink,
                      flex: 1,
                      wordBreak: 'break-all',
                    }}
                  >
                    {mintedUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(mintedUrl)}
                    style={{
                      ...sans,
                      fontSize: 12,
                      fontWeight: 600,
                      color: copied ? C.successGreen : C.charcoal,
                      background: 'transparent',
                      border: `1px solid ${copied ? C.successGreen : C.softLine}`,
                      borderRadius: 6,
                      padding: '5px 12px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Minted links history */}
          {links.length > 0 && (
            <div>
              <div style={{ ...eyebrow(), marginBottom: 10 }}>Secure upload links</div>
              <div
                style={{
                  border: `1px solid ${C.softLine}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {links.map((link, i) => (
                  <div
                    key={link.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      borderBottom:
                        i < links.length - 1 ? `1px solid ${C.softLine}` : 'none',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ ...sans, fontSize: 13.5, fontWeight: 500, color: C.ink }}>
                        {link.distributor.name}
                      </div>
                      <div style={{ ...sans, fontSize: 11.5, color: C.gray500, marginTop: 2 }}>
                        Expires {new Date(link.expires_at).toLocaleDateString()}
                        {link.consumed_at && ` · Used ${new Date(link.consumed_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <LinkStatusChip status={link.status} />
                      {link.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleCopy(link.url)}
                          style={{
                            ...sans,
                            fontSize: 11,
                            fontWeight: 600,
                            color: C.gray700,
                            background: 'transparent',
                            border: `1px solid ${C.softLine}`,
                            borderRadius: 6,
                            padding: '3px 10px',
                            cursor: 'pointer',
                          }}
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
