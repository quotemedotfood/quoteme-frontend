// UploadMenuDrawer: a restaurant uploads its own menu or wine list (PairMe 1c).
//
// Moose, 2026-09-29: "In the restaurant page, make sure to use drawers off to
// the right. Once they click on the upload menu and upload wine list".
//
// A file (PDF or a photo) or pasted text. WRITER: POST /api/v1/chef/menus
// with kind. The upload is stored pending on the restaurant; nothing is
// parsed or published from here.

import { useState } from 'react';
import { X } from 'lucide-react';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { uploadChefMenuDocument, type ChefMenuRow } from '../../services/api';

export type UploadKind = 'menu' | 'wine_list';

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/heic,image/heif,image/webp';
const MAX_BYTES = 20 * 1024 * 1024;

const COPY: Record<UploadKind, { title: string; lead: string; placeholder: string }> = {
  menu: {
    title: 'Upload menu',
    lead: 'A PDF or a photo of your menu, or paste the text.',
    placeholder: 'Dinner, fall 2026',
  },
  wine_list: {
    title: 'Upload wine list',
    lead: 'A PDF or a photo of your wine list, or paste the text.',
    placeholder: 'Wine list, fall 2026',
  },
};

export function UploadMenuDrawer({ kind, onClose, onUploaded }: {
  kind: UploadKind;
  onClose: () => void;
  onUploaded: (row: ChefMenuRow) => void;
}) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = COPY[kind];

  const pick = (f: File | null | undefined) => {
    setError(null);
    if (!f) return setFile(null);
    if (f.size > MAX_BYTES) return setError('That file is over 20 MB.');
    setFile(f);
  };

  const submit = async () => {
    if (!file && !text.trim()) return setError('Add a file or paste the text.');
    setBusy(true);
    const res = await uploadChefMenuDocument({ kind, name: name.trim(), file, rawText: text.trim() || undefined });
    setBusy(false);
    if (res.data) return onUploaded(res.data);
    setError(res.error || 'Upload failed.');
  };

  return (
    <Drawer open onOpenChange={(open) => { if (!open) onClose(); }} direction="right">
      <DrawerContent className="w-full sm:max-w-xl h-full flex flex-col" data-testid="upload-menu-drawer">
        <DrawerHeader className="border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>{copy.title}</DrawerTitle>
              <DrawerDescription className="text-sm mt-1">{copy.lead}</DrawerDescription>
            </div>
            <DrawerClose asChild>
              <button type="button" aria-label="Close" className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
          <div>
            <label htmlFor="upload-name" className="block font-semibold mb-1">Name</label>
            <input id="upload-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={copy.placeholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2" />
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center"
          >
            <label htmlFor="upload-file" className="block font-semibold mb-1">File</label>
            <p className="text-gray-500 text-sm mb-3">PDF, JPG, PNG or HEIC, up to 20 MB. Drop it here or choose one.</p>
            <input id="upload-file" type="file" accept={ACCEPT} onChange={(e) => pick(e.target.files?.[0])} />
            {file && <p className="mt-2 text-sm" data-testid="upload-file-name">{file.name}</p>}
          </div>

          <div>
            <label htmlFor="upload-text" className="block font-semibold mb-1">Or paste the text</label>
            <textarea id="upload-text" value={text} onChange={(e) => setText(e.target.value)} rows={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-2" />
          </div>

          {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={submit} disabled={busy}
              className="rounded-lg px-4 py-2 text-white" style={{ background: '#2B2B2B', opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Uploading…' : copy.title}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 border border-gray-200">Cancel</button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default UploadMenuDrawer;
