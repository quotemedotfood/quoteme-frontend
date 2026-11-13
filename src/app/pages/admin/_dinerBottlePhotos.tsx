// A DINER'S PHOTOS OF THE BOTTLE LIST (Cork's request and the Assemblage
// brief, Moose 11-12). The PairMe app's Bottles fallback lets a diner
// photograph a restaurant's list; the photos wait here for the team. Nothing
// reads them or pairs from them until someone presses "Use as wine list",
// which sends them through the same read as Upload wine list (QuoteMe
// MenuPhotoIntake), and pairing follows from there. "Discard" deletes them.
//
// Two readers of the same rows:
//   DinerBottlePhotosSection  the restaurant page block, shown ONLY when the
//                             restaurant has waiting photos
//   BottleListPhotoCard       one set of photos, also used by the Bottle list
//                             photos page (every restaurant's queue)
// Reads GET .../diner_bottle_photos (QM admin only); writes .../use and
// .../discard. The rows come in the server's order (newest first).
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import {
  getRestaurantBottleListPhotos,
  takeBottleListPhotosAsWineList,
  discardBottleListPhotos,
  type DinerBottlePhotoRow,
} from '../../services/adminApi';

export function receivedLabel(iso: string | null | undefined): string {
  if (!iso) return 'Date unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Date unknown';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// What the diner photographed (Pairme::BottleListPhotos::KINDS, QuoteMe #827).
// Missing or unknown kinds read as the bottle list, the server's default.
export function kindLabel(kind: string | null | undefined): string {
  if (kind === 'glass_list') return 'By the glass list';
  if (kind === 'wine_list') return 'Wine list';
  return 'Bottle list';
}

export function pagesLabel(n: number): string {
  return n === 1 ? '1 page' : `${n} pages`;
}

type Outcome = { ok: boolean; text: string };

export function BottleListPhotoCard({
  row,
  showRestaurant = false,
}: {
  row: DinerBottlePhotoRow;
  showRestaurant?: boolean;
}) {
  const [busy, setBusy] = useState<'use' | 'discard' | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function handleUse() {
    if (busy) return;
    setBusy('use');
    const res = await takeBottleListPhotosAsWineList(row.restaurant_id, row.menu_id);
    setBusy(null);
    if (res.data) {
      setOutcome({ ok: true, text: 'Reading as the wine list. Pairing follows once it is read.' });
    } else {
      setOutcome({ ok: false, text: res.error || 'That did not go through.' });
    }
  }

  async function handleDiscard() {
    if (busy) return;
    if (!window.confirm('Discard these photos? They are deleted and cannot be brought back.')) return;
    setBusy('discard');
    const res = await discardBottleListPhotos(row.restaurant_id, row.menu_id);
    setBusy(null);
    if (res.data) {
      setOutcome({ ok: true, text: 'Discarded.' });
    } else {
      setOutcome({ ok: false, text: res.error || 'That did not go through.' });
    }
  }

  const done = outcome?.ok === true;

  return (
    <li className="border border-gray-200 rounded-lg p-3" data-testid="bottle-list-photo-set">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <div className="text-sm text-[#2A2A2A]">
          {showRestaurant && (
            <Link to={`/qm-admin/restaurants/${row.restaurant_id}`} className="font-medium underline mr-2">
              {row.restaurant_name || 'Restaurant'}
            </Link>
          )}
          <span className="font-medium mr-1" data-testid="bottle-list-photo-kind">{`${kindLabel(row.kind)}:`}</span>
          <span>{pagesLabel(row.pages)}</span>
          <span className="text-gray-500">{`, received ${receivedLabel(row.received_at)}`}</span>
          {row.signed_in && <span className="text-gray-500">, from a signed in diner</span>}
        </div>
        {!done && (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUse} disabled={busy !== null}>
              {busy === 'use' ? 'Sending...' : 'Use as wine list'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDiscard} disabled={busy !== null}>
              {busy === 'discard' ? 'Discarding...' : 'Discard'}
            </Button>
          </div>
        )}
      </div>
      {!done && row.page_urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {row.page_urls.map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" aria-label={`Page ${i + 1}`}>
              <img
                src={url}
                alt={`Page ${i + 1} of the bottle list`}
                className="h-24 w-20 object-cover rounded border border-gray-200 bg-gray-50"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}
      {outcome && (
        <p role="status" className={`mt-2 text-xs ${outcome.ok ? 'text-green-700' : 'text-red-600'}`}>
          {outcome.text}
        </p>
      )}
    </li>
  );
}

export function DinerBottlePhotosSection({ restaurantId }: { restaurantId: string }) {
  const [rows, setRows] = useState<DinerBottlePhotoRow[]>([]);

  useEffect(() => {
    let live = true;
    // A failed read shows nothing: the block is only for photos on file, and
    // must never break the restaurant page around it.
    Promise.resolve()
      .then(() => getRestaurantBottleListPhotos(restaurantId))
      .then((res) => {
        if (live) setRows(res?.data?.photos ?? []);
      })
      .catch(() => {
        if (live) setRows([]);
      });
    return () => {
      live = false;
    };
  }, [restaurantId]);

  if (rows.length === 0) return null;

  return (
    <section aria-label="Diner photos of the bottle list" className="mb-8">
      <h2 className="text-lg font-semibold text-[#2A2A2A] mb-1">Diner photos of the bottle list</h2>
      <p className="text-xs text-gray-500 mb-3">
        Sent from the PairMe app. Nothing is read or paired until you use them.
      </p>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <BottleListPhotoCard key={row.menu_id} row={row} />
        ))}
      </ul>
    </section>
  );
}
