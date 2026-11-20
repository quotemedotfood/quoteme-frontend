// One retail location on the QM admin (QuoteMe #902): a store, which is a
// restaurant row marked retail. No menu, tables, servers or food.
//
// Reads GET /api/v1/admin/retail_locations/:id. Writes PATCH .../:id (name,
// address, phone, website, group, co-brand, live or prospect, catalog id,
// price rule), POST and DELETE .../:id/logo, and a contact through the
// restaurant contacts route with this store's id.
//
// A group is picked from the list of groups and sent by its id. A catalog is
// pasted in as its id. Nothing is matched on a name.
//
// THE PRICE is always the store's shelf price as given (Moose 2026-11-18).
// There is no rule to choose, so the page only says so.
import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  getAdminRetailLocation,
  updateAdminRetailLocation,
  uploadAdminRetailLocationLogo,
  deleteAdminRetailLocationLogo,
  getAdminRestaurantGroups,
  createAdminRestaurantContact,
  attachAdminPairitCode,
  AdminRetailLocationDetail,
  AdminRetailLocationInput,
  AdminRestaurantGroup,
  RetailStatus,
} from '../../services/adminApi';
import { ADMIN_PAGE_FRAME, ADMIN_PAGE_FRAME_STYLE } from '../../components/admin/adminPageFrame';
import { RetailStatusPill, retailStatusLabel } from './QMAdminRetailLocations';
import { StoreBillingCard } from './_storeBillingCard';
import { StoreHistoryCard } from './_storeHistoryCard';
import { PairmeFlowCard } from '../../components/PairmeFlowCard';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

/** "Nov 17, 2026" from an ISO time, or a dash. */
export function loadDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const blank = (v: string) => v.trim() || null;

