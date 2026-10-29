// CUSTOMER NAME FOR DISPLAY (Moose, admin walk 2026-10-29).
//
// Only a name that arrives in ALL CAPS is changed: each word gets a capital
// first letter and lower case after it ("LA FORET" -> "La Foret"). A name
// with any lower case letter in it is shown exactly as stored ("McGregor",
// "the Kitchen"). Display only; the stored name is never rewritten.

// A word starts after whitespace or after one of these.
const WORD_BREAKS = new Set(['-', '/', '(', '&', '.']);

export function isAllCaps(name: string): boolean {
  return name.toUpperCase() === name && name.toLowerCase() !== name;
}

export function displayCustomerName(name: string | null | undefined): string {
  if (name == null) return '';
  if (!isAllCaps(name)) return name;

  let out = '';
  let startOfWord = true;
  for (const ch of name) {
    if (/\s/.test(ch) || WORD_BREAKS.has(ch)) {
      out += ch;
      startOfWord = true;
      continue;
    }
    out += startOfWord ? ch : ch.toLowerCase();
    startOfWord = false;
  }
  return out;
}
