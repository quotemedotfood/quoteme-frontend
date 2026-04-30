import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router';
import { Search, Plus, ArrowUpDown, ArrowUp, ArrowDown, UserCheck, Download } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import {
  getAdminDistributors,
  createDistributor,
  impersonateUser,
  downloadDistributorExport,
  optOutDistributor,
  optInDistributor,
  AdminDistributor,
} from '../../services/adminApi';
import SubcategoryExclusionDrawer from '../../components/SubcategoryExclusionDrawer';
import {
  getAdminSubcategoryExclusions,
  updateAdminSubcategoryExclusions,
  SubcategoryExclusionsResponse,
} from '../../services/api';

// ── US States constant ──────────────────────────────────────────────────────
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

type SortField = 'name' | 'region' | 'status' | 'rep_count' | 'product_count' | 'created_at' | 'primary_state' | 'catalog_state';
type SortDir = 'asc' | 'desc';

// Extended AdminDistributor with optional new-endpoint fields
type DistributorRow = AdminDistributor & {
  primary_state?: string | null;
  service_states?: string[];
  source?: 'ingested' | 'registered' | 'claimed';
  catalog_state?: 'discovery' | 'provisional' | 'verified';
  distributor_opt_out?: boolean;
};

function truncateStates(states: string[] | undefined): string {
  if (!states || states.length === 0) return '—';
  if (states.length <= 3) return states.join(', ');
  return `${states.slice(0, 3).join(', ')} +${states.length - 3}`;
}

function catalogStateBadge(state: string | undefined) {
  if (!state) return null;
  const colors: Record<string, string> = {
    discovery: 'bg-yellow-100 text-yellow-700',
    provisional: 'bg-blue-100 text-blue-700',
    verified: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[state] ?? 'bg-gray-100 text-gray-600'}`}>
      {state}
    </span>
  );
}

function sourceBadge(source: string | undefined) {
  if (!source) return null;
  const colors: Record<string, string> = {
    ingested: 'bg-purple-100 text-purple-700',
    registered: 'bg-blue-100 text-blue-700',
    claimed: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[source] ?? 'bg-gray-100 text-gray-600'}`}>
      {source}
    </span>
  );
}

