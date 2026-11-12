// QM ADMIN: BOTTLE LIST PHOTOS (Assemblage brief, Moose 11-12). Every
// restaurant's waiting diner photos of a bottle list, newest first, from
// GET /api/v1/admin/bottle_list_photos. Each set has the same Use as wine
// list and Discard as the restaurant page block (BottleListPhotoCard).
import { useEffect, useState } from 'react';
import { getBottleListPhotoQueue, type DinerBottlePhotoRow } from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';
import { BottleListPhotoCard } from './_dinerBottlePhotos';

export function QMAdminBottleListPhotos() {
  const [rows, setRows] = useState<DinerBottlePhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getBottleListPhotoQueue().then((res) => {
      if (!live) return;
      if (res.data) setRows(res.data.photos);
      else setError(res.error || 'Could not load.');
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <h1 className="text-2xl font-bold text-[#2A2A2A] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
        Bottle list photos
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Diners sent these from the PairMe app. Nothing is read or paired until you use them.
      </p>

      {loading && <p className="text-sm text-gray-400 py-8">Loading...</p>}
      {error && <p className="text-sm text-red-500 py-8">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-gray-400 py-8">No photos waiting.</p>
      )}
      {rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <BottleListPhotoCard key={row.menu_id} row={row} showRestaurant />
          ))}
        </ul>
      )}
    </div>
  );
}
