/**
 * Plain-language error and empty-state copy for PairMe.
 *
 * The diner never sees a code, a status number, a stack trace, or the raw
 * text of an unexpected exception. Every screen that catches an error or
 * hits an empty state should render the output of `errorCopy` or
 * `emptyStateCopy` and nothing else.
 *
 * Two paths, matching "PairMe API Contract v1":
 *   1. A real server round trip. Per the contract every non-2xx response is
 *      `{ error_code, message }`, and the server already writes that message
 *      for a diner to read, so we show it verbatim.
 *   2. Anything that never reached the server (offline, a thrown JS error, a
 *      client-side empty state) or a response the server could not shape
 *      into JSON at all. There is no server message to trust here, so we
 *      supply our own sentence keyed by a stable client code.
 *
 * `apps/pairme/src/lib/api.js` already throws `ApiError(errorCode, message,
 * status)` for every failure, matching case 1 for real API codes and
 * synthesizing case 2 for NETWORK_ERROR (fetch itself failed) and UNKNOWN
 * (a non-2xx response whose body was not valid JSON). This module does not
 * import ApiError so it can be used from anywhere, including tests, with a
 * plain `{ error_code, message }` object, an `{ errorCode, message }`
 * instance, or a bare code string.
 */

// Codes the SERVER can send as part of the `{ error_code, message }`
// envelope (PairMe API Contract v1). Their `message` is written for a diner
// and is safe to render as-is.
const SERVER_CODES = new Set([
  'NO_IDENTITY',
  'NOT_FOUND',
  'CAPTURE_DAILY_CAP',
  'RATING_OUT_OF_RANGE',
  'UNSUPPORTED_FILE_TYPE',
  'PDF_TOO_LARGE',
  'PDF_TOO_MANY_PAGES',
  'PDF_UNREADABLE',
  'EXTRACTION_TRUNCATED',
  'EMPTY_RESULT',
  // GET /v1/t/:code (superset #340, table-code resolver, not built server
  // side yet - see lib/api.js's getTableCode). Its 404 message is already
  // plain language per the contract this FE codes against.
  'VENUE_NOT_FOUND',
  // AUTH CONTRACT (locked, feat/pairme-accounts-be) - POST /v1/auth/signup
  // and POST /v1/auth/login's error envelope is the same {error_code,
  // message} shape as every other endpoint above. These are the anticipated
  // codes for that endpoint (wrong password, an email already in use, a
  // malformed email), added ahead of the accounts BE actually shipping -
  // same pattern as VENUE_NOT_FOUND just above.
  'INVALID_CREDENTIALS',
  'EMAIL_TAKEN',
  'INVALID_EMAIL',
  'WEAK_PASSWORD',
]);

// Fallback copy for every known code, used when a caller passes a bare code
// string (no message to trust) or when a server message is missing or
// blank. Also covers the client-only codes that never carry a server
// message: NETWORK_ERROR (fetch failed before a response existed) and
// UNKNOWN (a non-2xx response whose body was not JSON).
const CODE_COPY = {
  NO_IDENTITY: 'Please refresh the page so we can find your session again.',
  NOT_FOUND: 'We could not find that. It may have been removed.',
  CAPTURE_DAILY_CAP: "You have hit today's scan limit. Please try again tomorrow.",
  RATING_OUT_OF_RANGE: 'That rating is out of range. Please pick a value on the scale shown.',
  UNSUPPORTED_FILE_TYPE: 'That file type is not supported. Please use a photo or a PDF of the wine list.',
  PDF_TOO_LARGE: 'That PDF is too large. Please upload a smaller file.',
  PDF_TOO_MANY_PAGES: 'That PDF has too many pages. Please upload a shorter wine list.',
  PDF_UNREADABLE: 'We could not read that PDF. Please try a clearer scan or a photo instead.',
  EXTRACTION_TRUNCATED: 'The wine list was too long to read in full. We used what we could find.',
  EMPTY_RESULT: 'We could not find anything to read in that. Please try again with a clearer photo.',
  VENUE_NOT_FOUND: "We could not find that table. Ask your server for the code, or point your camera at the wine list instead.",
  INVALID_CREDENTIALS: 'That email and password do not match. Please try again.',
  EMAIL_TAKEN: 'An account already exists for that email. Try logging in instead.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  WEAK_PASSWORD: 'Please choose a longer password.',
  NETWORK_ERROR: 'We could not reach the server. Please check your connection and try again.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Map an API error (an ApiError instance, a plain `{ error_code, message }`
 * or `{ errorCode, message }` object, a bare code string, or any other
 * thrown value) to a single human sentence a diner can act on.
 */
export function errorCopy(errOrCode) {
  if (errOrCode == null) return FALLBACK_MESSAGE;

  if (typeof errOrCode === 'string') {
    return CODE_COPY[errOrCode] || FALLBACK_MESSAGE;
  }

  const code = errOrCode.errorCode || errOrCode.error_code;
  const message = typeof errOrCode.message === 'string' ? errOrCode.message.trim() : '';

  // Real server round trip with a message the server wrote for a diner.
  if (code && message && SERVER_CODES.has(code)) {
    return message;
  }

  // A known code with no usable message, or a client-only code.
  if (code && CODE_COPY[code]) return CODE_COPY[code];

  // A bare exception, an unrecognized code, or nothing usable at all. Never
  // fall back to `errOrCode.message` here, it may be a technical string
  // (e.g. "Failed to fetch", a stack trace, a JSON parse error).
  return FALLBACK_MESSAGE;
}

// Stable client-side keys for empty states the UI detects on its own, not
// from a server error envelope (an empty list is not a failure).
const EMPTY_STATE_COPY = {
  noVenues: "We don't cover this spot yet. Point your camera at the wine list anyway, it still works, and it helps us add this place next.",
  noWineList: "We don't have their wine list. That's on us, not you. Point your camera at the list and we'll read it, it helps the next person here too.",
  unreadableDish: "We couldn't make out the dish in that photo. Try again with the plate centered and the light turned up.",
};

/**
 * Map a client-detected empty state (no server error involved) to a human
 * sentence. `kind` is one of 'noVenues', 'noWineList', 'unreadableDish'.
 */
export function emptyStateCopy(kind) {
  return EMPTY_STATE_COPY[kind] || FALLBACK_MESSAGE;
}
