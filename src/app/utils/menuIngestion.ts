// Shared menu-ingestion logic, extracted from StartNewQuotePage so the public
// distributor lander (/d/:slug) can use the same parser rather than a copy.
//
// LOGIC ONLY, NO JSX, and that is deliberate. The two surfaces do not share a
// styling system: StartNewQuotePage is Tailwind classes, DistributorLanderPage
// is inline styles driven by its own `C` palette so it can render a
// distributor's branding. Extracting the JSX into one component would drop a
// Tailwind block into an inline-styled page and it would not look like the page
// it sits on. What actually must not diverge is the PARSE -- if the lander
// parsed a menu differently from the quoting page, the same paste would produce
// different ingredients depending on which door the chef came through. That is
// what lives here.
//
// Pure functions, no React, no fetch: unit-testable without mounting a page.

export interface ParsedIngredient {
  id: string;
  name: string;
  confidence: number;
}

export interface ParsedDish {
  id: string;
  name: string;
  ingredients: ParsedIngredient[];
}

// Strip prices so they are not mistaken for ingredients. Handles "$12", "$12.50"
// and bare "12.50" sitting alone on a line, then collapses the whitespace that
// removal leaves behind.
export function stripPrices(text: string): string {
  return text
    .replace(/\$\d+(?:\.\d{1,2})?/g, '')
    .replace(/(?<=\s|^)\d{1,3}\.\d{2}(?=\s|$)/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^\s+$/gm, '')
    .trim();
}

// Heuristic parse: short comma-free lines read as dish headers, everything else
// splits on commas into ingredients. Identical to the quoting page's parser --
// moved, not rewritten, so the two surfaces cannot drift.
export function parseMenuText(text: string): ParsedDish[] {
  if (!text.trim()) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const dishes: ParsedDish[] = [];
  let currentDish: ParsedDish | null = null;
  let dishCounter = 0;
  let ingCounter = 0;

  for (const line of lines) {
    const isHeader = line.length < 60 && !line.includes(',') && (
      /^[A-Z]/.test(line) || /^\d+[\.\)]\s/.test(line) || line.endsWith(':')
    );

    if (isHeader && line.length < 50) {
      dishCounter++;
      currentDish = {
        id: `dish-${dishCounter}`,
        name: line.replace(/[:]+$/, '').trim(),
        ingredients: [],
      };
      dishes.push(currentDish);
    } else {
      if (!currentDish) {
        dishCounter++;
        currentDish = { id: `dish-${dishCounter}`, name: 'Menu Items', ingredients: [] };
        dishes.push(currentDish);
      }
      const parts = line.includes(',') ? line.split(',') : [line];
      for (const part of parts) {
        const name = part.trim().replace(/^[-•*]\s*/, '');
        if (name.length > 1 && name.length < 80) {
          ingCounter++;
          currentDish.ingredients.push({ id: `ing-${ingCounter}`, name, confidence: 0.85 });
        }
      }
    }
  }
  return dishes;
}

// Turn edited dishes back into text.
//
// LOAD BEARING ON THE LANDER, in a way it is not on the quoting page. The
// quoting page carries parsedDishes forward into quote creation directly. The
// lander SUBMITS TEXT -- its request body is { payload_type, text, contact_* }.
// So without reconstructing, a chef who edits a chip, removes an ingredient or
// adds a dish would watch the panel update, press submit, and send the
// unedited original. That is a control that reports success and persists
// nothing, which is the exact class of defect C3 has spent this week removing.
export function reconstructText(dishes: ParsedDish[]): string {
  return dishes.map(dish => {
    const header = dish.name !== 'Menu Items' ? dish.name + '\n' : '';
    const ings = dish.ingredients.map(i => i.name).join(', ');
    return header + ings;
  }).join('\n\n');
}

export function countIngredients(dishes: ParsedDish[]): number {
  return dishes.reduce((n, d) => n + d.ingredients.length, 0);
}

// ── Extraction copy, in one place, for a reader who is not us ──────────────
//
// The lander is PUBLIC and unauthenticated: the reader is a chef who has been
// handed a link, not a rep who knows the system. Two rules, both from failures
// already on the board:
//
//   1. No backend strings. Codes like url_fetch_failed or pdf_too_large are
//      not language.
//   2. Never tell someone to retry something that cannot succeed. A password
//      -protected PDF will fail identically every time, and "please try again"
//      sends them round a loop with no exit. Where retrying cannot work, say
//      what will.
export function extractionFailureMessage(raw: string | undefined): string {
  const e = (raw || '').toLowerCase();

  // Retrying WILL NOT help for these. Offer the path that does.
  if (e.includes('pdf_too_large')) {
    return 'That file is too big for us to read in one go. Send just the part you need: the dinner menu, or the drinks list. You can also paste the text below.';
  }
  if (e.includes('url_unsupported_type')) {
    return "That link didn't lead to a menu we can read. If you have the file itself, upload it below, or paste the text.";
  }
  if (e.includes('encrypted') || e.includes('password')) {
    return "That PDF is password-protected, so we can't open it. Save an unlocked copy, or paste the text below.";
  }
  if (e.includes('no_text') || e.includes('empty')) {
    return "We couldn't find any text in that file. If it's a photo, a straighter or brighter one usually works. You can also paste the text below.";
  }

  // Retrying MIGHT help for these, so it is honest to offer it.
  if (e.includes('service_busy')) {
    return 'We are a little busy right now. Give it a few seconds and try again.';
  }
  if (e.includes('url_fetch_failed')) {
    return "We couldn't open that link. Check it's the right address, or upload the file instead.";
  }

  return "We couldn't read that one. You can try again, upload a different file, or paste the text below.";
}

// What the page says WHILE extraction runs. Extraction takes real time -- the
// authed path polls for up to about four minutes -- so a static "Loading" is
// not honest for the whole wait. The message earns its keep by changing as the
// wait grows, and by saying what the chef can do instead of waiting.
export function extractionProgressMessage(elapsedMs: number): string {
  if (elapsedMs < 8000) return 'Reading your menu…';
  if (elapsedMs < 25000) return 'Still reading. Long menus take a little longer.';
  if (elapsedMs < 60000) return "This one's a big menu. Still going.";
  return "Still working. If you'd rather not wait, you can paste the text below instead.";
}
