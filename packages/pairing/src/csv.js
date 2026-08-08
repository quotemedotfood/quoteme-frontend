/**
 * Minimal RFC4180-ish CSV parser. No dependency, because the rules bundle
 * that GET /v1/rules/bundle eventually returns is JSON row arrays (see
 * PairMe API Contract v1, section on /v1/rules/bundle), and this parser only
 * exists so the SAME three reference CSVs Cooper hand-edits
 * (wine_axes.csv, dish_axes.csv, pairing_rules.csv) can be read locally for
 * dev/tests without a build step, mirroring Python's csv.DictReader.
 *
 * Handles: quoted fields, commas inside quotes, escaped quotes ("") inside
 * quotes, \r\n or \n line endings, and a leading UTF-8 BOM (Python's
 * `open(..., encoding="utf-8-sig")` strips this; we do the same).
 *
 * @param {string} text - raw CSV text, header row first.
 * @returns {Array<Record<string, string>>} one object per data row, keyed
 *   by the header row. Values are always strings (never cast), matching
 *   csv.DictReader's behaviour in pairing_engine.py.
 */
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1); // strip BOM, like utf-8-sig
  }

  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  function pushField() {
    row.push(field);
    field = '';
  }
  function pushRow() {
    // Skip fully-empty trailing rows (e.g. a trailing newline at EOF).
    if (row.length === 1 && row[0] === '') {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  }

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  // last field/row if the file doesn't end with a newline
  if (field !== '' || row.length > 0) {
    pushField();
    pushRow();
  }

  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? r[idx] : '';
    });
    return obj;
  });
}
