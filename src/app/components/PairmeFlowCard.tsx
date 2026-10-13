// THE PAIRME FLOW LINK AND QR CODE for one restaurant.
//
// Moose, 2026-10-13: "when the pairings have been made, i need to see the URL
// of their flow and their QR code in the restaurant view".
//
// Reads `pairme_flow` from the restaurant payload. WRITER: the backend's
// Pairme::FlowLink, which sends it only once a diner scanning the code would
// land on a walkable page; null otherwise. The QR is a PNG data URI encoded
// by the server from the same URL shown here, so the two cannot disagree.
import { useState } from 'react';
import { Copy, Download, ExternalLink } from 'lucide-react';
import type { PairmeFlow } from '../services/adminApi';

function fileSlug(url: string) {
  return url.split('/').filter(Boolean).pop() || 'pairme';
}

export function PairmeFlowCard({ flow }: { flow: PairmeFlow }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(flow.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mb-8" data-testid="pairme-flow-card">
      <h2 className="text-lg font-semibold text-[#2A2A2A] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
        PairMe link and QR code
      </h2>
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
        <img
          src={flow.qr_png}
          alt={`QR code for ${flow.url}`}
          className="w-40 h-40 self-center sm:self-auto border border-gray-100 rounded"
          data-testid="pairme-flow-qr"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#4F4F4F] mb-2">Guests scan this code, or open this link, to see the pairings.</p>
          <a
            href={flow.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#7FAEC2] hover:underline break-all inline-flex items-center gap-1"
            data-testid="pairme-flow-url"
          >
            {flow.url}
            <ExternalLink size={13} className="shrink-0" />
          </a>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border border-gray-200 text-[#2A2A2A] hover:border-gray-400"
              data-testid="pairme-flow-copy"
            >
              <Copy size={13} /> {copied ? 'Copied' : 'Copy link'}
            </button>
            <a
              href={flow.qr_png}
              download={`${fileSlug(flow.url)}-qr.png`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border border-gray-200 text-[#2A2A2A] hover:border-gray-400"
              data-testid="pairme-flow-download"
            >
              <Download size={13} /> Download QR code
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
