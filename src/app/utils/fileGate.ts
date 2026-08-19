// fileGate.ts - shared client-side file-type gate.
//
// WHY THIS EXISTS
// ---------------
// `accept` on an <input type="file"> is only a file-picker hint. Drag-and-drop
// bypasses it entirely, so the real defense on every upload surface has to be a
// programmatic guard. That guard was originally written inline in
// StartNewQuotePage (the menu reader) and the token-gated catalog upload page
// (TechLandingPage, route /c/:token) had none at all: any file at all could be
// dropped and POSTed.
//
// ONE VOCABULARY, TWO SURFACES
// ----------------------------
// The two surfaces genuinely accept different things: the menu reader takes a
// .txt or .gif and rejects spreadsheets, the catalog intake takes a .xlsx and
// does not take plain text. What they must NOT have is two different sets of
// rejection copy. So the copy lives here once, and the surface only supplies
// what it accepts plus the one sentence naming those formats.
//
// A rejection never names a MIME type or an extension. It says what the file
// looks like and what the surface takes, in that order.
//
// This is a leaf module on purpose: no React, no services/api. Both the pure
// unit tests and the render tests can import it without pulling a page in.

/** What one upload surface accepts, plus the sentence that names those formats. */
export interface FileGateSurface {
  /** Lower-case extensions including the leading dot, e.g. '.pdf'. */
  exts: string[];
  /** MIME prefixes matched with startsWith, e.g. 'image/'. */
  mimePrefixes: string[];
  /** Exact MIME strings. */
  mimeExact: string[];
  /** Plain-language sentence naming what this surface takes. Appended to every rejection. */
  supportedSentence: string;
}

// ─── Shared diagnosis vocabulary ─────────────────────────────────────────────
// Lifted verbatim from the original inline gate in StartNewQuotePage. The
// extension lists and MIME patterns are what let us say "this looks like a
// spreadsheet" instead of echoing "application/vnd.openxmlformats-...".

interface DiagnosisFamily {
  /** Extensions that identify this family (lower-case, leading dot). */
  exts: string[];
  /** MIME fragments that identify this family. */
  mimePattern: RegExp;
  /** The leading clause of the rejection, ending in a period. */
  clause: string;
}

const SPREADSHEET_EXTS = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.ods', '.numbers', '.tsv'];
const DOCUMENT_EXTS = ['.docx', '.doc', '.odt', '.rtf', '.pages'];

const SPREADSHEET_MIME = /spreadsheet|excel/;
const DOCUMENT_MIME = /wordprocessing|msword/;

const DIAGNOSIS_FAMILIES: DiagnosisFamily[] = [
  { exts: SPREADSHEET_EXTS, mimePattern: SPREADSHEET_MIME, clause: 'This looks like a spreadsheet.' },
  { exts: DOCUMENT_EXTS, mimePattern: DOCUMENT_MIME, clause: 'This looks like a Word document.' },
];

const GENERIC_CLAUSE = "This file type isn't supported.";

// ─── Surfaces ────────────────────────────────────────────────────────────────

/**
 * The menu reader (StartNewQuotePage). Copy mirrors the backend gate
 * (MenuTextExtractorService) exactly so the message is identical whether the
 * file is caught client-side or slips through to the server.
 */
export const MENU_SURFACE: FileGateSurface = {
  exts: ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.csv', '.txt'],
  mimePrefixes: ['image/', 'text/'],
  mimeExact: ['application/pdf', 'application/csv'],
  supportedSentence: 'The menu reader takes a PDF, photo, CSV, or text file.',
};

/**
 * The token-gated rep catalog intake (TechLandingPage, /c/:token). Accepts
 * spreadsheets, which the menu reader does not, hence the parameterisation.
 * `exts` is also the source of the page's <input accept="..."> attribute, so
 * the picker hint and the programmatic guard cannot drift apart.
 */
export const CATALOG_SURFACE: FileGateSurface = {
  exts: ['.pdf', '.csv', '.xlsx', '.jpg', '.jpeg', '.png', '.webp'],
  mimePrefixes: ['image/'],
  mimeExact: [
    'application/pdf',
    'application/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  supportedSentence: 'This takes a PDF, a spreadsheet, or photos of a printed price list.',
};

// ─── The gate ────────────────────────────────────────────────────────────────

/**
 * True when the surface itself accepts files of this family, which means the
 * family's diagnosis clause would contradict the supported-formats sentence
 * that follows it. Derived from the surface config rather than a hand-kept
 * flag, so adding an extension to a surface cannot leave a stale suppression
 * behind.
 *
 * Concretely: the catalog surface takes .xlsx, so a dropped .tsv must NOT come
 * back "This looks like a spreadsheet. This takes a PDF, a spreadsheet, ...".
 * It falls through to the generic clause instead.
 *
 * mimePrefixes are deliberately not consulted: they are coarse buckets
 * ('image/', 'text/'), never a specific document family.
 */
function surfaceAcceptsFamily(surface: FileGateSurface, family: DiagnosisFamily): boolean {
  return (
    family.exts.some((e) => surface.exts.includes(e)) ||
    surface.mimeExact.some((m) => family.mimePattern.test(m))
  );
}

/**
 * Returns plain-language rejection copy, or null if the file is accepted.
 *
 * Order matters and is preserved from the original inline gate: the ACCEPT
 * check runs first, and only a file that failed it is diagnosed. That ordering
 * is what lets a .xlsx return null on the catalog surface while returning the
 * spreadsheet clause on the menu surface.
 */
export function fileRejection(
  file: { name: string; type: string },
  surface: FileGateSurface,
): string | null {
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';

  const extOk = surface.exts.some((e) => name.endsWith(e));
  const typeOk =
    surface.mimePrefixes.some((p) => type.startsWith(p)) ||
    surface.mimeExact.some((m) => type === m);
  if (extOk || typeOk) return null;

  for (const family of DIAGNOSIS_FAMILIES) {
    if (surfaceAcceptsFamily(surface, family)) continue;
    if (family.exts.some((e) => name.endsWith(e)) || family.mimePattern.test(type)) {
      return `${family.clause} ${surface.supportedSentence}`;
    }
  }

  return `${GENERIC_CLAUSE} ${surface.supportedSentence}`;
}
