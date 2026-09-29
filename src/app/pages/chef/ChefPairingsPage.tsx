// ChefPairingsPage: what this restaurant's tables were shown by PairMe.
//
// Moose, 2026-09-29: "a timestamp, a name if we're given one for the diner,
// the names of the dishes that they ordered, the wines that were said to have
// been presented, an edit button for them to add wines or add dishes, and most
// importantly, a ticket or table number so that they can attribute it to a
// certain table or receipt."
//
// READER and EDITOR of GET/PATCH /api/v1/chef/pairme_presentations. The
// diner's recorded dishes and wines are shown as recorded and never edited
// here; what the house adds is shown beside them, marked "added".
//
// NEVER A BARE PRICE: every wine names producer, wine, the list it is on, the
// unit and the price. Glass and bottle are never interchangeable: the edit
// drawer offers a unit only when the list prices it.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getChefPairmePresentations,
  updateChefPairmePresentation,
  type PairmePresentationRow,
  type PairmePresentationsResponse,
  type PairmePresentedWine,
  type PairmeMenuWine,
} from '../../services/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';

const C = {
  charcoal: '#2B2B2B',
  orange: '#F2993D',
  softLine: '#E8E8E8',
  warmPaper: '#FBFAF7',
  gray700: '#4F4F4F',
  gray500: '#6B7280',
  danger: '#DC2626',
} as const;