export function RetailLocationDetail({ locationId }: { locationId: string }) {
  const [store, setStore] = useState<AdminRetailLocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<AdminRestaurantGroup[]>([]);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', address_line_1: '', address_line_2: '', city: '', state: '', zip: '', phone: '', website: '', group_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // One small write at a time (live, co-brand, catalog, price rule, logo).
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [catalogId, setCatalogId] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  // A blank sticker put on this store by its code (the tablet can also scan it).
  const [sticker, setSticker] = useState({ code: '', name: '' });
  const [stickerNote, setStickerNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [attaching, setAttaching] = useState(false);

  const [contact, setContact] = useState({ first_name: '', last_name: '', role: '', email: '', phone: '' });
  const [addingContact, setAddingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setStore(null);
    getAdminRetailLocation(locationId).then((res) => {
      if (!live) return;
      if (res.data) setStore(res.data);
      else setError(res.error || 'Failed to load store');
      setLoading(false);
    });
    getAdminRestaurantGroups().then((res) => {
      if (live && res.data) setGroups(res.data);
    });
    return () => { live = false; };
  }, [locationId]);

  function startEdit() {
    if (!store) return;
    setForm({
      name: store.name,
      address_line_1: store.address_line_1 ?? '',
      address_line_2: store.address_line_2 ?? '',
      city: store.city ?? '',
      state: store.state ?? '',
      zip: store.zip ?? '',
      phone: store.phone ?? '',
      website: store.website ?? '',
      group_id: store.restaurant_group?.id ?? '',
    });
    setSaveError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    const res = await updateAdminRetailLocation(locationId, {
      name: form.name.trim(),
      address_line_1: blank(form.address_line_1),
      address_line_2: blank(form.address_line_2),
      city: blank(form.city),
      state: form.state.trim(),
      zip: blank(form.zip),
      phone: blank(form.phone),
      website: blank(form.website),
      restaurant_group_id: form.group_id || null,
    });
    setSaving(false);
    if (res.data) {
      setStore(res.data);
      setEditing(false);
    } else {
      setSaveError(res.error || 'Failed to save');
    }
  }

  /** One PATCH; the backend answers with the whole store. */
  async function patch(what: string, data: AdminRetailLocationInput): Promise<boolean> {
    setBusy(what);
    setActionError(null);
    const res = await updateAdminRetailLocation(locationId, data);
    setBusy(null);
    if (res.data) {
      setStore(res.data);
      return true;
    }
    setActionError(res.error || 'Failed to save');
    return false;
  }

  async function setCatalog() {
    const id = catalogId.trim();
    if (!UUID.test(id)) {
      setActionError('A catalog id looks like 80fddae4-488e-4ad8-92d9-ec2bc8d26d20.');
      return;
    }
    if (await patch('catalog', { catalog_id: id })) setCatalogId('');
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setActionError('The logo must be a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setActionError('The logo is too large. 5 MB at most.');
      return;
    }
    setBusy('logo');
    setActionError(null);
    const res = await uploadAdminRetailLocationLogo(locationId, file);
    setBusy(null);
    if (fileInput.current) fileInput.current.value = '';
    if (res.data) setStore(res.data);
    else setActionError(res.error || 'Failed to upload the logo');
  }

  async function removeLogo() {
    setBusy('logo');
    setActionError(null);
    const res = await deleteAdminRetailLocationLogo(locationId);
    setBusy(null);
    if (res.data) setStore(res.data);
    else setActionError(res.error || 'Failed to remove the logo');
  }

  const canAttach = !!(sticker.code.trim() && sticker.name.trim());

  async function attachSticker() {
    if (!canAttach || attaching) return;
    setAttaching(true);
    setStickerNote(null);
    const res = await attachAdminPairitCode(locationId, sticker.code.trim(), sticker.name.trim());
    setAttaching(false);
    if (res.data) {
      setStickerNote({ ok: true, text: `Sticker ${res.data.code} is now "${res.data.name}" at this store.` });
      setSticker({ code: '', name: '' });
    } else {
      setStickerNote({ ok: false, text: res.error || 'Failed to attach the sticker' });
    }
  }

  const canAddContact = !!(contact.first_name.trim() && contact.last_name.trim());

  async function addContact() {
    if (!canAddContact || addingContact) return;
    setAddingContact(true);
    setContactError(null);
    const res = await createAdminRestaurantContact(locationId, {
      first_name: contact.first_name.trim(),
      last_name: contact.last_name.trim(),
      ...(contact.role.trim() ? { role: contact.role.trim() } : {}),
      ...(contact.email.trim() ? { email: contact.email.trim() } : {}),
      ...(contact.phone.trim() ? { phone: contact.phone.trim() } : {}),
    });
    if (res.data) {
      setContact({ first_name: '', last_name: '', role: '', email: '', phone: '' });
      const fresh = await getAdminRetailLocation(locationId);
      if (fresh.data) setStore(fresh.data);
    } else {
      setContactError(res.error || 'Failed to add the contact');
    }
    setAddingContact(false);
  }

  if (loading) return <p className="text-sm text-gray-400 py-8">Loading…</p>;
  if (error || !store) return <p className="text-sm text-red-500 py-8">{error || 'Store not found'}</p>;

  const field = (key: keyof typeof form, label: string, cls = 'max-w-xs') => (
    <label className="block text-xs text-gray-600">
      {label}
      <Input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        aria-label={label}
        className={`mt-1 h-8 text-sm ${cls}`}
      />
    </label>
  );
  const contactField = (key: keyof typeof contact, label: string, cls = 'max-w-[10rem]') => (
    <Input
      value={contact[key]}
      onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
      onKeyDown={(e) => e.key === 'Enter' && addContact()}
      placeholder={label}
      aria-label={`Contact ${label.toLowerCase()}`}
      className={`h-8 text-sm ${cls}`}
    />
  );
  const cityLine = [store.city, store.state].filter(Boolean).join(', ');
  const address = [store.address_line_1, store.address_line_2, [cityLine, store.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const nextStatus: RetailStatus = store.status === 'active' ? 'prospect' : 'active';
  const catalog = store.catalog;
  const card = 'bg-white border border-gray-200 rounded-lg px-4 py-3 space-y-2';
  const heading = 'text-xs font-medium text-gray-600 uppercase tracking-wide';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1
          className="text-2xl font-bold text-[#2A2A2A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {store.name}
        </h1>
        <RetailStatusPill status={store.status} />
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-[#7FAEC2] h-7"
          disabled={busy === 'status'}
          onClick={() => patch('status', { status: nextStatus })}
        >
          {nextStatus === 'active' ? 'Mark live' : 'Back to prospect'}
        </Button>
      </div>
      <p className="text-sm text-gray-500 -mt-4">
        {store.status === 'active'
          ? 'Live: shoppers can open PairIt for this store.'
          : `${retailStatusLabel(store.status)}: shoppers cannot open PairIt for this store yet.`}
      </p>
      {actionError && <p className="text-xs text-red-500" role="alert">{actionError}</p>}

      <div className={card}>
        <div className="flex items-center justify-between">
          <p className={heading}>Store</p>
          {!editing && (
            <Button variant="ghost" size="sm" className="text-xs text-[#7FAEC2] h-7" onClick={startEdit}>
              <Pencil size={13} className="mr-1" />
              Edit
            </Button>
          )}
        </div>
        {!editing ? (
          <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm" data-testid="store-facts">
            <dt className="text-gray-500">Address</dt><dd>{address || '-'}</dd>
            <dt className="text-gray-500">Phone</dt><dd>{store.phone || '-'}</dd>
            <dt className="text-gray-500">Website</dt><dd className="break-all">{store.website || '-'}</dd>
            <dt className="text-gray-500">Group</dt><dd>{store.restaurant_group?.name || '-'}</dd>
            <dt className="text-gray-500">Link name</dt><dd className="break-all font-mono text-xs">{store.slug || '-'}</dd>
          </dl>
        ) : (
          <div className="space-y-2">
            {field('name', 'Name')}
            {field('address_line_1', 'Address')}
            {field('address_line_2', 'Address line 2')}
            <div className="flex flex-wrap gap-2">
              {field('city', 'City', 'max-w-[12rem]')}
              {field('state', 'State', 'max-w-[5rem]')}
              {field('zip', 'Zip', 'max-w-[7rem]')}
            </div>
            {field('phone', 'Phone')}
            {field('website', 'Website')}
            <label className="block text-xs text-gray-600">
              Group
              <select
                value={form.group_id}
                onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
                aria-label="Group"
                className="mt-1 block text-sm border border-gray-200 rounded px-2 py-1.5 bg-white max-w-xs"
              >
                <option value="">No group</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-[#7FAEC2] hover:bg-[#6a9aae] text-white text-xs h-8"
                disabled={saving || !form.name.trim() || !form.state.trim()}
                onClick={save}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
            {saveError && <p className="text-xs text-red-500" role="alert">{saveError}</p>}
          </div>
        )}
      </div>

      {/* THE STORE'S QR CODE (Moose 2026-11-18), the restaurant's card. The
          server sends it only while the store is live; a prospect's link
          answers 404, so there is no code to print yet. */}
      {store.pairit_qr ? (
        <PairmeFlowCard
          flow={store.pairit_qr}
          title="PairIt link and QR code"
          blurb="Shoppers scan this code, or open this link, to pair a wine from this store's shelf."
        />
      ) : (
        <div className={card} data-testid="store-qr-pending">
          <p className={heading}>PairIt link and QR code</p>
          <p className="text-sm text-gray-500">Mark live to get the QR.</p>
        </div>
      )}

      <StoreBillingCard store={store} onChange={setStore} card={card} heading={heading} />

      {/* SAVED PAIRINGS (Moose 2026-11-20): one day of the store's PairIt
          sessions, read only. */}
      <StoreHistoryCard storeId={store.id} card={card} heading={heading} />

      <div className={card}>
        <p className={heading}>Logo and co-brand</p>
        <div className="flex flex-wrap items-center gap-4">
          {store.logo_url ? (
            <img src={store.logo_url} alt={`${store.name} logo`} className="h-16 w-16 object-contain border border-gray-200 rounded bg-white" />
          ) : (
            <div className="h-16 w-16 flex items-center justify-center border border-dashed border-gray-300 rounded text-[10px] text-gray-400">
              No logo
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept={LOGO_TYPES.join(',')}
              aria-label="Store logo file"
              className="text-xs"
              disabled={busy === 'logo'}
              onChange={(e) => uploadLogo(e.target.files?.[0])}
            />
            {store.logo_url && (
              <Button variant="ghost" size="sm" className="text-xs text-red-600 hover:text-red-700 h-7" disabled={busy === 'logo'} onClick={removeLogo}>
                Remove logo
              </Button>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={store.co_branded}
            disabled={busy === 'co_branded'}
            onChange={(e) => patch('co_branded', { co_branded: e.target.checked })}
            aria-label="Co-branded"
          />
          Co-branded
        </label>
        <p className="text-xs text-gray-500">
          {store.co_branded
            ? store.logo_url
              ? 'Shoppers see this logo on PairIt.'
              : 'Co-branded, but there is no logo yet, so shoppers see none.'
            : 'Not co-branded: the logo is kept here and not shown to shoppers.'}
        </p>
      </div>

      <div className={card}>
        <p className={heading}>Wine catalog</p>
        {catalog ? (
          <>
            <dl className="grid grid-cols-[10rem_1fr] gap-y-1 text-sm" data-testid="catalog-facts">
              <dt className="text-gray-500">Wines shown</dt><dd>{catalog.wines_shown.toLocaleString()}</dd>
              <dt className="text-gray-500">Rows hidden</dt><dd>{catalog.wines_hidden.toLocaleString()}</dd>
              <dt className="text-gray-500">Rows in the file</dt><dd>{catalog.rows.toLocaleString()}</dd>
              <dt className="text-gray-500">Last load</dt><dd>{loadDate(catalog.last_loaded_at)}</dd>
              <dt className="text-gray-500">Catalog id</dt><dd className="break-all font-mono text-xs">{catalog.id}</dd>
              <dt className="text-gray-500">Price shoppers see</dt><dd>Shelf price, as given</dd>
            </dl>
            <p className="text-xs text-gray-500">
              Shown: active, priced, matched to a wine we know, and not a keg. Every other row is hidden from shoppers.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-600 hover:text-red-700 h-7 px-0"
              disabled={busy === 'catalog'}
              onClick={() => patch('catalog', { catalog_id: null })}
            >
              Take this catalog off the store
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">No catalog yet. Shoppers see no wines until one is set.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setCatalog()}
                placeholder="Catalog id"
                aria-label="Catalog id"
                className="max-w-sm h-8 text-sm font-mono"
              />
              <Button
                size="sm"
                className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-8"
                disabled={busy === 'catalog' || !catalogId.trim()}
                onClick={setCatalog}
              >
                Set catalog
              </Button>
            </div>
            <p className="text-xs text-gray-500">The id is printed when the store&apos;s wine file is loaded.</p>
          </>
        )}
      </div>

      <div className={card}>
        <p className={heading}>Stickers</p>
        <p className="text-xs text-gray-500">
          Put a blank sticker on this store by the code printed on it, and name the spot. Staff can also do this on the store tablet by scanning it.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={sticker.code}
            onChange={(e) => setSticker((s) => ({ ...s, code: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && attachSticker()}
            placeholder="Code, for example K7M2QX"
            aria-label="Sticker code"
            className="max-w-[14rem] h-8 text-sm font-mono"
          />
          <Input
            value={sticker.name}
            onChange={(e) => setSticker((s) => ({ ...s, name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && attachSticker()}
            placeholder="Spot, for example Aisle 7, left"
            aria-label="Sticker spot name"
            maxLength={40}
            className="max-w-xs h-8 text-sm"
          />
          <Button
            size="sm"
            className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-8"
            disabled={attaching || !canAttach}
            onClick={attachSticker}
          >
            {attaching ? 'Attaching…' : 'Attach sticker'}
          </Button>
        </div>
        {stickerNote && (
          <p className={`text-xs ${stickerNote.ok ? 'text-green-700' : 'text-red-500'}`} role={stickerNote.ok ? 'status' : 'alert'} data-testid="sticker-note">
            {stickerNote.text}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className={heading}>Contacts ({store.contacts.length})</p>
        {store.contacts.length === 0 ? (
          <p className="text-sm text-gray-400">No contacts yet.</p>
        ) : (
          <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100" data-testid="store-contacts">
            {store.contacts.map((c) => (
              <li key={c.id} className="px-4 py-2 text-sm">
                <span className="font-medium text-[#2A2A2A]">{c.first_name} {c.last_name}</span>
                {c.role && <span className="text-gray-500">, {c.role}</span>}
                <span className="block text-xs text-gray-500">{[c.email, c.phone].filter(Boolean).join(' · ') || 'No email or phone'}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {contactField('first_name', 'First name')}
          {contactField('last_name', 'Last name')}
          {contactField('role', 'Role')}
          {contactField('email', 'Email', 'max-w-[14rem]')}
          {contactField('phone', 'Phone')}
          <Button
            size="sm"
            className="bg-[#A5CFDD] hover:bg-[#7FAEC2] text-white text-xs h-8"
            disabled={addingContact || !canAddContact}
            onClick={addContact}
          >
            <Plus size={13} className="mr-1" />
            {addingContact ? 'Adding…' : 'Add contact'}
          </Button>
        </div>
        {contactError && <p className="text-xs text-red-500" role="alert">{contactError}</p>}
      </div>
    </div>
  );
}

export function QMAdminRetailLocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className={ADMIN_PAGE_FRAME} style={ADMIN_PAGE_FRAME_STYLE}>
      <Link to="/qm-admin/retail-locations" className="inline-flex items-center gap-1 text-sm text-[#7FAEC2] hover:underline mb-4">
        <ArrowLeft size={14} />
        Retail locations
      </Link>
      {id ? <RetailLocationDetail locationId={id} /> : <p className="text-sm text-red-500">Store not found</p>}
    </div>
  );
}
