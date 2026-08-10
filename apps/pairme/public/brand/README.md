# PairMe brand assets

## Canonical mark: the VECTOR pear (founder ruling)
`pear-mark.svg` (amber pear + navy keyhole) and `pear-mark-inverse.svg` are the
canonical logo. They are Desi's deliberate vector: they scale to any size with no
redraw and recolour to any token. Use the SVG everywhere a vector works - the
landing, the favicon (`/favicon.svg`), any in-app header.

The AI raster pear has been retired. It is NOT in the repo anymore. Do not
reintroduce it.

## Raster is used ONLY where a bitmap is required
These are rasterised FROM the vector above (so it is the same mark), amber pear on
navy `#1F2A44`, opaque, square corners (App Store safe):
`/favicon-32.png` (PNG fallback), `/apple-touch-icon-180.png`, `/icon-192.png`,
`/icon-512.png`, `/app-icon-1024.png`, plus `/manifest.webmanifest`.

## Colour: one value, one place (founder ruling)
Canonical yellow: **`#EFB96B`**. Navy: `#1F2A44`.

Retired and swept from both apps + the landing: `#E8D24A` (old token), `#F8C800`
(AI asset gold), `#FFCC7D` (old landing pear). `#EFB96B` clears ~7.6:1 with navy
text, so the primary Present button passes AA + AAA for large text.

## Pear tint ramp (regenerated from #EFB96B)
Five tint steps plus the base, all `#EFB96B` mixed with white, so tinted
backgrounds never drift. Use these everywhere a tinted background appears:

  pear-50  #FDF8F0
  pear-100 #FCF1E1
  pear-200 #F9E4C7
  pear-300 #F6D6A9
  pear-400 #F2C789
  pear-500 #EFB96B  (base)

The old peach tints (`#FFF7EC/#FFEDD6/#FFDCAB/#FFF4E4/#FFE3BC/#FFEBCE`) are
retired and swept from both apps. Defined as `--color-pear-*` in the landing
:root; the diner app's theme carries the same values.

## Feature graphic typeface
Uses Piazzolla Bold - the same display font Desi's landing loads
(`--font-display:'Piazzolla'`). The DejaVu Serif stand-in is gone.