const serif: React.CSSProperties = { fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" };
const sans: React.CSSProperties = { fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };

export function formatCents(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** "Trapet Bourgogne · Burgundy · $16 glass". Never a bare price. */
export function wineLine(w: PairmePresentedWine): string {
  const name = [w.producer, w.wine].filter(Boolean).join(' ');
  const price = formatCents(w.price_cents);
  const priced = price ? `${price} ${w.unit}` : `${w.unit}, no printed price`;
  return [name, w.list, priced].filter(Boolean).join(' · ');
}

function when(row: PairmePresentationRow): string {
  if (row.local_date && row.local_time) return `${row.local_date} ${row.local_time}`;
  return new Date(row.presented_at).toLocaleString();
}

type Load =
  | { state: 'loading' }
  | { state: 'pick'; restaurants: { id: string; name: string }[] }
  | { state: 'error'; message: string }
  | { state: 'ready'; data: PairmePresentationsResponse };

export function ChefPairingsPage() {
  const [restaurantId, setRestaurantId] = useState<string | undefined>(undefined);
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [editing, setEditing] = useState<PairmePresentationRow | null>(null);

  const fetchRows = useCallback(async (rid?: string) => {
    setLoad({ state: 'loading' });
    const res = await getChefPairmePresentations(rid);
    if (res.data) return setLoad({ state: 'ready', data: res.data });
    const extra = (res.error_data || {}) as { error_code?: string; restaurants?: { id: string; name: string }[] };
    if (extra.error_code === 'RESTAURANT_CONTEXT_REQUIRED' && extra.restaurants) {
      return setLoad({ state: 'pick', restaurants: extra.restaurants });
    }
    setLoad({ state: 'error', message: res.error || 'Could not load your tables.' });
  }, []);

  useEffect(() => { fetchRows(restaurantId); }, [fetchRows, restaurantId]);

  const replaceRow = (row: PairmePresentationRow) => {
    setLoad((prev) => prev.state !== 'ready' ? prev : {
      state: 'ready',
      data: { ...prev.data, presentations: prev.data.presentations.map((r) => (r.id === row.id ? row : r)) },
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-5 pt-6 pb-16" style={{ ...sans, color: C.charcoal }}>
      <div style={{ borderBottom: `1px solid ${C.softLine}`, paddingBottom: 18, marginBottom: 24 }}>
        <h1 style={{ ...serif, fontSize: 26, fontWeight: 600, lineHeight: 1.15, margin: 0 }}>Pairings</h1>
        <p style={{ fontSize: 13, color: C.gray500, marginTop: 5, lineHeight: 1.5 }}>
          {load.state === 'ready' && load.data.restaurant ? `${load.data.restaurant.name}. ` : ''}
          Every table that showed your server wines from PairMe, newest first. Add the ticket or table number to match it to the receipt.
        </p>
      </div>

      {load.state === 'loading' && <p style={{ fontSize: 13, color: C.gray500 }}>Loading your tables…</p>}
      {load.state === 'error' && <p role="alert" style={{ fontSize: 13, color: C.danger }}>{load.message}</p>}

      {load.state === 'pick' && (
        <div data-testid="pairings-restaurant-picker">
          <p style={{ fontSize: 14, marginBottom: 10 }}>Which restaurant?</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {load.restaurants.map((r) => (
              <button key={r.id} type="button" onClick={() => setRestaurantId(r.id)}
                style={{ border: `1px solid ${C.softLine}`, borderRadius: 999, padding: '8px 16px', background: '#fff', cursor: 'pointer', fontSize: 14 }}>
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {load.state === 'ready' && !load.data.restaurant && (
        <p style={{ fontSize: 14, color: C.gray700 }}>Your account is not linked to a restaurant yet.</p>
      )}

      {load.state === 'ready' && load.data.restaurant && load.data.presentations.length === 0 && (
        <div data-testid="pairings-empty" style={{ background: C.warmPaper, border: `1px solid ${C.softLine}`, borderRadius: 12, padding: 20, fontSize: 14, color: C.gray700 }}>
          No tables yet. When a diner shows your server wines from PairMe, the table appears here with the time, what they ordered and the wines they presented.
        </div>
      )}

      {load.state === 'ready' && load.data.restaurant && load.data.presentations.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table data-testid="pairings-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: C.gray500, fontSize: 12 }}>
                {['Time', 'Ticket or table', 'Diner', 'Dishes ordered', 'Wines presented', ''].map((h) => (
                  <th key={h} style={{ padding: '8px 10px', borderBottom: `1px solid ${C.softLine}`, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {load.data.presentations.map((row) => (
                <tr key={row.id} data-testid="pairings-row" style={{ verticalAlign: 'top', borderBottom: `1px solid ${C.softLine}` }}>
                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{when(row)}</td>
                  <td style={{ padding: '10px' }}>{row.ticket_ref || <span style={{ color: C.gray500 }}>Not set</span>}</td>
                  <td style={{ padding: '10px' }}>{row.diner_name || <span style={{ color: C.gray500 }}>Guest</span>}</td>
                  <td style={{ padding: '10px' }}>
                    {row.dishes.map((d) => <div key={`d-${d.dish_id}`}>{d.dish}</div>)}
                    {row.added_dishes.map((d) => <div key={`ad-${d.dish_id}`}>{d.dish} <Added /></div>)}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {row.wines.map((w, i) => <div key={`w-${i}`}>{wineLine(w)}</div>)}
                    {row.added_wines.map((w, i) => <div key={`aw-${i}`}>{wineLine(w)} <Added /></div>)}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button type="button" onClick={() => setEditing(row)}
                      style={{ border: `1px solid ${C.softLine}`, borderRadius: 8, padding: '6px 12px', background: '#fff', cursor: 'pointer' }}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && load.state === 'ready' && (
        <EditDrawer
          row={editing}
          menu={load.data.menu || { dishes: [], wines: [] }}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            const res = await updateChefPairmePresentation(editing.id, body, load.data.restaurant?.id);
            if (res.data) { replaceRow(res.data.presentation); setEditing(null); return null; }
            return res.error || 'Could not save.';
          }}
        />
      )}
    </div>
  );
}

function Added() {
  return <span style={{ fontSize: 11, color: C.gray500, border: `1px solid ${C.softLine}`, borderRadius: 999, padding: '0 6px' }}>added</span>;
}

type SaveBody = { ticket_ref: string; added_dish_ids: string[]; added_wines: { wine_id: string; unit: 'glass' | 'bottle' }[] };

function EditDrawer({ row, menu, onClose, onSave }: {
  row: PairmePresentationRow;
  menu: { dishes: { dish_id: string; dish: string; course: string | null }[]; wines: PairmeMenuWine[] };
  onClose: () => void;
  onSave: (body: SaveBody) => Promise<string | null>;
}) {
  const [ticket, setTicket] = useState(row.ticket_ref || '');
  const [dishIds, setDishIds] = useState<string[]>(row.added_dishes.map((d) => d.dish_id));
  const [wines, setWines] = useState(row.added_wines.map((w) => ({ wine_id: w.wine_id, unit: w.unit })));
  const [pickWine, setPickWine] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordedDishIds = useMemo(() => new Set(row.dishes.map((d) => d.dish_id)), [row]);
  const wineById = useMemo(() => new Map(menu.wines.map((w) => [w.wine_id, w])), [menu]);
  const picked = pickWine ? wineById.get(pickWine) : undefined;

  const addWine = (unit: 'glass' | 'bottle') => {
    if (!picked) return;
    setWines((prev) => [...prev, { wine_id: picked.wine_id, unit }]);
    setPickWine('');
  };

  const save = async () => {
    setSaving(true);
    setError(await onSave({ ticket_ref: ticket, added_dish_ids: dishIds, added_wines: wines }));
    setSaving(false);
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" data-testid="pairings-edit-drawer">
        <SheetHeader>
          <SheetTitle>Edit this table</SheetTitle>
          <SheetDescription>{when(row)}. What the diner presented stays as recorded; what you add is marked added.</SheetDescription>
        </SheetHeader>
        <div style={{ ...sans, padding: '0 16px 24px', fontSize: 14, color: C.charcoal }}>
          <label htmlFor="pairings-ticket" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Ticket or table number</label>
          <input id="pairings-ticket" value={ticket} maxLength={40} onChange={(e) => setTicket(e.target.value)}
            style={{ width: '100%', border: `1px solid ${C.softLine}`, borderRadius: 8, padding: '8px 10px', marginBottom: 20 }} />

          <div style={{ fontWeight: 600, marginBottom: 6 }}>Dishes ordered</div>
          {menu.dishes.length === 0 && <p style={{ color: C.gray500 }}>Your PairMe menu is not loaded yet.</p>}
          <div style={{ marginBottom: 20 }}>
            {menu.dishes.map((d) => {
              const recorded = recordedDishIds.has(d.dish_id);
              return (
                <label key={d.dish_id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0', color: recorded ? C.gray500 : C.charcoal }}>
                  <input type="checkbox" checked={recorded || dishIds.includes(d.dish_id)} disabled={recorded}
                    onChange={(e) => setDishIds((prev) => e.target.checked ? [...prev, d.dish_id] : prev.filter((x) => x !== d.dish_id))} />
                  {d.dish}{recorded ? ' (from the diner)' : ''}
                </label>
              );
            })}
          </div>

          <div style={{ fontWeight: 600, marginBottom: 6 }}>Wines added</div>
          {wines.length === 0 && <p style={{ color: C.gray500, marginBottom: 8 }}>None added.</p>}
          {wines.map((w, i) => {
            const mw = wineById.get(w.wine_id);
            const price = mw ? (w.unit === 'glass' ? mw.glass_cents : mw.bottle_cents) : null;
            return (
              <div key={`${w.wine_id}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0' }}>
                <span>{mw ? wineLine({ ...mw, unit: w.unit, price_cents: price }) : w.wine_id}</span>
                <button type="button" aria-label="Remove wine" onClick={() => setWines((prev) => prev.filter((_, j) => j !== i))}
                  style={{ border: 'none', background: 'none', color: C.danger, cursor: 'pointer' }}>Remove</button>
              </div>
            );
          })}
          <label htmlFor="pairings-wine" style={{ display: 'block', marginTop: 10, marginBottom: 6, color: C.gray700 }}>Add a wine from your list</label>
          <select id="pairings-wine" value={pickWine} onChange={(e) => setPickWine(e.target.value)}
            style={{ width: '100%', border: `1px solid ${C.softLine}`, borderRadius: 8, padding: '8px 10px' }}>
            <option value="">Choose a wine</option>
            {menu.wines.map((w) => (
              <option key={w.wine_id} value={w.wine_id}>{[w.producer, w.wine].filter(Boolean).join(' ')}{w.list ? ` · ${w.list}` : ''}</option>
            ))}
          </select>
          {picked && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {picked.glass_cents != null && (
                <button type="button" onClick={() => addWine('glass')}
                  style={{ border: `1px solid ${C.softLine}`, borderRadius: 999, padding: '6px 14px', background: '#fff', cursor: 'pointer' }}>
                  Add glass, {formatCents(picked.glass_cents)}
                </button>
              )}
              {picked.bottle_cents != null && (
                <button type="button" onClick={() => addWine('bottle')}
                  style={{ border: `1px solid ${C.softLine}`, borderRadius: 999, padding: '6px 14px', background: '#fff', cursor: 'pointer' }}>
                  Add bottle, {formatCents(picked.bottle_cents)}
                </button>
              )}
            </div>
          )}

          {error && <p role="alert" style={{ color: C.danger, marginTop: 14 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={save} disabled={saving}
              style={{ background: C.charcoal, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={onClose}
              style={{ background: 'none', border: `1px solid ${C.softLine}`, borderRadius: 8, padding: '10px 18px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ChefPairingsPage;
