import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Upload, Camera, X, ChevronLeft, ChevronRight, FileText, Clock, RefreshCw } from 'lucide-react';
import {
  uploadRestaurantMenuFiles,
  getRestaurantMenuUpload,
  MenuUploadKind,
  MenuUploadStatus,
} from '../../services/adminApi';
import { TIMEOUT_MUTATION_MESSAGE } from '../../services/requestPolicy';

// UPLOAD MENU / UPLOAD WINE LIST on the QM admin restaurant page (Moose,
// 2026-10-30). Each chosen file goes up in its own request, so each has its
// own progress line and a failed file is retried on its own. The server hands
// every file to the same intake as the rep tablet photos (QuoteMe
// MenuPhotoIntake), reads it, and pairs once a menu and a wine list are both
// on file. This section polls the server's read of each upload.
// WRITER: the server (menus row, read, pairing). READER: this section.
//
// PAGES OF ONE LIST (Moose, 2026-11-03: "a drag and drop in every qm admin
// restaurant page ... pull it up on my phone and take a picture directly ...
// i'll sometimes need to take multiple pictures of the wine list"). Photos
// dropped on the page area, chosen, or taken with the phone camera queue as
// numbered pages. They can be removed or moved, and go up together in one
// request with pages=1, so the server reads them as ONE list in page order
// (QuoteMe MenuPhotoIntake files:). The two Upload buttons above it keep
// their old meaning: each chosen file is its own upload.
// WRITER of the page queue and of pages=1: this section. READER of pages=1:
// QuoteMe RestaurantMenuUploadsController#create.

// SAY WHAT WENT WRONG (Moose, 2026-11-11: "We should communicate issues with
// uploads: too big, doesn't look right, low bandwidth, whatever"). Spinners
// circled for 15+ minutes on prod with no word. Every row now says what is
// happening: queued vs running pairing, a refusal in plain words, a dropped
// or slow connection, and a line after a long wait that it is safe to leave.
//
// 'queued': pairing.queue === "queued" (QuoteMe, 11-11). Calm clock, no spinner.
// 'stalled': polling stopped after MAX_POLLS. Calm clock and a Check again.
// NEW MENU (Moose, 2026-11-12: "Have a different colored button for NEW
// menu, this should follow the button we made on the manager tablet for new
// menu."). "Upload menu" now ADDS to the menu on file (the server combines
// every uploaded menu). "New menu" REPLACES it: a confirm first, then the
// files go up with replace=1, as one list (pages=1) when there are several.
// Styled after the PairMe staff tablet's "Menu changing?" button
// (pairme apps/pairme/src/screens/staff/MenuChanging.jsx): pear, navy ink,
// pill, refresh icon. Menu only: the server already uses the newest wine list.
// WRITER of replace=1: this section. READER: RestaurantMenuUploadsController.
const PEAR = '#EFB96B';
const NAVY = '#1F2A44';
export const NEW_MENU_QUESTION = 'Replace the menu on file? Pairing will read only what you upload now.';

type Phase = 'uploading' | 'reading' | 'queued' | 'pairing' | 'stalled' | 'done' | 'failed';

interface Item {
  key: string;
  /** One file for a plain upload; every page, in order, for a page list. */
  files: File[];
  /** True when files went up as the pages of one list (pages=1). */
  asPages: boolean;
  /** True for New menu: the upload replaces the menu on file (replace=1). */
  replace?: boolean;
  /** What the line calls the upload: the file name, or "Wine list, 3 pages". */
  label: string;
  kind: MenuUploadKind;
  phase: Phase;
  message: string;
  menuId?: string;
  /** False when sending the same file again cannot help (wrong type, too large here). */
  retry?: boolean;
}

interface Page {
  id: string;
  file: File;
  /** Object URL for a photo's thumbnail; none for a PDF or without URL support. */
  url?: string;
}

const LABEL: Record<MenuUploadKind, string> = { menu: 'Menu', wine_list: 'Wine list' };
const ACCEPT = 'image/*,application/pdf';
const MAX_PAGES = 20;
/** QuoteMe MenuPhotoIntake::MAX_BYTES = 25.megabytes. Checked here before sending. */
export const MAX_FILE_MB = 25;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

