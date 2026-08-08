import { describe, it, expect } from 'vitest';
import { errorCopy, emptyStateCopy } from './errors.js';

// Every code the PairMe API Contract v1 defines, plus the two client-side
// codes apps/pairme/src/lib/api.js synthesizes (NETWORK_ERROR, UNKNOWN).
const KNOWN_CODES = [
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
  'NETWORK_ERROR',
  'UNKNOWN',
];

const EMPTY_STATE_KINDS = ['noVenues', 'noWineList', 'unreadableDish'];

// No digit-only tokens (status codes, HTTP numbers) and never the literal
// words "error_code" or "errorCode" in anything a diner reads.
function isDinerSafe(sentence) {
  expect(typeof sentence).toBe('string');
  expect(sentence.trim().length).toBeGreaterThan(0);
  expect(sentence).not.toMatch(/\berror_code\b/i);
  expect(sentence).not.toMatch(/\berrorCode\b/);
  expect(sentence).not.toMatch(/^\d+$/);
  expect(sentence).not.toMatch(/\b\d{3}\b/); // no bare HTTP status codes
  return sentence;
}

describe('errorCopy', () => {
  it('maps every known code (bare string) to a non-empty human sentence', () => {
    for (const code of KNOWN_CODES) {
      isDinerSafe(errorCopy(code));
    }
  });

  it('maps every known code as an ApiError-shaped object without a message', () => {
    for (const code of KNOWN_CODES) {
      isDinerSafe(errorCopy({ errorCode: code }));
    }
  });

  it('prefers the server message verbatim for a real server error envelope', () => {
    const serverMessage = 'Please rate between 1 and 5.';
    expect(errorCopy({ errorCode: 'RATING_OUT_OF_RANGE', message: serverMessage })).toBe(
      serverMessage
    );
    // Also accepts the raw wire shape (snake_case error_code) as sent by the API.
    expect(errorCopy({ error_code: 'NOT_FOUND', message: 'That capture is gone.' })).toBe(
      'That capture is gone.'
    );
  });

  it('does not trust a message on a client-only code, even if one is set', () => {
    const copy = errorCopy({ errorCode: 'NETWORK_ERROR', message: 'TypeError: Failed to fetch' });
    expect(copy).not.toContain('TypeError');
    expect(copy).not.toContain('Failed to fetch');
    isDinerSafe(copy);
  });

  it('never surfaces a raw exception message for an unrecognized/bare error', () => {
    const raw = new Error('ECONNRESET at socket.js:42:11, status 500');
    const copy = errorCopy(raw);
    expect(copy).not.toContain('ECONNRESET');
    expect(copy).not.toContain('socket.js');
    isDinerSafe(copy);
  });

  it('falls back safely for null, undefined, and unknown codes', () => {
    isDinerSafe(errorCopy(null));
    isDinerSafe(errorCopy(undefined));
    isDinerSafe(errorCopy('SOME_FUTURE_CODE_NOT_YET_KNOWN'));
    isDinerSafe(errorCopy({ errorCode: 'SOME_FUTURE_CODE_NOT_YET_KNOWN', message: 'x' }));
  });

  it('covers the daily rate limit (CAPTURE_DAILY_CAP) as a human sentence', () => {
    const copy = errorCopy('CAPTURE_DAILY_CAP');
    isDinerSafe(copy);
    expect(copy.toLowerCase()).toContain('limit');
  });
});

describe('emptyStateCopy', () => {
  it('maps every known empty-state kind to a non-empty human sentence', () => {
    for (const kind of EMPTY_STATE_KINDS) {
      isDinerSafe(emptyStateCopy(kind));
    }
  });

  it('covers no venues found with the out-of-coverage message', () => {
    const copy = emptyStateCopy('noVenues');
    isDinerSafe(copy);
    expect(copy.toLowerCase()).toMatch(/cover|coverage/);
  });

  it('covers no wine list separately from no venues', () => {
    expect(emptyStateCopy('noWineList')).not.toBe(emptyStateCopy('noVenues'));
  });

  it('covers an unreadable dish photo', () => {
    const copy = emptyStateCopy('unreadableDish');
    isDinerSafe(copy);
    expect(copy.toLowerCase()).toMatch(/dish|photo|plate/);
  });

  it('falls back safely for an unknown kind', () => {
    isDinerSafe(emptyStateCopy('not_a_real_kind'));
  });
});
