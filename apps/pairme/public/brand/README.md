# PairMe brand assets

Canonical pear mark, derived from the two source files in
`C:\Users\DavidMoosman\quoteme\PairMe\` (the yellow-background one had its
background stripped to transparent here).

## Files
- `pear-navy.png` - navy pear on transparent. Use on LIGHT backgrounds.
- `pear-gold.png` - gold pear on transparent. Use on DARK / navy backgrounds.
- `header-pear-navy@2x.png` / `header-pear-gold@2x.png` - 160px-tall header marks (2x).
- App icons / favicons live at the public root, not here: `/favicon-32.png`,
  `/apple-touch-icon-180.png`, `/icon-192.png`, `/icon-512.png`,
  `/app-icon-1024.png` (opaque, gold pear on navy `#1F2A44`, square corners -
  App Store safe), plus `/manifest.webmanifest`.

## Colours - UNRESOLVED, needs a founder call
Measured from the actual assets, against the stated brand tokens:

| token (stated) | asset (measured) | verdict |
|---|---|---|
| pear yellow `#E8D24A` | `#F8C800` (Gemini gold pear) | MISMATCH - the asset is a brighter, more saturated gold. Distance ~76. |
| navy `#1F2A44` | `~#182848` (PearMe navy) | match (distance ~8, imperceptible) |
| landing token `--color-pear-500:#FFCC7D` | - | a THIRD yellow, different again |

Per instruction the asset was NOT recoloured. Three different yellows now exist
(`#E8D24A` token, `#F8C800` asset, `#FFCC7D` landing). Pick one before this ships
wide. These icons use the asset gold `#F8C800` as-is.

## Design conflict - also needs a call
`apps/pairme-landing/assets/logo-mark.svg` is a DIFFERENT, hand-made vector pear
(simple pear + keyhole, `#FFCC7D`). This new AI mark is detailed line-art. Both
are in the repo; the landing still points at the SVG. Decide which is canonical
before swapping the landing. A faithful SVG of this AI mark could not be derived
(it is raster line-art and there is no tracer here); the header ships as a 2x PNG.