export function QMAdminDistributors() {
  const [distributors, setDistributors] = useState<DistributorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCatalogState, setFilterCatalogState] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sort
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminFirstName, setNewAdminFirstName] = useState('');
  const [newAdminLastName, setNewAdminLastName] = useState('');
  const [creating, setCreating] = useState(false);

  // Actions
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [togglingOptOut, setTogglingOptOut] = useState<string | null>(null);

  // Exclusion drawer
  const [exclusionDrawerOpen, setExclusionDrawerOpen] = useState(false);
  const [exclusionDistributorId, setExclusionDistributorId] = useState<string | null>(null);
  const [exclusionData, setExclusionData] = useState<SubcategoryExclusionsResponse | null>(null);
  const [exclusionLoading, setExclusionLoading] = useState(false);

  // Export drawer
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);
  const [exportDistributor, setExportDistributor] = useState<DistributorRow | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleImpersonate(userId: string, userName: string) {
    setImpersonating(userId);
    const res = await impersonateUser(userId);
    if (res.data?.token) {
      localStorage.setItem('quoteme_admin_token', localStorage.getItem('quoteme_token') || '');
      localStorage.setItem('quoteme_impersonating', userName);
      localStorage.setItem('quoteme_token', res.data.token);
      window.location.href = '/';
    } else {
      setError(res.error || 'Failed to impersonate');
      setImpersonating(null);
    }
  }

  const loadExclusions = useCallback(async (distributorId: string) => {
    setExclusionDistributorId(distributorId);
    setExclusionLoading(true);
    setExclusionDrawerOpen(true);
    const res = await getAdminSubcategoryExclusions(distributorId);
    if (res.data) setExclusionData(res.data);
    setExclusionLoading(false);
  }, []);

  const handleExport = async (type: 'catalog' | 'quotes' | 'reps') => {
    if (!exportDistributor) return;
    setExporting(type);
    setExportError(null);
    try {
      await downloadDistributorExport(exportDistributor.id, type);
    } catch (e: any) {
      setExportError(e.message || 'Download failed');
    }
    setExporting(null);
  };

  const saveExclusions = useCallback(async (actions: { confirm?: string[]; exclude?: string[]; include?: string[]; confirm_all?: boolean }) => {
    if (!exclusionDistributorId) return;
    const res = await updateAdminSubcategoryExclusions(exclusionDistributorId, actions);
    if (res.data) setExclusionData(res.data);
  }, [exclusionDistributorId]);

  async function loadDistributors() {
    setLoading(true);
    const res = await getAdminDistributors();
    if (res.data) setDistributors(res.data as DistributorRow[]);
    else setError(res.error || 'Failed to load');
    setLoading(false);
  }

  useEffect(() => {
    loadDistributors();
  }, []);

  // Debounced search handler
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // search is applied client-side (existing rows); debounce is here for future server-side use
    debounceRef.current = setTimeout(() => {
      // no-op — filtering happens in useMemo
    }, 300);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDir(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const filtered = useMemo(() => {
    let result = [...distributors];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(q) ||
          (d.email_domain || '').toLowerCase().includes(q) ||
          (d.region || '').toLowerCase().includes(q) ||
          ((d as any).display_name || '').toLowerCase().includes(q)
      );
    }
    if (filterState) {
      result = result.filter(
        (d) =>
          (d as any).primary_state === filterState ||
          ((d as any).service_states || []).includes(filterState)
      );
    }
    if (filterCatalogState) {
      result = result.filter((d) => (d as any).catalog_state === filterCatalogState);
    }
    if (filterSource) {
      result = result.filter((d) => (d as any).source === filterSource);
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
        case 'region': cmp = (a.region || '').localeCompare(b.region || ''); break;
        case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break;
        case 'rep_count': cmp = (a.rep_count || 0) - (b.rep_count || 0); break;
        case 'product_count': cmp = (a.product_count || 0) - (b.product_count || 0); break;
        case 'created_at': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case 'primary_state': cmp = ((a as any).primary_state || '').localeCompare((b as any).primary_state || ''); break;
        case 'catalog_state': cmp = ((a as any).catalog_state || '').localeCompare((b as any).catalog_state || ''); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [distributors, search, filterState, filterCatalogState, filterSource, sortField, sortDir]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createDistributor({
      name: newName.trim(),
      email_domain: newDomain.trim() || undefined,
      region: newRegion.trim() || undefined,
      admin_email: newAdminEmail.trim() || undefined,
      admin_first_name: newAdminFirstName.trim() || undefined,
      admin_last_name: newAdminLastName.trim() || undefined,
    });
    setCreating(false);
    if (res.data) {
      setShowCreate(false);
      setNewName('');
      setNewDomain('');
      setNewRegion('');
      setNewAdminEmail('');
      setNewAdminFirstName('');
      setNewAdminLastName('');
      loadDistributors();
    } else {
      setError(res.error || 'Failed to create distributor');
    }
  }

  async function handleOptOutToggle(d: DistributorRow) {
    setTogglingOptOut(d.id);
    const fn = d.distributor_opt_out ? optInDistributor : optOutDistributor;
    const res = await fn(d.id);
    if (res.data || !res.error) {
      setDistributors((prev) =>
        prev.map((row) =>
          row.id === d.id ? { ...row, distributor_opt_out: !d.distributor_opt_out } : row
        )
      );
    } else {
      setError(res.error || 'Failed to update opt-out status');
    }
    setTogglingOptOut(null);
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Determine if we have new-endpoint fields to show extra columns
  const hasNewFields = distributors.some((d) => (d as any).source !== undefined || (d as any).catalog_state !== undefined);

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold text-[#2A2A2A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Distributors
        </h1>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
        >
          <Plus size={16} className="mr-1" /> Create Distributor
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h3 className="font-medium text-[#2A2A2A] mb-3">New Distributor</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-gray-500 mb-1 block">Name *</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Sysco, US Foods..." />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs text-gray-500 mb-1 block">Email Domain</label>
              <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="sysco.com" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs text-gray-500 mb-1 block">Region</label>
              <Input value={newRegion} onChange={(e) => setNewRegion(e.target.value)} placeholder="Northeast" />
            </div>
            <div className="w-full pt-2">
              <p className="text-xs text-gray-400 mb-2">Distributor Admin (optional)</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs text-gray-500 mb-1 block">Admin Email</label>
                  <Input value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="admin@distributor.com" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs text-gray-500 mb-1 block">First Name</label>
                  <Input value={newAdminFirstName} onChange={(e) => setNewAdminFirstName(e.target.value)} placeholder="First" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs text-gray-500 mb-1 block">Last Name</label>
                  <Input value={newAdminLastName} onChange={(e) => setNewAdminLastName(e.target.value)} placeholder="Last" />
                </div>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white">
              {creating ? 'Creating...' : 'Create'}
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search distributors..."
            className="pl-9"
          />
        </div>

        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-[#2A2A2A] focus:outline-none focus:ring-1 focus:ring-[#7FAEC2]"
        >
          <option value="">All States</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filterCatalogState}
          onChange={(e) => setFilterCatalogState(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-[#2A2A2A] focus:outline-none focus:ring-1 focus:ring-[#7FAEC2]"
        >
          <option value="">All Catalog States</option>
          <option value="discovery">Discovery</option>
          <option value="provisional">Provisional</option>
          <option value="verified">Verified</option>
        </select>

        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-[#2A2A2A] focus:outline-none focus:ring-1 focus:ring-[#7FAEC2]"
        >
          <option value="">All Sources</option>
          <option value="ingested">Ingested</option>
          <option value="registered">Registered</option>
          <option value="claimed">Claimed</option>
        </select>

        {(filterState || filterCatalogState || filterSource) && (
          <button
            onClick={() => { setFilterState(''); setFilterCatalogState(''); setFilterSource(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear filters
          </button>
        )}

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} distributors</span>
      </div>

      {loading && <p className="text-sm text-gray-400 py-8">Loading distributors...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No distributors found</p>
          <p className="text-sm mt-1">Try adjusting your filters or create a new distributor.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('primary_state')}>
                    <div className="flex items-center gap-1">State <SortIcon field="primary_state" /></div>
                  </TableHead>
                  <TableHead>Service States</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('catalog_state')}>
                    <div className="flex items-center gap-1">Catalog State <SortIcon field="catalog_state" /></div>
                  </TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('product_count')}>
                    <div className="flex items-center justify-end gap-1">Products <SortIcon field="product_count" /></div>
                  </TableHead>
                  {!hasNewFields && (
                    <>
                      <TableHead>Email Domain</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort('region')}>
                        <div className="flex items-center gap-1">Region <SortIcon field="region" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('rep_count')}>
                        <div className="flex items-center justify-end gap-1">Reps <SortIcon field="rep_count" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>
                        <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>
                        <div className="flex items-center gap-1">Created <SortIcon field="created_at" /></div>
                      </TableHead>
                    </>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const row = d as DistributorRow;
                  return (
                    <TableRow key={d.id} className={`hover:bg-gray-50 ${row.distributor_opt_out ? 'opacity-60' : ''}`}>
                      <TableCell>
                        <Link to={`/qm-admin/distributors/${d.id}`} className="font-medium text-[#7FAEC2] hover:underline">
                          {(row as any).display_name || d.name}
                        </Link>
                        {(row as any).display_name && (
                          <div className="text-xs text-gray-400">{d.name}</div>
                        )}
                        {row.distributor_opt_out && (
                          <span className="text-xs text-red-500 ml-1">(opted out)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {row.primary_state || d.region || 'None'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {truncateStates(row.service_states)}
                      </TableCell>
                      <TableCell>
                        {row.catalog_state
                          ? catalogStateBadge(row.catalog_state)
                          : <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{d.status || 'unknown'}</span>
                        }
                      </TableCell>
                      <TableCell>
                        {sourceBadge(row.source)}
                      </TableCell>
                      <TableCell className="text-sm text-right">{d.product_count ?? 0}</TableCell>
                      {!hasNewFields && (
                        <>
                          <TableCell className="text-sm text-gray-500">{d.email_domain || 'None'}</TableCell>
                          <TableCell className="text-sm text-gray-500">{d.region || 'None'}</TableCell>
                          <TableCell className="text-sm text-right">{d.rep_count ?? 0}</TableCell>
                          <TableCell>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {d.status || 'unknown'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{formatDate(d.created_at)}</TableCell>
                        </>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <Link
                            to={`/qm-admin/distributors/${d.id}`}
                            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            View
                          </Link>
                          <Link
                            to={`/qm-admin/distributors/${d.id}`}
                            state={{ editMode: true }}
                            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleOptOutToggle(row)}
                            disabled={togglingOptOut === d.id}
                            className={`text-xs px-2 py-1 border rounded hover:bg-gray-50 ${row.distributor_opt_out ? 'border-green-300 text-green-700' : 'border-red-200 text-red-600'}`}
                            title={row.distributor_opt_out ? 'Opt back in' : 'Opt out'}
                          >
                            {togglingOptOut === d.id ? '...' : (row.distributor_opt_out ? 'Opt In' : 'Opt Out')}
                          </button>
                          <button
                            onClick={() => { setExportDistributor(d); setExportDrawerOpen(true); setExportError(null); }}
                            className="text-xs px-1.5 py-1 border border-gray-300 rounded hover:bg-gray-50"
                            title="Download exports"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={() => loadExclusions(d.id)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Subcategory Exclusions
                          </button>
                          {d.admin_user_id ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-[#7FAEC2] hover:text-[#6A9AB0]"
                              disabled={impersonating === d.admin_user_id}
                              onClick={() => handleImpersonate(d.admin_user_id!, d.admin_user_name || d.name)}
                            >
                              <UserCheck size={14} className="mr-1" />
                              {impersonating === d.admin_user_id ? 'Switching...' : 'Impersonate'}
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">No user</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <SubcategoryExclusionDrawer
        isOpen={exclusionDrawerOpen}
        onClose={() => { setExclusionDrawerOpen(false); setExclusionDistributorId(null); }}
        data={exclusionData}
        onSave={saveExclusions}
        loading={exclusionLoading}
      />

      {/* Export Drawer */}
      <Sheet open={exportDrawerOpen} onOpenChange={setExportDrawerOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle style={{ fontFamily: "'Playfair Display', serif" }}>
              Export — {exportDistributor?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-1">
            <p className="text-sm text-gray-500">Download an Excel file for this distributor.</p>
            {exportError && <p className="text-sm text-red-500">{exportError}</p>}
            <button
              onClick={() => handleExport('catalog')}
              disabled={!!exporting}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left"
            >
              <Download size={16} className="text-[#7FAEC2] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#2A2A2A]">Catalog</p>
                <p className="text-xs text-gray-400">{exportDistributor?.product_count ?? 0} products</p>
              </div>
              {exporting === 'catalog' && <span className="ml-auto text-xs text-gray-400">Downloading...</span>}
            </button>
            <button
              onClick={() => handleExport('quotes')}
              disabled={!!exporting}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left"
            >
              <Download size={16} className="text-[#7FAEC2] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#2A2A2A]">Quotes</p>
                <p className="text-xs text-gray-400">All quote names &amp; details</p>
              </div>
              {exporting === 'quotes' && <span className="ml-auto text-xs text-gray-400">Downloading...</span>}
            </button>
            <button
              onClick={() => handleExport('reps')}
              disabled={!!exporting}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left"
            >
              <Download size={16} className="text-[#7FAEC2] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#2A2A2A]">Reps</p>
                <p className="text-xs text-gray-400">{exportDistributor?.rep_count ?? 0} reps</p>
              </div>
              {exporting === 'reps' && <span className="ml-auto text-xs text-gray-400">Downloading...</span>}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
