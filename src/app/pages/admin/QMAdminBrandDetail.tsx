import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Globe, Package, Users, Boxes, UserCheck, Mail, Upload } from 'lucide-react';
import {
  getAdminBrand,
  resendInvite,
  AdminBrandDetail,
  uploadAdminBrandLogo,
} from '../../services/adminApi';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import { handleImpersonate } from '../../utils/impersonate';

const STALE_MS = 14 * 24 * 60 * 60 * 1000;

function isStale(dateStr: string): boolean {
  return new Date(dateStr) < new Date(Date.now() - STALE_MS);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status, colorMap }: { status: string; colorMap: Record<string, string> }) {
  const cls = colorMap[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

const USER_STATUS_MAP: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  invited: 'bg-blue-100 text-blue-700',
};

const PACKAGE_STATUS_MAP: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  converted: 'bg-green-100 text-green-700',
  dismissed: 'bg-red-100 text-red-700',
};

const DIST_STATUS_MAP: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
};

const LOGO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const LOGO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// ─── QMAdminBrandDetail ──────────────────────────────────────────────────────

export function QMAdminBrandDetail() {
  const { id } = useParams<{ id: string }>();
  const [brand, setBrand] = useState<AdminBrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<Record<string, string>>({});

  // Logo upload state
  const [logoUrl, setLogoUrl]             = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError]         = useState<string | null>(null);
  const logoInputRef                      = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await getAdminBrand(id!);
      if (res.data) {
        setBrand(res.data);
        setLogoUrl(res.data.logo_url ?? null);
      } else {
        setError(res.error || 'Not found');
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleResend(userId: string) {
    setResendingId(userId);
    const res = await resendInvite(userId);
    setResendingId(null);
    if (res.data) {
      setResendMsg((prev) => ({ ...prev, [userId]: 'Sent!' }));
      setTimeout(() => setResendMsg((prev) => { const next = { ...prev }; delete next[userId]; return next; }), 3000);
    } else {
      setResendMsg((prev) => ({ ...prev, [userId]: res.error || 'Failed' }));
    }
  }

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    e.target.value = '';

    if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
      setLogoError('Only JPEG, PNG, or WebP images are accepted.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError('Image must be 5 MB or smaller.');
      return;
    }

    setLogoError(null);
    setLogoUploading(true);
    const res = await uploadAdminBrandLogo(id, file);
    setLogoUploading(false);

    if (res.error) {
      setLogoError(res.error);
      return;
    }
    setLogoUrl(res.data!.logo_url);
  }

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-[#7FAEC2] rounded-full animate-spin" />
        Loading...
      </div>
    );
  }
  if (error) return <div className="p-10 text-red-500">{error}</div>;
  if (!brand) return null;

  const initials = brand.name.slice(0, 2).toUpperCase();

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      {/* Back link */}
      <Link to="/qm-admin/brands" className="text-sm text-[#7FAEC2] hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Back to Brands
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        {/* Logo preview + upload */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brand.name}
              className="w-16 h-16 object-contain rounded-lg border border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-[#7FAEC2] text-white flex items-center justify-center text-xl font-bold">
              {initials}
            </div>
          )}
          {/* Hidden file input */}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogoFileChange}
            disabled={logoUploading}
          />
          <button
            type="button"
            title={logoUrl ? 'Replace logo' : 'Upload logo'}
            className="flex items-center gap-1 text-xs text-[#7FAEC2] hover:text-[#6A9AB0] disabled:opacity-50"
            style={{ background: 'transparent', border: 'none', cursor: logoUploading ? 'not-allowed' : 'pointer', padding: 0 }}
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading}
          >
            <Upload size={11} />
            {logoUploading ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload'}
          </button>
          {logoError && (
            <p className="text-xs text-red-500 max-w-[80px] text-center leading-tight">{logoError}</p>
          )}
        </div>

        <div>
          <h1
            className="text-2xl font-bold text-[#2A2A2A]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {brand.name}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                brand.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {brand.status}
            </span>
            {brand.website ? (
              <a
                href={brand.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-[#7FAEC2] hover:text-[#6A9AB0]"
              >
                <Globe size={13} />
                {brand.website.replace(/^https?:\/\//, '')}
              </a>
            ) : (
              <span className="text-sm text-gray-400">No website set</span>
            )}
            {brand.category && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{brand.category}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">Created {formatDate(brand.created_at)}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Boxes size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{brand.stats.products.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Products</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Package size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{brand.stats.packages}</div>
            <div className="text-xs text-gray-500">Packages</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#7FAEC2]/10 flex items-center justify-center">
            <Users size={18} className="text-[#7FAEC2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-[#2A2A2A]">{brand.stats.distributors}</div>
            <div className="text-xs text-gray-500">Distributors</div>
          </div>
        </div>
      </div>

      {/* Users section */}
      <section className="mb-8">
        <h2
          className="text-lg font-semibold text-[#2A2A2A] mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Users
        </h2>
        {brand.users.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">None yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brand.users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-[#2A2A2A]">
                      {u.first_name} {u.last_name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{u.email}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} colorMap={USER_STATUS_MAP} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(u.last_login_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* Impersonate */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Impersonate"
                          className="text-xs text-[#7FAEC2] hover:text-[#6A9AB0] px-2"
                          disabled={impersonatingId === u.id}
                          onClick={() =>
                            handleImpersonate(
                              u.id,
                              `${u.first_name} ${u.last_name}`,
                              setImpersonatingId,
                              setError,
                            )
                          }
                        >
                          <UserCheck size={14} />
                          {impersonatingId === u.id ? (
                            <span className="ml-1">Switching...</span>
                          ) : null}
                        </Button>
                        {/* Resend invite / reset password */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Resend invite / reset password"
                          className="text-xs text-gray-400 hover:text-gray-600 px-2"
                          disabled={resendingId === u.id}
                          onClick={() => handleResend(u.id)}
                        >
                          <Mail size={14} />
                        </Button>
                        {resendMsg[u.id] && (
                          <span className="text-xs text-green-600 ml-1">{resendMsg[u.id]}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Catalogs section */}
      <section className="mb-8">
        <h2
          className="text-lg font-semibold text-[#2A2A2A] mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Catalogs
        </h2>
        {brand.catalogs.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">None yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Filename</TableHead>
                  <TableHead>Row Count</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brand.catalogs.map((c) => (
                  <TableRow key={c.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-[#2A2A2A]">
                      {c.original_filename || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {c.row_count != null ? c.row_count.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell
                      className={`text-sm font-medium ${isStale(c.uploaded_at) ? 'text-red-600' : 'text-gray-500'}`}
                    >
                      {formatDate(c.uploaded_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Packages section */}
      <section className="mb-8">
        <h2
          className="text-lg font-semibold text-[#2A2A2A] mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Packages
        </h2>
        {brand.packages.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">None yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Title</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brand.packages.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-[#2A2A2A]">{p.title}</TableCell>
                    <TableCell className="text-sm text-gray-500">{p.item_count}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} colorMap={PACKAGE_STATUS_MAP} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(p.sent_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Distributors section */}
      <section className="mb-8">
        <h2
          className="text-lg font-semibold text-[#2A2A2A] mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Distributors
        </h2>
        {brand.distributors.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">None yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brand.distributors.map((d) => (
                  <TableRow key={d.distributor_id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-[#2A2A2A]">{d.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={d.status} colorMap={DIST_STATUS_MAP} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(d.connected_since)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
