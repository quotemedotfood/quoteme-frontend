// BrandDistributorsPage — /brand/distributors
//
// Reskinned per handoff/desi-brand-suite-060626/src/screens-brand.jsx
// (BrandDistributorsBody + BrandSendCatalogBody). All API wiring
// (getBrandDistributors, addBrandDistributor, getBrandSecuredUploadLinks,
// createBrandSecuredUploadLink) and mint/copy flow preserved.
//
// Doctrine: NO prices, NO match counts anywhere.
// No gradient colors.

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
import { NpIcon } from '../../components/newspaper/NewspaperShell';

// ─── Status badge ─────────────────────────────────────────────────────────────

function RelStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; dot: string }> = {
    active:   { bg: 'rgba(127,174,194,.22)', fg: '#2A5F6F',            dot: 'var(--accent)' },
    pending:  { bg: '#FFF9F3',               fg: 'var(--qm-gray-700)', dot: 'var(--qm-warning)' },
    expired:  { bg: '#F3F4F6',               fg: 'var(--qm-gray-500)', dot: 'var(--qm-gray-400)' },
  };
  const m = map[status] ?? { bg: '#F3F4F6', fg: 'var(--qm-gray-700)', dot: 'var(--qm-gray-400)' };
  return (
    <span className="qm-pill" style={{ background: m.bg, color: m.fg, fontSize: 10, padding: '2px 8px', gap: 5, border: '1px solid var(--qm-soft-line)' }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: m.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BrandDistributorsPage() {
  const [relationships, setRelationships]   = useState<BrandDistributorRelationship[]>([]);
  const [directory, setDirectory]           = useState<BrandDistributorDirectory[]>([]);
  const [links, setLinks]                   = useState<BrandSecuredUploadLink[]>([]);
  const [loading, setLoading]               = useState(true);

  const [selectedDistId, setSelectedDistId] = useState('');
  const [adding, setAdding]                 = useState(false);
  const [addError, setAddError]             = useState<string | null>(null);

  const [mintName, setMintName]             = useState('');
  const [mintContactName, setMintContactName] = useState('');
  const [mintEmail, setMintEmail]           = useState('');
  const [minting, setMinting]               = useState(false);
  const [mintError, setMintError]           = useState<string | null>(null);
  const [mintedUrl, setMintedUrl]           = useState<string | null>(null);
  const [mintDist, setMintDist]             = useState<string | null>(null);
  const [copied, setCopied]                 = useState(false);

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
    setMintDist(mintName.trim());
    setMintName('');
    setMintContactName('');
    setMintEmail('');
    const linksRes = await getBrandSecuredUploadLinks();
    setLinks(linksRes.data ?? []);
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const connectedIds = new Set(relationships.map((r) => r.distributor.id));
  const availableDirectory = directory.filter((d) => !connectedIds.has(d.id));

  // ── Sent confirmation screen ──────────────────────────────────────────────
  if (mintedUrl && mintDist) {
    return (
      <div>
        <div
          className="inline-flex items-center justify-center rounded-full"
          style={{ width: 44, height: 44, background: 'rgba(127,174,194,.18)' }}
        >
          <NpIcon name="check" size={22} color="var(--qm-ack-navy)" />
        </div>
        <h1 className="serif font-medium ink mt-4" style={{ fontSize: 26, lineHeight: 1.2 }}>
          Link sent to {mintDist}.
        </h1>
        <p className="ink-soft mt-2 leading-relaxed" style={{ fontSize: 14, maxWidth: 440 }}>
          Their catalog person can drop the current catalog through it — no account needed. You'll see them move to Loaded once it's in.
        </p>

        {/* Show the link */}
        <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-md bg-white border hairline" style={{ maxWidth: 480 }}>
          <span className="text-[12.5px] ink flex-1" style={{ wordBreak: 'break-all' }}>{mintedUrl}</span>
          <button
            type="button"
            onClick={() => handleCopy(mintedUrl)}
            className="qm-btn qm-btn-outline shrink-0"
            style={{ fontSize: 11.5, padding: '4px 10px' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => { setMintedUrl(null); setMintDist(null); }}
            className="qm-btn qm-btn-outline"
            style={{ fontSize: 13 }}
          >
            Back to distributors
          </button>
          <button
            onClick={() => { setMintedUrl(null); setMintDist(null); }}
            className="qm-btn qm-btn-text"
            style={{ fontSize: 13 }}
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header ── */}
      <div>
        <h1 className="serif font-semibold ink" style={{ fontSize: 32, lineHeight: 1.15 }}>Distributors</h1>
        <p className="mt-1 ink-faint" style={{ fontSize: 13.5 }}>Who carries your line, and who else is available.</p>
      </div>

      {loading ? (
        <div className="mt-8 text-[14px] ink-faint" style={{ fontFamily: 'var(--qm-sans)' }}>Loading…</div>
      ) : (
        <>
          {/* ── YOUR DISTRIBUTORS ── */}
          <div className="mt-6">
            <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
              <span>YOUR DISTRIBUTORS</span>
              <span className="ink-faint" style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}>{relationships.length}</span>
            </div>
            <div className="mt-2 doc-divider-thick" />

            {relationships.length === 0 ? (
              <div className="py-4 text-[13px] ink-faint">No distributor connections yet.</div>
            ) : (
              relationships.map((rel, i) => (
                <div key={rel.id} className="doc-divider py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="serif text-[15px] font-medium ink leading-snug">
                        {rel.distributor.display_name ?? rel.distributor.name}
                      </div>
                      {rel.distributor.headquarters_city && (
                        <div className="text-[11.5px] ink-faint leading-snug">{rel.distributor.headquarters_city}</div>
                      )}
                    </div>
                    <RelStatusBadge status={rel.status} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── ADD FROM DIRECTORY ── */}
          {availableDirectory.length > 0 && (
            <div className="mt-7">
              <div className="qm-eyebrow" style={{ fontSize: 10 }}>CONNECT A DISTRIBUTOR</div>
              <div className="mt-2 doc-divider-thick" />
              <div className="mt-3 flex gap-2" style={{ flexWrap: 'wrap' }}>
                <select
                  value={selectedDistId}
                  onChange={(e) => setSelectedDistId(e.target.value)}
                  className="qm-input"
                  style={{ flex: '1 1 200px', padding: '9px 12px', fontSize: 14, cursor: 'pointer', minHeight: 'unset' }}
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
                  className="qm-btn qm-btn-outline"
                  style={{ fontSize: 13, opacity: (adding || !selectedDistId) ? 0.5 : 1 }}
                >
                  {adding ? 'Connecting…' : 'Connect'}
                </button>
              </div>
              {addError && <div className="mt-2 text-[12.5px]" style={{ color: '#B91C1C' }}>{addError}</div>}
            </div>
          )}

          {/* ── BRING ON A DISTRIBUTOR (F3 mint) ── */}
          <div className="mt-7 px-4 py-4 rounded-md" style={{ background: 'var(--qm-warm-paper)', border: '1px solid var(--qm-soft-line)' }}>
            <div className="qm-eyebrow" style={{ fontSize: 10 }}>BRING ON A DISTRIBUTOR</div>
            <div className="serif font-medium ink mt-1" style={{ fontSize: 14.5, lineHeight: 1.3 }}>Send a secure catalog link.</div>
            <p className="mt-1 text-[11.5px] ink-soft leading-relaxed">
              For a distributor that isn't on QuoteMe yet. Their catalog person drops the current catalog through a secure link — then chefs in range can order your line.
            </p>

            <div className="mt-4 flex flex-col gap-3" style={{ maxWidth: 460 }}>
              <div>
                <label className="qm-eyebrow block" style={{ fontSize: 9 }}>DISTRIBUTOR NAME</label>
                <input
                  className="qm-input mt-1.5"
                  style={{ fontSize: 14, padding: '9px 12px', minHeight: 'unset' }}
                  type="text"
                  placeholder="Distributor name"
                  value={mintName}
                  onChange={(e) => setMintName(e.target.value)}
                  disabled={minting}
                />
              </div>
              <div>
                <label className="qm-eyebrow block" style={{ fontSize: 9 }}>CATALOG CONTACT NAME</label>
                <input
                  className="qm-input mt-1.5"
                  style={{ fontSize: 14, padding: '9px 12px', minHeight: 'unset' }}
                  type="text"
                  placeholder="e.g. Jamie Torres"
                  value={mintContactName}
                  onChange={(e) => setMintContactName(e.target.value)}
                  disabled={minting}
                />
              </div>
              <div>
                <label className="qm-eyebrow block" style={{ fontSize: 9 }}>EMAIL (OPTIONAL)</label>
                <input
                  className="qm-input mt-1.5"
                  style={{ fontSize: 14, padding: '9px 12px', minHeight: 'unset' }}
                  type="email"
                  placeholder="catalog@distributor.com"
                  value={mintEmail}
                  onChange={(e) => setMintEmail(e.target.value)}
                  disabled={minting}
                />
              </div>

              <div className="px-3.5 py-3 rounded-md flex items-start gap-2.5" style={{ background: '#fff', border: '1px solid var(--qm-soft-line)' }}>
                <NpIcon name="lock" size={14} color="var(--qm-charcoal)" style={{ marginTop: 2 }} />
                <div className="text-[11.5px] ink-soft leading-relaxed">
                  The link is good for seven days and only does one thing: take a catalog. Their prices stay private — you never see a distributor's pricing.
                </div>
              </div>

              {mintError && <div className="text-[12.5px]" style={{ color: '#B91C1C' }}>{mintError}</div>}

              <button
                type="button"
                onClick={handleMint}
                disabled={minting || !mintName.trim()}
                className="qm-btn qm-btn-orange"
                style={{ padding: '12px 18px', fontSize: 14, opacity: (minting || !mintName.trim()) ? 0.5 : 1, cursor: (minting || !mintName.trim()) ? 'not-allowed' : 'pointer' }}
              >
                <NpIcon name="send" size={15} color="#fff" />
                {minting ? 'Generating…' : 'Send a catalog link'}
              </button>
            </div>
          </div>

          {/* ── MINTED LINKS HISTORY ── */}
          {links.length > 0 && (
            <div className="mt-7">
              <div className="qm-eyebrow flex items-baseline justify-between" style={{ fontSize: 10 }}>
                <span>SECURE UPLOAD LINKS</span>
                <span className="ink-faint" style={{ letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}>{links.length}</span>
              </div>
              <div className="mt-2 doc-divider-thick" />
              {links.map((link, i) => (
                <div key={link.id} className="doc-divider py-3 flex items-center justify-between gap-3" style={{ flexWrap: 'wrap' }}>
                  <div className="min-w-0">
                    <div className="text-[13.5px] ink leading-snug">{link.distributor.name}</div>
                    <div className="text-[11px] ink-faint num leading-snug">
                      Expires {new Date(link.expires_at).toLocaleDateString()}
                      {link.consumed_at ? ` · Used ${new Date(link.consumed_at).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <RelStatusBadge status={link.status} />
                    {link.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleCopy(link.url)}
                        className="qm-btn qm-btn-outline"
                        style={{ fontSize: 11, padding: '3px 9px' }}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
