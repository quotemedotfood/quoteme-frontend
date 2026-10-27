// QM ADMIN: RESTAURANT LOADS, the list (Moose, 2026-10-24: "a page in the
// qmadmin for me to plug in a list, and have it run soup to nuts").
//
// Upload a crawler CSV export here. The server stores it and queues a dry run,
// which writes nothing; the detail page shows the dry run report and holds the
// Apply and Revert controls.
//
// READS GET /api/v1/admin/restaurant_load_batches (newest first, paged).
// WRITES POST /api/v1/admin/restaurant_load_batches (multipart `file`).
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Upload } from 'lucide-react';
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
  getRestaurantLoadBatches,
  uploadRestaurantLoadBatch,
  type RestaurantLoadBatch,
} from '../../services/adminApi';
import { AdminEmptyState } from './_adminEmptyState';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';
import {
  RESTAURANT_LOAD_POLL_MS,
  UPLOAD_TOO_LARGE_NOTE,
  formatWhen,
  isRestaurantLoadRunning,
  restaurantLoadStatusWords,
  whoEmail,
} from './_restaurantLoadStatus';

const PER_PAGE = 25;

function countsCell(b: RestaurantLoadBatch, kind: 'restaurants' | 'menus') {
  const c = b.ledger_counts;
  if (!c) return <span className="text-gray-300">-</span>;
  const created = kind === 'restaurants' ? c.restaurants_created : c.menus_created;
  const updated = kind === 'restaurants' ? c.restaurants_updated : c.menus_updated;
  return (
    <span>
      {created} created, {updated} updated
    </span>
  );
}

export function QMAdminRestaurantLoads({ pollMs = RESTAURANT_LOAD_POLL_MS }: { pollMs?: number } = {}) {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<RestaurantLoadBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, per_page: PER_PAGE, total_count: 0, total_pages: 0 });

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadTooLarge, setUploadTooLarge] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const res = await getRestaurantLoadBatches({ page, per_page: PER_PAGE });
    if (res.data) {
      setBatches(res.data.restaurant_load_batches);
      setMeta({
        page: res.data.page,
        per_page: res.data.per_page,
        total_count: res.data.total_count,
        total_pages: res.data.total_pages,
      });
      setError(null);
    } else if (!quiet) {
      setError(res.error || 'Failed to load');
    }
    if (!quiet) setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the visible statuses current while any row on this page is still
  // being worked on. One request at a time: the next is scheduled only after
  // the last one settled.
  const anyRunning = batches.some((b) => isRestaurantLoadRunning(b.status));
  useEffect(() => {
    if (!anyRunning) return;
    const timer = setTimeout(() => load(true), pollMs);
    return () => clearTimeout(timer);
  }, [anyRunning, batches, load, pollMs]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadTooLarge(false);
    const res = await uploadRestaurantLoadBatch(file);
    setUploading(false);
    if (res.data) {
      navigate(`/qm-admin/restaurant-loads/${res.data.restaurant_load_batch.id}`);
      return;
    }
    setUploadError(res.error || 'Upload failed');
    setUploadTooLarge(res.status === 413);
  };

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1 className="text-2xl font-bold text-[#2A2A2A] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        Restaurant loads
      </h1>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Upload a crawler CSV export. The server runs a dry run first, which writes nothing. Open the
        load to read the dry run report, then load it into production or revert it.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Crawler CSV file"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setUploadError(null);
              setUploadTooLarge(false);
            }}
            className="text-sm text-[#4F4F4F] file:mr-3 file:rounded-md file:border file:border-gray-200 file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm"
          />
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white flex items-center gap-1.5"
          >
            <Upload size={15} />
            {uploading ? 'Uploading...' : 'Upload and run the dry run'}
          </Button>
        </div>
        {uploadError && (
          <div role="alert" className="mt-3 text-sm text-red-600">
            <p>{uploadError}</p>
            {uploadTooLarge && <p className="mt-1">{UPLOAD_TOO_LARGE_NOTE}</p>}
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400 py-8">Loading...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}

      {!loading && !error && batches.length === 0 && <AdminEmptyState label="restaurant loads" />}

      {!loading && batches.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded by</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Restaurants</TableHead>
                  <TableHead>Menus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.id} className="hover:bg-gray-50" data-testid={`restaurant-load-row-${b.id}`}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/qm-admin/restaurant-loads/${b.id}`}
                        className="text-[#2A2A2A] hover:text-[#7FAEC2] hover:underline"
                      >
                        {b.filename || 'Unnamed file'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-right">{b.row_count ?? '-'}</TableCell>
                    <TableCell className="text-sm">{restaurantLoadStatusWords(b.status)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{whoEmail(b)}</TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">{formatWhen(b.created_at)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{countsCell(b, 'restaurants')}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{countsCell(b, 'menus')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {!loading && meta.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-400">
            Showing {(meta.page - 1) * meta.per_page + 1} to{' '}
            {Math.min(meta.page * meta.per_page, meta.total_count)} of {meta.total_count}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <span className="text-xs text-gray-500">
              Page {meta.page} of {meta.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
