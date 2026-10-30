import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import {
  uploadRestaurantMenuFiles,
  getRestaurantMenuUpload,
  MenuUploadKind,
  MenuUploadStatus,
} from '../../services/adminApi';

// UPLOAD MENU / UPLOAD WINE LIST on the QM admin restaurant page (Moose,
// 2026-10-30). Each chosen file goes up in its own request, so each has its
// own progress line and a failed file is retried on its own. The server hands
// every file to the same intake as the rep tablet photos (QuoteMe
// MenuPhotoIntake), reads it, and pairs once a menu and a wine list are both
// on file. This section polls the server's read of each upload.
// WRITER: the server (menus row, read, pairing). READER: this section.

type Phase = 'uploading' | 'reading' | 'pairing' | 'done' | 'failed';

interface Item {
  key: string;
  file: File;
  kind: MenuUploadKind;
  phase: Phase;
  message: string;
  menuId?: string;
}

const LABEL: Record<MenuUploadKind, string> = { menu: 'Menu', wine_list: 'Wine list' };
const ACCEPT = 'image/*,application/pdf';

// How often the page asks, and for how long before it stops and leaves the
// last line on screen. A pairing run can take several minutes.
const DEFAULT_POLL_MS = 3000;
const MAX_POLLS = 400;

/** The line shown for a server read. terminal: stop polling. */
export function describeUpload(s: MenuUploadStatus): { phase: Phase; message: string; terminal: boolean } {
  const label = LABEL[s.kind] ?? 'File';
  if (s.status === 'extracting') return { phase: 'reading', message: 'Reading...', terminal: false };
  if (s.status === 'failed') {
    return { phase: 'failed', message: s.error || 'We could not read that file.', terminal: true };
  }
  const p = s.pairing;
  if (!p || p.state === 'pending' || p.state === 'started') {
    return { phase: 'pairing', message: `${label} received. Pairing started.`, terminal: false };
  }
  switch (p.state) {
    case 'done': {
      const count = s.kind === 'wine_list'
        ? (p.wines != null ? `${p.wines} wines read. ` : '')
        : (p.dishes != null ? `${p.dishes} dishes read. ` : '');
      return { phase: 'done', message: `${label} received. ${count}Pairing done.`, terminal: true };
    }
    case 'failed':
      return { phase: 'failed', message: `${label} received. Pairing failed: ${p.error || 'no reason given'}.`, terminal: true };
    case 'waiting_for_menu':
      return { phase: 'done', message: `${label} received. Pairing waits for a menu.`, terminal: true };
    case 'waiting_for_list':
      return { phase: 'done', message: `${label} received. Pairing waits for a wine list.`, terminal: true };
    case 'hand_venue':
      return { phase: 'done', message: `${label} received. This restaurant's pairings were written by hand, so they were not changed.`, terminal: true };
    case 'test_seeded':
      return { phase: 'done', message: `${label} received. Test restaurant, not paired.`, terminal: true };
    case 'off':
      return { phase: 'done', message: `${label} received. Pairing is switched off.`, terminal: true };
    default:
      return { phase: 'done', message: `${label} received.`, terminal: true };
  }
}

export function MenuUploadSection({ restaurantId, pollMs = DEFAULT_POLL_MS }: { restaurantId: string; pollMs?: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const menuInput = useRef<HTMLInputElement>(null);
  const listInput = useRef<HTMLInputElement>(null);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const alive = useRef(true);
  const seq = useRef(0);

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  function patch(key: string, change: Partial<Item>) {
    if (!alive.current) return;
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...change } : it)));
  }

  function later(fn: () => void) {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, pollMs);
    timers.current.add(t);
  }

  function poll(key: string, menuId: string, n = 0) {
    later(async () => {
      if (!alive.current) return;
      const res = await getRestaurantMenuUpload(restaurantId, menuId);
      if (!res.data) {
        if (n + 1 < MAX_POLLS) poll(key, menuId, n + 1);
        return;
      }
      const d = describeUpload(res.data);
      patch(key, { phase: d.phase, message: d.message });
      if (!d.terminal && n + 1 < MAX_POLLS) poll(key, menuId, n + 1);
    });
  }

  async function send(key: string, file: File, kind: MenuUploadKind) {
    patch(key, { phase: 'uploading', message: 'Uploading...', menuId: undefined });
    const res = await uploadRestaurantMenuFiles(restaurantId, kind, [file]);
    const taken = res.data?.uploads?.[0];
    if (!taken || !taken.menu_id) {
      patch(key, { phase: 'failed', message: taken?.error || res.error || 'Upload failed.' });
      return;
    }
    patch(key, { phase: 'reading', message: 'Reading...', menuId: taken.menu_id });
    poll(key, taken.menu_id);
  }

  function choose(kind: MenuUploadKind, list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const added: Item[] = files.map((file) => {
      seq.current += 1;
      return { key: `u${seq.current}`, file, kind, phase: 'uploading', message: 'Uploading...' };
    });
    setItems((prev) => [...added, ...prev]);
    added.forEach((it) => { void send(it.key, it.file, it.kind); });
  }

  return (
    <section className="mb-8" data-testid="menu-upload-section">
      <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
        Menu and wine list
      </h2>
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex flex-col gap-3">
        <p className="text-sm text-gray-600">
          Photos or PDFs, several at once. Each file is read, and pairing starts once a menu and a wine list are both on file.
        </p>
        <div className="flex flex-wrap gap-3">
          {(['menu', 'wine_list'] as MenuUploadKind[]).map((kind) => (
            <div key={kind}>
              <button
                type="button"
                onClick={() => (kind === 'menu' ? menuInput : listInput).current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7a1f2b] text-white text-sm font-medium hover:opacity-90"
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                {kind === 'menu' ? 'Upload menu' : 'Upload wine list'}
              </button>
              <input
                ref={kind === 'menu' ? menuInput : listInput}
                type="file"
                accept={ACCEPT}
                className="hidden"
                data-testid={`upload-input-${kind}`}
                aria-label={kind === 'menu' ? 'Menu files' : 'Wine list files'}
                onChange={(e) => {
                  choose(kind, e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <ul className="flex flex-col gap-2" aria-live="polite">
            {items.map((it) => (
              <li
                key={it.key}
                data-testid="upload-item"
                data-phase={it.phase}
                className="flex flex-wrap items-center gap-2 text-sm border border-gray-100 rounded-lg px-3 py-2"
              >
                {it.phase === 'done' && <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />}
                {it.phase === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" aria-hidden="true" />}
                {(it.phase === 'uploading' || it.phase === 'reading' || it.phase === 'pairing') && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" aria-hidden="true" />
                )}
                <span className="font-medium text-[#2A2A2A]">{it.file.name}</span>
                <span className={it.phase === 'failed' ? 'text-red-600' : 'text-gray-600'}>{it.message}</span>
                {it.phase === 'failed' && (
                  <button
                    type="button"
                    onClick={() => { items.forEach((x) => { void send(x.key, x.file, x.kind); }); }}
                    className="ml-auto text-sm font-medium text-[#7a1f2b] underline"
                    aria-label={`Retry ${it.file.name}`}
                  >
                    Retry
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