/** Every line this section adds for a problem or a long wait. */
export const UPLOAD_COPY = {
  tooLarge: `That file is too large. The limit is ${MAX_FILE_MB} MB per file.`,
  notPhotoOrPdf: 'That is not a photo or a PDF. Upload a photo or a PDF.',
  tooManyFiles: 'Too many files. Send 20 or fewer at a time.',
  tooManyPages: `Too many pages. One list holds ${MAX_PAGES} pages at most.`,
  unreadable: "We couldn't read that file. Try a clearer, straight-on photo.",
  connection: 'The connection dropped. Check your signal and retry.',
  timedOut: 'The connection is slow and we did not hear back, so this may have gone through. Retry if it does not show up.',
  slowUpload: 'Still uploading. The connection looks slow.',
  pollDropped: 'The connection dropped. Still checking.',
  gone: 'That upload is no longer on file. Upload it again.',
  stale: 'Still working. This can take a while, and it is safe to leave this page.',
  stalled: 'Still working. Check back later. It is safe to leave this page.',
} as const;

/**
 * The line for an upload the server (or the connection) refused. retry: false
 * when sending the same file again cannot help.
 * READER of error_code: this function. WRITER: QuoteMe
 * RestaurantMenuUploadsController / MenuPhotoIntake::Refused.
 */
export function describeRefusal(r: { error?: string | null; error_code?: string | null; status?: number }): { message: string; retry: boolean } {
  switch (r.error_code) {
    case 'FILE_TOO_LARGE': return { message: UPLOAD_COPY.tooLarge, retry: true };
    case 'NOT_PHOTO_OR_PDF': return { message: UPLOAD_COPY.notPhotoOrPdf, retry: false };
    case 'TOO_MANY_FILES': return { message: UPLOAD_COPY.tooManyFiles, retry: false };
    case 'TOO_MANY_PAGES': return { message: UPLOAD_COPY.tooManyPages, retry: false };
  }
  if (r.status === 413) return { message: UPLOAD_COPY.tooLarge, retry: false };
  if (r.error === TIMEOUT_MUTATION_MESSAGE) return { message: UPLOAD_COPY.timedOut, retry: true };
  // No HTTP status at all: the request never got an answer (offline, dropped).
  if (r.status == null) return { message: UPLOAD_COPY.connection, retry: true };
  return { message: r.error || 'Upload failed.', retry: true };
}

function photoOrPdf(f: File): boolean {
  return f.type.startsWith('image/') || f.type === 'application/pdf';
}

function pagesLabel(kind: MenuUploadKind, n: number): string {
  return `${LABEL[kind]}, ${n} ${n === 1 ? 'page' : 'pages'}`;
}

// How often the page asks, and for how long before it stops and leaves the
// last line on screen. A pairing run can take several minutes.
const DEFAULT_POLL_MS = 3000;
const MAX_POLLS = 400;
// A read or a pairing run sitting in one state longer than this gets the
// "still working, safe to leave" line. An upload still going after
// DEFAULT_SLOW_UPLOAD_MS says the connection looks slow.
const DEFAULT_STALE_MS = 5 * 60 * 1000;
const DEFAULT_SLOW_UPLOAD_MS = 30_000;

