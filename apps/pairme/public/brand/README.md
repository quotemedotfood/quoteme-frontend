# PairMe brand assets

Canonical pear mark, derived from the two source files in
`C:\Users\DavidMoosman\quoteme\PairMe\` (the yellow-background one had its
background stripped to transparent here).

## Files
- `pear-navy.png` - navy pear on transparent. Use on LIGHT backgrounds.
- `pear-gold.png` - amber (`#EFB96B`) pear on transparent. Use on DARK / navy backgrounds.
- `header-pear-navy@2x.png` / `header-pear-gold@2x.png` - 160px-tall header marks (2x).
- App icons / favicons live at the public root, not here: `/favicon-32.png`,
  `/apple-touch-icon-180.png`, `/icon-192.png`, `/icon-512.png`,
  `/app-icon-1024.png` (opaque, amber pear on navy `#1F2A44`, square corners -
  App Store safe), plus `/manifest.webmanifest`.

## Colours - DECIDED
Canonical yellow: **`#EFB96B`** (founder call). Navy: `#1F2A44`.

The pear asset (originally an AI `#F8C800` gold) was recoloured to `#EFB96B`, and
the old primary pear `#FFCC7D` was replaced with `#EFB96B` everywhere in
apps/pairme and apps/pairme-landing: the `PEAR` constant, the light/dark theme
accents, `--color-pear-500`, the CTA button, and the SVG marks.

Follow-up (Desi, optional): the lighter pear TINT ramp still carries its old
peach steps (`--color-pear-50/100/300` = `#FFF7EC/#FFEDD6/#FFDCAB`, and the
`sel`/`#FFF4E4`/`#FFE3BC` selected-state creams). They harmonise with `#EFB96B`
but were not regenerated from it; regenerate the ramp if you want it exact.

## Design conflict - still needs a call
`apps/pairme-landing/assets/logo-mark.svg` is a DIFFERENT, hand-made vector pear
(simple pear + keyhole, now recoloured to `#EFB96B`). This new AI mark is detailed
line-art. Both are in the repo; the landing still points at the SVG. Decide which
is canonical before swapping the landing. A faithful SVG of this AI mark could not
be derived (raster line-art, no tracer here); the header ships as a 2x PNG.
