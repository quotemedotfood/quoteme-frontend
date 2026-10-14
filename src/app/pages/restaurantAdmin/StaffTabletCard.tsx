// THE STAFF TABLET, on the restaurant admin's home.
//
// Moose, 2026-10-14: the servers' tablet lives at /v/<slug>/staff, lands on a
// PIN, and "a pin code in the settings page" sets it. The restaurant admin has
// no settings page, so it sits here with the other tools. Guests never see
// the address; nothing on their side links to it.
//
// Reads staff_tablet from GET /api/v1/restaurant_admin/home (null until
// paired). Writes PATCH .../staff_pin (BE RestaurantAdminHomeController
// #staff_pin). The PIN is never shown or sent back; the page only knows
// whether one is set and when.
import { useState } from 'react';
import { Tablet } from 'lucide-react';
import { setRestaurantAdminStaffPin } from '../../services/api';
import type { StaffTablet } from '../../services/adminApi';

const PIN = /^\d{4,8}$/;

function when(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function StaffTabletCard({ restaurantId, tablet: initial }: { restaurantId: string; tablet: StaffTablet }) {
  const [tablet, setTablet] = useState(initial);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(null);
    if (!PIN.test(pin)) {
      setError('Use 4 to 8 digits.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await setRestaurantAdminStaffPin(restaurantId, pin);
    setBusy(false);
    if (!res.data) {
      setError(res.error || 'Could not save the PIN');
      return;
    }
    const wasSet = tablet.pin_set;
    setTablet(res.data.staff_tablet);
    setPin('');
    setSaved(wasSet ? 'New PIN saved. Every tablet will ask for it.' : 'PIN saved. Open the address on your tablet and enter it.');
  }

  const since = when(tablet.pin_set_at);

  return (
    <section className="mb-8" data-testid="ra-staff-tablet">
      <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
        Staff tablet
      </h2>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-[#4F4F4F] mb-3">
          Open this address on the tablet at your service station. It asks for the staff PIN once, then stays open with
          tonight&apos;s pairings and every wine&apos;s learning page. Guests never see it.
        </p>
        <p className="text-sm mb-3 flex items-center gap-2">
          <Tablet size={14} className="text-[#4F4F4F] shrink-0" />
          <a href={tablet.url} target="_blank" rel="noreferrer" className="text-[#1F2A44] underline break-all" data-testid="ra-staff-tablet-url">
            {tablet.url}
          </a>
        </p>
        <p className="text-sm text-[#4F4F4F] mb-3" data-testid="ra-staff-pin-status">
          {tablet.pin_set
            ? `A staff PIN is set${since ? ` (since ${since})` : ''}. Changing it locks every tablet until they enter the new one.`
            : 'No staff PIN yet. The tablet stays locked until you set one.'}
        </p>
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <label htmlFor={`staff-pin-${restaurantId}`} className="text-xs font-medium text-[#2A2A2A]">
            {tablet.pin_set ? 'New PIN' : 'Staff PIN'}
          </label>
          <input
            id={`staff-pin-${restaurantId}`}
            data-testid="ra-staff-pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(null); }}
            placeholder="4 to 8 digits"
            className="w-36 px-2 py-1.5 rounded border border-gray-300 text-sm tracking-widest"
          />
          <button
            type="submit"
            disabled={busy || !pin}
            data-testid="ra-staff-pin-save"
            className="px-3 py-1.5 rounded text-xs font-medium border border-gray-200 text-[#2A2A2A] hover:border-gray-400 disabled:opacity-50"
          >
            {busy ? 'Saving…' : tablet.pin_set ? 'Change PIN' : 'Set PIN'}
          </button>
        </form>
        {error ? <p className="text-sm text-red-500 mt-2" data-testid="ra-staff-pin-error">{error}</p> : null}
        {saved ? <p className="text-sm text-green-700 mt-2" data-testid="ra-staff-pin-saved">{saved}</p> : null}
      </div>
    </section>
  );
}