/** The line shown for a server read. terminal: stop polling. */
export function describeUpload(s: MenuUploadStatus): { phase: Phase; message: string; terminal: boolean } {
  const label = LABEL[s.kind] ?? 'File';
  if (s.status === 'extracting') return { phase: 'reading', message: 'Reading...', terminal: false };
  if (s.status === 'failed') {
    const why = s.error || UPLOAD_COPY.unreadable;
    const message = s.error_page ? `Page ${s.error_page} could not be read. ${why}` : why;
    return { phase: 'failed', message, terminal: true };
  }
  const p = s.pairing;
  if (p?.state === 'started' && p.queue === 'queued') {
    return { phase: 'queued', message: `${label} received. Pairing queued.`, terminal: false };
  }
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
      return {
        phase: 'done',
        message: `${label} received. Pairing waits for a menu. No food menu is on file for this restaurant yet. Upload the menu and pairing starts.`,
        terminal: true,
      };
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

export function MenuUploadSection({
  restaurantId,
  restaurantName,
  pollMs = DEFAULT_POLL_MS,
  staleMs = DEFAULT_STALE_MS,
  slowUploadMs = DEFAULT_SLOW_UPLOAD_MS,
  maxPolls = MAX_POLLS,
}: {
  restaurantId: string;
  restaurantName?: string;
  pollMs?: number;
  staleMs?: number;
  slowUploadMs?: number;
  maxPolls?: number;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pageNote, setPageNote] = useState('');
  const cameraInput = useRef<HTMLInputElement>(null);
  const pagesInput = useRef<HTMLInputElement>(null);
  const pageUrls = useRef<Set<string>>(new Set());
  const menuInput = useRef<HTMLInputElement>(null);
  const listInput = useRef<HTMLInputElement>(null);
  const newMenuInput = useRef<HTMLInputElement>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const alive = useRef(true);
  const seq = useRef(0);
  // Per row: which send is current (a Retry starts a new one), and since when
  // the row has sat in its current waiting phase.
  const attempt = useRef<Map<string, number>>(new Map());
  const uploading = useRef<Set<string>>(new Set());
  const since = useRef<Map<string, { phase: Phase; at: number }>>(new Map());

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    const urls = pageUrls.current;
    return () => {
      alive.current = false;
      pending.forEach(clearTimeout);
      pending.clear();
      urls.forEach((u) => revoke(u));
      urls.clear();
    };
  }, []);

  function patch(key: string, change: Partial<Item>) {
    if (!alive.current) return;
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...change } : it)));
  }

  function after(ms: number, fn: () => void) {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }

  /** The line plus, after a long wait in the same phase, the safe-to-leave note. */
  function withWait(key: string, phase: Phase, message: string): string {
    const now = Date.now();
    const seen = since.current.get(key);
    const at = seen && seen.phase === phase ? seen.at : now;
    since.current.set(key, { phase, at });
    return now - at >= staleMs ? `${message} ${UPLOAD_COPY.stale}` : message;
  }

  function poll(key: string, menuId: string, n = 0) {
    const run = attempt.current.get(key);
    after(pollMs, async () => {
      if (!alive.current || attempt.current.get(key) !== run) return;
      const res = await getRestaurantMenuUpload(restaurantId, menuId);
      if (!alive.current || attempt.current.get(key) !== run) return;
      const more = n + 1 < maxPolls;
      if (!res.data) {
        if (res.status === 404) {
          patch(key, { phase: 'failed', message: UPLOAD_COPY.gone, retry: true });
          return;
        }
        if (res.status == null) patch(key, { message: UPLOAD_COPY.pollDropped });
        if (more) poll(key, menuId, n + 1);
        else patch(key, { phase: 'stalled', message: UPLOAD_COPY.stalled });
        return;
      }
      const d = describeUpload(res.data);
      const message = d.terminal ? d.message : withWait(key, d.phase, d.message);
      patch(key, { phase: d.phase, message });
      if (d.terminal) return;
      if (more) poll(key, menuId, n + 1);
      else patch(key, { phase: 'stalled', message: UPLOAD_COPY.stalled });
    });
  }

  function checkAgain(key: string, menuId: string) {
    patch(key, { phase: 'reading', message: 'Checking...' });
    poll(key, menuId);
  }

  async function send(key: string, files: File[], kind: MenuUploadKind, asPages: boolean, replace = false) {
    const run = (attempt.current.get(key) ?? 0) + 1;
    attempt.current.set(key, run);
    since.current.delete(key);
    uploading.current.add(key);
    patch(key, { phase: 'uploading', message: 'Uploading...', menuId: undefined, retry: undefined });
    after(slowUploadMs, () => {
      if (attempt.current.get(key) === run && uploading.current.has(key)) {
        patch(key, { message: UPLOAD_COPY.slowUpload });
      }
    });
    const opts = { ...(asPages ? { pages: true } : {}), ...(replace ? { replace: true } : {}) };
    const res = Object.keys(opts).length > 0
      ? await uploadRestaurantMenuFiles(restaurantId, kind, files, opts)
      : await uploadRestaurantMenuFiles(restaurantId, kind, files);
    if (attempt.current.get(key) !== run) return;
    uploading.current.delete(key);
    const taken = res.data?.uploads?.[0];
    if (!taken || !taken.menu_id) {
      // A per-file refusal inside a 202 carries its own code; otherwise the
      // response's own error, code and status say what happened.
      const why = describeRefusal(taken ? { ...taken, status: 202 } : res);
      patch(key, { phase: 'failed', message: why.message, retry: why.retry });
      return;
    }
    patch(key, { phase: 'reading', message: 'Reading...', menuId: taken.menu_id });
    poll(key, taken.menu_id);
  }

  function nextKey(): string {
    seq.current += 1;
    return `u${seq.current}`;
  }

  function choose(kind: MenuUploadKind, list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    // Too large for the server: say so on the row and never send it.
    const added: Item[] = files.map((file) => (file.size > MAX_FILE_BYTES
      ? {
        key: nextKey(), files: [file], asPages: false, label: file.name, kind,
        phase: 'failed', message: UPLOAD_COPY.tooLarge, retry: false,
      }
      : {
        key: nextKey(), files: [file], asPages: false, label: file.name, kind, phase: 'uploading', message: 'Uploading...',
      }));
    setItems((prev) => [...added, ...prev]);
    added.forEach((it) => { if (it.phase === 'uploading') void send(it.key, it.files, it.kind, it.asPages); });
  }

  // NEW MENU: one upload that replaces the menu on file. Several files go as
  // the pages of one menu, since separate uploads would each replace the last.
  function sendNewMenu(files: File[]) {
    if (files.length === 0) return;
    const asPages = files.length > 1;
    const big = files.find((f) => f.size > MAX_FILE_BYTES);
    const item: Item = {
      key: nextKey(), files, asPages, replace: true,
      label: asPages ? `New menu, ${files.length} pages` : `New menu, ${files[0].name}`,
      kind: 'menu',
      phase: big ? 'failed' : 'uploading',
      message: big ? `${big.name}: ${UPLOAD_COPY.tooLarge}` : 'Uploading...',
      retry: big ? false : undefined,
    };
    setItems((prev) => [item, ...prev]);
    if (!big) void send(item.key, item.files, item.kind, item.asPages, true);
  }

  // Continue in the confirm: send the queued pages as the new menu, or, with
  // nothing queued, open the file picker.
  function continueNewMenu() {
    setConfirmNew(false);
    if (pages.length > 0) {
      const files = pages.map((p) => p.file);
      clearQueue();
      sendNewMenu(files);
      return;
    }
    newMenuInput.current?.click();
  }

  function clearQueue() {
    pages.forEach((p) => {
      if (p.url) {
        revoke(p.url);
        pageUrls.current.delete(p.url);
      }
    });
    setPages([]);
    setPageNote('');
  }

  // The page queue.
  function revoke(url: string) {
    if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  }

  function addPages(list: FileList | File[] | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const ok = files.filter((f) => photoOrPdf(f) && f.size <= MAX_FILE_BYTES);
    const refused = files.filter((f) => !photoOrPdf(f));
    const big = files.filter((f) => photoOrPdf(f) && f.size > MAX_FILE_BYTES);
    const room = MAX_PAGES - pages.length;
    const taken = ok.slice(0, Math.max(room, 0));
    const notes: string[] = [];
    if (refused.length > 0) notes.push(`${refused.map((f) => f.name).join(', ')} is not a photo or a PDF, so it was left out.`);
    if (big.length > 0) notes.push(`${big.map((f) => f.name).join(', ')} is over the ${MAX_FILE_MB} MB limit, so it was left out.`);
    if (ok.length > taken.length) notes.push(`One list holds ${MAX_PAGES} pages at most.`);
    setPageNote(notes.join(' '));
    if (taken.length === 0) return;
    const added: Page[] = taken.map((file) => {
      let url: string | undefined;
      if (file.type.startsWith('image/') && typeof URL.createObjectURL === 'function') {
        url = URL.createObjectURL(file);
        pageUrls.current.add(url);
      }
      return { id: nextKey(), file, url };
    });
    setPages((prev) => [...prev, ...added]);
  }

  function removePage(id: string) {
    setPages((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone?.url) {
        revoke(gone.url);
        pageUrls.current.delete(gone.url);
      }
      return prev.filter((p) => p.id !== id);
    });
  }

  function movePage(index: number, by: -1 | 1) {
    setPages((prev) => {
      const to = index + by;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  function sendPages(kind: MenuUploadKind) {
    if (pages.length === 0) return;
    const files = pages.map((p) => p.file);
    const item: Item = {
      key: nextKey(), files, asPages: true, label: pagesLabel(kind, files.length), kind,
      phase: 'uploading', message: 'Uploading...',
    };
    clearQueue();
    setItems((prev) => [item, ...prev]);
    void send(item.key, item.files, item.kind, item.asPages);
  }

  return (
    <section className="mb-8 scroll-mt-16" id="menu-upload" data-testid="menu-upload-section">
      <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
        Menu and wine list
      </h2>
      <div className="bg-white border border-gray-200 rounded-xl px-4 sm:px-5 py-4 flex flex-col gap-3 min-w-0">
        {restaurantName && (
          <p className="text-base text-[#2A2A2A] break-words" data-testid="upload-restaurant-name">
            Uploading to <strong className="font-semibold">{restaurantName}</strong>
          </p>
        )}

        <div
          data-testid="upload-dropzone"
          data-dragging={dragging ? 'true' : 'false'}
          onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addPages(e.dataTransfer?.files ?? null);
          }}
          className={`rounded-xl border-2 border-dashed px-4 py-5 flex flex-col gap-3 transition-colors ${
            dragging ? 'border-[#7a1f2b] bg-[#7a1f2b]/5' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <p className="text-sm text-gray-700">
            <span className="font-medium">Photos of one menu or one wine list.</span>{' '}
            Drag photos or PDFs here, or take a photo of each page. Every page goes up together and is read as one list, in this order.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#7a1f2b] text-white text-sm font-medium hover:opacity-90 w-full sm:w-auto"
            >
              <Camera className="w-4 h-4" aria-hidden="true" />
              {pages.length === 0 ? 'Take photo' : 'Add another page'}
            </button>
            <button
              type="button"
              onClick={() => pagesInput.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 bg-white text-[#2A2A2A] text-sm font-medium hover:bg-gray-50 w-full sm:w-auto"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              Choose photos or PDFs
            </button>
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              data-testid="page-camera-input"
              aria-label="Take a photo of a page"
              onChange={(e) => { addPages(e.target.files); e.target.value = ''; }}
            />
            <input
              ref={pagesInput}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              data-testid="page-files-input"
              aria-label="Pages, photos or PDFs"
              onChange={(e) => { addPages(e.target.files); e.target.value = ''; }}
            />
          </div>
          {pageNote && <p className="text-sm text-red-600" role="alert">{pageNote}</p>}

          {pages.length > 0 && (
            <>
              <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="page-queue" aria-label="Pages to send">
                {pages.map((p, i) => (
                  <li
                    key={p.id}
                    data-testid="queued-page"
                    className="relative flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-2 min-w-0"
                  >
                    <div className="aspect-[3/4] w-full overflow-hidden rounded bg-gray-100 flex items-center justify-center">
                      {p.url ? (
                        <img src={p.url} alt={`Page ${i + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <FileText className="w-8 h-8 text-gray-400" aria-label={`Page ${i + 1}, ${p.file.name}`} />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-[#2A2A2A]">Page {i + 1}</span>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => movePage(i, -1)}
                          disabled={i === 0}
                          className="p-2 text-gray-600 disabled:opacity-30"
                          aria-label={`Move page ${i + 1} earlier`}
                        >
                          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePage(i, 1)}
                          disabled={i === pages.length - 1}
                          className="p-2 text-gray-600 disabled:opacity-30"
                          aria-label={`Move page ${i + 1} later`}
                        >
                          <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePage(p.id)}
                          className="p-2 text-red-600"
                          aria-label={`Remove page ${i + 1}`}
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 truncate">{p.file.name}</span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-col sm:flex-row gap-2">
                {(['wine_list', 'menu'] as MenuUploadKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => sendPages(kind)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#2A2A2A] text-white text-sm font-medium hover:opacity-90 w-full sm:w-auto"
                  >
                    {`Send ${pages.length} ${pages.length === 1 ? 'page' : 'pages'} as the ${kind === 'menu' ? 'menu' : 'wine list'}`}
                  </button>
                ))}
                <button
                  type="button"
                  data-testid="queue-new-menu"
                  onClick={() => setConfirmNew(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-bold hover:opacity-90 w-full sm:w-auto"
                  style={{ background: PEAR, color: NAVY }}
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  {`Send ${pages.length} ${pages.length === 1 ? 'page' : 'pages'} as a new menu`}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-sm text-gray-600">
          Separate files, several at once: each file is read on its own. Pairing starts once a menu and a wine list are both on file.
        </p>
        <div className="flex flex-wrap items-start gap-3">
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
              {kind === 'menu' && (
                <p className="mt-1 text-xs text-gray-500" data-testid="upload-menu-adds">Adds to the menu on file</p>
              )}
              <input
                ref={kind === 'menu' ? menuInput : listInput}
                type="file"
                multiple
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
          <div>
            <button
              type="button"
              data-testid="new-menu-button"
              onClick={() => setConfirmNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold hover:opacity-90"
              style={{ background: PEAR, color: NAVY }}
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              New menu
            </button>
            <p className="mt-1 text-xs text-gray-500">Replaces the menu on file</p>
            <input
              ref={newMenuInput}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              data-testid="upload-input-new-menu"
              aria-label="New menu files"
              onChange={(e) => {
                sendNewMenu(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
          </div>
        </div>
        {confirmNew && <NewMenuConfirm onContinue={continueNewMenu} onCancel={() => setConfirmNew(false)} />}
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
                {(it.phase === 'queued' || it.phase === 'stalled') && (
                  <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                )}
                <span className="font-medium text-[#2A2A2A] break-all">{it.label}</span>
                <span className={it.phase === 'failed' ? 'text-red-600' : 'text-gray-600'}>{it.message}</span>
                {it.phase === 'stalled' && it.menuId && (
                  <button
                    type="button"
                    onClick={() => checkAgain(it.key, it.menuId!)}
                    className="ml-auto text-sm font-medium text-[#7a1f2b] underline"
                    aria-label={`Check again ${it.label}`}
                  >
                    Check again
                  </button>
                )}
                {it.phase === 'failed' && it.retry !== false && (
                  <button
                    type="button"
                    onClick={() => { void send(it.key, it.files, it.kind, it.asPages, it.replace === true); }}
                    className="ml-auto text-sm font-medium text-[#7a1f2b] underline"
                    aria-label={`Retry ${it.label}`}
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

/** The New menu confirm. Cancel, the scrim, or Escape closes it and nothing is sent. */
function NewMenuConfirm({ onContinue, onCancel }: { onContinue: () => void; onCancel: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <>
      <div data-testid="new-menu-scrim" onClick={onCancel} className="fixed inset-0 z-40 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={NEW_MENU_QUESTION}
        data-testid="new-menu-confirm"
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(480px,calc(100%-32px))] bg-white rounded-2xl p-6 flex flex-col gap-5 shadow-xl"
      >
        <h3 className="m-0 text-xl font-semibold text-[#2A2A2A]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {NEW_MENU_QUESTION}
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-bold hover:opacity-90"
            style={{ background: PEAR, color: NAVY }}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Continue
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-full border border-gray-300 bg-white text-base font-semibold text-[#2A2A2A]"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
